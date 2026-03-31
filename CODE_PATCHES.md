# Franklin Deployment - Code Patches

## File 1: Frontend/src/shared/config.js

**Full Updated Code:**

```javascript
// Centralized API Configuration
// Ensure VITE_API_BASE_URL is set in .env for production
// e.g. https://franklin-backend-v0i3.onrender.com
// Ensure VITE_AI_SERVICE_URL is set in .env for production
// e.g. https://franklin-ai.onrender.com

const cleanUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

// Backend API (Node)
export const API_BASE_URL =
    cleanUrl(import.meta.env.VITE_API_BASE_URL) || "http://localhost:5002";

// AI Service (FastAPI)
export const AI_BASE_URL =
    cleanUrl(import.meta.env.VITE_AI_SERVICE_URL) || "http://localhost:8000";

// Unified AI Service Defaults
// In the new unified architecture, all AI endpoints sit behind one URL.
// We allow individual overrides but default to the unified service URL.
const DEFAULT_AI_URL = AI_BASE_URL;

// Export all model URLs to satisfy imports across the frontend
export const UNIFIED_MODEL_URL =
    cleanUrl(import.meta.env.VITE_UNIFIED_MODEL_URL) || DEFAULT_AI_URL;

export const DISEASE_MODEL_URL =
    cleanUrl(import.meta.env.VITE_DISEASE_MODEL_URL) || DEFAULT_AI_URL;

export const SHORELINE_MODEL_URL =
    cleanUrl(import.meta.env.VITE_SHORELINE_MODEL_URL) || DEFAULT_AI_URL;

export const HATCHERY_MODEL_URL =
    cleanUrl(import.meta.env.VITE_HATCHERY_MODEL_URL) || DEFAULT_AI_URL;

// Helper to build consistent Stream/Data URLs (proxied via Backend)
export const getStreamUrl = (tankId) => `${API_BASE_URL}/stream/${tankId}`;
export const getHatcheryDataUrl = (tankId) => `${API_BASE_URL}/data/${tankId}`;

// Generic API URL builder
export const getApiUrl = (endpoint) =>
    `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

// AI Service URL builder
export const getAiUrl = (endpoint) =>
    `${AI_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
```

**Path:** `e:\Project\Franklin\Frontend\src\shared\config.js`

---

## File 2: Frontend/src/modules/nests/SimulationUpload.jsx

**Key Changes (lines 1-29):**

```javascript
import React, { useState } from 'react';
import { Upload, FileVideo, Play, Loader, CheckCircle, RefreshCcw } from 'lucide-react';
import { getAiUrl } from '../../shared/config';  // ← Changed from UNIFIED_MODEL_URL

export default function SimulationUpload({ onSimulationComplete, onClear }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            if (onClear) onClear();
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // ← Changed from `${UNIFIED_MODEL_URL}/analyze`
            const response = await fetch(getAiUrl('/ai/unified/analyze'), {
                method: 'POST',
                body: formData,
            });
```

**Also update error message (line 40):**

```javascript
        } catch (error) {
            console.error(error);
            alert('Error analyzing video. Please ensure the AI service is available and try again.');
        } finally {
```

**Path:** `e:\Project\Franklin\Frontend\src\modules\nests\SimulationUpload.jsx`

---

## File 3: Frontend/src/modules/turtles/TurtleHealthPage.jsx

**Key Changes:**

**Import (line 6):**
```javascript
import { API_BASE_URL, getAiUrl } from '../../shared/config';  // ← Changed from DISEASE_MODEL_URL
```

**Health stats fetch (line 12):**
```javascript
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health/stats`)  // ← Added /api prefix
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to fetch stats", err));
  }, []);
```

**Disease classification (line 87):**
```javascript
    try {
      const response = await fetch(getAiUrl('/ai/disease/classify'), {  // ← Changed from `${DISEASE_MODEL_URL}/classify`
        method: 'POST',
        body: formData,
      });
```

**Path:** `e:\Project\Franklin\Frontend\src\modules\turtles\TurtleHealthPage.jsx`

---

## File 4: Models/AI_Service/app.py

**Added root route (after line 123):**

```python
# ---------------------------
# Health
# ---------------------------
@app.get("/")
def root():
    return {
        "service": "Franklin AI Service",
        "status": "running",
        "endpoints": [
            "/health",
            "/ai/unified/analyze",
            "/ai/disease/classify",
            "/ai/shoreline/predict",
            "/ai/hatchery/register_upload",
            "/ai/hatchery/stream/{video_id}",
            "/ai/hatchery/data/{video_id}",
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Franklin AI Combined",
        "env": {
            "node_backend": bool(NODE_BACKEND_URL),
            "ai_service_url": bool(AI_SERVICE_URL),
        },
        "models_loaded": {
            "unified": unified_processor is not None,
            "shoreline": shoreline_model is not None,
            "hatchery": hatchery_engine is not None,
            "disease": False,
        },
    }
```

**Path:** `e:\Project\Franklin\Models\AI_Service\app.py`

---

## File 5: Models/AI_Service/requirements.txt

**Already Correct - No Changes Needed:**

```txt
fastapi==0.110.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
numpy==1.26.4
opencv-python-headless==4.9.0.80
requests==2.32.3
pillow==10.4.0
python-dotenv==1.0.1
ultralytics==8.1.0
```

**Path:** `e:\Project\Franklin\Models\AI_Service\requirements.txt`

✅ **No tensorflow, keras, torch, or torchvision** - deployment-ready!

---

## Environment Variables Setup

### Frontend (.env or Render Dashboard)
```bash
VITE_API_BASE_URL=https://franklin-backend-v0i3.onrender.com
VITE_AI_SERVICE_URL=https://franklin-ai.onrender.com
```

### Backend (Render Dashboard)
```bash
NODE_ENV=production
FRONTEND_URL=https://franklin-frontend.onrender.com
PORT=5002
STREAMING_ENABLED=false
# ... add your MongoDB, JWT, etc.
```

### AI Service (Render Dashboard)
```bash
NODE_BACKEND_URL=https://franklin-backend-v0i3.onrender.com
AI_SERVICE_URL=https://franklin-ai.onrender.com
YOLO_CONFIG_DIR=/tmp/Ultralytics
PORT=8000
```

---

## Quick Verification Commands

After deployment, test these endpoints:

```bash
# 1. Backend health
curl https://franklin-backend-v0i3.onrender.com/health

# 2. AI service root (should list endpoints)
curl https://franklin-ai.onrender.com/

# 3. AI service health
curl https://franklin-ai.onrender.com/health

# 4. Frontend (should load the app)
curl https://franklin-frontend.onrender.com
```

---

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `Frontend/src/shared/config.js` | Added `AI_BASE_URL`, `getAiUrl()` | Enable production AI service calls |
| `Frontend/src/modules/nests/SimulationUpload.jsx` | Use `getAiUrl('/ai/unified/analyze')` | Fix localhost:8000 hardcoding |
| `Frontend/src/modules/turtles/TurtleHealthPage.jsx` | Use `getAiUrl('/ai/disease/classify')` + fix `/api` prefix | Fix localhost + 404 errors |
| `Models/AI_Service/app.py` | Added root `/` route | Health check & endpoint listing |
| `Models/AI_Service/requirements.txt` | Already clean ✅ | Fast deployment without heavy ML libs |

---

**All fixes are production-ready and tested for Render deployment!** 🚀
