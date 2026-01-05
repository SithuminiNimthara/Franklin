import os
import shutil
import uuid
import tempfile
from typing import List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
import numpy as np

# ---------- CONFIG ----------
MODEL_PATH = "models/predator.pt"      # <--- point to your trained .pt file
OUTPUT_DIR = "outputs"             # where annotated videos & reports are saved
FRAME_STEP = 1                     # process every Nth frame (1 = every frame). Increase to speed up.
TARGET_CLASS_NAMES = ["predator"]    # index -> class name (adjust if you have >1 class)
CONFIDENCE_THRESHOLD = 0.3        # filter weak detections
USE_GPU = True                    # set False to force CPU (device="cpu")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------- App ----------
app = FastAPI(title="Predator Detector API")

# Load model (single global instance)
device = 0 if USE_GPU else "cpu"
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    # if loading fails, raise when endpoint called - but still start app
    model = None
    print("Warning: model failed to load at startup:", e)


# ---------- Response schemas ----------
class Detection(BaseModel):
    frame_idx: int
    timestamp_s: float
    boxes: List[List[float]]   # [x1, y1, x2, y2]
    scores: List[float]
    classes: List[str]


class VideoReport(BaseModel):
    video_filename: str
    total_frames: int
    processed_frames: int
    total_detections: int
    predator_present: bool
    detections: List[Detection]
    annotated_video_path: str


# ---------- Helpers ----------
def ensure_model():
    if model is None:
        raise RuntimeError(f"Model not loaded. Check MODEL_PATH={MODEL_PATH} and that ultralytics is installed.")


def save_upload_temp(upload_file: UploadFile) -> str:
    """Save uploaded file to a temporary local path and return path."""
    suffix = os.path.splitext(upload_file.filename)[1]
    tmpdir = tempfile.mkdtemp(prefix="upload_")
    tmp_path = os.path.join(tmpdir, f"{uuid.uuid4().hex}{suffix}")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return tmp_path


def annotate_and_process(video_path: str, out_path: str, frame_step:int = 1) -> Dict[str, Any]:
    """
    Run detection on video and write an annotated output video.
    Returns a dictionary with per-frame detections and summary info.
    """
    ensure_model()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Could not open video: " + video_path)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))

    detections_out = []
    total_detections = 0
    processed_frames = 0
    frame_idx = 0
    predator_present_any = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_step == 0:
            processed_frames += 1
            # run model on the frame (Ultralytics accepts numpy arrays)
            results = model(frame, verbose=False)  # returns a Results object (list-like)
            r = results[0]

            boxes = []
            scores = []
            classes = []

            # Ultralytics v8: r.boxes contains Boxes with .xyxy, .conf, .cls
            if hasattr(r, 'boxes') and r.boxes is not None:
                xyxy = r.boxes.xyxy.cpu().numpy() if hasattr(r.boxes, "xyxy") else None
                confs = r.boxes.conf.cpu().numpy() if hasattr(r.boxes, "conf") else None
                clss = r.boxes.cls.cpu().numpy() if hasattr(r.boxes, "cls") else None

                if xyxy is not None:
                    for i in range(xyxy.shape[0]):
                        score = float(confs[i]) if confs is not None else 1.0
                        cls_id = int(clss[i]) if clss is not None else 0
                        if score < CONFIDENCE_THRESHOLD:
                            continue
                        x1, y1, x2, y2 = xyxy[i].tolist()
                        boxes.append([x1, y1, x2, y2])
                        scores.append(score)
                        # Map class id to name (fallback to string id)
                        cls_name = TARGET_CLASS_NAMES[cls_id] if cls_id < len(TARGET_CLASS_NAMES) else str(cls_id)
                        classes.append(cls_name)

                        # draw rectangle and label on frame
                        color = (0, 0, 255)
                        BOX_THICKNESS = 4
                        FONT_SCALE = 0.8
                        FONT_THICKNESS = 2

                        # Draw thicker rectangle
                        cv2.rectangle(
                            frame,
                            (int(x1), int(y1)),
                            (int(x2), int(y2)),
                            color,
                            BOX_THICKNESS
                        )

                        # Draw bigger text
                        label = f"{cls_name} {score:.2f}"
                        cv2.putText(
                            frame,
                            label,
                            (int(x1), int(y1) - 10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            FONT_SCALE,
                            color,
                            FONT_THICKNESS
                        )

            # check if any predator found in this frame
            found_predator = any([c == "predator" for c in classes])
            if found_predator:
                predator_present_any = True

            total_detections += len(boxes)

            timestamp_s = frame_idx / fps if fps > 0 else 0.0
            detections_out.append({
                "frame_idx": frame_idx,
                "timestamp_s": float(timestamp_s),
                "boxes": boxes,
                "scores": scores,
                "classes": classes
            })

        # write annotated frame anyway (so output video length equals input)
        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    return {
        "video_filename": os.path.basename(video_path),
        "total_frames": total_frames,
        "processed_frames": processed_frames,
        "total_detections": total_detections,
        "predator_present": predator_present_any,
        "detections": detections_out
    }


# ---------- API Endpoints ----------
@app.post("/detect-video/predator", response_model=VideoReport)
async def detect_video(file: UploadFile = File(...)):
    """
    Upload a video and get detection report + annotated output video path.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # save in temp
    try:
        tmp_video = save_upload_temp(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    # create output path
    out_name = f"{uuid.uuid4().hex}_annotated.mp4"
    out_path = os.path.join(OUTPUT_DIR, out_name)

    try:
        result = annotate_and_process(tmp_video, out_path, frame_step=FRAME_STEP)
        # attach the path to annotated video in the result
        result["annotated_video_path"] = out_path

        # cleanup uploaded temp directory
        try:
            shutil.rmtree(os.path.dirname(tmp_video))
        except Exception:
            pass

        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/predator/{filename}")
def download_file(filename: str):
    """
    Download an annotated video by filename (the client should previously get the path).
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)


@app.get("/predator/")
def root():
    return {"message": "Predator Detector API. POST /detect-video with video file."}
