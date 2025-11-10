import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { StyleConfig } from '../../utils/types';

type Props = {
  projectId: string;
  initial: StyleConfig;
  onChange: (style: StyleConfig) => void;
};

export default function StylePanel({ projectId, initial, onChange }: Props) {
  const [style, setStyle] = useState<StyleConfig>(initial);

  useEffect(() => setStyle(initial), [initial]);

  const update = async (patch: Partial<StyleConfig>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    onChange(next);
    try {
      await updateDoc(doc(db, 'projects', projectId), { style: next });
    } catch (e) {
      // ignore transient failures; UI stays responsive
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4">Customization</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2">Font Family</label>
          <input value={style.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-2">Font Size</label>
          <input type="number" value={style.fontSize} onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-2">Text Color</label>
          <input type="color" value={style.color} onChange={(e) => update({ color: e.target.value })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-2">Background</label>
          <input value={style.background} onChange={(e) => update({ background: e.target.value })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm" placeholder="CSS gradient or rgba()" />
        </div>
        <div>
          <label className="block text-sm mb-2">Animation</label>
          <select value={style.animation} onChange={(e) => update({ animation: e.target.value as StyleConfig['animation'] })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm">
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="pop">Pop</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-2">Alignment</label>
          <select value={style.align} onChange={(e) => update({ align: e.target.value as StyleConfig['align'] })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-2">Position</label>
          <select value={style.position} onChange={(e) => update({ position: e.target.value as StyleConfig['position'] })}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm">
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-2">Opacity</label>
          <input type="range" min={0} max={1} step={0.05} value={style.opacity} onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
            className="w-full" />
        </div>
      </div>
    </div>
  );
}