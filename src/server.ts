import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import { renderHtmlToMp4 } from './render';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Multer for multipart form (HTML file upload) — store in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'ad-recorder-backend' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/render', upload.single('html'), async (req: Request, res: Response) => {
  try {
    let htmlContent: string;
    if (req.file) {
      htmlContent = req.file.buffer.toString('utf-8');
    } else if (req.body?.htmlContent) {
      htmlContent = req.body.htmlContent;
    } else {
      return res.status(400).json({ error: 'No HTML provided (upload "html" file or JSON htmlContent)' });
    }

    const width = parseInt(req.body.width, 10);
    const height = parseInt(req.body.height, 10);
    const durationSeconds = parseFloat(req.body.durationSeconds);
    const fps = parseInt(req.body.fps || '30', 10) as 24 | 30 | 60;
    const quality = (req.body.quality || 'standard') as 'draft' | 'standard' | 'high';

    if (!width || !height || !durationSeconds) {
      return res.status(400).json({ error: 'Missing width/height/durationSeconds' });
    }
    if (![24, 30, 60].includes(fps)) {
      return res.status(400).json({ error: 'fps must be 24, 30, or 60' });
    }
    if (!['draft', 'standard', 'high'].includes(quality)) {
      return res.status(400).json({ error: 'quality must be draft, standard, or high' });
    }
    if (durationSeconds < 1 || durationSeconds > 60) {
      return res.status(400).json({ error: 'durationSeconds must be between 1 and 60' });
    }

    console.log(`[render] starting: ${width}x${height} ${durationSeconds}s @ ${fps}fps quality=${quality}`);
    const startTime = Date.now();

    const mp4 = await renderHtmlToMp4({
      htmlContent,
      width,
      height,
      durationSeconds,
      fps,
      quality,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[render] done in ${elapsed}s, ${(mp4.length / 1024 / 1024).toFixed(1)} MB`);

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Length': String(mp4.length),
      'Cache-Control': 'no-store',
    });
    res.send(mp4);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[render] failed:', err);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
