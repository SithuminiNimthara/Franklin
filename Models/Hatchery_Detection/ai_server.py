import cv2
import numpy as np
import os
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from collections import defaultdict, deque

# APP SETUP
app = Flask(__name__)
CORS(app)

# PATHS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'best.pt')
VIDEO_DIR = os.path.join(BASE_DIR, "test_videos")

# CONFIG
TANK_CONFIG = {
    "tankA": "IMG_3147.MOV"
}

PIXELS_PER_CM = 25.0
WALL_MARGIN = 100

# THRESHOLD: 0.5 Body Lengths per Second
# If moving more than half its body length per second, it's active.
BL_THRESHOLD = 0.5 

# AI ENGINE
class VideoController:
    def __init__(self):
        print("AI Engine Starting...")

        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

        self.model = YOLO(MODEL_PATH)
        print("YOLOv8 model loaded")

        self.states = {
            "tankA": {
                "status": "Initializing...",
                "health": "Unknown",
                "species": "Detecting...",
                "history": defaultdict(lambda: deque(maxlen=60))
            }
        }

    #  STREAM 
    def generate_frames(self, tank_id):
        filename = TANK_CONFIG.get(tank_id)
        if not filename: return

        video_path = os.path.join(VIDEO_DIR, filename)
        if not os.path.exists(video_path):
            print(f"Error: Video file not found at {video_path}")
            return

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        safe_zone = [WALL_MARGIN, WALL_MARGIN, w - WALL_MARGIN, h - WALL_MARGIN]

        while True:
            success, frame = cap.read()
            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            results = self.model.track(frame, persist=True, conf=0.5, tracker="bytetrack.yaml", verbose=False)

            if results and results[0].boxes.id is not None:
                self._process(results[0], frame, tank_id, safe_zone, fps)

            ret, buffer = cv2.imencode(".jpg", frame)
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

    # PROCESS
    def _process(self, result, frame, tank_id, safe_zone, fps):
        boxes = result.boxes.xywh.cpu()
        ids = result.boxes.id.int().cpu().tolist()
        classes = result.boxes.cls.int().cpu().tolist()
        names = self.model.names

        for box, tid, cls in zip(boxes, ids, classes):
            x, y, w, h = box
            cx, cy = float(x), float(y)
            species = names[cls]
            
            history = self.states[tank_id]["history"][tid]
            history.append((cx, cy))
            
            # Pass w and h to analyze for body length calculation
            status, color = self._analyze(history, w, h, cx, cy, safe_zone, fps)

            self.states[tank_id].update({
                "species": species,
                "status": status,
                "health": status 
            })

            # Draw UI
            x1, y1 = int(x - w/2), int(y - h/2)
            cv2.rectangle(frame, (x1, y1), (int(x+w/2), int(y+h/2)), color, 2)
            label = f"{species} | {status}"
            
            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    #BEHAVIOR (LOGIC UPDATE) 
    def _analyze(self, hist, w, h, cx, cy, safe, fps):
        if len(hist) < 10:
            return "Analyzing...", (200, 200, 200)

        # 1. Calculate Speed in cm/s
        dist_pixels = sum(np.linalg.norm(np.array(hist[i]) - np.array(hist[i-1])) for i in range(1, len(hist)))
        duration = len(hist) / fps
        speed_cm_s = (dist_pixels / PIXELS_PER_CM) / duration

        # 2. Calculate Body Lengths per Second (BL/s)
        # We use the maximum dimension (length) of the bounding box
        body_len_cm = max(w, h) / PIXELS_PER_CM
        if body_len_cm < 0.1: body_len_cm = 0.1 # Prevent div/0
        
        speed_bl_s = speed_cm_s / body_len_cm

        # 3. Check Position
        at_wall = cx < safe[0] or cx > safe[2] or cy < safe[1] or cy > safe[3]

        # 4. DECISION LOGIC
        # Priority A: If moving fast (relative to size) -> HEALTHY
        if speed_bl_s > BL_THRESHOLD:
            return "Normal", (0, 255, 0) # Green

        # Priority B: If slow, BUT at the wall -> HEALTHY (Resting)
        if at_wall:
            return "Normal", (0, 255, 255) # Cyan/Yellowish (distinct but healthy)
        # Priority C: Slow AND in the middle -> FLOATER
        return "Floator", (0, 0, 255) # Red

#INIT & ROUTES 
engine = VideoController()

@app.route("/stream/<tank_id>")
def stream(tank_id):
    return Response(engine.generate_frames(tank_id), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/data/<tank_id>")
def data(tank_id):
    state = engine.states.get(tank_id)
    if not state: return jsonify({"status": "Offline"})
    return jsonify({
        "status": state["status"],
        "health": state["health"],
        "species": state["species"]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, threaded=True)