import { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StylePreset } from './StyleSelector';
import { uploadUnsigned } from '../lib/cloudinary';
import type { LyricLine, StyleConfig } from '../utils/types';
import { readSRTFile } from '../utils/srtParser';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface RenderEngineProps {
  videoFile: File | null;
  style: StylePreset;
  subtitles?: { index: number; startTime: number; endTime: number; text: string }[];
  srtUrl?: string;
  onRenderComplete?: (videoUrl: string) => void;
}

export function RenderEngine({ videoFile, style, subtitles, srtUrl, onRenderComplete }: RenderEngineProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRender = async () => {
    if (!videoFile) {
      setError('Please upload a video before rendering.');
      return;
    }
    setError(null);
    setIsRendering(true);
    setRenderProgress(5);
    setIsComplete(false);
    setOutputUrl(null);

    try {
      // 1) Upload video to Cloudinary
      let inputVideoUrl: string | null = null;
      try {
        console.log('Uploading video to Cloudinary...');
        const vidUpload = await uploadUnsigned(videoFile, 'video');
        inputVideoUrl = vidUpload?.secure_url || null;
        if (!inputVideoUrl) throw new Error('Missing Cloudinary secure_url');
        console.log('Video uploaded to Cloudinary:', inputVideoUrl);
      } catch (cloudErr) {
        console.error('Cloudinary upload failed:', cloudErr);
        throw new Error('Video upload to Cloudinary failed. Please check preset and API keys.');
      }
      if (!inputVideoUrl) {
        throw new Error('Failed to upload video to Cloudinary');
      }
      setRenderProgress(20);

      // 2) Build lyrics
      const lyrics: LyricLine[] = (subtitles || []).map((c) => ({ 
        id: String(c.index), 
        start: c.startTime, 
        end: c.endTime, 
        text: c.text 
      }));
      
      if (lyrics.length === 0) {
        console.warn('No subtitles provided for rendering');
        setError('No subtitles found. Please upload an SRT file.');
        setIsRendering(false);
        return;
      }

      // 3) Map style
      const styleConfig: StyleConfig = {
        fontFamily: style.fontFamily || 'Arial',
        fontSize: style.fontSize || 24,
        color: style.color || '#ffffff',
        background: style.backgroundColor || 'rgba(0,0,0,0.5)',
        animation: (['fade','slide','pop'].includes(style.animation) ? (style.animation as any) : 'fade'),
        align: style.position === 'center' ? 'center' : style.position === 'top' ? 'left' : 'center',
        position: style.position === 'center' ? 'middle' : (style.position as any),
        opacity: 0.95,
      };
      setRenderProgress(35);
      console.log('Style configuration:', styleConfig);

      // 4) Save upload metadata and create project in Firestore
      const userId = auth.currentUser?.uid || 'guest';
      try {
        await addDoc(collection(db, 'videos'), {
          userId,
          videoUrl: inputVideoUrl,
          srtUrl: srtUrl || null,
          createdAt: serverTimestamp(),
          status: 'uploaded',
        });
        console.log('Saved video metadata to Firestore');
      } catch (metaErr) {
        console.warn('Failed to save video metadata:', metaErr);
      }

      // 5) Create project in Firestore for rendering (non-fatal if it fails)
      console.log('Creating Firestore project record...');
      let currentProjectId: string | null = null;
      try {
        const projectRef = await addDoc(collection(db, 'projects'), {
          videoUrl: inputVideoUrl,
          lyrics,
          style: styleConfig,
          createdAt: serverTimestamp(),
          status: 'rendering'
        });
        console.log('Created project with ID:', projectRef.id);
        currentProjectId = projectRef.id;
      } catch (projErr) {
        console.warn('Failed to create Firestore project record (continuing):', projErr);
      }
      setRenderProgress(50);

      // 6) Call render API with timeout and retry
      console.log('Calling render API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      try {
        const resp = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            videoUrl: inputVideoUrl, 
            lyrics, 
            style: styleConfig, 
            projectId: currentProjectId 
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Render API failed: ${resp.status} ${errorText}`);
        }
        
        const data = await resp.json();
        if (!data || !data.url) {
          throw new Error('Render API returned invalid response');
        }
        
        console.log('Render completed successfully:', data.url);
        setRenderProgress(95);

        // Update Firestore with final URL (non-fatal if it fails)
        if (currentProjectId) {
          try {
            await updateDoc(doc(db, 'projects', currentProjectId), { 
              finalUrl: data.url,
              status: 'completed'
            });
            console.log('Updated Firestore with final URL');
          } catch (finalUpdateErr) {
            console.warn('Failed to update Firestore with final URL (continuing):', finalUpdateErr);
          }
        } else {
          console.log('Skipping Firestore final URL update: no project ID');
        }
        
        setRenderProgress(100);
        setIsRendering(false);
        setIsComplete(true);
        setOutputUrl(data.url);
        onRenderComplete?.(data.url);
      } catch (apiError: any) {
        if (apiError.name === 'AbortError') {
          throw new Error('Rendering timed out after 2 minutes');
        }
        throw apiError;
      }
    } catch (e: any) {
      // Treat Firestore aborted channel errors as non-actionable in dev logs
      const msg = e?.message || '';
      if (msg.includes('google.firestore.v1.Firestore/Write/channel') || msg.includes('net::ERR_ABORTED')) {
        console.warn('Non-fatal Firestore channel abort encountered:', msg);
      } else {
        console.error('Render error:', e);
      }
      setIsRendering(false);
      setError(e?.message || 'Render failed');
      
      // Try to update Firestore with error status if we have a project reference
      try {
        // Update the most recent project record for this user/video
        const projectsRef = collection(db, 'projects');
        const qSnap = await getDocs(query(
          projectsRef,
          orderBy('createdAt', 'desc'),
          limit(1)
        ));
        if (!qSnap.empty) {
          const projId = qSnap.docs[0].id;
          try {
            await updateDoc(doc(db, 'projects', projId), {
              status: 'error',
              errorMessage: e?.message || 'Unknown error'
            });
            console.log('Updated Firestore with error status');
          } catch (updateErr) {
            console.warn('Failed to update Firestore error status (continuing):', updateErr);
          }
        }
      } catch (dbError) {
        console.error('Failed to update error status in Firestore:', dbError);
      }
    }
  };

  const downloadVideo = () => {
    if (!outputUrl) return;

    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `lyricai-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-card/50 backdrop-blur-lg rounded-xl border border-border p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-foreground mb-2">Render Your Video</h3>
            <p className="text-muted-foreground">
              Generate your lyric video with the selected style
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {!isRendering && !isComplete && (
              <motion.button
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={startRender}
                disabled={!videoFile || !(subtitles && subtitles.length > 0)}
                className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                  videoFile && subtitles && subtitles.length > 0
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Start Rendering
              </motion.button>
            )}

            {isRendering && (
              <motion.div
                key="rendering"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-3 py-4">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-lg font-medium">Rendering your video...</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{renderProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${renderProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                {error && <div className="text-red-400 text-sm">{error}</div>}

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {Math.floor(renderProgress / 3)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {Math.floor(renderProgress / 2.5)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Rendering</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {renderProgress}%
                    </div>
                    <div className="text-xs text-muted-foreground">Finalizing</div>
                  </div>
                </div>
              </motion.div>
            )}

            {isComplete && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center justify-center gap-4 py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </motion.div>
                  <div className="text-center">
                    <h4 className="text-xl font-semibold text-foreground mb-2">
                      Video Ready!
                    </h4>
                    <p className="text-muted-foreground">
                      Your lyric video has been generated successfully
                    </p>
                  </div>
                </div>

                {outputUrl && (
                  <>
                    <div className="w-full">
                      <video
                        src={outputUrl}
                        controls
                        className="w-full rounded-xl border border-border mb-4"
                      />
                    </div>
                    <a
                      href={`${outputUrl}?fl_attachment`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </a>
                  </>
                )}

                <button
                  onClick={() => {
                    setIsComplete(false);
                    setOutputUrl(null);
                  }}
                  className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-medium transition-colors"
                >
                  Create Another
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Style:</span>
                <span className="ml-2 font-medium">{style.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>
                <span className="ml-2 font-medium">MP4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
