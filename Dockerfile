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

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install chrome-headless-shell
RUN npx puppeteer browsers install chrome-headless-shell

# Wrap the Chrome binary to always inject required Docker flags.
# This ensures --no-sandbox and --disable-dev-shm-usage are always passed
# regardless of how HyperFrames internally launches the browser.
RUN CHROME_BIN=$(find /root/.cache/puppeteer -name 'chrome-headless-shell' -type f | head -1) \
    && echo "Wrapping Chrome at: $CHROME_BIN" \
    && mv "$CHROME_BIN" "${CHROME_BIN}.real" \
    && printf '#!/bin/sh\nexec "%s.real" --no-sandbox --disable-dev-shm-usage --use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist "$@"\n' "$CHROME_BIN" > "$CHROME_BIN" \
    && chmod +x "$CHROME_BIN"

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
