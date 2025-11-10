export type Timestamp = number;

export type LyricLine = {
  id: string;
  start: number; // seconds
  end: number;   // seconds
  text: string;
};

export type StyleConfig = {
  fontFamily: string;
  fontSize: number; // px
  color: string;
  background: string; // gradient or rgba
  animation: 'fade' | 'slide' | 'pop';
  align: 'left' | 'center' | 'right';
  position: 'top' | 'middle' | 'bottom';
  opacity: number; // 0-1
};

export type ProjectRecord = {
  id: string;
  videoUrl: string;
  srtUrl?: string;
  lyrics: LyricLine[];
  style: StyleConfig;
  finalUrl?: string;
  createdAt: Timestamp;
};