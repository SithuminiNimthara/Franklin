import os
import shutil
import uuid
import math
import cv2
import requests
from ultralytics import YOLO

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
        self.ensure_models()

    def ensure_models(self):
        # In this merged setup, we assume models are present or copied during build
        # We will load them on demand or startup
        pass

    def load_model(self, key):
        if key not in self.models:
            path = os.path.join(self.models_dir, f"{key}.pt")
            if os.path.exists(path):
                print(f"Loading {key} model from {path}")
                try:
                    self.models[key] = YOLO(path)
                except Exception as e:
                    print(f"Error loading {key}: {e}")
                    return None
            else:
                # Fallback for demo/dev if files missing
                if key == "human": 
                    print("Loading generic yolov8n for human")
                    self.models[key] = YOLO("yolov8n.pt") 
                else:
                    return None
        return self.models[key]

    def process_frame(self, frame, source_id="live"):
        if frame is None:
            return frame, []

        height, width = frame.shape[:2]
        frame_dets = []

        # 1. Turtle
        model_t = self.load_model('turtle')
        if model_t:
            res = model_t(frame, verbose=False, conf=0.5)
            for r in res:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cx, by = (x1 + x2) / 2, y2
                    mx, my = (cx / width) * 100, (by / height) * 100
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
            res = model_p(frame, verbose=False, conf=0.5)
            for r in res:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cx, by = (x1 + x2) / 2, y2
                    frame_dets.append({
                        "type": "predator",
                        "score": float(box.conf[0]),
                        "bbox": [x1, y1, x2, y2],
                        "map_x": (cx / width) * 100,
                        "map_y": (by / height) * 100
                    })

        # 3. Human
        model_h = self.load_model('human')
        if model_h:
            try:
                res = model_h(frame, verbose=False, conf=0.5, classes=[0])
                for r in res:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        cx, by = (x1 + x2) / 2, y2
                        frame_dets.append({
                            "type": "human",
                            "score": float(box.conf[0]),
                            "bbox": [x1, y1, x2, y2],
                            "map_x": (cx / width) * 100,
                            "map_y": (by / height) * 100
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

        # Drawing & Posting results
        annotated_frame = frame.copy()
        for d in final_dets:
            # Draw on frame
            x1, y1, x2, y2 = [int(v) for v in d['bbox']]
            color = (0, 255, 0) if d['type'] == 'turtle' else (0, 0, 255) if d['type'] == 'predator' else (255, 0, 0)
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated_frame, f"{d['type']} {d['score']:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            # Post Detections to Backend
            if self.node_backend_url:
                try:
                    payload = {
                        "type": d['type'],
                        "confidence": d['score'],
                        "location": {"zone": f"Camera {source_id}", "coordinates": {"x": d['map_x'], "y": d['map_y']}},
                        "nestStatus": "safe",
                        "videoSource": source_id,
                        "isLive": True
                    }
                    requests.post(self.node_backend_url, json=payload, timeout=0.2)
                except: pass

        return annotated_frame, final_dets

    def process_video(self, video_path, video_filename):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Cannot read video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        results = []
        step = 5
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
