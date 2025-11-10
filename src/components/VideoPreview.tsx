import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StylePreset } from './StyleSelector';
import type { SubtitleCue } from '../utils/srtParser';

interface VideoPreviewProps {
  videoFile: File | null;
  subtitles: SubtitleCue[];
  style: StylePreset;
}

export function VideoPreview({ videoFile, subtitles, style }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      const subtitle = subtitles.find(
        (cue) => time >= cue.startTime && time <= cue.endTime
      );
      setCurrentSubtitle(subtitle ? subtitle.text : '');
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [subtitles]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="aspect-video bg-muted/30 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
          <p className="text-muted-foreground">Upload a video to preview</p>
        </div>
      </div>
    );
  }

  const getSubtitleStyle = () => {
    const baseStyle: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      color: style.color,
      backgroundColor: style.backgroundColor,
      padding: '12px 24px',
      borderRadius: '8px',
      textAlign: 'center',
      maxWidth: '80%',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    };

    const positionStyle: React.CSSProperties =
      style.position === 'bottom' ? { bottom: '10%' } :
      style.position === 'top' ? { top: '10%' } :
      { top: '50%', transform: 'translateY(-50%)' };

    return { ...baseStyle, ...positionStyle };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-4"
    >
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          onEnded={() => setIsPlaying(false)}
        />

        {currentSubtitle && (
          <motion.div
            key={currentSubtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-1/2 -translate-x-1/2"
            style={getSubtitleStyle()}
          >
            {currentSubtitle}
          </motion.div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      </div>

      <div className="bg-card/50 backdrop-blur-lg rounded-xl border border-border p-4">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => skip(-10)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 bg-primary hover:bg-primary/90 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-primary-foreground" />
            ) : (
              <Play className="w-6 h-6 text-primary-foreground" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const video = videoRef.current;
                if (video) {
                  video.currentTime = parseFloat(e.target.value);
                }
              }}
              className="w-full accent-primary"
            />
          </div>

          <div className="text-sm text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
