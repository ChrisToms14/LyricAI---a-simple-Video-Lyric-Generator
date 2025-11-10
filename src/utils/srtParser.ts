export interface SubtitleCue {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

function parseTimestamp(timestamp: string): number {
  const [time, milliseconds] = timestamp.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
}

export function parseSRT(srtContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);

    if (!timeMatch) continue;

    const startTime = parseTimestamp(timeMatch[1]);
    const endTime = parseTimestamp(timeMatch[2]);
    const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '');

    cues.push({ index, startTime, endTime, text });
  }

  return cues;
}

export async function readSRTFile(file: File): Promise<SubtitleCue[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const cues = parseSRT(content);
        resolve(cues);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function generateSampleSRT(): SubtitleCue[] {
  return [
    {
      index: 1,
      startTime: 0.5,
      endTime: 3.0,
      text: 'Welcome to LyricAI'
    },
    {
      index: 2,
      startTime: 3.5,
      endTime: 6.0,
      text: 'Create beautiful lyric videos'
    },
    {
      index: 3,
      startTime: 6.5,
      endTime: 9.0,
      text: 'With stunning animations'
    },
    {
      index: 4,
      startTime: 9.5,
      endTime: 12.0,
      text: 'And professional styles'
    }
  ];
}
