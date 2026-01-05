import tensorflow as tf
import numpy as np
import os
import cv2
import traceback

# Define constants
IMG_SIZE = 224
CLASS_NAMES = ["fp", "healthy", "barnacles"]
EMBEDDING_DIM = 128

class DiseaseClassifier:
    def __init__(self, model_path, support_set_dir=None):
        self.model_path = model_path
        self.support_set_dir = support_set_dir
        self.model = None
        self.prototypes = None
        print(f"Initializing DiseaseClassifier with model: {model_path}")
        self.load_model()
        
        if self.model: # Only load support set if model loaded
            if self.support_set_dir and os.path.exists(self.support_set_dir):
                self.load_support_set()
            else:
                print("Warning: No support set found. Using dummy prototypes.")
                self.initialize_dummy_prototypes()
        else:
            print("Skipping support set loading - Model not available.")

    def build_conv4_encoder(self):
        """Reconstruct the model architecture to load weights safely"""
        try:
            inp = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
            x = inp
            for filters in [32, 64, 128, 256]:
                x = tf.keras.layers.Conv2D(filters, 3, padding="same")(x)
                x = tf.keras.layers.BatchNormalization()(x)
                x = tf.keras.layers.ReLU()(x)
                x = tf.keras.layers.MaxPool2D()(x)

            x = tf.keras.layers.GlobalAveragePooling2D()(x)
            x = tf.keras.layers.Dense(EMBEDDING_DIM)(x)

            # Keras-safe L2 normalization
            out = tf.keras.layers.Lambda(lambda t: tf.math.l2_normalize(t, axis=-1))(x)
            return tf.keras.Model(inp, out, name="Conv4_Encoder")
        except Exception as e:
            print(f"Error building model architecture: {e}")
            traceback.print_exc()
            return None

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                print(f"Loading Disease Model weights from {self.model_path}")
                # Rebuild architecture
                self.model = self.build_conv4_encoder()
                if self.model:
                     # Load weights
                    self.model.load_weights(self.model_path)
                    print("Disease Model loaded successfully (Weights Only).")
                    
                    # Warmup
                    print("Running warmup prediction...")
                    dummy = np.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)
                    self.model.predict(dummy, verbose=0)
                    print("Warmup complete.")
                
            except Exception as e:
                print(f"Error loading Disease Model: {e}")
                traceback.print_exc()
                self.model = None
        else:
            print(f"Disease Model not found at {self.model_path}")

    def load_image_file(self, path):
        """Helper to load and preprocess a single image file for the support set"""
        try:
            img = cv2.imread(path)
            if img is None:
                return None
            img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = img.astype(np.float32) / 255.0
            return img
        except Exception as e:
            print(f"Error loading support image {path}: {e}")
            return None

    def load_support_set(self):
        print(f"Loading support set from {self.support_set_dir}...")
        prototypes = []
        
        if not self.model:
            print("Cannot compute prototypes: Model not loaded.")
            return

        for class_name in CLASS_NAMES:
            class_dir = os.path.join(self.support_set_dir, class_name)
            if not os.path.exists(class_dir):
                print(f"Warning: Support class directory not found: {class_dir}")
                # Fallback to random vector for missing class to prevent crash
                rng = np.random.default_rng()
                proto = rng.normal(size=(EMBEDDING_DIM,))
                proto = proto / np.linalg.norm(proto)
                prototypes.append(proto)
                continue

            images = []
            files = os.listdir(class_dir)
            
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    img_path = os.path.join(class_dir, f)
                    img = self.load_image_file(img_path)
                    if img is not None:
                        images.append(img)
            
            if not images:
                print(f"Warning: No valid images found for class {class_name}")
                # Fallback
                rng = np.random.default_rng()
                proto = rng.normal(size=(EMBEDDING_DIM,))
                proto = proto / np.linalg.norm(proto)
                prototypes.append(proto)
                continue

            # Batch process images to get embeddings
            print(f"Processing class '{class_name}' with {len(images)} images.")
            batch = np.array(images)
            embeddings = self.model.predict(batch, verbose=0)
            
            # Compute mean (prototype)
            # embeddings shape: (N, 128)
            proto = np.mean(embeddings, axis=0) # (128,)
            
            # Re-normalize prototype (optional but good for cosine/euclidean consistency in hypersphere)
            proto = proto / np.linalg.norm(proto)
            
            prototypes.append(proto)

        self.prototypes = np.array(prototypes) # (3, 128)
        print("Support set loaded and prototypes computed successfully.")

    def initialize_dummy_prototypes(self):
        print("Initializing dummy prototypes...")
        rng = np.random.default_rng(42)
        self.prototypes = rng.normal(size=(3, EMBEDDING_DIM))
        self.prototypes = self.prototypes / np.linalg.norm(self.prototypes, axis=1, keepdims=True)

    def preprocess(self, image_bytes):
        # Decode
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
        
        # Resize and Format
        img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 255.0
        return np.expand_dims(img, axis=0) # Batch dimension

    def classify(self, image_bytes):
        print("Classifying image...")
        if not self.model:
            print("Error: Model not loaded")
            return {"error": "Model not loaded"}
        
        if self.prototypes is None:
            print("Error: Prototypes not initialized")
            return {"error": "Prototypes not initialized"}

        try:
            # Preprocess
            img_tensor = self.preprocess(image_bytes)
            print(f"Preprocessed shape: {img_tensor.shape}")
            
            # Get Embedding - Use __call__ instead of predict for serving
            embedding = self.model(img_tensor, training=False)
            # Convert to numpy
            embedding = embedding.numpy()
            
            # Compute Euclidean distances to prototypes
            dists = []
            for i in range(len(CLASS_NAMES)):
                proto = self.prototypes[i]
                d = np.sum(np.square(embedding - proto))
                dists.append(d)
            
            scores = -np.array(dists)
            exp_scores = np.exp(scores)
            probs = exp_scores / np.sum(exp_scores)
            
            best_idx = np.argmax(probs)
            confidence = float(probs[best_idx])
            class_name = CLASS_NAMES[best_idx]
            
            print(f"Classification result: {class_name} ({confidence:.2f})")
            
            return {
                "class": class_name,
                "confidence": confidence,
                "probabilities": {name: float(p) for name, p in zip(CLASS_NAMES, probs)},
            }

        except Exception as e:
            print(f"Classification error: {e}")
            traceback.print_exc()
            return {"error": str(e)}
