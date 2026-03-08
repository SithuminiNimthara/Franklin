FROM python:3.10-slim

WORKDIR /app

# Ensure OpenGL dependencies are installed for cv2 operations
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire Models folder to include both AI_Service and Disease_Detection
COPY . /app/

# Install unified requirements
RUN pip install --no-cache-dir -r AI_Service/requirements.txt

# Run the AI Service
WORKDIR /app/AI_Service
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
