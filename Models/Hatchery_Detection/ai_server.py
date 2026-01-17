import cv2
import numpy as np
import os
from datetime import datetime
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from collections import defaultdict, deque, Counter

# APP SETUP 
app = Flask(__name__)
CORS(app)

# PATHS 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
VIDEO_DIR = os.path.join(BASE_DIR, "test_videos")

# CONFIG 
TANK_CONFIG = {
    "tankA": "IMG_3149.MOV"
}

PIXELS_PER_CM = 25.0
WALL_MARGIN = 100
BL_THRESHOLD = 0.5 

# --- SMART DETECTION CONSTANTS ---
CONFIRMATION_WINDOW = 45 # Reduced to ~1.5 seconds for faster updates
SPECIES_CONFIDENCE_THRESH = 0.3 
BEHAVIOR_CONFIDENCE_THRESH = 0.5 

# AI ENGINE
class VideoController:
    def __init__(self):
        print("🚀 AI Engine Starting...")
        if not os.path.exists(MODEL_PATH):
             print(f"⚠️ WARNING: Model not found at {MODEL_PATH}")

        self.model = YOLO(MODEL_PATH)

        #ALERT STORAGE 
        self.alerts = []
        self.last_alert_time = {} 

        # SMART MONITORING BUFFERS
        self.monitoring = {
            "tankA": {
                "species_buffer": deque(maxlen=CONFIRMATION_WINDOW),
                "status_buffer": deque(maxlen=CONFIRMATION_WINDOW)
            }
        }

        self.states = {
            "tankA": {
                "status": "Initializing",
                "health": "Unknown",
                "species": "Detecting...",
                # History is for internal calculation only
                "history": defaultdict(lambda: deque(maxlen=60)) 
            }
        }

    # STREAM
    def generate_frames(self, tank_id):
        filename = TANK_CONFIG.get(tank_id)
        if not filename: return
        
        video_path = os.path.join(VIDEO_DIR, filename)
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

            # Track
            results = self.model.track(
                frame, persist=True, conf=0.5, tracker="bytetrack.yaml", verbose=False
            )

            if results and results[0].boxes.id is not None:
                self._process(results[0], frame, tank_id, safe_zone, fps)

            _, buffer = cv2.imencode(".jpg", frame)
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )

    # PROCESS 
    def _process(self, result, frame, tank_id, safe_zone, fps):
        if result.boxes.id is None:
            return 

        boxes = result.boxes.xywh.cpu()
        ids = result.boxes.id.int().cpu().tolist()
        classes = result.boxes.cls.int().cpu().tolist()
        names = self.model.names

        frame_statuses = []
        frame_species = set()

        for box, tid, cls in zip(boxes, ids, classes):
            x, y, w, h = box
            cx, cy = float(x), float(y)
            species = names[cls]

            # Update motion history
            history = self.states[tank_id]["history"][tid]
            history.append((cx, cy))

            # Analyze individual turtle
            status, color = self._analyze(history, w, h, cx, cy, safe_zone, fps)

            frame_statuses.append(status)
            frame_species.add(species)

            # Draw UI
            x1, y1 = int(x - w/2), int(y - h/2)
            cv2.rectangle(frame, (x1, y1), (int(x+w/2), int(y+h/2)), color, 2)
            label = f"{species}"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        
        monitor = self.monitoring[tank_id]
        
        # 1. Add current frame data to buffer
        current_frame_worst_status = "Floater" if "Floater" in frame_statuses else "Normal"
        monitor["species_buffer"].append(list(frame_species))
        monitor["status_buffer"].append(current_frame_worst_status)

        # 2. Check if buffer is filling up
        if len(monitor["status_buffer"]) < CONFIRMATION_WINDOW:
            # While buffering, show immediate results so UI isn't empty
            temp_species = ", ".join(frame_species) if frame_species else "Detecting..."
            self.states[tank_id].update({
                "species": temp_species,
                "status": "Analyzing...",
                "health": "Unknown"
            })
            return 

        # 3. Analyze the Full Buffer (The "Smart" Part)
        all_seen_species = [s for sublist in monitor["species_buffer"] for s in sublist]
        species_counts = Counter(all_seen_species)
        total_frames = len(monitor["species_buffer"])
        
        # Filter noise
        valid_species = {
            s for s, count in species_counts.items() 
            if count > (total_frames * SPECIES_CONFIDENCE_THRESH)
        }
        
        # Alert: Mixed Species
        if len(valid_species) > 1:
            self._trigger_alert(tank_id, "species", f"Mixed Species: {', '.join(valid_species)}")

        final_species_str = ", ".join(valid_species) if valid_species else "None"

        # Behavior Check
        floater_count = monitor["status_buffer"].count("Floater")
        if floater_count > (total_frames * BEHAVIOR_CONFIDENCE_THRESH):
            final_status = "Floater"
            final_health = "Critical"
            self._trigger_alert(tank_id, "behavior", "Abnormal behavior (Floater)")
        else:
            final_status = "Normal"
            final_health = "Healthy"

        # Update Global State
        self.states[tank_id].update({
            "species": final_species_str,
            "status": final_status,
            "health": final_health
        })

    #HELPER: ALERTS
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

    #BEHAVIOR ANALYSIS
    def _analyze(self, hist, w, h, cx, cy, safe, fps):
        if len(hist) < 10:
            return "Analyzing...", (200, 200, 200)

        dist = sum(np.linalg.norm(np.array(hist[i]) - np.array(hist[i-1])) for i in range(1, len(hist)))
        speed_cm = (dist / PIXELS_PER_CM) / (len(hist) / fps)
        
        body_len = max(w, h) / PIXELS_PER_CM
        if body_len < 0.1: body_len = 0.1 
        
        speed_bl = speed_cm / body_len
        at_wall = cx < safe[0] or cx > safe[2] or cy < safe[1] or cy > safe[3]

        if speed_bl > BL_THRESHOLD:
            return "Normal", (0, 255, 0)
        if at_wall:
            return "Normal", (0, 255, 255)
        return "Floater", (0, 0, 255)

# INIT
engine = VideoController()

# ROUTES 
@app.route("/stream/<tank_id>")
def stream(tank_id):
    return Response(engine.generate_frames(tank_id),
        mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/data/<tank_id>")
def data(tank_id):
   
    raw_state = engine.states.get(tank_id)
    
    if not raw_state:
        return jsonify({
            "status": "Offline",
            "health": "Unknown",
            "species": "Unknown"
        })

    clean_response = {
        "status": raw_state["status"],
        "health": raw_state["health"],
        "species": raw_state["species"]
    }

    return jsonify(clean_response)

@app.route("/alerts")
def get_alerts():
    return jsonify(engine.alerts)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, threaded=True)