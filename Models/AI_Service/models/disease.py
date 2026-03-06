import tensorflow as tf
import numpy as np
import os
import cv2
import traceback

IMG_SIZE = 224
CLASS_NAMES = ["fp", "healthy", "barnacles"]
EMBEDDING_DIM = 128

class DiseaseClassifier:
    def __init__(self, model_path, support_set_dir=None):
        self.model_path = model_path
        self.support_set_dir = support_set_dir
        self.model = None
        self.prototypes = None
        self.load_model()
        
        if self.model:
            if self.support_set_dir and os.path.exists(self.support_set_dir):
                self.load_support_set()
            else:
                self.initialize_dummy_prototypes()

    def build_conv4_encoder(self):
        inp = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
        x = inp
        for filters in [32, 64, 128, 256]:
            x = tf.keras.layers.Conv2D(filters, 3, padding="same")(x)
            x = tf.keras.layers.BatchNormalization()(x)
            x = tf.keras.layers.ReLU()(x)
            x = tf.keras.layers.MaxPool2D()(x)
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        x = tf.keras.layers.Dense(EMBEDDING_DIM)(x)
        out = tf.keras.layers.Lambda(lambda t: tf.math.l2_normalize(t, axis=-1))(x)
        return tf.keras.Model(inp, out, name="Conv4_Encoder")

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = self.build_conv4_encoder()
                if self.model:
                    self.model.load_weights(self.model_path)
                    dummy = np.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)
                    self.model(dummy, training=False)
            except Exception as e:
                print(f"Error loading Disease Model: {e}")
                self.model = None

    def load_support_set(self):
        prototypes = []
        for class_name in CLASS_NAMES:
            class_dir = os.path.join(self.support_set_dir, class_name)
            images = []
            if os.path.exists(class_dir):
                for f in os.listdir(class_dir):
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        img = cv2.imread(os.path.join(class_dir, f))
                        if img is not None:
                            img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
                            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                            images.append(img.astype(np.float32) / 255.0)
            
            if images:
                batch = np.array(images)
                embeddings = self.model(batch, training=False).numpy()
                proto = np.mean(embeddings, axis=0)
                proto = proto / np.linalg.norm(proto)
                prototypes.append(proto)
            else:
                rng = np.random.default_rng()
                proto = rng.normal(size=(EMBEDDING_DIM,))
                prototypes.append(proto / np.linalg.norm(proto))
        self.prototypes = np.array(prototypes)

    def initialize_dummy_prototypes(self):
        rng = np.random.default_rng(42)
        self.prototypes = rng.normal(size=(3, EMBEDDING_DIM))
        self.prototypes = self.prototypes / np.linalg.norm(self.prototypes, axis=1, keepdims=True)

    def classify(self, image_bytes):
        if not self.model or self.prototypes is None:
            return {"error": "Model or prototypes not loaded"}
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_tensor = np.expand_dims(img.astype(np.float32) / 255.0, axis=0)
            
            embedding = self.model(img_tensor, training=False).numpy()
            dists = [np.sum(np.square(embedding - self.prototypes[i])) for i in range(len(CLASS_NAMES))]
            probs = np.exp(-np.array(dists)) / np.sum(np.exp(-np.array(dists)))
            best_idx = np.argmax(probs)
            
            return {
                "class": CLASS_NAMES[best_idx],
                "confidence": float(probs[best_idx]),
                "probabilities": {name: float(p) for name, p in zip(CLASS_NAMES, probs)},
            }
        except Exception as e:
            return {"error": str(e)}
