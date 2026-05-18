# Pin to linux/amd64 — matches Railway's servers
FROM --platform=linux/amd64 node:22-bookworm-slim

# Install system libraries that Chrome needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    fontconfig \
    ca-certificates \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Chrome flags for headless Docker rendering
ENV CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist --disable-gpu-sandbox"
ENV CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist --disable-gpu-sandbox"
ENV PUPPETEER_CHROMIUM_ARGS="--no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist --disable-gpu-sandbox"

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install chrome-headless-shell (what HyperFrames needs)
RUN npx puppeteer browsers install chrome-headless-shell

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
