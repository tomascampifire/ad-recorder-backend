# Ad Recorder — Backend

Express server that renders HTML animations to MP4 using `@hyperframes/producer`.  
Deployed to Railway as a Docker container with Chromium + ffmpeg pre-installed.

---

## Deploy to Railway

1. Push this repo to a new GitHub repository
2. Go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**
3. Select this repo — Railway auto-detects the Dockerfile
4. Wait for the first build (~5 min; it installs Chromium + ffmpeg)
5. Once deployed: click the service → **Settings** → **Networking** → **Generate Domain**
6. Copy the public URL (e.g. `https://ad-recorder-backend-production.up.railway.app`)

Set that URL as `NEXT_PUBLIC_RENDER_API_URL` in your Vercel frontend deployment.

---

## Local development

**With Docker (recommended):**

```bash
docker build -t ad-recorder-backend .
docker run -p 3000:3000 ad-recorder-backend
```

**Without Docker** (requires `chromium` and `ffmpeg` on your PATH):

```bash
npm install
npm run dev
```

---

## Test with curl

```bash
curl -X POST http://localhost:3000/render \
  -F 'html=@/path/to/your-ad.html' \
  -F 'width=1080' \
  -F 'height=1920' \
  -F 'durationSeconds=10' \
  -F 'fps=30' \
  -F 'quality=standard' \
  --output test-output.mp4
```

Open `test-output.mp4` in QuickTime or VLC — it should be 10 seconds of your animation.

---

## API

### `POST /render`

Accepts multipart form **or** JSON body.

| Field | Type | Required | Notes |
|---|---|---|---|
| `html` | file (multipart) | one of | HTML file upload |
| `htmlContent` | string (JSON) | one of | Inline HTML string |
| `width` | number | ✓ | px |
| `height` | number | ✓ | px |
| `durationSeconds` | number | ✓ | 1–60 |
| `fps` | 24 \| 30 \| 60 | — | default 30 |
| `quality` | draft \| standard \| high | — | default standard |

Returns `video/mp4` binary on success, or `{ "error": "..." }` JSON on failure.

### `GET /health`

Returns `{ "ok": true }`. Used by the frontend to show the backend status indicator.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to launch the browser process` | Chromium or a shared lib is missing — check the apt install list in Dockerfile |
| `ffmpeg: command not found` | Add `ffmpeg` to apt install in Dockerfile |
| `Cannot find module @hyperframes/producer` | `npm install` failed in Docker build — check build logs |
| MP4 is 0 bytes | Add `debug: true` to `createRenderJob` options and check Railway logs |
| Render takes >300s and Railway kills it | Use `quality: 'draft'` for testing, or bump container memory in Railway dashboard |

---

## Architecture

This service is intentionally a thin wrapper around `@hyperframes/producer`.  
Do **not** add raw Puppeteer, html2canvas, MediaRecorder, or ffmpeg.wasm — each was tried previously and failed at production resolutions. See `PART-0-context.md` in the PRD for the full history.
