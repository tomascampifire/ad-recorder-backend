# Ad Recorder — Backend

Express server that renders self-contained HTML animations to MP4 using `@hyperframes/producer`.

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to https://railway.com → **New Project** → **Deploy from GitHub repo**
3. Select this repo. Railway auto-detects the Dockerfile and builds it.
4. First build takes ~5 min (installs Chromium + ffmpeg in the container).
5. Once deployed: click the service → **Settings** → **Networking** → **Generate Domain**
6. Copy the public URL — you'll need it for the frontend env var `NEXT_PUBLIC_RENDER_API_URL`.

---

## Local development

### With Docker (recommended — matches production exactly)

```bash
docker build -t ad-recorder-backend .
docker run -p 3000:3000 ad-recorder-backend
```

### Without Docker (requires local `chromium` and `ffmpeg` on your PATH)

```bash
npm install
npm run dev
```

---

## Curl test

Replace `/path/to/your-ad.html` with one of your HyperFrames or Claude Design export files.

```bash
# Square 1:1
curl -X POST http://localhost:3000/render \
  -F 'html=@/path/to/your-ad.html' \
  -F 'width=1080' \
  -F 'height=1080' \
  -F 'durationSeconds=6' \
  -F 'fps=30' \
  -F 'quality=standard' \
  --output test-square.mp4

# Vertical 9:16
curl -X POST http://localhost:3000/render \
  -F 'html=@/path/to/your-ad-9x16.html' \
  -F 'width=1080' \
  -F 'height=1920' \
  -F 'durationSeconds=6' \
  -F 'fps=30' \
  -F 'quality=standard' \
  --output test-vertical.mp4
```

Against the Railway URL once deployed:

```bash
curl -X POST https://your-service.up.railway.app/render \
  -F 'html=@/path/to/your-ad.html' \
  -F 'width=1080' \
  -F 'height=1080' \
  -F 'durationSeconds=6' \
  --output test.mp4
```

Expected: `test.mp4` is non-empty and plays correctly in QuickTime/VLC at the specified duration.

---

## API

### `GET /health`

Returns `{ "ok": true }`. Use this to confirm the container is up.

---

### `POST /render`

Renders an HTML file to MP4. Returns the video binary directly.

#### Option A — Multipart form (recommended for files)

```
Content-Type: multipart/form-data

html             — the .html file (required)
width            — integer px (required)
height           — integer px (required)
durationSeconds  — float, 1–60 (required)
fps              — 24 | 30 | 60 (optional, default 30)
quality          — draft | standard | high (optional, default standard)
```

#### Option B — JSON body

```json
{
  "htmlContent": "<html>...</html>",
  "width": 1080,
  "height": 1920,
  "durationSeconds": 6,
  "fps": 30,
  "quality": "standard"
}
```

#### Response

- **200** — `Content-Type: video/mp4`, binary body
- **400** — `{ "error": "..." }` — bad params
- **500** — `{ "error": "..." }` — render failed (check Railway logs)

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to launch the browser process` | Container missing Chromium or a shared lib. Check the apt-get list in Dockerfile. |
| `ffmpeg: command not found` | ffmpeg missing from container. Confirm it's in the Dockerfile apt install. |
| `Cannot find module @hyperframes/producer` | npm install didn't run in Docker build. Check build logs for npm errors. |
| Render takes >5 min and Railway kills it | Lower quality to `draft` for testing; bump container RAM in Railway settings for production. |
| MP4 is 0 bytes | Producer ran but failed silently. Add `debug: true` to `createRenderJob` in `render.ts`. |
| Animation appears frozen or cut off | `ensureCompositionWrapper` may have wrapped incorrectly. Test with a pre-formatted HyperFrames HTML to isolate. |
