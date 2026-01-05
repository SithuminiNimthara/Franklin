import tensorflow as tf
import os
import traceback
import numpy as np

MODEL_PATH = "d:/FranklinNew/Franklin/Models/Disease_Detection/protonet_conv4_encoder.keras"

print(f"Testing model loading from {MODEL_PATH}")

try:
    # Attempt 2: Reconstruct and load_weights
    print("\nAttempt 2: Build + load_weights")
    IMG_SIZE = 224
    EMBEDDING_DIM = 128
    
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
    model = tf.keras.Model(inp, out, name="Conv4_Encoder")
    
    model.load_weights(MODEL_PATH)
    print("Success with load_weights!")
    
    # Test Inference
    print("Testing inference...")
    dummy_input = np.random.rand(1, IMG_SIZE, IMG_SIZE, 3).astype(np.float32)
    output = model.predict(dummy_input)
    print("Inference success! Output shape:", output.shape)
    
except Exception:
    print("Attempt 2 failed.")
    traceback.print_exc()
