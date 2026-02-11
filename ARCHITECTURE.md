# Franklin Project - Production Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Frontend (Vite/React)                                           │
│  https://franklin-frontend.onrender.com                          │
│                                                                   │
│  Environment Variables:                                          │
│  • VITE_API_BASE_URL=https://franklin-backend-v0i3.onrender.com │
│  • VITE_AI_SERVICE_URL=https://franklin-ai.onrender.com         │
└────────────┬─────────────────────────────┬─────────────────────┘
             │                             │
             │ API Calls                   │ AI Calls
             │ (getApiUrl)                 │ (getAiUrl)
             │                             │
             ▼                             ▼
┌────────────────────────┐    ┌────────────────────────────────┐
│  Backend (Node.js)     │    │  AI Service (FastAPI)          │
│  Port: 5002            │    │  Port: 8000                    │
│                        │    │                                │
│  Routes:               │    │  Routes:                       │
│  • /health             │    │  • / (root)                    │
│  • /api/profile/me     │    │  • /health                     │
│  • /api/health/stats   │    │  • /ai/unified/analyze         │
│  • /api/health/save    │    │  • /ai/disease/classify (503)  │
│  • /api/turtles        │    │  • /ai/shoreline/predict       │
│  • /api/nests          │    │  • /ai/hatchery/*              │
│  • /api/detections     │    │  • /content/{filename}         │
│  • /api/alerts         │    │                                │
│  • /streams/* (static) │    │  Lazy Loading:                 │
│                        │    │  ✓ Unified model               │
│  CORS: Frontend URL    │    │  ✓ Shoreline model             │
│                        │    │  ✓ Hatchery engine             │
│                        │    │  ✗ Disease (TF removed)        │
└────────────────────────┘    └────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      KEY FIXES IMPLEMENTED                        │
└──────────────────────────────────────────────────────────────────┘

1. ✅ Frontend → AI Service
   Before: http://localhost:8000/analyze
   After:  getAiUrl('/ai/unified/analyze')
   Result: Uses production URL in deployment

2. ✅ Config Exports
   Before: Missing DISEASE_MODEL_URL, getAiUrl
   After:  All exports present in config.js
   Result: No build failures

3. ✅ Backend Routes
   Before: /health/stats (404)
   After:  /api/health/stats
   Result: Correct API prefix

4. ✅ AI Service Deployment
   Before: Timeout (tensorflow/torch)
   After:  Lightweight deps only
   Result: Fast startup (<60s)

┌──────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT CHECKLIST                          │
└──────────────────────────────────────────────────────────────────┘

Frontend (Render Static Site):
  ☐ Set VITE_API_BASE_URL environment variable
  ☐ Set VITE_AI_SERVICE_URL environment variable
  ☐ Build: npm install && npm run build
  ☐ Publish: dist/

Backend (Render Web Service):
  ☐ Set NODE_ENV=production
  ☐ Set FRONTEND_URL
  ☐ Set MongoDB connection string
  ☐ Start: npm start
  ☐ Verify /health responds

AI Service (Render Web Service):
  ☐ Set NODE_BACKEND_URL
  ☐ Set AI_SERVICE_URL
  ☐ Set YOLO_CONFIG_DIR=/tmp/Ultralytics
  ☐ Start: uvicorn app:app --host 0.0.0.0 --port $PORT
  ☐ Verify / and /health respond

┌──────────────────────────────────────────────────────────────────┐
│                      FILES MODIFIED                               │
└──────────────────────────────────────────────────────────────────┘

Frontend/src/shared/config.js
  • Added AI_BASE_URL constant
  • Added getAiUrl() helper function
  • Exported all model URLs

Frontend/src/modules/nests/SimulationUpload.jsx
  • Import getAiUrl instead of UNIFIED_MODEL_URL
  • Call getAiUrl('/ai/unified/analyze')
  • Updated error message

Frontend/src/modules/turtles/TurtleHealthPage.jsx
  • Import getAiUrl instead of DISEASE_MODEL_URL
  • Call getAiUrl('/ai/disease/classify')
  • Fixed /api/health/stats prefix

Models/AI_Service/app.py
  • Added root route / for endpoint listing
  • Already has lazy loading ✓
  • Already has fast startup ✓

Models/AI_Service/requirements.txt
  • Already clean (no TF/torch) ✓

┌──────────────────────────────────────────────────────────────────┐
│                    TESTING ENDPOINTS                              │
└──────────────────────────────────────────────────────────────────┘

# Backend Health
curl https://franklin-backend-v0i3.onrender.com/health

# AI Service Info
curl https://franklin-ai.onrender.com/

# AI Service Health
curl https://franklin-ai.onrender.com/health

# Test Video Analysis
curl -X POST https://franklin-ai.onrender.com/ai/unified/analyze \
  -F "file=@test_video.mp4"

# Frontend
open https://franklin-frontend.onrender.com

┌──────────────────────────────────────────────────────────────────┐
│                      KNOWN LIMITATIONS                            │
└──────────────────────────────────────────────────────────────────┘

1. Disease Classification (503 Error)
   • TensorFlow/Keras removed for deployment
   • Endpoint returns 503 with explanation
   • Solution: Use TFLite or separate GPU service

2. Live Streaming (May be disabled)
   • Requires camera access
   • Set STREAMING_ENABLED=false in cloud
   • Demo video shown instead

┌──────────────────────────────────────────────────────────────────┐
│                     SUCCESS CRITERIA                              │
└──────────────────────────────────────────────────────────────────┘

✓ Frontend builds without errors
✓ No localhost calls in production
✓ All API routes resolve correctly
✓ AI service starts in <60 seconds
✓ Video upload and analysis works
✓ Health endpoints respond
✓ No 404 errors on valid routes
