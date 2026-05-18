FROM --platform=linux/amd64 node:22-bookworm-slim

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

RUN npx puppeteer browsers install chrome-headless-shell

# Wrap Chrome to inject --no-sandbox and --disable-dev-shm-usage.
# These two flags are all that's needed for Chrome to run in Docker as root.
RUN CHROME_BIN=$(find /root/.cache/puppeteer -name 'chrome-headless-shell' -type f | head -1) \
    && echo "Wrapping Chrome at: $CHROME_BIN" \
    && mv "$CHROME_BIN" "${CHROME_BIN}.real" \
    && printf '#!/bin/sh\nexec "%s.real" --no-sandbox --disable-dev-shm-usage "$@"\n' "$CHROME_BIN" > "$CHROME_BIN" \
    && chmod +x "$CHROME_BIN"

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
