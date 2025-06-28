'use server';

/**
 * @fileOverview A Genkit flow for converting feedback text to speech.
 *
 * - speakFeedback - A function that takes text and returns an audio data URI.
 * - SpeakFeedbackOutput - The return type for the speakFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import wav from 'wav';

const SpeakFeedbackOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type SpeakFeedbackOutput = z.infer<typeof SpeakFeedbackOutputSchema>;

export async function speakFeedback(feedback: string): Promise<SpeakFeedbackOutput> {
  return speakFeedbackFlow(feedback);
}

const speakFeedbackFlow = ai.defineFlow(
  {
    name: 'speakFeedbackFlow',
    inputSchema: z.string(),
    outputSchema: SpeakFeedbackOutputSchema,
  },
  async (query) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: query,
    });

    if (!media) {
      throw new Error('No audio was generated.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d: Buffer) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}
