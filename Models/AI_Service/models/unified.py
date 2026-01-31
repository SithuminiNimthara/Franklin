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

    def process_video(self, video_path, video_filename):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Cannot read video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
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
                    except: pass # Generic model might crash on classes arg if minimal

                # NMS
                final_dets = []
                frame_dets.sort(key=lambda x: x['score'], reverse=True)
                for det in frame_dets:
                    overlap = False
                    for other in final_dets:
                        # Simple IoU
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

                # Nest Logic
                current_turtles = [d for d in final_dets if d['type'] == 'turtle']
                for t_det in current_turtles:
                    matched = False
                    for track in self.turtle_tracks:
                        dist = math.sqrt((t_det['map_x'] - track['last_pos'][0])**2 + (t_det['map_y'] - track['last_pos'][1])**2)
                        if dist < 12.0:
                            track['last_pos'] = (t_det['map_x'], t_det['map_y'])
                            track['last_seen'] = timestamp
                            duration = track['last_seen'] - track['first_seen']
                            move_from_start = math.sqrt((t_det['map_x'] - track['start_pos'][0])**2 + (t_det['map_y'] - track['start_pos'][1])**2)
                            
                            if duration >= NEST_TIME_THRESHOLD and move_from_start <= NEST_MOVEMENT_LIMIT:
                                track['is_nest'] = True
                            elif move_from_start > NEST_MOVEMENT_LIMIT:
                                track['is_nest'] = False
                            
                            if track['is_nest']:
                                t_det['type'] = 'nest'
                                t_det['hasNest'] = True
                            else:
                                t_det['type'] = 'turtle'
                                t_det['hasNest'] = False
                            
                            matched = True
                            break
                    
                    if not matched:
                        self.turtle_tracks.append({
                            'start_pos': (t_det['map_x'], t_det['map_y']),
                            'last_pos': (t_det['map_x'], t_det['map_y']),
                            'first_seen': timestamp,
                            'last_seen': timestamp,
                            'is_nest': False
                        })

                # Cleanup
                self.turtle_tracks = [t for t in self.turtle_tracks if timestamp - t['last_seen'] < 2.0]

                # Post results
                for d in final_dets:
                    dx, dy = d['map_x'] - 50.0, d['map_y'] - 100.0
                    dist_m = round((math.sqrt(dx**2 + dy**2) / 100.0) * 15.0, 2)
                    d['distance_m'] = dist_m
                    
                    if self.node_backend_url:
                        try:
                            payload = {
                                "type": d['type'],
                                "confidence": d['score'],
                                "location": {"zone": "Simulation Zone", "coordinates": {"x": d['map_x'], "y": d['map_y']}},
                                "nestStatus": "safe",
                                "videoSource": video_filename,
                                "details": f"Time: {timestamp:.2f}s, Dist: {dist_m}m"
                            }
                            if d.get('hasNest'):
                                payload['details'] += " (Potential Nest)"
                            
                            requests.post(self.node_backend_url, json=payload, timeout=0.1)
                        except: pass

                results.append({"time": timestamp, "entities": final_dets})

            count += 1

        cap.release()
        return {"duration": total_frames / fps, "data": results}
