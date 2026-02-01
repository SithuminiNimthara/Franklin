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
                    reasons.append(f"Low dive rate")
        
        bl_cm = max(bbox_width, bbox_height) / PIXELS_PER_CM
        if len(history) >= 10:
            dist = sum(np.linalg.norm(np.array(history[i]) - np.array(history[i-1])) for i in range(1, len(history)))
            speed_bl_s = ((dist / PIXELS_PER_CM) / (len(history) / fps)) / (bl_cm + 0.1)
            if speed_bl_s < BL_SPEED_THRESHOLD:
                floater_score += 1
                reasons.append(f"Low speed")
        
        if floater_score >= 5: return "CRITICAL - Floater", (0, 0, 255), "Critical", reasons
        if floater_score >= 3: return "WARNING - Abnormal", (0, 140, 255), "Concerning", reasons
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

    def init_state(self, vid):
        self.states[vid] = {"status": "Initializing", "health": "Unknown", "species": "Detecting...", "history": defaultdict(lambda: deque(maxlen=60))}
        self.monitoring[vid] = {"species_buffer": deque(maxlen=CONFIRMATION_WINDOW), "status_buffer": deque(maxlen=CONFIRMATION_WINDOW), "health_buffer": deque(maxlen=CONFIRMATION_WINDOW)}
        self.behavior_analyzers[vid] = {}

    def register_video(self, vid, path):
        self.video_sources[vid] = path
        self.init_state(vid)
        return True

    def process_frame(self, frame, vid, fps):
        if vid not in self.states: self.init_state(vid)
        results = self.model.track(frame, persist=True, conf=0.5, verbose=False)
        if not results: return frame
        
        r = results[0]
        if r.boxes is None: return frame
        
        boxes = r.boxes.xywh.cpu()
        classes = r.boxes.cls.int().cpu().tolist()
        ids = r.boxes.id.int().cpu().tolist() if r.boxes.id is not None else range(len(boxes))
        
        f_species, f_status, f_health = set(), [], []
        h, w = frame.shape[:2]
        
        for i, (box, cls) in enumerate(zip(boxes, classes)):
            x, y, bw, bh = box
            species = self.model.names[int(cls)]
            f_species.add(species)
            tid = int(ids[i])
            
            history = self.states[vid]["history"][tid]
            history.append((float(x), float(y)))
            
            if tid not in self.behavior_analyzers[vid]: self.behavior_analyzers[vid][tid] = EnhancedBehaviorAnalyzer()
            status, color, health, reasons = self.behavior_analyzers[vid][tid].analyze_behavior(float(bw), float(bh), float(x), float(y), history, fps, h, w)
            f_status.append(status)
            f_health.append(health)
            
            x1, y1 = int(x - bw/2), int(y - bh/2)
            cv2.rectangle(frame, (x1, y1), (int(x+bw/2), int(y+bh/2)), color, 2)
            cv2.putText(frame, f"{species}-{status}", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
        self.update_logic(vid, f_species, f_status, f_health)
        return frame

    def update_logic(self, vid, f_species, f_status, f_health):
        m = self.monitoring[vid]
        curr_status = "CRITICAL - Floater" if any("CRITICAL" in s for s in f_status) else ("WARNING - Abnormal" if any("WARNING" in s for s in f_status) else "Normal")
        curr_health = "Critical" if "CRITICAL" in curr_status else ("Concerning" if "WARNING" in curr_status else "Healthy")
        
        m["species_buffer"].append(list(f_species))
        m["status_buffer"].append(curr_status)
        m["health_buffer"].append(curr_health)
        
        if len(m["status_buffer"]) >= CONFIRMATION_WINDOW:
            all_s = [s for sub in m["species_buffer"] for s in sub]
            valid = [s for s, c in Counter(all_s).items() if c > CONFIRMATION_WINDOW * 0.3]
            
            crit = sum(1 for s in m["status_buffer"] if "CRITICAL" in s)
            warn = sum(1 for s in m["status_buffer"] if "WARNING" in s)
            
            final_s = "CRITICAL - Floater" if crit > CONFIRMATION_WINDOW*0.5 else ("WARNING - Abnormal" if warn > CONFIRMATION_WINDOW*0.5 else "Normal")
            final_h = "Critical" if "CRITICAL" in final_s else ("Concerning" if "WARNING" in final_s else "Healthy")
            
            self.states[vid].update({"species": ", ".join(valid) if valid else "None", "status": final_s, "health": final_h})
            if vid.startswith("upload_") and self.node_api_url:
                self.trigger_node_update(vid, self.states[vid]["species"], final_s, final_h)

    def trigger_node_update(self, vid, species, behavior, health):
        try: # Fire and forget
            requests.post(f"{self.node_api_url}/video/{vid}/analysis", json={"species": species, "behavior": behavior, "health": health}, timeout=0.1)
        except: pass
