import { useCallback, useState } from 'react';
import { Upload, FileVideo, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onFileUpload: (file: File, type: 'video' | 'srt') => void;
  uploadedVideo?: File | null;
  uploadedSrt?: File | null;
}

export function UploadZone({ onFileUpload, uploadedVideo, uploadedSrt }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    setTimeout(() => {
      if (file.name.endsWith('.srt')) {
        onFileUpload(file, 'srt');
      } else if (file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.type.startsWith('video/')) {
        onFileUpload(file, 'video');
      }
      setUploadProgress(null);
    }, 1000);
  };

  const removeFile = (type: 'video' | 'srt', e: React.MouseEvent) => {
    e.stopPropagation();
    onFileUpload(null as any, type);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 backdrop-blur-lg ${
          dragActive
            ? 'border-primary bg-primary/10 scale-105'
            : 'border-border bg-card/50 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".mp4,.webm,.srt"
          onChange={handleChange}
        />

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{
                y: dragActive ? -10 : 0,
                scale: dragActive ? 1.1 : 1
              }}
              className="p-4 bg-primary/10 rounded-full"
            >
              <Upload className="w-12 h-12 text-primary" />
            </motion.div>

            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">
                Drop your files here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports MP4, WEBM videos and SRT subtitle files
              </p>
            </div>
          </div>
        </label>

        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {uploadedVideo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-3 p-4 bg-card/50 backdrop-blur-lg rounded-xl border border-border"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileVideo className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedVideo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedVideo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => removeFile('video', e)}
                className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </motion.div>
          )}

          {uploadedSrt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-3 p-4 bg-card/50 backdrop-blur-lg rounded-xl border border-border"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedSrt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedSrt.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={(e) => removeFile('srt', e)}
                className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
