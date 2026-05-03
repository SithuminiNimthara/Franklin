import os
import shutil
import uuid
import math
import cv2
import requests
import threading
import queue
import time
import time
from ultralytics import YOLO
from concurrent.futures import ThreadPoolExecutor

# Constants
STATIONARY_THRESHOLD = 2.0
MOVEMENT_THRESHOLD = 5.0
NEST_TIME_THRESHOLD = 3600.0
NEST_MOVEMENT_LIMIT = 10.0

class UnifiedProcessor:
    def __init__(self, models_dir, node_backend_url):
        self.models_dir = models_dir
        self.node_backend_url = node_backend_url
        self.models = {}
        self.turtle_tracks = []
        
        # Parallel Execution for faster inference on CPU
        self.executor = ThreadPoolExecutor(max_workers=3)
        
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

        def run_model(key, model, img):
            try:
                # Different confidence per model
                conf = 0.4
                if key == 'predator':
                    conf = 0.6   # stricter
                if key == 'human':
                    conf = 0.5

                results = model(img, verbose=False, conf=conf, imgsz=320)

                dets = []
                for r in results:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx, by = (x1 + x2) / 2, y2

                        dets.append({
                            "type": key,
                            "score": float(box.conf[0]),
                            "bbox": [x1, y1, x2, y2],
                            "map_x": (cx / orig_w) * 100,
                            "map_y": (by / orig_h) * 100
                        })
                return dets
            except Exception as e:
                print(f"Inference error ({key}): {e}")
                return []

        # Load models
        model_t = self.load_model('turtle')
        model_p = self.load_model('predator')
        model_h = self.load_model('human')

        # Parallel inference
        futures = []
        if model_t:
            futures.append(self.executor.submit(run_model, 'turtle', model_t, frame))
        if model_p:
            futures.append(self.executor.submit(run_model, 'predator', model_p, frame))
        if model_h:
            futures.append(self.executor.submit(run_model, 'human', model_h, frame))

        frame_dets = []
        for f in futures:
            frame_dets.extend(f.result())

        # ----------------------------
        # STEP 1: SORT BY CONFIDENCE
        # ----------------------------
        frame_dets.sort(key=lambda x: x['score'], reverse=True)

        # ----------------------------
        # STEP 2: CLASS-AWARE NMS
        # ----------------------------
        final_dets = []

        for det in frame_dets:
            keep = True
            for other in final_dets:
                b1 = det['bbox']
                b2 = other['bbox']

                x_left = max(b1[0], b2[0])
                y_top = max(b1[1], b2[1])
                x_right = min(b1[2], b2[2])
                y_bottom = min(b1[3], b2[3])

                if x_right > x_left and y_bottom > y_top:
                    inter = (x_right - x_left) * (y_bottom - y_top)
                    area1 = (b1[2]-b1[0])*(b1[3]-b1[1])
                    area2 = (b2[2]-b2[0])*(b2[3]-b2[1])
                    iou = inter / (area1 + area2 - inter)

                    # SAME CLASS → normal suppression
                    if det['type'] == other['type'] and iou > 0.5:
                        keep = False
                        break

                    # DIFFERENT CLASS → priority logic
                    if iou > 0.4:
                        # Turtle has highest priority
                        if other['type'] == 'turtle':
                            keep = False
                            break

            if keep:
                final_dets.append(det)

        # ----------------------------
        # STEP 3: EXTRA FILTER
        # If turtle exists → remove overlapping predator/human
        # ----------------------------
        turtles = [d for d in final_dets if d['type'] == 'turtle']

        filtered = []
        for det in final_dets:
            if det['type'] in ['predator', 'human']:
                suppress = False

                for t in turtles:
                    b1 = det['bbox']
                    b2 = t['bbox']

                    x_left = max(b1[0], b2[0])
                    y_top = max(b1[1], b2[1])
                    x_right = min(b1[2], b2[2])
                    y_bottom = min(b1[3], b2[3])

                    if x_right > x_left and y_bottom > y_top:
                        inter = (x_right - x_left) * (y_bottom - y_top)
                        area1 = (b1[2]-b1[0])*(b1[3]-b1[1])
                        area2 = (b2[2]-b2[0])*(b2[3]-b2[1])
                        iou = inter / (area1 + area2 - inter)

                        if iou > 0.3:
                            suppress = True
                            break

                if suppress:
                    continue

            filtered.append(det)

        final_dets = filtered

        # ----------------------------
        # DRAWING + EXISTING LOGIC
        # ----------------------------
        annotated_frame = frame.copy()

        for d in final_dets:
            x1, y1, x2, y2 = [int(v) for v in d['bbox']]

            if d['type'] == 'turtle':
                color = (0, 255, 0)
            elif d['type'] == 'predator':
                color = (0, 0, 255)
            elif d['type'] == 'human':
                color = (255, 0, 0)
            else:
                color = (255, 255, 0)

            label = f"{d['type']} {d['score']:.2f}"

            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated_frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

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
