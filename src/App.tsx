import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { UploadZone } from './components/UploadZone';
import { VideoPreview } from './components/VideoPreview';
import { StyleSelector, presets } from './components/StyleSelector';
import { RenderEngine } from './components/RenderEngine';
import { readSRTFile, generateSampleSRT } from './utils/srtParser';
import type { SubtitleCue } from './utils/srtParser';
import type { StylePreset } from './components/StyleSelector';
import { uploadUnsigned } from './lib/cloudinary';
import { ensureAuthWithEmailPassword, ensureAnonymousAuth, db, auth } from './lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type Step = 'upload' | 'preview' | 'style' | 'render';

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [srtUrl, setSrtUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>({...presets[0], fontFamily: 'SF Pro Display, system-ui, sans-serif', fontSize: 36});

  useEffect(() => {
    // Try email/password auth first, fallback to anonymous
    const init = async () => {
      await ensureAuthWithEmailPassword(
        'christhomasabraham.b23cs1221@mbcet.ac.in',
        'Chris#2005'
      );

      // Record an app session document so Firestore shows structure
      try {
        await addDoc(collection(db, 'appSessions'), {
          userId: auth.currentUser?.uid || 'guest',
          createdAt: serverTimestamp(),
        });
        console.log('App session recorded in Firestore');
      } catch (e) {
        console.warn('Failed to record app session:', e);
      }
    };
    init();
  }, []);

  const handleFileUpload = async (file: File | null, type: 'video' | 'srt') => {
    if (!file) {
      if (type === 'video') {
        setVideoFile(null);
      } else {
        setSrtFile(null);
        setSubtitles([]);
      }
      return;
    }

    if (type === 'video') {
      setVideoFile(file);
      if (!srtFile) {
        setSubtitles(generateSampleSRT());
      }
    } else {
      setSrtFile(file);
      try {
        const cues = await readSRTFile(file);
        setSubtitles(cues);

        // Upload SRT to Cloudinary (raw)
        const res = await uploadUnsigned(file, 'raw');
        const url = res?.secure_url as string | undefined;
        if (!url) throw new Error('Missing Cloudinary secure_url');
        setSrtUrl(url);
      } catch (error) {
        console.error('Error parsing SRT file:', error);
      }
    }
  };

  const goToNextStep = () => {
    const steps: Step[] = ['upload', 'preview', 'style', 'render'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'upload':
        return videoFile !== null;
      case 'preview':
        return subtitles.length > 0;
      case 'style':
        return selectedStyle !== null;
      default:
        return true;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload':
        return 'Upload Your Content';
      case 'preview':
        return 'Preview & Sync';
      case 'style':
        return 'Choose Your Style';
      case 'render':
        return 'Generate Video';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <AnimatedBackground />
      <Navbar />

      <main className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Lyric Videos</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {getStepTitle()}
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create stunning lyric videos in minutes with beautiful animations and professional styles
          </p>
        </motion.div>

        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3">
            {(['upload', 'preview', 'style', 'render'] as Step[]).map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const steps: Step[] = ['upload', 'preview', 'style', 'render'];
                    const stepIndex = steps.indexOf(step);
                    const currentIndex = steps.indexOf(currentStep);
                    if (stepIndex <= currentIndex) {
                      setCurrentStep(step);
                    }
                  }}
                  className={`w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
                    currentStep === step
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : index < (['upload', 'preview', 'style', 'render'] as Step[]).indexOf(currentStep)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </motion.button>
                {index < 3 && (
                  <div className={`w-12 h-1 rounded-full transition-colors ${
                    index < (['upload', 'preview', 'style', 'render'] as Step[]).indexOf(currentStep)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mb-12"
        >
          {currentStep === 'upload' && (
            <UploadZone
              onFileUpload={handleFileUpload}
              uploadedVideo={videoFile}
              uploadedSrt={srtFile}
            />
          )}

          {currentStep === 'preview' && (
            <VideoPreview
              videoFile={videoFile}
              subtitles={subtitles}
              style={selectedStyle}
            />
          )}

          {currentStep === 'style' && (
            <StyleSelector
              selectedStyle={selectedStyle}
              onStyleSelect={setSelectedStyle}
            />
          )}

          {currentStep === 'render' && (
            <RenderEngine
              videoFile={videoFile}
              style={selectedStyle}
              subtitles={subtitles}
              srtUrl={srtUrl || undefined}
            />
          )}
        </motion.div>

        {currentStep !== 'render' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className={`group px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                canProceed()
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className={`w-5 h-5 transition-transform ${canProceed() ? 'group-hover:translate-x-1' : ''}`} />
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default App;
