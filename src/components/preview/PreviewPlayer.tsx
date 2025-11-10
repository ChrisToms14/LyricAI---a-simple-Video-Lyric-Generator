import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import type { LyricLine, StyleConfig } from '../../utils/types';

type Props = {
  videoUrl: string;
  lyrics: LyricLine[];
  style: StyleConfig;
};

export default function PreviewPlayer({ videoUrl, lyrics, style }: Props) {
  const [time, setTime] = useState(0);

  const current = lyrics.find((l) => time >= l.start && time <= l.end);

  const positionClass =
    style.position === 'top' ? 'top-8' : style.position === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-12';
  const alignClass = style.align === 'left' ? 'items-start text-left' : style.align === 'right' ? 'items-end text-right' : 'items-center text-center';

  const variants = {
    fade: { initial: { opacity: 0 }, animate: { opacity: style.opacity }, exit: { opacity: 0 } },
    slide: { initial: { opacity: 0, y: 20 }, animate: { opacity: style.opacity, y: 0 }, exit: { opacity: 0, y: -20 } },
    pop: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: style.opacity, scale: 1 }, exit: { opacity: 0, scale: 0.95 } },
  } as const;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
        <ReactPlayer url={videoUrl} controls width="100%" height="100%" onProgress={(s) => setTime(s.playedSeconds)} />
      <div className={`absolute left-0 right-0 ${positionClass} px-6 flex ${alignClass}`}>
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={variants[style.animation].initial}
              animate={variants[style.animation].animate}
              exit={variants[style.animation].exit}
              transition={{ duration: 0.25 }}
              style={{ fontFamily: style.fontFamily, fontSize: style.fontSize, color: style.color }}
              className="px-4 py-2 rounded-xl"
            >
              <div style={{ background: style.background }} className="inline-block px-4 py-2 rounded-xl bg-clip-padding">
                {current.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}