import os
import sys
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add current dir to path to find inference
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from inference import DiseaseClassifier

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DISEASE_MODEL_PATH = os.path.join(BASE_DIR, "protonet_conv4_encoder.keras")
SUPPORT_SET_DIR = os.path.join(BASE_DIR, "support_set")

print("Starting Disease Detection Service...")
try:
    classifier = DiseaseClassifier(DISEASE_MODEL_PATH, SUPPORT_SET_DIR)
except Exception as e:
    print(f"Failed to initialize classifier: {e}")
    classifier = None

@app.get("/")
def health_check():
    return {"status": "Disease Detection Service Running", "model_loaded": classifier is not None}

@app.post("/classify")
async def classify_health(file: UploadFile = File(...)):
    if not classifier:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    content = await file.read()
    result = classifier.classify(content)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
