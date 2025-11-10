import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { v2 as cloudinary } from 'cloudinary';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = express.Router();
router.use(express.json({ limit: '20mb' }));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dapxr5zok',
  api_key: process.env.CLOUDINARY_API_KEY || '163415781228883',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'EWhYbD2XnA57uow5kaAPj1MOPBk',
});

// Firebase Admin (optional Firestore update)
let adminInited = false;
try {
  initializeApp({ credential: applicationDefault() });
  adminInited = true;
} catch {}
const adminDb = adminInited ? getFirestore() : undefined;

type LyricLine = { id: string; start: number; end: number; text: string };
type StyleConfig = {
  fontFamily: string;
  fontSize: number;
  color: string;
  background: string; // rgba or gradient (boxcolor will use rgba)
  animation: 'fade' | 'slide' | 'pop';
  align: 'left' | 'center' | 'right';
  position: 'top' | 'middle' | 'bottom';
  opacity: number;
};

router.post('/render', async (req, res) => {
  try {
    const { videoUrl, lyrics, style, projectId } = req.body as {
      videoUrl: string;
      lyrics: LyricLine[];
      style: StyleConfig;
      projectId?: string;
    };

    if (!videoUrl || !Array.isArray(lyrics) || lyrics.length === 0) {
      return res.status(400).json({ error: 'Missing videoUrl or lyrics' });
    }

    // Prepare temp paths
    const inputPath = join(tmpdir(), `input-${Date.now()}.mp4`);
    const outputPath = join(tmpdir(), `output-${Date.now()}.mp4`);

    // Download input video to temp
    const resp = await fetch(videoUrl);
    if (!resp.ok) throw new Error('Failed to download input video');
    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(inputPath, buf);

    // Build drawtext filters per line
    const marginX = 50;
    const marginY = 50;
    const targetYExpr = style.position === 'top'
      ? `${marginY}`
      : style.position === 'middle'
      ? `(h-text_h)/2`
      : `h-text_h-${marginY}`;

    const targetXExpr = style.align === 'left'
      ? `${marginX}`
      : style.align === 'right'
      ? `w-text_w-${marginX}`
      : `(w-text_w)/2`;

    // Normalize colors to ffmpeg-accepted format
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const parseRgba = (rgba: string): { hex: string; alpha: number } | null => {
      const m = rgba.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i);
      if (!m) return null;
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
      const a = Math.max(0, Math.min(1, parseFloat(m[4])));
      return { hex: `0x${toHex(r)}${toHex(g)}${toHex(b)}`, alpha: a };
    };

    const normalizeColorNoAlpha = (color: string, fallback: string = '0xffffff') => {
      if (!color) return fallback;
      // #RRGGBB -> 0xRRGGBB
      const hex = color.match(/^#([0-9a-fA-F]{6})$/);
      if (hex) return `0x${hex[1]}`;
      // rgba(r,g,b,a) -> 0xRRGGBB (drop alpha)
      const pr = parseRgba(color);
      if (pr) return pr.hex;
      // Named colors or already a hex without #
      if (/^[0-9a-fA-F]{6}$/.test(color)) return `0x${color}`;
      return fallback;
    };

    const normalizeColorWithAlpha = (color: string, defaultAlpha = 0.4, fallback: string = '0x000000') => {
      if (!color) return `${fallback}@${defaultAlpha}`;
      const hexOnly = normalizeColorNoAlpha(color, fallback);
      const pr = parseRgba(color);
      const alpha = pr ? pr.alpha : defaultAlpha;
      return `${hexOnly}@${alpha}`;
    };

    const boxColor = normalizeColorWithAlpha(style.background, 0.1);
    const fontColor = normalizeColorNoAlpha(style.color, '0xffffff');

    const filters = lyrics.map((l) => {
      const enable = `between(t,${l.start},${l.end})`;
      let yExpr = targetYExpr;
      let xExpr = targetXExpr;
      if (style.animation === 'slide') {
        // slide up into position over 0.3s
        yExpr = `if(between(t,${l.start},${l.start}+0.3), ${targetYExpr}+20*(1-((t-${l.start})/0.3)), ${targetYExpr})`;
      } else if (style.animation === 'pop') {
        // emulate pop via small oscillation in y
        yExpr = `if(between(t,${l.start},${l.start}+0.2), ${targetYExpr}-5, ${targetYExpr})`;
      }

      const alphaExpr = style.animation === 'fade'
        ? `if(between(t,${l.start},${l.start}+0.25),(t-${l.start})/0.25, if(between(t,${l.end}-0.25,${l.end}),(${l.end}-t)/0.25,1))`
        : `${style.opacity}`;

      return {
        filter: 'drawtext',
        options: {
          // Escape text for ffmpeg drawtext; avoid interpreting special chars
          text: String(l.text || '')
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\'"),
          fontcolor: fontColor,
          fontsize: style.fontSize,
          x: xExpr,
          y: yExpr,
          box: 1,
          boxcolor: boxColor,
          boxborderw: 10,
          alpha: alphaExpr,
          enable,
          expansion: 'none',
        },
      } as any;
    });

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .outputOptions([
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-movflags', '+faststart',
        ])
        .complexFilter(filters as any)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    const uploadRes = await cloudinary.uploader.upload(outputPath, {
      resource_type: 'video',
      folder: 'lyricai/outputs',
    });

    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}

    if (projectId && adminDb) {
      try {
        await adminDb.collection('projects').doc(projectId).update({ finalUrl: uploadRes.secure_url });
      } catch {}
    }

    return res.json({ url: uploadRes.secure_url });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Render failed' });
  }
});

export default router;