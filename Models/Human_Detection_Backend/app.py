from fastapi import FastAPI, UploadFile, File, HTTPException
from ultralytics import YOLO
import shutil
import os
import uuid
import cv2

app = FastAPI()

MODEL_PATH = "models/yolov8n.pt"
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

model = YOLO(MODEL_PATH)

@app.post("/detect-video")
async def detect_video(file: UploadFile = File(...)):
    # Save uploaded video
    video_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{video_id}.mp4")
    output_path = os.path.join(OUTPUT_DIR, f"{video_id}_out.mp4")

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Open video
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Cannot open video")

    width = int(cap.get(3))
    height = int(cap.get(4))
    fps = cap.get(cv2.CAP_PROP_FPS)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_frames = 0
    person_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=0.4, classes=[0])  # 0 = person

        for r in results:
            boxes = r.boxes
            if boxes is not None:
                person_count += len(boxes)

        annotated = results[0].plot()
        out.write(annotated)
        total_frames += 1

    cap.release()
    out.release()

    return {
        "message": "Human detection completed",
        "frames_processed": total_frames,
        "persons_detected": person_count,
        "output_video": output_path
    }
