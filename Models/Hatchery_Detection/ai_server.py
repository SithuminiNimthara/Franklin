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
NODE_API_URL = os.environ.get("NODE_API_URL", "http://localhost:5002")

# CONSTANTS
PIXELS_PER_CM = 25.0
WALL_MARGIN = 100
CONFIRMATION_WINDOW = 45
FRAME_SKIP = 3

# ENHANCED BEHAVIORAL ANALYSIS CONSTANTS
NORMAL_SUBMERGED_DEPTH_THRESHOLD = 0.7
SURFACE_FLOAT_THRESHOLD = 0.30
LATERAL_TILT_ANGLE_MIN = 0.7
LATERAL_TILT_ANGLE_MAX = 1.3
MIN_DIVE_ATTEMPTS = 3
SPEED_VARIANCE_THRESHOLD = 0.4
BL_SPEED_THRESHOLD = 0.3

DEFAULT_TANK_CONFIG = {
    "tankA": os.path.join(VIDEO_DIR, "IMG_3149.MOV"),
    "tankB": os.path.join(VIDEO_DIR, "IMG_3150.MOV"),
    "tankC": os.path.join(VIDEO_DIR, "IMG_3162.MOV"),
    "tankD": os.path.join(VIDEO_DIR, "IMG_3163.MOV")
}

class EnhancedBehaviorAnalyzer:
    """
    Multi-parameter behavioral analysis system for sea turtle hatchlings.
    Uses 5 indicators to detect floater syndrome with higher accuracy.
    """
    def __init__(self):
        self.depth_history = deque(maxlen=300)
        self.surface_time_ratio = deque(maxlen=1800)
        self.tilt_history = deque(maxlen=300)
        self.dive_attempts = deque(maxlen=1800)
        self.movement_patterns = deque(maxlen=3600)
        
    def analyze_behavior(self, bbox_width, bbox_height, center_x, center_y, 
                         history, fps, frame_height, frame_width):
        """
        Comprehensive behavior assessment using 5 research-based indicators
        Returns: status, color, health, reasons
        """
        floater_score = 0
        reasons = []
        
        # 1. SURFACE TIME ANALYSIS
        relative_depth = self._calculate_depth_indicator(
            center_y, bbox_width, bbox_height, frame_height
        )
        self.depth_history.append(relative_depth)
        
        is_at_surface = relative_depth < 0.3
        self.surface_time_ratio.append(is_at_surface)
        
        if len(self.surface_time_ratio) >= 60:
            surface_percentage = sum(self.surface_time_ratio) / len(self.surface_time_ratio)
            
            if surface_percentage > SURFACE_FLOAT_THRESHOLD:
                floater_score += 3
                reasons.append(f"Surface time: {surface_percentage:.1%}")
        
        # 2. LATERAL TILT DETECTION
        tilt_indicator = self._detect_lateral_tilt(bbox_width, bbox_height)
        self.tilt_history.append(tilt_indicator)
        
        if len(self.tilt_history) >= 60:
            persistent_tilt = sum(self.tilt_history) > (len(self.tilt_history) * 0.6)
            if persistent_tilt:
                floater_score += 3
                reasons.append("Lateral tilt detected")
        
        # 3. MOVEMENT PATTERN VARIABILITY
        if len(history) >= 30:
            speeds = self._calculate_speed_sequence(history, fps)
            if len(speeds) > 0:
                speed_variance = np.std(speeds) / (np.mean(speeds) + 1e-6)
                
                if speed_variance < SPEED_VARIANCE_THRESHOLD:
                    floater_score += 2
                    reasons.append("Monotonous movement")
        
        # 4. DIVE ATTEMPT FREQUENCY
        if len(history) >= 5:
            dive_attempt = self._detect_dive_attempt(history)
            self.dive_attempts.append(dive_attempt)
            
            if len(self.dive_attempts) >= 60 * fps:
                dive_rate = sum(self.dive_attempts[-int(60*fps):]) / 60.0 * fps
                if dive_rate < MIN_DIVE_ATTEMPTS:
                    floater_score += 2
                    reasons.append(f"Low dive rate: {dive_rate:.1f}/min")
        
        # 5. SPEED RELATIVE TO BODY LENGTH
        body_length_cm = max(bbox_width, bbox_height) / PIXELS_PER_CM
        if len(history) >= 10:
            distance = sum(np.linalg.norm(
                np.array(history[i]) - np.array(history[i-1])
            ) for i in range(1, len(history)))
            speed_cm_s = (distance / PIXELS_PER_CM) / (len(history) / fps)
            speed_bl_s = speed_cm_s / (body_length_cm + 0.1)
            
            if speed_bl_s < BL_SPEED_THRESHOLD:
                floater_score += 1
                reasons.append(f"Low speed: {speed_bl_s:.2f} BL/s")
        
        # CLASSIFICATION BASED ON COMPOSITE SCORE
        if floater_score >= 5:
            status = "CRITICAL - Floater"
            color = (0, 0, 255)
            health = "Critical"
        elif floater_score >= 3:
            status = "WARNING - Abnormal"
            color = (0, 140, 255)
            health = "Concerning"
        else:
            status = "Normal"
            color = (0, 255, 0)
            health = "Healthy"
        
        return status, color, health, reasons
    
    def _calculate_depth_indicator(self, cy, w, h, frame_h):
        y_ratio = cy / frame_h
        size_score = (w * h) / (frame_h * frame_h * 0.25)
        depth_score = (1 - y_ratio) * 0.7 + min(size_score, 1.0) * 0.3
        return depth_score
    
    def _detect_lateral_tilt(self, w, h):
        aspect_ratio = w / (h + 1e-6)
        return 1 if (aspect_ratio < LATERAL_TILT_ANGLE_MIN or 
                     aspect_ratio > LATERAL_TILT_ANGLE_MAX) else 0
    
    def _calculate_speed_sequence(self, history, fps):
        speeds = []
        window = min(10, len(history) - 1)
        if window < 2:
            return speeds
            
        for i in range(len(history) - window):
            dist = np.linalg.norm(
                np.array(history[i+window]) - np.array(history[i])
            )
            speed = (dist / PIXELS_PER_CM) / (window / fps)
            speeds.append(speed)
        return speeds
    
    def _detect_dive_attempt(self, history):
        if len(history) < 5:
            return 0
        recent_y = [pos[1] for pos in list(history)[-5:]]
        y_change = abs(recent_y[-1] - recent_y[0])
        return 1 if y_change > 20 else 0

class VideoController:
    def __init__(self):
     
        
        self.models = {}
        self.video_sources = DEFAULT_TANK_CONFIG.copy()
        self.states = {}
        self.monitoring = {}
        self.alerts = []
        self.last_alert_time = {}
        self.behavior_analyzers = {}
        
        # Load models for default tanks
        for tid in self.video_sources.keys():
            self._init_tank_state(tid)
            print(f"Loading YOLO model for {tid}...")
            self.models[tid] = YOLO(MODEL_PATH)
            self.behavior_analyzers[tid] = {}
        
        #print("All models loaded successfully")

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
            "status_buffer": deque(maxlen=CONFIRMATION_WINDOW),
            "health_buffer": deque(maxlen=CONFIRMATION_WINDOW)
        }

    def register_video(self, video_id, path):
        """Register a newly uploaded video"""
        print(f"\nRegistering upload: {video_id}")
        print(f"Video path: {path}")
        
        if not path.startswith("http") and not os.path.exists(path):
            print(f"Video file not found: {path}")
            return False
        
        # Add to video sources
        self.video_sources[video_id] = path
        
        # Initialize state, monitoring, and model
        self._init_tank_state(video_id)
        print(f"Loading YOLO model for {video_id}...")
        self.models[video_id] = YOLO(MODEL_PATH)
        self.behavior_analyzers[video_id] = {}
        
        print(f"Upload registered successfully: {video_id}")
        return True

    def generate_frames(self, video_id):
        """Generate MJPEG stream for a specific tank or uploaded video"""
        path = self.video_sources.get(video_id)
        
        if not path:
            print(f"Video ID not found: {video_id}")
            return
        
        if not os.path.exists(path):
            print(f"Video file not found: {video_id} at {path}")
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
            print(f"📦 Loading model for {video_id}...")
            self.models[video_id] = YOLO(MODEL_PATH)
            model = self.models[video_id]

        frame_count = 0
        last_result = None

        print(f"▶️ Streaming {video_id} @ {fps:.1f} FPS ({w}x{h})")

        while cap.isOpened():
            start_time = time.time()
            success, frame = cap.read()

            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            if frame_count % FRAME_SKIP == 0:
                results = model.track(frame, persist=True, conf=0.5, verbose=False)
                if results and len(results) > 0:
                    last_result = results[0]

            if last_result is not None:
                self._process(last_result, frame, video_id, safe_zone, fps, model, w, h)

            frame_count += 1

            small_frame = cv2.resize(frame, (640, int(h * (640 / w))))
            ok, buffer = cv2.imencode(".jpg", small_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ok:
                continue

            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

            elapsed = time.time() - start_time
            wait = frame_duration - elapsed
            if wait > 0:
                time.sleep(wait)

    def _process(self, result, frame, video_id, safe_zone, fps, model, frame_width, frame_height):
        """Process detection results and draw boxes with enhanced analysis"""
        if result.boxes is None:
            return

        names = model.names
        boxes_xywh = result.boxes.xywh.cpu() if result.boxes.xywh is not None else []
        classes = result.boxes.cls.int().cpu().tolist() if result.boxes.cls is not None else []

        ids = None
        if getattr(result.boxes, "id", None) is not None:
            ids = result.boxes.id.int().cpu().tolist()

        frame_species = set()
        frame_statuses = []
        frame_healths = []

        for i, (box, cls) in enumerate(zip(boxes_xywh, classes)):
            x, y, w, h = box
            cx, cy = float(x), float(y)
            bw, bh = float(w), float(h)

            species = names[int(cls)]
            frame_species.add(species)

            tid = int(ids[i]) if ids is not None and i < len(ids) else int(i)

            history = self.states[video_id]["history"][tid]
            history.append((cx, cy))

            if tid not in self.behavior_analyzers[video_id]:
                self.behavior_analyzers[video_id][tid] = EnhancedBehaviorAnalyzer()
            
            analyzer = self.behavior_analyzers[video_id][tid]

            status, color, health, reasons = analyzer.analyze_behavior(
                bbox_width=bw,
                bbox_height=bh,
                center_x=cx,
                center_y=cy,
                history=history,
                fps=fps,
                frame_height=frame_height,
                frame_width=frame_width
            )

            frame_statuses.append(status)
            frame_healths.append(health)

            x1, y1 = int(x - w / 2), int(y - h / 2)
            x2, y2 = int(x + w / 2), int(y + h / 2)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            label = f"{species} - {status}"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 
                       0.5, color, 2)
            
            if reasons and health != "Healthy":
                for idx, reason in enumerate(reasons[:2]):
                    cv2.putText(frame, reason, (x1, y2 + 15 + idx*15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

        self._update_logic(video_id, frame_species, frame_statuses, frame_healths)

    def _update_logic(self, video_id, frame_species, frame_statuses, frame_healths):
        """Update tank state and trigger alerts based on confirmed patterns"""
        monitor = self.monitoring[video_id]

        if any("CRITICAL" in s for s in frame_statuses):
            current_status = "CRITICAL - Floater"
            current_health = "Critical"
        elif any("WARNING" in s for s in frame_statuses):
            current_status = "WARNING - Abnormal"
            current_health = "Concerning"
        else:
            current_status = "Normal"
            current_health = "Healthy"

        monitor["species_buffer"].append(list(frame_species))
        monitor["status_buffer"].append(current_status)
        monitor["health_buffer"].append(current_health)

        if len(monitor["status_buffer"]) >= CONFIRMATION_WINDOW:
            all_s = [s for sub in monitor["species_buffer"] for s in sub]
            counts = Counter(all_s)
            valid_species = [s for s, c in counts.items() 
                           if c > CONFIRMATION_WINDOW * 0.3]
            
            if len(valid_species) > 1:
                species_list = ", ".join(sorted(valid_species))
                self._trigger_alert(
                    video_id, 
                    "species_mixing", 
                    f"Mixed species detected: {species_list}. Separation recommended."
                )
                print(f"🐢 SPECIES MIXING ALERT: {species_list} in {video_id}")
            
            final_species = ", ".join(valid_species) if valid_species else "None"

            critical_count = sum(1 for s in monitor["status_buffer"] 
                               if "CRITICAL" in s)
            warning_count = sum(1 for s in monitor["status_buffer"] 
                              if "WARNING" in s)

            if critical_count > (CONFIRMATION_WINDOW * 0.5):
                final_status = "CRITICAL - Floater"
                final_health = "Critical"
                self._trigger_alert(video_id, "behavior", 
                                  "CRITICAL: Floater hatchling detected")
            elif warning_count > (CONFIRMATION_WINDOW * 0.5):
                final_status = "WARNING - Abnormal"
                final_health = "Concerning"
                self._trigger_alert(video_id, "behavior", 
                                  "WARNING: Abnormal behavior detected")
            else:
                final_status = "Normal"
                final_health = "Healthy"

            self.states[video_id].update({
                "species": final_species,
                "status": final_status,
                "health": final_health
            })
            
            # Update MongoDB for uploaded videos
            if video_id.startswith("upload_"):
                self._update_mongodb_analysis(video_id, final_species, final_status, final_health)

    def _update_mongodb_analysis(self, video_id, species, behavior, health):
        """Update MongoDB with analysis results for uploaded videos"""
        try:
            response = requests.post(
                f"{NODE_API_URL}/api/hatchery/video/{video_id}/analysis",
                json={
                    "species": species,
                    "behavior": behavior,
                    "health": health
                },
                timeout=2
            )
            if response.status_code == 200:
                print(f"MongoDB updated for {video_id}: {species} - {behavior}")
            else:
                print(f"MongoDB update returned {response.status_code}")
        except Exception as e:
            print(f"MongoDB update failed: {e}")

    def _trigger_alert(self, tank_id, alert_type, message):
        """Trigger and save alert to both memory and database"""
        current_time = datetime.now()
        alert_key = f"{tank_id}_{alert_type}"

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

            self.alerts.append(payload)
            
            if len(self.alerts) > 100:
                self.alerts.pop(0)

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
    """Get current stats for a tank or uploaded video"""
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
    """Get in-memory alerts"""
    return jsonify(engine.alerts)

@app.route("/register_upload", methods=["POST"])
def register_upload():
    """Register a newly uploaded video"""
    try:
        d = request.json
        video_id = d.get("videoId")
        video_path = d.get("videoPath")
        
        if not video_id or not video_path:
            return jsonify({"error": "Missing videoId or videoPath"}), 400
        
        success = engine.register_video(video_id, video_path)
        
        if success:
            return jsonify({"status": "registered", "videoId": video_id}), 200
        else:
            return jsonify({"error": "Failed to register video"}), 500
            
    except Exception as e:
        print(f"Error in register_upload: {str(e)}")
        return jsonify({"error": str(e)}), 500

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
    print("Sea Turtle Hatchery AI Monitor")
    print("Multi-Parameter Behavioral Analysis System")
    print("="*50 + "\n")
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
