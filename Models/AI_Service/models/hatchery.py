import cv2
import numpy as np
import os
import requests
import time
from datetime import datetime
from ultralytics import YOLO
from collections import defaultdict, deque, Counter



PIXELS_PER_CM = 25.0
CONFIRMATION_WINDOW = 45
SURFACE_FLOAT_THRESHOLD = 0.30
LATERAL_TILT_ANGLE_MIN = 0.7
LATERAL_TILT_ANGLE_MAX = 1.3
MIN_DIVE_ATTEMPTS = 3
SPEED_VARIANCE_THRESHOLD = 0.4
BL_SPEED_THRESHOLD = 0.3
ALERT_COOLDOWN_SECONDS = 300



class EnhancedBehaviorAnalyzer:
    def __init__(self):
        self.depth_history = deque(maxlen=300)
        self.surface_time_ratio = deque(maxlen=1800)
        self.tilt_history = deque(maxlen=300)
        self.dive_attempts = deque(maxlen=1800)
        self.movement_patterns = deque(maxlen=3600)


    def analyze_behavior(self, bbox_width, bbox_height, center_x, center_y, history, fps, frame_height, frame_width):
        floater_score = 0
        reasons = []

        y_ratio = center_y / frame_height
        size_score = (bbox_width * bbox_height) / (frame_height * frame_height * 0.25)
        relative_depth = (1 - y_ratio) * 0.7 + min(size_score, 1.0) * 0.3
        self.depth_history.append(relative_depth)

        is_at_surface = relative_depth < 0.3
        self.surface_time_ratio.append(is_at_surface)
        if len(self.surface_time_ratio) >= 60:
            surface_percentage = sum(self.surface_time_ratio) / len(self.surface_time_ratio)
            if surface_percentage > SURFACE_FLOAT_THRESHOLD:
                floater_score += 3
                reasons.append(f"Surface: {surface_percentage:.1%}")

        aspect_ratio = bbox_width / (bbox_height + 1e-6)
        tilt = 1 if (aspect_ratio < LATERAL_TILT_ANGLE_MIN or aspect_ratio > LATERAL_TILT_ANGLE_MAX) else 0
        self.tilt_history.append(tilt)
        if len(self.tilt_history) >= 60:
            if sum(self.tilt_history) > (len(self.tilt_history) * 0.6):
                floater_score += 3
                reasons.append("Lateral tilt")

        if len(history) >= 30:
            speeds = []
            for i in range(len(history) - 10):
                dist = np.linalg.norm(np.array(history[i+10]) - np.array(history[i]))
                speeds.append((dist / PIXELS_PER_CM) / (10 / fps))
            if speeds and (np.std(speeds) / (np.mean(speeds) + 1e-6)) < SPEED_VARIANCE_THRESHOLD:
                floater_score += 2
                reasons.append("Low variance")

        if len(history) >= 5:
            recent_y = [pos[1] for pos in list(history)[-5:]]
            dive = 1 if abs(recent_y[-1] - recent_y[0]) > 20 else 0
            self.dive_attempts.append(dive)
            if len(self.dive_attempts) >= 60 * fps:
                rate = sum(self.dive_attempts[-int(60*fps):]) / 60.0 * fps
                if rate < MIN_DIVE_ATTEMPTS:
                    floater_score += 2
                    reasons.append("Low dive rate")

        bl_cm = max(bbox_width, bbox_height) / PIXELS_PER_CM
        if len(history) >= 10:
            dist = sum(np.linalg.norm(np.array(history[i]) - np.array(history[i-1])) for i in range(1, len(history)))
            speed_bl_s = ((dist / PIXELS_PER_CM) / (len(history) / fps)) / (bl_cm + 0.1)
            if speed_bl_s < BL_SPEED_THRESHOLD:
                floater_score += 1
                reasons.append("Low speed")

        if floater_score >= 5:
            return "CRITICAL - Floater", (0, 0, 255), "Critical", reasons
        if floater_score >= 3:
            return "WARNING - Abnormal", (0, 140, 255), "Concerning", reasons
        return "Normal", (0, 255, 0), "Healthy", reasons



class HatcheryEngine:
    def __init__(self, model_path, node_api_url):
        self.model_path = model_path
        self.node_api_url = node_api_url
        self.model = YOLO(model_path)
        self.video_sources = {} 
        self.states = {}
        self.monitoring = {}
        self.alerts = []
        self.last_alert_time = {}
        self.behavior_analyzers = {}
        self._frame_count = {}
        self.last_confirmed = {}


# Default values before detection starts
    def init_state(self, vid):
        self.states[vid] = {
            "status": "Initializing",
            "health": "Unknown",
            "species": "Detecting...",
            "history": defaultdict(lambda: deque(maxlen=60))  #Stores trajectory (movement) of each turtle
        }
        self.monitoring[vid] = {
            "species_buffer": deque(maxlen=CONFIRMATION_WINDOW),
            "status_buffer": deque(maxlen=CONFIRMATION_WINDOW),
            "health_buffer": deque(maxlen=CONFIRMATION_WINDOW)
        }
        self.behavior_analyzers[vid] = {}
        self.last_confirmed[vid] = {   #Each turtle gets its own analyzer object later
            "species_key": None,
            "status": None
        }


    def register_video(self, vid, path):
        self.video_sources[vid] = path
        self.init_state(vid)
        return True

# If video is new, initialize it
    def process_frame(self, frame, vid, fps):
        if vid not in self.states:
            self.init_state(vid)

        f_species, f_status, f_health = set(), [], []
        h, w = frame.shape[:2]

        results = None
        try:
            results = self.model.track(frame, persist=True, conf=0.5, verbose=False)  #Run YOLOv8 tracking:* track()- detects + assigns IDs to turtles,* persist=True-keeps same ID across frames,* conf=0.5-confidence threshold
        except Exception as e:
            print(f"Tracking error for {vid}: {e}")

        if results and results[0].boxes is not None:
            r = results[0]
            boxes = r.boxes.xywh.cpu()
            classes = r.boxes.cls.int().cpu().tolist()
            ids = r.boxes.id.int().cpu().tolist() if r.boxes.id is not None else range(len(boxes))

            for i, (box, cls) in enumerate(zip(boxes, classes)):
                x, y, bw, bh = box
                species = self.model.names[int(cls)]
                f_species.add(species)
                tid = int(ids[i])

                history = self.states[vid]["history"][tid]
                history.append((float(x), float(y)))

                if tid not in self.behavior_analyzers[vid]:
                    self.behavior_analyzers[vid][tid] = EnhancedBehaviorAnalyzer()

                status, color, health, reasons = self.behavior_analyzers[vid][tid].analyze_behavior(
                    float(bw), float(bh), float(x), float(y), history, fps, h, w
                )
                f_status.append(status)
                f_health.append(health)

                x1, y1 = int(x - bw/2), int(y - bh/2)
                cv2.rectangle(frame, (x1, y1), (int(x + bw/2), int(y + bh/2)), color, 2)
                cv2.putText(frame, f"{species}-{status}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        self.update_logic(vid, f_species, f_status, f_health)

        self._frame_count[vid] = self._frame_count.get(vid, 0) + 1
        if self._frame_count[vid] % 100 == 0:
            print(f"Processed {self._frame_count[vid]} frames for {vid}. Health: {self.states[vid]['health']}")

        return frame


    def update_logic(self, vid, f_species, f_status, f_health):
        m = self.monitoring[vid]
        lc = self.last_confirmed[vid]

        curr_status = (
            "CRITICAL - Floater" if any("CRITICAL" in s for s in f_status)
            else "WARNING - Abnormal" if any("WARNING" in s for s in f_status)
            else "Normal"
        )
        curr_health = (
            "Critical" if "CRITICAL" in curr_status
            else "Concerning" if "WARNING" in curr_status
            else "Healthy"
        )

        m["species_buffer"].append(list(f_species))
        m["status_buffer"].append(curr_status)
        m["health_buffer"].append(curr_health)

        if len(m["status_buffer"]) >= CONFIRMATION_WINDOW:
            all_s = [s for sub in m["species_buffer"] for s in sub]
            valid = [s for s, c in Counter(all_s).items() if c > CONFIRMATION_WINDOW * 0.3]

            crit = sum(1 for s in m["status_buffer"] if "CRITICAL" in s)
            warn = sum(1 for s in m["status_buffer"] if "WARNING" in s)

            final_s = (
                "CRITICAL - Floater" if crit > CONFIRMATION_WINDOW * 0.5
                else "WARNING - Abnormal" if warn > CONFIRMATION_WINDOW * 0.5
                else "Normal"
            )
            final_h = (
                "Critical" if "CRITICAL" in final_s
                else "Concerning" if "WARNING" in final_s
                else "Healthy"
            )

            self.states[vid].update({
                "species": ", ".join(valid) if valid else "None",
                "status": final_s,
                "health": final_h
            })

            # Uploaded video — always push analysis update
            if vid.startswith("upload_") and self.node_api_url:
                self.trigger_node_update(vid, self.states[vid]["species"], final_s, final_h)

            # Live tank — alert ONLY on state change
            if not vid.startswith("upload_") and self.node_api_url:
                new_species_key = frozenset(valid)

                if new_species_key != lc["species_key"]:
                    if len(valid) > 1:
                        sent = self.trigger_alert(
                            vid, "species_mixing",
                            f"Mixed species detected in {vid}: {', '.join(valid)}. Separation recommended."
                        )
                        if sent:
                            lc["species_key"] = new_species_key
                    else:
                        lc["species_key"] = new_species_key

                if final_s != lc["status"]:
                    lc["status"] = final_s
                    if final_s == "CRITICAL - Floater":
                        self.trigger_alert(
                            vid, "behavior",
                            f"CRITICAL: Floater hatchling detected in {vid}. Immediate attention required."
                        )
                    elif final_s == "WARNING - Abnormal":
                        self.trigger_alert(
                            vid, "behavior",
                            f"WARNING: Abnormal behavior detected in {vid}. Please inspect."
                        )


    def trigger_alert(self, vid, alert_type, message):
        current_time = datetime.now()
        alert_key = f"{vid}_{alert_type}"

        if alert_key in self.last_alert_time:
            elapsed = (current_time - self.last_alert_time[alert_key]).total_seconds()
            if elapsed < ALERT_COOLDOWN_SECONDS:
                print(f"[COOLDOWN] Alert suppressed for {alert_key}, {elapsed:.0f}s elapsed")
                return False

        payload = {
            "type": alert_type,
            "message": message,
            "tank": vid,
            "location": f"Hatchery Section {vid[-1].upper()}",
            "status": "pending",
            "createdAt": current_time.isoformat()
        }

        try:
            response = requests.post(
                f"{self.node_api_url}/alerts/new",
                json=payload,
                timeout=2
            )
            if response.status_code == 201:
                print(f"[ALERT SENT] {vid} - {message}")
                self.last_alert_time[alert_key] = current_time
                return True
            else:
                print(f"[ALERT FAILED] {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"[ALERT ERROR] {e}")
            return False


    def trigger_node_update(self, vid, species, behavior, health):
        try:                                                        
            response = requests.post(
                f"{self.node_api_url}/video/{vid}/analysis",
                json={"species": species, "behavior": behavior, "health": health},
                timeout=2
            )
            print(f"[UPDATE] {vid} → {response.status_code} {species} {behavior}")
        except Exception as e:
            print(f"[UPDATE ERROR] {e}")