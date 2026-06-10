import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { renderHtmlToMp4 } from './render.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'ad-recorder-backend' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/render', upload.single('html'), async (req, res) => {
  try {
    let htmlContent: string;
    if (req.file) {
      htmlContent = req.file.buffer.toString('utf-8');
    } else if (req.body?.htmlContent) {
      htmlContent = req.body.htmlContent;
    } else {
      res.status(400).json({ error: 'No HTML provided.' });
      return;
    }

    const width = parseInt(req.body.width, 10);
    const height = parseInt(req.body.height, 10);
    const durationSeconds = parseFloat(req.body.durationSeconds);
    const fps = parseInt(req.body.fps || '30', 10) as 24 | 30 | 60;
    const quality = (req.body.quality || 'standard') as 'draft' | 'standard' | 'high';

    if (!width || !height || !durationSeconds) {
      res.status(400).json({ error: 'Missing width, height, or durationSeconds.' });
      return;
    }

    console.log(`[render] ${width}x${height} ${durationSeconds}s @ ${fps}fps quality=${quality}`);
    const t0 = Date.now();

    const mp4 = await renderHtmlToMp4({ htmlContent, width, height, durationSeconds, fps, quality });

    console.log(`[render] done in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${(mp4.length / 1024 / 1024).toFixed(1)} MB`);

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Length': String(mp4.length),
      'Cache-Control': 'no-store',
    });
    res.send(mp4);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[render] failed:', err);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
