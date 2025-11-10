import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadUnsigned } from '../../lib/cloudinary';
import { readSRTFile } from '../../utils/srtParser';
import type { LyricLine, ProjectRecord, StyleConfig } from '../../utils/types';

type Props = {
  onCreated: (project: ProjectRecord) => void;
};

export default function Upload({ onCreated }: Props) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultStyle: StyleConfig = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 32,
    color: '#ffffff',
    background: 'linear-gradient(to right, #7c3aed, #a78bfa)',
    animation: 'fade',
    align: 'center',
    position: 'bottom',
    opacity: 0.9,
  };

  const handleCreate = async () => {
    if (!videoFile) return;
    setLoading(true);
    setError(null);
    try {
      const vidRes = await uploadUnsigned(videoFile, 'video');
      let lyrics: LyricLine[] = [];
      let srtUrl: string | undefined;
      if (srtFile) {
        const cues = await readSRTFile(srtFile);
        lyrics = cues.map((c) => ({ id: String(c.index), start: c.startTime, end: c.endTime, text: c.text }));
        const srtUpload = await uploadUnsigned(srtFile, 'raw');
        srtUrl = srtUpload.secure_url;
      }

      const docRef = await addDoc(collection(db, 'projects'), {
        videoUrl: vidRes.secure_url,
        srtUrl,
        lyrics,
        style: defaultStyle,
        createdAt: serverTimestamp(),
      });

      const project: ProjectRecord = {
        id: docRef.id,
        videoUrl: vidRes.secure_url,
        srtUrl,
        lyrics,
        style: defaultStyle,
        createdAt: Date.now(),
      };
      onCreated(project);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Upload Video (.mp4)</label>
          <input type="file" accept="video/mp4" onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Upload Subtitles (.srt)</label>
          <input type="file" accept=".srt" onChange={(e) => setSrtFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/90" />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button disabled={!videoFile || loading} onClick={handleCreate}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Project'}
        </button>
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  );
}