# Ad Recorder — Backend

Express server that renders HTML animations to MP4 using `@hyperframes/producer`.

## Local test (do this before deploying)

### Step 1 — Make sure Docker Desktop is running
Open Docker Desktop on your Mac. Wait until it says "Engine running" in the bottom left.

### Step 2 — Open Terminal and navigate to this folder
```bash
cd /path/to/ad-recorder-backend
```

### Step 3 — Build the Docker image
This takes ~5 minutes the first time (it downloads Chromium + ffmpeg).
```bash
docker build -t ad-recorder-backend .
```

### Step 4 — Run the container
```bash
docker run -p 3000:3000 ad-recorder-backend
```
You should see: `[server] listening on port 3000`
Leave this terminal open.

### Step 5 — Test with curl (open a NEW terminal tab)
Replace `/path/to/your-ad.html` with the actual path to one of your HTML ad files.
Also replace 1080 and 1920 with the actual width and height of that ad.
```bash
curl -X POST http://localhost:3000/render \
  -F 'html=@/path/to/your-ad.html' \
  -F 'width=1080' \
  -F 'height=1920' \
  -F 'durationSeconds=6' \
  -F 'fps=30' \
  -F 'quality=standard' \
  --output test-output.mp4
```

### Step 6 — Verify
- The curl command finishes without an error
- `test-output.mp4` exists in your current folder
- Open it in QuickTime — it should play your ad animation, ~6 seconds long

If all that works, the backend is ready to deploy to Railway.

## Deploy to Railway

1. Push this folder to a new GitHub repo
2. Go to https://railway.com → New Project → Deploy from GitHub repo
3. Select this repo — Railway auto-detects the Dockerfile
4. Wait for build (~5 min)
5. Click the service → Settings → Networking → Generate Domain
6. Copy the public URL — you'll need it for the frontend

## API

### `POST /render`

Form fields:
- `html` — the HTML file (required)
- `width` — number in pixels (required)
- `height` — number in pixels (required)
- `durationSeconds` — number, 1–60 (required)
- `fps` — 24, 30, or 60 (default: 30)
- `quality` — draft, standard, or high (default: standard)

Returns `video/mp4` binary on success.
