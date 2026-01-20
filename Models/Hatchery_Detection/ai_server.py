import cv2
import numpy as np
import os
import requests
from datetime import datetime
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from collections import defaultdict, deque, Counter

# APP SETUP 
app = Flask(__name__)
CORS(app)

# CONFIG
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
VIDEO_DIR = os.path.join(BASE_DIR, "test_videos")
NODE_API_URL = "http://localhost:5002/api/hatchery" 

# CONSTANTS
PIXELS_PER_CM = 25.0
WALL_MARGIN = 100
BL_THRESHOLD = 0.5 
CONFIRMATION_WINDOW = 45 

# DEFAULT CONFIG
DEFAULT_TANK_CONFIG = {
    "tankA": os.path.join(VIDEO_DIR, "IMG_3149.MOV") 
}

class VideoController:
    def __init__(self):
        print("AI Engine Starting...")
        self.model = YOLO(MODEL_PATH)
        
        # 1. Initialize Video Sources
        self.video_sources = DEFAULT_TANK_CONFIG.copy()
        
        # 2. State & Monitoring Containers
        self.states = {}
        self.monitoring = {}
        self.alerts = [] 
        self.last_alert_time = {}

        # Initialize default tank state
        self._init_tank_state("tankA")

    def _init_tank_state(self, video_id):
        """Helper to initialize buffers for a new video"""
        self.states[video_id] = {
            "status": "Initializing",
            "health": "Unknown",
            "species": "Detecting...",
            # 'history' contains deques, which CANNOT be sent via JSON directly
            "history": defaultdict(lambda: deque(maxlen=60)),
            "db_saved": False
        }
        self.monitoring[video_id] = {
            "species_buffer": deque(maxlen=CONFIRMATION_WINDOW),
            "status_buffer": deque(maxlen=CONFIRMATION_WINDOW)
        }

    def register_video(self, video_id, path):
        """Register a new uploaded video"""
        self.video_sources[video_id] = path
        self._init_tank_state(video_id)
        print(f"Registered video: {video_id} at {path}")

    def generate_frames(self, video_id):
        path = self.video_sources.get(video_id)
        
        if not path or not os.path.exists(path):
            print(f"Video file not found for {video_id}: {path}")
            return

        cap = cv2.VideoCapture(path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        safe_zone = [WALL_MARGIN, WALL_MARGIN, w - WALL_MARGIN, h - WALL_MARGIN]

        while True:
            success, frame = cap.read()
            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Loop video
                continue

            results = self.model.track(frame, persist=True, conf=0.5, tracker="bytetrack.yaml", verbose=False)

            if results and results[0].boxes.id is not None:
                self._process(results[0], frame, video_id, safe_zone, fps)

            _, buffer = cv2.imencode(".jpg", frame)
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

    def _process(self, result, frame, video_id, safe_zone, fps):
        boxes = result.boxes.xywh.cpu()
        ids = result.boxes.id.int().cpu().tolist()
        classes = result.boxes.cls.int().cpu().tolist()
        names = self.model.names

        frame_species = set()
        frame_statuses = []

        for box, tid, cls in zip(boxes, ids, classes):
            x, y, w, h = box
            cx, cy = float(x), float(y)
            species = names[cls]

            # Update History (Deque)
            history = self.states[video_id]["history"][tid]
            history.append((cx, cy))
            
            # Analyze
            status, color = self._analyze(history, w, h, cx, cy, safe_zone, fps)
            
            frame_species.add(species)
            frame_statuses.append(status)

            # Draw UI
            x1, y1 = int(x-w/2), int(y-h/2)
            cv2.rectangle(frame, (x1, y1), (int(x+w/2), int(y+h/2)), color, 2)
            cv2.putText(frame, f"{species}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Buffer & Logic
        monitor = self.monitoring[video_id]
        current_status = "Floater" if "Floater" in frame_statuses else "Normal"
        monitor["species_buffer"].append(list(frame_species))
        monitor["status_buffer"].append(current_status)

        # AI decision logic
        if len(monitor["status_buffer"]) >= CONFIRMATION_WINDOW:
            # Species Majority Vote
            all_species = [s for sub in monitor["species_buffer"] for s in sub]
            if all_species:
                counts = Counter(all_species)
                valid_species = [s for s, c in counts.items() if c > CONFIRMATION_WINDOW * 0.3]
                
                if len(valid_species) > 1:
                    self._trigger_alert(video_id, "species", f"Mixed Species: {', '.join(valid_species)}")
                
                final_species = ", ".join(valid_species) if valid_species else "None"
            else:
                final_species = "None"

            # Behavior Vote
            floater_count = monitor["status_buffer"].count("Floater")
            if floater_count > (len(monitor["status_buffer"]) * 0.5):
                final_status = "Floater"
                final_health = "Critical"
                self._trigger_alert(video_id, "behavior", "Abnormal behavior detected (Floater)")
            else:
                final_status = "Normal"
                final_health = "Healthy"

            # Update State
            self.states[video_id].update({
                "species": final_species,
                "status": final_status,
                "health": final_health
            })

            # Save to DB
            if "upload" in video_id and not self.states[video_id]["db_saved"] and final_species != "None":
                self._save_to_db(video_id, final_species, final_status, final_health)

    def _analyze(self, hist, w, h, cx, cy, safe, fps):
        if len(hist) < 10: return "Analyzing...", (200, 200, 200)
        dist = sum(np.linalg.norm(np.array(hist[i]) - np.array(hist[i-1])) for i in range(1, len(hist)))
        speed_cm = (dist / PIXELS_PER_CM) / (len(hist) / fps)
        body_len = max(w, h) / PIXELS_PER_CM or 0.1
        
        if (speed_cm / body_len) > BL_THRESHOLD: return "Normal", (0, 255, 0)
        if cx < safe[0] or cx > safe[2] or cy < safe[1] or cy > safe[3]: return "Normal", (0, 255, 255)
        return "Floater", (0, 0, 255)

    def _trigger_alert(self, tank_id, alert_type, message):
        current_time = datetime.now()
        alert_key = f"{tank_id}_{alert_type}"

        if alert_key not in self.last_alert_time or \
           (current_time - self.last_alert_time[alert_key]).total_seconds() > 10:
            
            new_alert = {
                "type": alert_type,
                "message": message,
                "tank": tank_id,
                "time": current_time.strftime("%H:%M:%S")
            }
            self.alerts.insert(0, new_alert)
            self.alerts = self.alerts[:50] 
            self.last_alert_time[alert_key] = current_time

    def _save_to_db(self, video_id, species, behavior, health):
        try:
            payload = { "species": species, "behavior": behavior, "health": health }
            url = f"{NODE_API_URL}/video/{video_id}/analysis"
            requests.post(url, json=payload)
            print(f"Saved results to DB for {video_id}")
            self.states[video_id]["db_saved"] = True
        except Exception as e:
            print(f"DB Save Failed: {e}")

engine = VideoController()

#Routes 

@app.route("/register_upload", methods=["POST"])
def register_upload():
    data = request.json
    video_id = data.get("videoId")
    path = data.get("videoPath")
    if video_id and path:
        engine.register_video(video_id, path)
        return jsonify({"status": "registered"}), 200
    return jsonify({"error": "missing data"}), 400

@app.route("/stream/<video_id>")
def stream(video_id):
    return Response(engine.generate_frames(video_id), 
                   mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/data/<video_id>")
def data(video_id):
    # Get raw state or defaults
    raw_state = engine.states.get(video_id)
    
    if not raw_state:
        return jsonify({
            "status": "Offline", 
            "health": "Unknown", 
            "species": "Unknown"
        })

    # Create a CLEAN dictionary without the 'history' deque objects
    response_data = {
        "status": raw_state["status"],
        "health": raw_state["health"],
        "species": raw_state["species"]
    }
    
    return jsonify(response_data)

@app.route("/alerts")
def get_alerts():
    return jsonify(engine.alerts)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, threaded=True)