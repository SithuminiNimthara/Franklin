from dataclasses import dataclass
from ultralytics import YOLO
import numpy as np
import cv2
import base64  # ✅ NEW


@dataclass
class Settings:
    model_path: str
    conf: float
    img_size: int
    device: str


def _moving_average(arr: np.ndarray, win: int = 11) -> np.ndarray:
    if arr.size == 0:
        return arr
    win = max(3, int(win))
    if win % 2 == 0:
        win += 1
    if arr.size < win:
        return arr
    kernel = np.ones(win, dtype=np.float32) / win
    return np.convolve(arr, kernel, mode="same")


def mask_to_base64_png(mask_bin: np.ndarray) -> str:
    """
    Convert a binary mask (0/1) to base64 encoded PNG (no data:image prefix).
    This lets frontend render:  data:image/png;base64,<mask_png_b64>
    """
    if mask_bin is None or mask_bin.size == 0:
        return ""

    png = (mask_bin * 255).astype(np.uint8)
    ok, buf = cv2.imencode(".png", png)
    if not ok:
        return ""

    return base64.b64encode(buf.tobytes()).decode("utf-8")


def mask_to_shoreline_polyline(mask: np.ndarray, max_points: int = 180) -> list[tuple[float, float]]:
    """
    Convert a THICK shoreline band mask into a SINGLE shoreline polyline.

    ✅ We extract the LANDWARD edge = bottom edge of band
    because that's the risky side towards nests.

    mask: (H, W) binary {0,1}
    returns: [(x_px, y_px), ...] sorted by x
    """
    H, W = mask.shape[:2]
    if mask.sum() == 0:
        return []

    xs = np.linspace(0, W - 1, num=min(max_points, W), dtype=np.int32)
    pts: list[tuple[float, float]] = []

    for x in xs:
        ys = np.where(mask[:, x] > 0)[0]
        if ys.size == 0:
            continue
        y = float(np.max(ys))  # ✅ landward (bottom-most) edge
        pts.append((float(x), y))

    if len(pts) < 15:
        return []

    # remove unstable left/right edges (common segmentation noise)
    if len(pts) > 40:
        pts = pts[5:-5]

    # remove spikes (outliers)
    yvals = np.array([p[1] for p in pts], dtype=np.float32)
    lo, hi = np.percentile(yvals, [5, 95])
    pts = [(x, y) for (x, y) in pts if lo <= y <= hi]
    if len(pts) < 10:
        return []

    # smooth curve
    y_sm = _moving_average(np.array([p[1] for p in pts], dtype=np.float32), win=11)
    out = [(float(x), float(y)) for (x, y) in zip([p[0] for p in pts], y_sm)]

    out.sort(key=lambda p: p[0])
    return out


class ShorelineModel:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = YOLO(settings.model_path)

    def predict(self, bgr_img: np.ndarray):
        """
        YOLOv8-seg prediction.

        Returns:
          shoreline_points: [{x,y,conf}, ...] in PIXELS (polyline)
          shoreline_conf: float
          mask_png_b64: str (base64 PNG of segmentation mask, resized to original image size)
        """
        img_h, img_w = bgr_img.shape[:2]

        results = self.model.predict(
            source=bgr_img,
            conf=self.settings.conf,
            imgsz=self.settings.img_size,
            device=self.settings.device,
            verbose=False,
        )
        r0 = results[0]

        # ✅ segmentation masks live here
        if getattr(r0, "masks", None) is None or r0.masks is None:
            return [], 0.0, ""

        masks = r0.masks.data  # tensor (n, h, w)
        if masks is None or len(masks) == 0:
            return [], 0.0, ""

        # choose best detection by box confidence
        det_idx = 0
        shoreline_conf = 0.0

        if getattr(r0, "boxes", None) is not None and r0.boxes is not None:
            confs = getattr(r0.boxes, "conf", None)
            if confs is not None and len(confs) > 0:
                det_idx = int(np.argmax(confs.cpu().numpy()))
                shoreline_conf = float(confs[det_idx].cpu().numpy())

        mask = masks[det_idx].cpu().numpy()  # (h, w) float 0..1
        mask_bin = (mask > 0.5).astype(np.uint8)

        # masks are sometimes at model-size; resize to ORIGINAL image size
        if mask_bin.shape[0] != img_h or mask_bin.shape[1] != img_w:
            mask_bin = cv2.resize(mask_bin, (img_w, img_h), interpolation=cv2.INTER_NEAREST)

        # ✅ Option A output: base64 PNG of mask (for Colab-like overlay)
        mask_png_b64 = mask_to_base64_png(mask_bin)

        # ✅ Keep polyline output too (optional for map)
        pts = mask_to_shoreline_polyline(mask_bin, max_points=180)
        shoreline_points = [{"x": float(x), "y": float(y), "conf": None} for (x, y) in pts]

        return shoreline_points, shoreline_conf, mask_png_b64
