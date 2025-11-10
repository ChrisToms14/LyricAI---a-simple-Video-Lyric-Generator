import { useEffect, useState } from 'react';
import type { LyricLine } from '../../utils/types';

type Props = {
  lyrics: LyricLine[];
  onChange: (lyrics: LyricLine[]) => void;
};

export default function LyricsEditor({ lyrics, onChange }: Props) {
  const [localLyrics, setLocalLyrics] = useState<LyricLine[]>(lyrics);

  useEffect(() => setLocalLyrics(lyrics), [lyrics]);

  const updateLine = (idx: number, patch: Partial<LyricLine>) => {
    const next = [...localLyrics];
    next[idx] = { ...next[idx], ...patch };
    setLocalLyrics(next);
    onChange(next);
  };

  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4">Lyric Lines</h3>
      <div className="space-y-3 max-h-[50vh] overflow-auto pr-2">
        {localLyrics.map((line, idx) => (
          <div key={line.id} className="grid grid-cols-12 gap-3 items-center">
            <input
              type="number"
              step="0.01"
              value={line.start}
              onChange={(e) => updateLine(idx, { start: parseFloat(e.target.value) })}
              className="col-span-2 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={line.end}
              onChange={(e) => updateLine(idx, { end: parseFloat(e.target.value) })}
              className="col-span-2 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={line.text}
              onChange={(e) => updateLine(idx, { text: e.target.value })}
              className="col-span-8 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}