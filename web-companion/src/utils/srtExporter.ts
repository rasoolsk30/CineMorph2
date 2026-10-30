/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DialogueLine, SupportedLanguage } from '../types';

/**
 * Format seconds into SRT timestamp format: HH:MM:SS,mmm
 */
function formatSrtTimestamp(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const millis = Math.floor((safeSec % 1) * 1000);

  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Generates SubRip (.srt) formatted text from movie dialogues
 */
export function generateSrtContent(
  dialogues: DialogueLine[],
  targetLang: SupportedLanguage,
  offsetMs: number = 0
): string {
  const offsetSec = offsetMs / 1000;
  
  return dialogues
    .map((dialogue, index) => {
      const startSec = Math.max(0, dialogue.startTime + offsetSec);
      const endSec = Math.max(startSec + 0.5, dialogue.endTime + offsetSec);
      
      const startTime = formatSrtTimestamp(startSec);
      const endTime = formatSrtTimestamp(endSec);

      // Select localized dialogue based on targetLang
      let lineText = dialogue.teluguColloquial;
      if (targetLang === 'en') {
        lineText = dialogue.englishLiteral;
      } else if (targetLang === 'ko') {
        lineText = dialogue.originalText;
      }

      return `${index + 1}\n${startTime} --> ${endTime}\n[${dialogue.speaker}]: ${lineText}\n`;
    })
    .join('\n');
}

/**
 * Triggers a browser download of the generated SRT file
 */
export function downloadSrtFile(
  dialogues: DialogueLine[],
  movieTitle: string,
  targetLang: SupportedLanguage,
  offsetMs: number = 0
) {
  const srtContent = generateSrtContent(dialogues, targetLang, offsetMs);
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const cleanTitle = movieTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanTitle}_${targetLang.toUpperCase()}_CineMorph.srt`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
