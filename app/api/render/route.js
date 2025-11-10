import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { v2 as cloudinary } from 'cloudinary';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
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

router.post('/render', async (req, res) => {
  try {
    const { videoUrl, lyrics, style, projectId } = req.body || {};

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

    // Normalize colors to ffmpeg-accepted formats and escape text
    const toHex = (n) => n.toString(16).padStart(2, '0');
    const parseRgba = (rgba) => {
      const m = String(rgba).match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i);
      if (!m) return null;
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
      const a = Math.max(0, Math.min(1, parseFloat(m[4])));
      return { hex: `0x${toHex(r)}${toHex(g)}${toHex(b)}`, alpha: a };
    };
    const normalizeColorNoAlpha = (color, fallback = '0xffffff') => {
      if (!color) return fallback;
      const hex = String(color).match(/^#([0-9a-fA-F]{6})$/);
      if (hex) return `0x${hex[1]}`;
      const pr = parseRgba(color);
      if (pr) return pr.hex;
      if (/^[0-9a-fA-F]{6}$/.test(String(color))) return `0x${String(color)}`;
      return fallback;
    };
    const normalizeColorWithAlpha = (color, defaultAlpha = 0.4, fallback = '0x000000') => {
      const hexOnly = normalizeColorNoAlpha(color, fallback);
      const pr = parseRgba(color);
      const alpha = pr ? pr.alpha : defaultAlpha;
      return `${hexOnly}@${alpha}`;
    };

    const boxColor = normalizeColorWithAlpha(style?.background, 0.1);
    const fontColor = normalizeColorNoAlpha(style?.color, '0xffffff');

    // Font fallback across OSes
    const fontCandidates = [
      'C:/Windows/Fonts/arial.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/System/Library/Fonts/Supplemental/Arial.ttf',
      '/Library/Fonts/Arial.ttf'
    ];
    const fontfile = fontCandidates.find((p) => existsSync(p));

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
          // Escape text for ffmpeg safely
          text: String(l.text || '')
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\'"),
          fontcolor: fontColor,
          fontsize: Number(style?.fontSize || 32),
          x: xExpr,
          y: yExpr,
          box: 1,
          boxcolor: boxColor,
          boxborderw: 10,
          alpha: alphaExpr,
          enable,
          // expansion can be sensitive across ffmpeg builds; default to normal
          // expansion: 'none',
          ...(fontfile ? { fontfile } : {}),
        },
      };
    });

    await new Promise((resolve, reject) => {
      console.log('Sample filter:', filters[0]);

      // Chain drawtext filters with explicit input/output labels
      const chained = filters.map((f, i) => ({
        filter: f.filter,
        options: f.options,
        inputs: i === 0 ? '0:v' : `v${i}`,
        outputs: `v${i + 1}`,
      }));

      const finalLabel = `v${filters.length}`;
      console.log('Filter chain labels:', chained.map(c => `${c.inputs}->${c.filter}->${c.outputs}`));

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-movflags', '+faststart',
          '-map', '0:a?',
          '-b:a', '192k',
        ])
        .complexFilter(chained, finalLabel)
        .on('start', (cmd) => {
          console.log('ffmpeg start:', cmd);
        })
        .on('progress', (p) => {
          try {
            console.log('ffmpeg progress:', p);
          } catch {}
        })
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => {
          console.error('ffmpeg error:', err?.message || err);
          if (stdout) console.error('ffmpeg stdout:', stdout);
          if (stderr) console.error('ffmpeg stderr:', stderr);
          reject(new Error(err?.message || 'FFmpeg failed'));
        })
        .save(outputPath);
    });

    let uploadRes;
    try {
      uploadRes = await cloudinary.uploader.upload(outputPath, {
        resource_type: 'video',
        folder: 'lyricai/outputs',
      });
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr);
      throw new Error('Cloudinary upload failed');
    }

    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}

    if (projectId && adminDb) {
      try {
        await adminDb.collection('projects').doc(projectId).update({ finalUrl: uploadRes.secure_url });
      } catch {}
    }

    return res.json({ url: uploadRes.secure_url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Render failed' });
  }
});

export default router;