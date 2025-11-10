import { motion } from 'framer-motion';
import { Type, Palette, Sparkles, Film } from 'lucide-react';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  animation: 'fade' | 'type' | 'flow' | 'bounce';
  position: 'bottom' | 'center' | 'top';
  icon: React.ReactNode;
}

const presets: StylePreset[] = [
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Clean sans serif, bottom center fade',
    fontFamily: 'Inter, sans-serif',
    fontSize: 42,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    animation: 'fade',
    position: 'bottom',
    icon: <Type className="w-5 h-5" />
  },
  {
    id: 'retro-neon',
    name: 'Retro Neon',
    description: 'Pink glow + animated fade-in',
    fontFamily: 'Courier New, monospace',
    fontSize: 48,
    color: '#ff6ec7',
    backgroundColor: 'rgba(255, 110, 199, 0.1)',
    animation: 'flow',
    position: 'center',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    id: 'lofi-type',
    name: 'Lofi Type',
    description: 'Typewriter effect, soft tones',
    fontFamily: 'Courier, monospace',
    fontSize: 38,
    color: '#c9ada7',
    backgroundColor: 'rgba(201, 173, 167, 0.2)',
    animation: 'type',
    position: 'bottom',
    icon: <Palette className="w-5 h-5" />
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Centered serif, slight motion blur',
    fontFamily: 'Georgia, serif',
    fontSize: 52,
    color: '#f5f5f5',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    animation: 'bounce',
    position: 'center',
    icon: <Film className="w-5 h-5" />
  }
];

interface StyleSelectorProps {
  selectedStyle: StylePreset;
  onStyleSelect: (style: StylePreset) => void;
}

export function StyleSelector({ selectedStyle, onStyleSelect }: StyleSelectorProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <h3 className="text-2xl font-semibold text-foreground mb-2">Choose Your Style</h3>
        <p className="text-muted-foreground">Select a preset or customize your own</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {presets.map((preset, index) => (
          <motion.button
            key={preset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            onClick={() => onStyleSelect(preset)}
            className={`group relative p-6 rounded-xl border-2 transition-all duration-300 text-left ${
              selectedStyle.id === preset.id
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card/70'
            }`}
          >
            <div className="flex flex-col space-y-3">
              <div
                className={`p-3 rounded-lg w-fit transition-colors ${
                  selectedStyle.id === preset.id
                    ? 'bg-primary/20'
                    : 'bg-muted group-hover:bg-primary/10'
                }`}
              >
                {preset.icon}
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1">{preset.name}</h4>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </div>

              <div className="pt-2 border-t border-border">
                <div
                  className="text-xs px-3 py-2 rounded-md"
                  style={{
                    fontFamily: preset.fontFamily,
                    color: preset.color,
                    backgroundColor: preset.backgroundColor
                  }}
                >
                  Preview
                </div>
              </div>
            </div>

            {selectedStyle.id === preset.id && (
              <motion.div
                layoutId="selected-indicator"
                className="absolute inset-0 border-2 border-primary rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 p-6 bg-card/50 backdrop-blur-lg rounded-xl border border-border"
      >
        <h4 className="font-semibold text-foreground mb-4">Customization Options</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Font Family</label>
            <select 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              value={selectedStyle.fontFamily}
              onChange={(e) => {
                const updatedStyle = { ...selectedStyle, fontFamily: e.target.value };
                onStyleSelect(updatedStyle);
              }}
            >
              <option value="Inter, sans-serif">Inter (Sans-serif)</option>
              <option value="SF Pro Display, system-ui, sans-serif">SF Pro (Apple)</option>
              <option value="Georgia, serif">Georgia (Serif)</option>
              <option value="Courier New, monospace">Courier (Monospace)</option>
              <option value="Arial, sans-serif">Arial (Sans-serif)</option>
              <option value="Times New Roman, serif">Times New Roman (Serif)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Font Size</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="24"
                max="72"
                value={selectedStyle.fontSize}
                onChange={(e) => {
                  const updatedStyle = { ...selectedStyle, fontSize: parseInt(e.target.value) };
                  onStyleSelect(updatedStyle);
                }}
                className="flex-1 accent-primary"
              />
              <span className="text-sm w-12 text-right">{selectedStyle.fontSize}px</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Text Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedStyle.color}
                onChange={(e) => {
                  const updatedStyle = { ...selectedStyle, color: e.target.value };
                  onStyleSelect(updatedStyle);
                }}
                className="w-10 h-10 rounded-md border border-border cursor-pointer"
              />
              <input
                type="text"
                value={selectedStyle.color}
                onChange={(e) => {
                  const updatedStyle = { ...selectedStyle, color: e.target.value };
                  onStyleSelect(updatedStyle);
                }}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Background</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedStyle.backgroundColor.startsWith('rgba') ? '#000000' : selectedStyle.backgroundColor}
                onChange={(e) => {
                  // Convert hex to rgba with opacity
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  const a = 0.5; // Default opacity
                  const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
                  const updatedStyle = { ...selectedStyle, backgroundColor: rgba };
                  onStyleSelect(updatedStyle);
                }}
                className="w-10 h-10 rounded-md border border-border cursor-pointer"
              />
              <input
                type="text"
                value={selectedStyle.backgroundColor}
                onChange={(e) => {
                  const updatedStyle = { ...selectedStyle, backgroundColor: e.target.value };
                  onStyleSelect(updatedStyle);
                }}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Animation</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              value={selectedStyle.animation}
              onChange={(e) => {
                const updatedStyle = { ...selectedStyle, animation: e.target.value as any };
                onStyleSelect(updatedStyle);
              }}
            >
              <option value="fade">Fade</option>
              <option value="type">Type</option>
              <option value="flow">Flow</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Position</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              value={selectedStyle.position}
              onChange={(e) => {
                const updatedStyle = { ...selectedStyle, position: e.target.value as any };
                onStyleSelect(updatedStyle);
              }}
            >
              <option value="bottom">Bottom</option>
              <option value="center">Center</option>
              <option value="top">Top</option>
            </select>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <h5 className="text-sm font-medium text-foreground mb-3">Live Preview</h5>
          <div 
            className="p-4 rounded-lg flex items-center justify-center min-h-16"
            style={{
              fontFamily: selectedStyle.fontFamily,
              fontSize: `${Math.min(selectedStyle.fontSize, 36)}px`,
              color: selectedStyle.color,
              backgroundColor: selectedStyle.backgroundColor
            }}
          >
            Sample Text
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export { presets };
