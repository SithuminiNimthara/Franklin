import os
import shutil
import uuid
import math
import cv2
import requests
import threading
import queue
import time
from ultralytics import YOLO

# Constants
STATIONARY_THRESHOLD = 2.0
MOVEMENT_THRESHOLD = 5.0
NEST_TIME_THRESHOLD = 1.0
NEST_MOVEMENT_LIMIT = 10.0

class UnifiedProcessor:
    def __init__(self, models_dir, node_backend_url):
        self.models_dir = models_dir
        self.node_backend_url = node_backend_url
        self.models = {}
        self.turtle_tracks = []
        
        # Background Reporting Queue
        self.report_queue = queue.Queue(maxsize=100)
        self.stop_reporting = False
        self.reporting_thread = threading.Thread(target=self._reporting_worker, daemon=True)
        self.reporting_thread.start()
        
        self.ensure_models()

    def _reporting_worker(self):
        """Background thread to handle network requests without blocking AI inference."""
        session = requests.Session()
        print("🚀 Detection reporting worker started")
        while not self.stop_reporting:
            try:
                payload = self.report_queue.get(timeout=1.0)
                if self.node_backend_url:
                    try:
                        session.post(self.node_backend_url, json=payload, timeout=0.5)
                    except Exception as e:
                        # Silently fail network errors to keep AI running
                        pass
                self.report_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Reporting worker error: {e}")

    def ensure_models(self):
        # Models are loaded lazily in load_model
        pass

    def load_model(self, key):
        if key not in self.models:
            path = os.path.join(self.models_dir, f"{key}.pt")
            if os.path.exists(path):
                print(f"Loading {key} model from {path}")
                try:
                    # Load model and potentially move to GPU if available
                    model = YOLO(path)
                    self.models[key] = model
                except Exception as e:
                    print(f"Error loading {key}: {e}")
                    return None
            else:
                if key == "human": 
                    print("Loading generic yolov8n for human")
                    self.models[key] = YOLO("yolov8n.pt") 
                else:
                    return None
        return self.models[key]

    def process_frame(self, frame, source_id="live"):
        if frame is None:
            return frame, []

        orig_h, orig_w = frame.shape[:2]
        
        # AI Internal Resize for speed (YOLO usually uses 640x640)
        # We don't resize the 'annotated_frame' back yet, we draw on the original or a copy
        frame_dets = []

        # 1. Turtle
        model_t = self.load_model('turtle')
        if model_t:
            # Setting imgsz to 320 for even faster inference if needed, but 640 is standard
            res = model_t(frame, verbose=False, conf=0.4, imgsz=640)
            for r in res:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cx, by = (x1 + x2) / 2, y2
                    mx, my = (cx / orig_w) * 100, (by / orig_h) * 100
                    frame_dets.append({
                        "type": "turtle",
                        "score": float(box.conf[0]),
                        "bbox": [x1, y1, x2, y2],
                        "map_x": mx,
                        "map_y": my
                    })

        # 2. Predator
        model_p = self.load_model('predator')
        if model_p:
            res = model_p(frame, verbose=False, conf=0.4, imgsz=640)
            for r in res:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cx, by = (x1 + x2) / 2, y2
                    frame_dets.append({
                        "type": "predator",
                        "score": float(box.conf[0]),
                        "bbox": [x1, y1, x2, y2],
                        "map_x": (cx / orig_w) * 100,
                        "map_y": (by / orig_h) * 100
                    })

        # 3. Human
        model_h = self.load_model('human')
        if model_h:
            try:
                # Class 0 is human in standard YOLO
                res = model_h(frame, verbose=False, conf=0.4, classes=[0], imgsz=640)
                for r in res:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx, by = (x1 + x2) / 2, y2
                        frame_dets.append({
                            "type": "human",
                            "score": float(box.conf[0]),
                            "bbox": [x1, y1, x2, y2],
                            "map_x": (cx / orig_w) * 100,
                            "map_y": (by / orig_h) * 100
                        })
            except: pass

        # NMS
        final_dets = []
        frame_dets.sort(key=lambda x: x['score'], reverse=True)
        for det in frame_dets:
            overlap = False
            for other in final_dets:
                b1 = det['bbox']
                b2 = other['bbox']
                # Fast IOU
                x_left = max(b1[0], b2[0])
                y_top = max(b1[1], b2[1])
                x_right = min(b1[2], b2[2])
                y_bottom = min(b1[3], b2[3])
                if x_right > x_left and y_bottom > y_top:
                    inter = (x_right - x_left) * (y_bottom - y_top)
                    area1 = (b1[2]-b1[0])*(b1[3]-b1[1])
                    area2 = (b2[2]-b2[0])*(b2[3]-b2[1])
                    iou = inter / (area1 + area2 - inter)
                    if iou > 0.5:
                        overlap = True
                        break
            if not overlap:
                final_dets.append(det)

        now = time.time()
        annotated_frame = frame.copy()
        
        current_turtles = [d for d in final_dets if d['type'] == 'turtle']
        
        # Match existing tracks for nesting logic
        for turtle in current_turtles:
            matched = False
            for track in self.turtle_tracks:
                dist = math.sqrt((track['x'] - turtle['map_x'])**2 + (track['y'] - turtle['map_y'])**2)
                if dist < 2.0: # 2m threshold
                    track['last_seen'] = now
                    track['x'] = (track['x'] * 0.9) + (turtle['map_x'] * 0.1)
                    track['y'] = (track['y'] * 0.9) + (turtle['map_y'] * 0.1)

                    duration = now - track['start_time']
                    if duration >= NEST_TIME_THRESHOLD:
                         final_dets.append({
                             "type": "nest",
                             "score": 1.0,
                             "bbox": turtle['bbox'],
                             "map_x": track['x'],
                             "map_y": track['y'],
                             "is_ai_nest": True
                         })
                    matched = True
                    break
            
            if not matched:
                self.turtle_tracks.append({
                    "x": turtle['map_x'],
                    "y": turtle['map_y'],
                    "start_time": now,
                    "last_seen": now
                })

        self.turtle_tracks = [t for t in self.turtle_tracks if (now - t['last_seen']) < 15]

        # Tracking for Reporting Deduplication
        if not hasattr(self, 'last_reported'):
            self.last_reported = {} # {type: {pos: (x,y), time: t}}

        for d in final_dets:
            # Draw
            x1, y1, x2, y2 = [int(v) for v in d['bbox']]
            color = (0, 255, 0) if d['type'] == 'turtle' else (0, 0, 255) if d['type'] == 'predator' else (255, 0, 0)
            if d['type'] == 'nest': color = (255, 255, 0)
            
            label = f"{d['type']} {d['score']:.2f}"
            if d.get('is_ai_nest'): label = "NESTING TURTLE"
            
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            # Reporting Deduplication Logic:
            # Only report if:
            # 1. It's a predator or human (higher priority)
            # 2. It has moved more than 5 units
            # 3. Or it's been more than 2 seconds since last report of this type
            
            should_report = False
            dtype = d['type']
            dx, dy = d['map_x'], d['map_y']
            
            if dtype not in self.last_reported:
                should_report = True
            else:
                last = self.last_reported[dtype]
                dist = math.sqrt((dx - last['x'])**2 + (dy - last['y'])**2)
                time_since = now - last['time']
                
                if dist > 5.0 or time_since > 2.0:
                    should_report = True
            
            if should_report and not self.report_queue.full():
                self.last_reported[dtype] = {'x': dx, 'y': dy, 'time': now}
                payload = {
                    "type": d['type'],
                    "confidence": d['score'],
                    "location": {"zone": f"Camera {source_id}", "coordinates": {"x": d['map_x'], "y": d['map_y']}},
                    "nestStatus": "safe",
                    "videoSource": source_id,
                    "isLive": True,
                    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                    "details": "AI DETECTED NESTER" if d.get('is_ai_nest') else ""
                }
                self.report_queue.put(payload)

        return annotated_frame, final_dets

    def process_video(self, video_path, video_filename):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Cannot read video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        results = []
        step = 5 # Increase step for video processing to be faster
        count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if count % step == 0:
                timestamp = count / fps
                _, final_dets = self.process_frame(frame, source_id=video_filename)
                results.append({"time": timestamp, "entities": final_dets})

            count += 1

        cap.release()
        return {"duration": total_frames / fps, "data": results}
