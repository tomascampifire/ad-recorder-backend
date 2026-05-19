import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import { renderHtmlToMp4 } from './render';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Multer — store uploaded files in memory (no disk write for the upload itself)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max per file
});

// ─── Health checks ────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'ad-recorder-backend' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// ─── Main render endpoint ─────────────────────────────────────────────────────

/**
 * POST /render
 *
 * Accepts HTML + render params, returns an MP4 binary.
 *
 * Two ways to send the HTML:
 *   a) Multipart form:  field "html" = the .html file; remaining fields as form text
 *   b) JSON body:       { htmlContent, width, height, durationSeconds, fps?, quality? }
 *
 * Required params:
 *   width           — px (integer)
 *   height          — px (integer)
 *   durationSeconds — seconds (float, 1–60)
 *
 * Optional params:
 *   fps     — 24 | 30 | 60  (default 30)
 *   quality — draft | standard | high  (default standard)
 *
 * Returns: video/mp4 binary on success, JSON error on failure.
 */
app.post('/render', upload.single('html'), async (req: Request, res: Response) => {
  try {
    // ── 1. Extract HTML content ───────────────────────────────────────────────
    let htmlContent: string;

    if (req.file) {
      // Multipart upload
      htmlContent = req.file.buffer.toString('utf-8');
    } else if (req.body?.htmlContent) {
      // JSON body
      htmlContent = req.body.htmlContent;
    } else {
      res.status(400).json({
        error: 'No HTML provided. Send a multipart "html" file, or JSON with "htmlContent".',
      });
      return;
    }

    // ── 2. Parse + validate render params ────────────────────────────────────
    const width = parseInt(req.body.width, 10);
    const height = parseInt(req.body.height, 10);
    const durationSeconds = parseFloat(req.body.durationSeconds);
    const fps = parseInt(req.body.fps || '30', 10) as 24 | 30 | 60;
    const quality = (req.body.quality || 'standard') as 'draft' | 'standard' | 'high';

    if (!width || !height || Number.isNaN(durationSeconds)) {
      res.status(400).json({ error: 'Missing or invalid width / height / durationSeconds' });
      return;
    }
    if (![24, 30, 60].includes(fps)) {
      res.status(400).json({ error: 'fps must be 24, 30, or 60' });
      return;
    }
    if (!['draft', 'standard', 'high'].includes(quality)) {
      res.status(400).json({ error: 'quality must be draft, standard, or high' });
      return;
    }
    if (durationSeconds < 1 || durationSeconds > 60) {
      res.status(400).json({ error: 'durationSeconds must be between 1 and 60' });
      return;
    }

    // ── 3. Render ─────────────────────────────────────────────────────────────
    console.log(
      `[render] start  ${width}x${height}  ${durationSeconds}s  ${fps}fps  quality=${quality}  ` +
      `html=${(htmlContent.length / 1024).toFixed(0)} KB`
    );
    const t0 = Date.now();

    const mp4 = await renderHtmlToMp4({
      htmlContent,
      width,
      height,
      durationSeconds,
      fps,
      quality,
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[render] done   ${elapsed}s  output=${(mp4.length / 1024 / 1024).toFixed(1)} MB`
    );

    // ── 4. Return MP4 ─────────────────────────────────────────────────────────
    res.set({
      'Content-Type': 'video/mp4',
      'Content-Length': String(mp4.length),
      'Cache-Control': 'no-store',
    });
    res.send(mp4);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[render] error:', err);
    res.status(500).json({ error: message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
