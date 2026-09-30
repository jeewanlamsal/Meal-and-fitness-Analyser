FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY ai-engine/requirements.txt ../ai-engine/requirements.txt

# 1. Force Pip to have a 1000-second timeout limit for unstable connections
# 2. Pre-install the lightweight CPU-only version of PyTorch BEFORE installing YOLOv8
RUN pip3 install --break-system-packages --default-timeout=1000 torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu
# 3. Install the rest of your AI requirements
RUN pip3 install --break-system-packages --default-timeout=1000 --no-cache-dir -r ../ai-engine/requirements.txt

COPY backend/ ./
COPY ai-engine/ ../ai-engine/

ENV PYTHON_EXEC=python3

EXPOSE 5000

# Ensure uploads directory exists at runtime
RUN mkdir -p /app/backend/uploads



CMD ["node", "server.js"]
