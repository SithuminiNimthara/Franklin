# Franklin - AI-Driven Sea Turtle Protection System

Franklin is a comprehensive monitoring and protection system designed for sea turtle conservation in Sri Lanka. It leverages AI for disease detection, predator identification, and habitat monitoring.

## 🚀 Features

- **Live CCTV Integration:** Real-time monitoring of nesting sites.
- **AI-Powered Detection:**
  - Disease Detection (Protonet model)
  - Predator & Human Detection (YOLO/Unified Service)
  - Nest & Shoreline Monitoring
- **Automated Alerts:** Instant notifications based on AI findings.
- **Google Drive Integration:** Secure storage for diagnosis and monitoring logs.

## 🛠 Tech Stack

- **Frontend:** React + Vite, Tailwind CSS
- **Backend:** Node.js (Express), MongoDB
- **AI Service:** Python (FastAPI), TensorFlow, OpenCV, Ultralytics YOLO

## 🐳 Running with Docker

The easiest way to get the entire system running is using Docker Compose.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Steps
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Franklin
   ```

2. **Set up Environment Variables:**
   - Create `.env` files in `Backend/` and `Frontend/` based on the `.env.example` provided.
   - Ensure you have your `oauth-credentials.json` in the `Backend/` folder for Google Drive integration.

3. **Build and Start the system:**
   ```bash
   docker compose up --build -d
   ```

4. **Access the application:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5002](http://localhost:5002)
   - **AI Service API:** [http://localhost:8000](http://localhost:8000)

## 🔧 Local Development

If you prefer to run services individually:

### Backend
```bash
cd Backend
npm install
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

### AI Service
```bash
cd Models/AI_Service
pip install -r requirements.txt
uvicorn app:app --reload
```

## 📂 Project Structure

- `Frontend/`: React application.
- `Backend/`: Express server handling API requests and Google Drive integration.
- `Models/`: AI models and the Unified AI Service.
- `.github/workflows/`: CI/CD pipeline configuration.

## 📄 License
This project is licensed under the MIT License.
