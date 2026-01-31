from dataclasses import dataclass
from ultralytics import YOLO
import numpy as np
import cv2
import base64

@dataclass
class ShorelineSettings:
    model_path: str
    conf: float = 0.25
    img_size: int = 640
    device: str = "cpu"

def _moving_average(arr: np.ndarray, win: int = 11) -> np.ndarray:
    if arr.size == 0: return arr
    win = max(3, int(win))
    if win % 2 == 0: win += 1
    if arr.size < win: return arr
    kernel = np.ones(win, dtype=np.float32) / win
    return np.convolve(arr, kernel, mode="same")

def mask_to_base64_png(mask_bin: np.ndarray) -> str:
    if mask_bin is None or mask_bin.size == 0: return ""
    png = (mask_bin * 255).astype(np.uint8)
    ok, buf = cv2.imencode(".png", png)
    return base64.b64encode(buf.tobytes()).decode("utf-8") if ok else ""

def mask_to_shoreline_polyline(mask: np.ndarray, max_points: int = 180) -> list:
    H, W = mask.shape[:2]
    if mask.sum() == 0: return []
    xs = np.linspace(0, W - 1, num=min(max_points, W), dtype=np.int32)
    pts = []
    for x in xs:
        ys = np.where(mask[:, x] > 0)[0]
        if ys.size > 0: pts.append((float(x), float(np.max(ys))))
    if len(pts) < 15: return []
    yvals = np.array([p[1] for p in pts], dtype=np.float32)
    lo, hi = np.percentile(yvals, [5, 95])
    pts = [(x, y) for (x, y) in pts if lo <= y <= hi]
    if len(pts) < 10: return []
    y_sm = _moving_average(np.array([p[1] for p in pts], dtype=np.float32), win=11)
    return [{"x": float(x), "y": float(y)} for (x, y) in zip([p[0] for p in pts], y_sm)]

class ShorelineModel:
    def __init__(self, settings: ShorelineSettings):
        self.settings = settings
        self.model = YOLO(settings.model_path)

    def predict(self, bgr_img: np.ndarray):
        img_h, img_w = bgr_img.shape[:2]
        results = self.model.predict(source=bgr_img, conf=self.settings.conf, imgsz=self.settings.img_size, device=self.settings.device, verbose=False)
        r0 = results[0]
        if not hasattr(r0, "masks") or r0.masks is None: return [], 0.0, ""
        
        masks = r0.masks.data
        if masks is None or len(masks) == 0: return [], 0.0, ""
        
        det_idx = 0
        conf = 0.0
        if hasattr(r0, "boxes") and r0.boxes is not None:
            confs = r0.boxes.conf
            if confs is not None and len(confs) > 0:
                det_idx = int(np.argmax(confs.cpu().numpy()))
                conf = float(confs[det_idx].cpu().numpy())

        mask = masks[det_idx].cpu().numpy()
        mask_bin = (mask > 0.5).astype(np.uint8)
        if mask_bin.shape[0] != img_h or mask_bin.shape[1] != img_w:
            mask_bin = cv2.resize(mask_bin, (img_w, img_h), interpolation=cv2.INTER_NEAREST)

        return mask_to_shoreline_polyline(mask_bin), conf, mask_to_base64_png(mask_bin)

def compute_risk(points: list, img_h: int) -> tuple:
    if not points: return "medium", ["No shoreline detected."]
    ys = [p["y"] for p in points]
    avg_y = float(np.mean(ys))
    if avg_y < img_h * 0.35: return "high", ["Shoreline inland (high runup)."]
    if avg_y < img_h * 0.55: return "medium", ["Moderate shoreline position."]
    return "low", ["Shoreline near sea (low runup)."]
