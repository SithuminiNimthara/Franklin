# 🚀 Franklin Production Quick Reference

## 🔴 CRITICAL: Fix 500 Error NOW

### Root Cause
**Missing model files on Render!** Your `.pt` files are not deployed.

### Immediate Fix
```bash
# 1. Check what's actually on Render
curl https://franklin-ai.onrender.com/debug/info

# 2. You'll see: "unified_turtle": {"exists": false}
# This is why analyze returns 500!
```

### Solution Options (Pick ONE)

**Option A: Download from Cloud (RECOMMENDED)**
```python
# Add to app.py startup
@app.on_event("startup")
async def startup_event():
    import requests
    models = {
        "unified_turtle.pt": "https://your-bucket.s3.amazonaws.com/unified_turtle.pt",
        "unified_predator.pt": "https://your-bucket.s3.amazonaws.com/unified_predator.pt",
    }
    for name, url in models.items():
        path = os.path.join(MODELS_DIR, name)
        if not os.path.exists(path):
            logger.info(f"📥 Downloading {name}...")
            r = requests.get(url, stream=True)
            with open(path, 'wb') as f:
                shutil.copyfileobj(r.raw, f)
```

**Option B: Use Render Disk (Costs $)**
1. Render Dashboard → Add Disk
2. Mount at `/opt/render/models`
3. Upload files via SFTP
4. Update `MODELS_DIR = "/opt/render/models"`

**Option C: Git LFS**
```bash
# In your repo
git lfs install
git lfs track "*.pt"
git add .gitattributes models_data/*.pt
git commit -m "Add model files"
git push
```

---

## 📋 Deployment Checklist

### AI Service (Render)
- [ ] Replace `app.py` with `app_production.py`
- [ ] Set environment variables:
  ```
  NODE_BACKEND_URL=https://franklin-backend-v0i3.onrender.com/api/detections
  AI_SERVICE_URL=https://franklin-ai.onrender.com
  YOLO_CONFIG_DIR=/tmp/Ultralytics
  PORT=8000
  ```
- [ ] Build: `pip install -r requirements.txt`
- [ ] Start: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- [ ] Upload model files (see above)
- [ ] Test: `curl https://franklin-ai.onrender.com/debug/info`

### Backend (Render)
- [ ] Set environment variables:
  ```
  NODE_ENV=production
  FRONTEND_URL=https://franklin-frontend.onrender.com
  AI_SERVICE_URL=https://franklin-ai.onrender.com
  STREAMING_ENABLED=false
  MONGO_URI=your_mongodb_connection_string
  ```
- [ ] Start: `npm start`
- [ ] Test: `curl https://franklin-backend-v0i3.onrender.com/health`

### Frontend (Render)
- [ ] Set environment variables:
  ```
  VITE_API_BASE_URL=https://franklin-backend-v0i3.onrender.com
  VITE_AI_SERVICE_URL=https://franklin-ai.onrender.com
  ```
- [ ] Build: `npm run build`
- [ ] Publish: `dist/`
- [ ] Test: Open in browser

---

## 🐛 Debugging Commands

```bash
# 1. Check AI service health
curl https://franklin-ai.onrender.com/health

# 2. Check model files (MOST IMPORTANT)
curl https://franklin-ai.onrender.com/debug/info

# 3. Test video upload
curl -X POST https://franklin-ai.onrender.com/ai/unified/analyze \
  -F "file=@test.mp4" \
  -v

# 4. Check Render logs
# Go to Render Dashboard → AI Service → Logs
# Look for errors after POST /ai/unified/analyze

# 5. Check backend routes
curl https://franklin-backend-v0i3.onrender.com/api/health/stats
curl https://franklin-backend-v0i3.onrender.com/api/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎥 CCTV Streaming (Why 404?)

### Current Problem
```
Frontend calls: /streams/camera1/stream.m3u8
Backend expects: Static files in /streams directory
Reality: Render has no persistent storage + no RTSP cameras connected
Result: 404 Not Found
```

### Solution Architecture
```
IP Camera (RTSP) 
    ↓
Edge Server (FFmpeg converts RTSP → HLS)
    ↓
Cloud Storage (S3/CloudFlare stores .m3u8 + .ts files)
    ↓
Backend (Proxies from S3)
    ↓
Frontend (HLS.js player)
```

### Quick Setup
```bash
# On edge server (VPS/on-premise)
ffmpeg -i rtsp://camera-ip:554/stream \
  -c:v libx264 -preset veryfast \
  -f hls -hls_time 2 -hls_list_size 10 \
  -hls_flags delete_segments \
  /var/www/hls/camera1/stream.m3u8

# Sync to S3 every 5 seconds
while true; do
  aws s3 sync /var/www/hls s3://franklin-streams --delete
  sleep 5
done
```

### Backend Proxy (Node.js)
```javascript
// streaming.routes.js
router.get('/streams/:cameraId/stream.m3u8', async (req, res) => {
  const s3Url = `https://franklin-streams.s3.amazonaws.com/${req.params.cameraId}/stream.m3u8`;
  const response = await fetch(s3Url);
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(await response.text());
});
```

---

## 🔧 Frontend Config Fix

### Current Issue
```javascript
// ❌ Hardcoded localhost
fetch('http://localhost:8000/analyze')

// ❌ Missing /api prefix
fetch(`${API_BASE_URL}/health/stats`)
```

### Fixed Version
```javascript
// shared/config.js
export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002";

export const AI_BASE_URL = 
  import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export const getApiUrl = (endpoint) =>
  `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

export const getAiUrl = (endpoint) =>
  `${AI_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

// Usage
import { getAiUrl, getApiUrl } from './shared/config';

// ✅ Correct
fetch(getAiUrl('/ai/unified/analyze'))
fetch(getApiUrl('/api/health/stats'))
```

---

## 📊 Expected Responses

### ✅ Working AI Service
```bash
$ curl https://franklin-ai.onrender.com/debug/info
{
  "model_files": {
    "unified_turtle": {"exists": true, "size_mb": 45.2},
    "unified_predator": {"exists": true, "size_mb": 42.1}
  }
}
```

### ❌ Broken AI Service
```bash
$ curl https://franklin-ai.onrender.com/debug/info
{
  "model_files": {
    "unified_turtle": {"exists": false, "size_mb": 0},  # ← THIS IS YOUR PROBLEM
    "unified_predator": {"exists": false, "size_mb": 0}
  }
}
```

---

## 🎯 Priority Order

1. **🔴 CRITICAL:** Upload model files to Render (see Options A/B/C above)
2. **🟠 HIGH:** Replace app.py with app_production.py for better logging
3. **🟡 MEDIUM:** Fix frontend config to use getAiUrl/getApiUrl
4. **🟢 LOW:** Setup CCTV streaming infrastructure

---

## 💡 Pro Tips

1. **Check Render logs FIRST** - They show the actual Python traceback
2. **Use /debug/info endpoint** - Shows exactly what files exist
3. **Test locally first** - Ensure models work before deploying
4. **Monitor memory** - Render free tier has 512MB limit
5. **Use lazy loading** - Don't load all models at startup

---

## 🆘 Still Broken?

```bash
# Get detailed error
curl -X POST https://franklin-ai.onrender.com/ai/unified/analyze \
  -F "file=@test.mp4" \
  -v 2>&1 | grep -A 20 "< HTTP"

# Check Render logs
# Look for lines starting with "❌" or "ERROR"

# Common errors:
# - "NoneType object has no attribute" → Model files missing
# - "FileNotFoundError" → Model files missing
# - "Out of memory" → Too many models loaded
# - "Cannot read video" → Invalid upload
```

---

**🚀 Start with fixing model files - that's 90% of your 500 error!**
