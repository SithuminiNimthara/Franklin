import cv2
import numpy as np
import os
import requests
import time
from datetime import datetime
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from collections import defaultdict, deque, Counter

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
FRAME_SKIP = 3

DEFAULT_TANK_CONFIG = {
    "tankA": os.path.join(VIDEO_DIR, "IMG_3149.MOV"),
    "tankB": os.path.join(VIDEO_DIR, "IMG_3150.MOV"),
    "tankC": os.path.join(VIDEO_DIR, "IMG_3162.MOV"),
    "tankD": os.path.join(VIDEO_DIR, "IMG_3163.MOV")
}


class VideoController:
    def __init__(self):
        print("AI Engine Starting...")

        # One YOLO model per video_id (tank) to avoid shared-state bottlenecks
        self.models = {}

        self.video_sources = DEFAULT_TANK_CONFIG.copy()
        self.states = {}
        self.monitoring = {}
        self.alerts = []  # In-memory alert storage
        self.last_alert_time = {}

        for tid in self.video_sources.keys():
            self._init_tank_state(tid)
            print(f"Loading YOLO model for {tid}...")
            self.models[tid] = YOLO(MODEL_PATH)

        print("All models loaded successfully")

    def _init_tank_state(self, video_id):
        self.states[video_id] = {
            "status": "Initializing",
            "health": "Unknown",
            "species": "Detecting...",
            "history": defaultdict(lambda: deque(maxlen=60)),
            "db_saved": False
        }
        self.monitoring[video_id] = {
            "species_buffer": deque(maxlen=CONFIRMATION_WINDOW),
            "status_buffer": deque(maxlen=CONFIRMATION_WINDOW)
        }

    def register_video(self, video_id, path):
        """Register a newly uploaded video"""
        self.video_sources[video_id] = path
        self._init_tank_state(video_id)
        self.models[video_id] = YOLO(MODEL_PATH)
        print(f"Registered new video: {video_id}")

    def generate_frames(self, video_id):
        """Generate MJPEG stream for a specific tank"""
        path = self.video_sources.get(video_id)
        if not path or not os.path.exists(path):
            print(f" Video not found: {video_id} at {path}")
            return

        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            print(f"Failed to open video: {path}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_duration = 1.0 / fps

        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        safe_zone = [WALL_MARGIN, WALL_MARGIN, w - WALL_MARGIN, h - WALL_MARGIN]

        model = self.models.get(video_id)
        if model is None:
            self.models[video_id] = YOLO(MODEL_PATH)
            model = self.models[video_id]

        frame_count = 0
        last_result = None  # cache last inference result

        print(f"▶️  Streaming {video_id} @ {fps:.1f} FPS ({w}x{h})")

        while cap.isOpened():
            start_time = time.time()
            success, frame = cap.read()

            if not success:
                # Loop video
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            # Run inference only on every FRAME_SKIP frames
            if frame_count % FRAME_SKIP == 0:
                results = model.track(frame, persist=True, conf=0.5, verbose=False)
                if results and len(results) > 0:
                    last_result = results[0]

            # Draw using cached result so boxes don't disappear on skipped frames
            if last_result is not None:
                self._process(last_result, frame, video_id, safe_zone, fps, model)

            frame_count += 1

            # Stream resized frame
            small_frame = cv2.resize(frame, (640, int(h * (640 / w))))
            ok, buffer = cv2.imencode(".jpg", small_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ok:
                continue

            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

            # SPEED CONTROL
            elapsed = time.time() - start_time
            wait = frame_duration - elapsed
            if wait > 0:
                time.sleep(wait)

    def _process(self, result, frame, video_id, safe_zone, fps, model):
        """Process detection results and draw boxes"""
        if result.boxes is None:
            return

        names = model.names

        boxes_xywh = result.boxes.xywh.cpu() if result.boxes.xywh is not None else []
        classes = result.boxes.cls.int().cpu().tolist() if result.boxes.cls is not None else []

        # IDs may be None sometimes; don't block drawing if IDs are missing
        ids = None
        if getattr(result.boxes, "id", None) is not None:
            ids = result.boxes.id.int().cpu().tolist()

        frame_species = set()
        frame_statuses = []

        for i, (box, cls) in enumerate(zip(boxes_xywh, classes)):
            x, y, w, h = box
            cx, cy = float(x), float(y)

            species = names[int(cls)]
            frame_species.add(species)

            # If tracking IDs exist use them, else fall back to index
            tid = int(ids[i]) if ids is not None and i < len(ids) else int(i)

            history = self.states[video_id]["history"][tid]
            history.append((cx, cy))

            status, color = self._analyze(history, w, h, cx, cy, safe_zone, fps)
            frame_statuses.append(status)

            x1, y1 = int(x - w / 2), int(y - h / 2)
            x2, y2 = int(x + w / 2), int(y + h / 2)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Draw label
            label = f"{species} - {status}"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 
                       0.5, color, 2)

        self._update_logic(video_id, frame_species, frame_statuses)

    def _update_logic(self, video_id, frame_species, frame_statuses):
        """Update tank state and trigger alerts"""
        monitor = self.monitoring[video_id]
        current_status = "Floater" if "Floater" in frame_statuses else "Normal"

        monitor["species_buffer"].append(list(frame_species))
        monitor["status_buffer"].append(current_status)

        if len(monitor["status_buffer"]) >= CONFIRMATION_WINDOW:
            all_s = [s for sub in monitor["species_buffer"] for s in sub]
            counts = Counter(all_s)
            valid_species = [s for s, c in counts.items() if c > CONFIRMATION_WINDOW * 0.3]
            final_species = ", ".join(valid_species) if valid_species else "None"

            if monitor["status_buffer"].count("Floater") > (CONFIRMATION_WINDOW * 0.5):
                final_status, final_health = "Floater", "Critical"
                self._trigger_alert(video_id, "behavior", "Abnormal behavior detected")
            else:
                final_status, final_health = "Normal", "Healthy"

            self.states[video_id].update({
                "species": final_species,
                "status": final_status,
                "health": final_health
            })

    def _analyze(self, hist, w, h, cx, cy, safe, fps):
        """Analyze movement to determine behavior status"""
        if len(hist) < 10:
            return "Analyzing...", (200, 200, 200)

        dist = sum(np.linalg.norm(np.array(hist[i]) - np.array(hist[i - 1]))
                   for i in range(1, len(hist)))

        speed_cm = (dist / PIXELS_PER_CM) / (len(hist) / fps)
        body_len = max(float(w), float(h)) / PIXELS_PER_CM or 0.1

        if (speed_cm / body_len) > BL_THRESHOLD:
            return "Normal", (0, 255, 0)
        return "Floater", (0, 0, 255)

    def _trigger_alert(self, tank_id, alert_type, message):
        """Trigger and save alert to both memory and database"""
        current_time = datetime.now()
        alert_key = f"{tank_id}_{alert_type}"

        # Throttling: only one alert per tank/type every 60 seconds
        if alert_key not in self.last_alert_time or \
           (current_time - self.last_alert_time[alert_key]).total_seconds() > 60:
            
            payload = {
                "type": alert_type,
                "message": message,
                "tank": tank_id,
                "location": f"Hatchery Section {tank_id[-1].upper()}",
                "status": "pending",
                "createdAt": current_time.isoformat()
            }

            # 1. Save to Python's in-memory list (for Flask /alerts endpoint)
            self.alerts.append(payload)
            
            # Keep only last 100 alerts to prevent memory bloat
            if len(self.alerts) > 100:
                self.alerts.pop(0)

            # 2. Save to Node.js database
            try:
                response = requests.post(
                    f"{NODE_API_URL}/alerts/new", 
                    json=payload, 
                    timeout=2
                )
                if response.status_code == 201:
                    print(f"Alert saved to DB: {tank_id} - {message}")
                else:
                    print(f"Alert save returned {response.status_code}")
            except Exception as e:
                print(f"Database sync failed: {e}")

            self.last_alert_time[alert_key] = current_time


# Initialize controller
engine = VideoController()


# ROUTES 

@app.route("/stream/<video_id>")
def stream(video_id):
    """Stream video with AI overlay"""
    return Response(
        engine.generate_frames(video_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/data/<video_id>")
def data(video_id):
    """Get current stats for a tank"""
    s = engine.states.get(video_id, {
        "status": "Offline", 
        "health": "Unknown", 
        "species": "Unknown"
    })
    return jsonify({
        "status": s["status"], 
        "health": s["health"], 
        "species": s["species"]
    })


@app.route("/alerts")
def get_alerts():
    """Get in-memory alerts (fallback if DB unavailable)"""
    return jsonify(engine.alerts)


@app.route("/register_upload", methods=["POST"])
def register_upload():
    """Register a newly uploaded video"""
    d = request.json
    engine.register_video(d.get("videoId"), d.get("videoPath"))
    return jsonify({"status": "registered"}), 200


@app.route("/health")
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "tanks": list(engine.video_sources.keys()),
        "alerts_count": len(engine.alerts)
    })


if __name__ == "__main__":
    print("\n" + "="*50)
    print("🐢 Sea Turtle Hatchery AI Monitor")
    print("="*50 + "\n")
    app.run(host="0.0.0.0", port=5001, threaded=True, debug=False)
