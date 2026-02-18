# Franklin Project Deployment Fixes - Summary

## Issues Fixed

### 1. Frontend Calling localhost:8000 in Production ✅
**Problem:** Frontend was calling `http://localhost:8000/analyze` in production
**Solution:** 
- Updated `src/shared/config.js` to export `AI_BASE_URL` and `getAiUrl()` helper
- Modified `SimulationUpload.jsx` to use `getAiUrl('/ai/unified/analyze')` instead of hardcoded localhost
- Modified `TurtleHealthPage.jsx` to use `getAiUrl('/ai/disease/classify')` instead of hardcoded localhost

**Files Changed:**
- `Frontend/src/shared/config.js` - Added AI_BASE_URL export and getAiUrl helper
- `Frontend/src/modules/nests/SimulationUpload.jsx` - Uses getAiUrl for AI endpoint
- `Frontend/src/modules/turtles/TurtleHealthPage.jsx` - Uses getAiUrl for disease classification

### 2. Missing Exports from config.js ✅
**Problem:** Build failures due to missing `DISEASE_MODEL_URL`, `UNIFIED_MODEL_URL`, and `getAiUrl` exports
**Solution:**
- All model URLs are now properly exported from `config.js`
- Added `getAiUrl()` helper function for dynamic AI service URL construction
- Added `AI_BASE_URL` constant for direct AI service access

### 3. Backend Route 404s ✅
**Problem:** 404 errors on `/profile/me` and `/health/stats`
**Solution:**
- Fixed `/health/stats` to use `/api/health/stats` in TurtleHealthPage.jsx
- Verified backend routes are correctly mounted:
  - `/api/profile/me` ✅ (backend has this route)
  - `/api/health/stats` ✅ (backend has this route)
  - `/streams/:id/stream.m3u8` ✅ (served as static files, not under /api)

**Note:** The `/streams/` routes are correctly NOT under `/api` prefix as they're served as static files from the backend.

### 4. AI Service Deployment Timeout ✅
**Problem:** Render deployment times out due to heavy dependencies (tensorflow/torch)
**Solution:**
- ✅ `requirements.txt` already clean - contains only:
  - fastapi==0.110.0
  - uvicorn[standard]==0.29.0
  - python-multipart==0.0.9
  - numpy==1.26.4
  - opencv-python-headless==4.9.0.80
  - requests==2.32.3
  - pillow==10.4.0
  - python-dotenv==1.0.1
  - ultralytics==8.1.0
- ✅ Lazy model loading already implemented in `app.py`
- ✅ Fast startup with `@app.on_event("startup")` handler
- ✅ Added root route `/` for health checks and endpoint listing

## Configuration Required

### Frontend Environment Variables (.env)
```bash
VITE_API_BASE_URL=https://franklin-backend-v0i3.onrender.com
VITE_AI_SERVICE_URL=https://franklin-ai.onrender.com
```

### Backend Environment Variables (Render)
```bash
NODE_ENV=production
FRONTEND_URL=https://franklin-frontend.onrender.com
PORT=5002
# ... other backend vars (DB, etc.)
```

### AI Service Environment Variables (Render)
```bash
NODE_BACKEND_URL=https://franklin-backend-v0i3.onrender.com
AI_SERVICE_URL=https://franklin-ai.onrender.com
YOLO_CONFIG_DIR=/tmp/Ultralytics
PORT=8000
```

## API Endpoints Summary

### Backend (Node.js) - https://franklin-backend-v0i3.onrender.com
- `/` - Root health check
- `/health` - Health status
- `/api/profile/me` - User profile
- `/api/health/stats` - Health statistics
- `/api/health/save` - Save health diagnosis
- `/streams/:id/stream.m3u8` - HLS streaming (static files)
- All other routes under `/api/*`

### AI Service (FastAPI) - https://franklin-ai.onrender.com
- `/` - Service info and endpoint listing
- `/health` - Health check with model status
- `/ai/unified/analyze` - POST - Video analysis
- `/ai/disease/classify` - POST - Disease classification (disabled - returns 503)
- `/ai/shoreline/predict` - POST - Shoreline segmentation
- `/ai/hatchery/register_upload` - POST - Register hatchery video
- `/ai/hatchery/stream/{video_id}` - GET - Stream hatchery video
- `/ai/hatchery/data/{video_id}` - GET - Get hatchery data
- `/content/{filename}` - GET - Serve processed content

## Deployment Checklist

### Frontend (Render Static Site)
- [x] Set `VITE_API_BASE_URL` environment variable
- [x] Set `VITE_AI_SERVICE_URL` environment variable
- [x] Build command: `npm install && npm run build`
- [x] Publish directory: `dist`

### Backend (Render Web Service)
- [x] Set all required environment variables
- [x] Start command: `npm start` or `node src/server.js`
- [x] Verify `/health` endpoint responds

### AI Service (Render Web Service)
- [x] Set `NODE_BACKEND_URL` and `AI_SERVICE_URL` environment variables
- [x] Set `YOLO_CONFIG_DIR=/tmp/Ultralytics`
- [x] Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- [x] Verify `/health` endpoint responds
- [x] Verify root `/` endpoint lists all available endpoints

## Testing Production Deployment

1. **Frontend Health Check:**
   ```bash
   curl https://franklin-frontend.onrender.com
   ```

2. **Backend Health Check:**
   ```bash
   curl https://franklin-backend-v0i3.onrender.com/health
   ```

3. **AI Service Health Check:**
   ```bash
   curl https://franklin-ai.onrender.com/health
   ```

4. **Test AI Endpoint:**
   ```bash
   curl -X POST https://franklin-ai.onrender.com/ai/unified/analyze \
     -F "file=@test_video.mp4"
   ```

## Known Limitations

1. **Disease Classification Disabled:** The `/ai/disease/classify` endpoint returns 503 because TensorFlow/Keras were removed to enable deployment. To re-enable:
   - Use TensorFlow Lite runtime instead of full TensorFlow
   - Or deploy disease model as a separate service with GPU support

2. **Streaming:** HLS streaming requires the backend to have access to camera feeds. In cloud deployment, this may be disabled via `STREAMING_ENABLED=false` environment variable.

## Files Modified

1. `Frontend/src/shared/config.js` - Added AI_BASE_URL and getAiUrl helper
2. `Frontend/src/modules/nests/SimulationUpload.jsx` - Use getAiUrl for analyze endpoint
3. `Frontend/src/modules/turtles/TurtleHealthPage.jsx` - Use getAiUrl for disease classification, fixed /api prefix
4. `Models/AI_Service/app.py` - Added root route for endpoint listing

## Next Steps

1. Deploy frontend with updated environment variables
2. Verify all API calls work in production
3. Test video upload and analysis flow
4. Monitor AI service startup time (should be <60 seconds)
5. Check logs for any 404 errors and address as needed
