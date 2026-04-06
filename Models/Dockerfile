FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (for OpenCV)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (IMPORTANT for caching)
COPY AI_Service/requirements.txt .

# Upgrade pip + install with timeout & retries
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --timeout 1000 --retries 10 -r requirements.txt

# Copy rest of the project
COPY . /app/

# Run the AI Service
WORKDIR /app/AI_Service
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]