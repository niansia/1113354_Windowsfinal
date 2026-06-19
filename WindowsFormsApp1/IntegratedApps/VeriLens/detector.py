"""VeriLens image track -- real YOLO object detection + classic image forensics.

* YOLO: the YOLOv8n model exported to ONNX is run with onnxruntime (so we sidestep
  the torch/torchvision NMS issue) using our own letterbox pre-processing and a
  hand-written Non-Maximum-Suppression -- i.e. the actual YOLO inference pipeline.
* Forensics: Error-Level Analysis (ELA), a noise-residual map, and ORB-based
  copy-move (clone) detection -- the classic CV signals used to spot doctored
  images -- combined into a single tamper score, with colour heatmaps for the UI.

Everything degrades gracefully: if the model or OpenCV op is unavailable the rest
of the pipeline still returns a result.
"""
from __future__ import annotations

import base64
import json
from pathlib import Path

import cv2
import numpy as np

APP_ROOT = Path(__file__).resolve().parent
MODEL_DIR = APP_ROOT / "models"
ONNX_PATH = MODEL_DIR / "yolov8n.onnx"
NAMES_PATH = MODEL_DIR / "coco_names.json"
INPUT = 640


def _png_data_url(img_bgr) -> str:
    ok, buf = cv2.imencode(".png", img_bgr)
    if not ok:
        return ""
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


class Detector:
    def __init__(self, log=print):
        self.log = log
        self.session = None
        self.input_name = None
        self.names = {}
        self._load()

    def _load(self):
        try:
            names = json.loads(NAMES_PATH.read_text(encoding="utf-8")) if NAMES_PATH.exists() else {}
            self.names = {int(k): v for k, v in names.items()}
        except Exception:
            self.names = {}
        if not ONNX_PATH.exists():
            self.log("[yolo] yolov8n.onnx not found -- detection disabled (forensics still run)")
            return
        try:
            import onnxruntime as ort
            so = ort.SessionOptions()
            so.intra_op_num_threads = 2
            self.session = ort.InferenceSession(str(ONNX_PATH), sess_options=so,
                                                providers=["CPUExecutionProvider"])
            self.input_name = self.session.get_inputs()[0].name
            self.log("[yolo] ONNX model ready (%d classes)" % len(self.names))
        except Exception as exc:  # noqa: BLE001
            self.log("[yolo] failed to init onnxruntime: %s" % exc)
            self.session = None

    @property
    def ready(self) -> bool:
        return self.session is not None

    # ---------------------------------------------------------------- YOLO
    def detect(self, img_bgr, conf_thres=0.30, iou_thres=0.45):
        if self.session is None:
            return []
        h0, w0 = img_bgr.shape[:2]
        r = min(INPUT / w0, INPUT / h0)
        nw, nh = int(round(w0 * r)), int(round(h0 * r))
        resized = cv2.resize(img_bgr, (nw, nh))
        canvas = np.full((INPUT, INPUT, 3), 114, np.uint8)
        dx, dy = (INPUT - nw) // 2, (INPUT - nh) // 2
        canvas[dy:dy + nh, dx:dx + nw] = resized
        blob = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        blob = blob.transpose(2, 0, 1)[None]
        out = self.session.run(None, {self.input_name: blob})[0][0].T  # [8400, 84]
        boxes, scores = out[:, :4], out[:, 4:]
        cls = scores.argmax(1)
        conf = scores.max(1)
        keep = conf > conf_thres
        boxes, cls, conf = boxes[keep], cls[keep], conf[keep]
        if len(boxes) == 0:
            return []
        xy = np.empty_like(boxes)
        xy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
        xy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
        xy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
        xy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
        xy[:, [0, 2]] = (xy[:, [0, 2]] - dx) / r
        xy[:, [1, 3]] = (xy[:, [1, 3]] - dy) / r
        xy[:, [0, 2]] = xy[:, [0, 2]].clip(0, w0)
        xy[:, [1, 3]] = xy[:, [1, 3]].clip(0, h0)
        keep_idx = self._nms(xy, conf, iou_thres)
        dets = []
        for i in keep_idx:
            dets.append({
                "cls": int(cls[i]),
                "name": self.names.get(int(cls[i]), str(int(cls[i]))),
                "conf": round(float(conf[i]), 3),
                "box": [int(v) for v in xy[i]],
            })
        return dets

    @staticmethod
    def _nms(boxes, scores, thr):
        idx = scores.argsort()[::-1]
        keep = []
        while len(idx):
            i = idx[0]
            keep.append(int(i))
            if len(idx) == 1:
                break
            rest = idx[1:]
            xx1 = np.maximum(boxes[i, 0], boxes[rest, 0])
            yy1 = np.maximum(boxes[i, 1], boxes[rest, 1])
            xx2 = np.minimum(boxes[i, 2], boxes[rest, 2])
            yy2 = np.minimum(boxes[i, 3], boxes[rest, 3])
            w = np.maximum(0, xx2 - xx1)
            h = np.maximum(0, yy2 - yy1)
            inter = w * h
            a1 = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
            a2 = (boxes[rest, 2] - boxes[rest, 0]) * (boxes[rest, 3] - boxes[rest, 1])
            iou = inter / (a1 + a2 - inter + 1e-9)
            idx = rest[iou < thr]
        return keep

    def annotate(self, img_bgr, dets):
        out = img_bgr.copy()
        palette = [(70, 224, 255), (156, 124, 255), (70, 231, 176), (255, 193, 94), (255, 106, 125)]
        for d in dets:
            x1, y1, x2, y2 = d["box"]
            col = palette[d["cls"] % len(palette)]
            cv2.rectangle(out, (x1, y1), (x2, y2), col, 2)
            label = "%s %.0f%%" % (d["name"], d["conf"] * 100)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(out, (x1, max(0, y1 - th - 6)), (x1 + tw + 6, y1), col, -1)
            cv2.putText(out, label, (x1 + 3, max(10, y1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (10, 14, 24), 1, cv2.LINE_AA)
        return out

    # ---------------------------------------------------------------- forensics
    @staticmethod
    def ela(img_bgr, quality=90):
        enc = cv2.imencode(".jpg", img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])[1]
        recomp = cv2.imdecode(enc, cv2.IMREAD_COLOR)
        diff = cv2.absdiff(img_bgr, recomp).max(axis=2).astype(np.float32)
        score = float(np.clip(diff.mean() / 6.0, 0, 1))
        mx = max(1.0, float(diff.max()))
        norm = np.clip(diff * (255.0 / mx), 0, 255).astype(np.uint8)
        heat = cv2.applyColorMap(norm, cv2.COLORMAP_JET)
        return heat, score

    @staticmethod
    def noise_inconsistency(img_bgr):
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        resid = gray - cv2.GaussianBlur(gray, (0, 0), 1.2)
        h, w = resid.shape
        bs = max(16, min(h, w) // 16)
        vars_ = []
        for y in range(0, h - bs, bs):
            for x in range(0, w - bs, bs):
                vars_.append(float(resid[y:y + bs, x:x + bs].var()))
        if len(vars_) < 4:
            return 0.0
        vars_ = np.array(vars_)
        m = vars_.mean() + 1e-6
        # coefficient of variation of local noise -> inconsistent noise = splicing hint
        cov = float(vars_.std() / m)
        return float(np.clip((cov - 0.6) / 2.0, 0, 1))

    @staticmethod
    def copy_move(img_bgr):
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        try:
            orb = cv2.ORB_create(2000)
            kp, des = orb.detectAndCompute(gray, None)
        except Exception:
            return 0.0, 0
        if des is None or len(kp) < 12:
            return 0.0, 0
        bf = cv2.BFMatcher(cv2.NORM_HAMMING)
        matches = bf.knnMatch(des, des, k=3)
        cloned = 0
        for group in matches:
            for m in group:
                if m.queryIdx == m.trainIdx:
                    continue
                if m.distance > 32:
                    continue
                p1 = np.array(kp[m.queryIdx].pt)
                p2 = np.array(kp[m.trainIdx].pt)
                if np.linalg.norm(p1 - p2) > 24:   # same descriptor, far apart => clone
                    cloned += 1
                break
        ratio = cloned / max(1, len(kp))
        return float(np.clip(ratio * 6.0, 0, 1)), cloned

    def forensics(self, img_bgr):
        out = {"ela_score": 0.0, "noise_score": 0.0, "copymove_score": 0.0,
               "copymove_count": 0, "tamper": 0.0, "ela_url": ""}
        try:
            heat, es = self.ela(img_bgr)
            out["ela_score"] = es
            out["ela_url"] = _png_data_url(heat)
        except Exception as exc:  # noqa: BLE001
            self.log("[forensics] ELA failed: %s" % exc)
        try:
            out["noise_score"] = self.noise_inconsistency(img_bgr)
        except Exception:
            pass
        try:
            cm, cnt = self.copy_move(img_bgr)
            out["copymove_score"] = cm
            out["copymove_count"] = cnt
        except Exception:
            pass
        out["tamper"] = float(np.clip(
            0.5 * out["ela_score"] + 0.3 * out["copymove_score"] + 0.2 * out["noise_score"], 0, 1))
        return out

    # ---------------------------------------------------------------- top level
    def analyze_image(self, img_bytes):
        arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        # cap very large images for speed
        h, w = img.shape[:2]
        scale = min(1.0, 1600.0 / max(h, w))
        if scale < 1.0:
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        dets = self.detect(img)
        forensics = self.forensics(img)
        persons = sum(1 for d in dets if d["name"] == "person")
        result = {
            "width": img.shape[1], "height": img.shape[0],
            "detections": dets,
            "yoloPersons": persons,
            "yoloObjects": len(dets),
            "yoloMaxConf": max([d["conf"] for d in dets], default=0.0),
            "yoloReady": self.ready,
            "original_url": _png_data_url(img),
            "annotated_url": _png_data_url(self.annotate(img, dets)) if dets else "",
            **forensics,
        }
        return result


if __name__ == "__main__":
    import sys
    d = Detector()
    print("yolo ready:", d.ready, "names:", len(d.names))
    if len(sys.argv) > 1:
        res = d.analyze_image(Path(sys.argv[1]).read_bytes())
        if res:
            print("detections:", [(x["name"], x["conf"]) for x in res["detections"]])
            print("tamper=%.2f ela=%.2f noise=%.2f copymove=%.2f" % (
                res["tamper"], res["ela_score"], res["noise_score"], res["copymove_score"]))
