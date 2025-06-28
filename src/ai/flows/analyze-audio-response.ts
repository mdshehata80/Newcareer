'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing audio responses and providing feedback on correctness, completeness, and clarity.
 *
 * - analyzeAudioResponse - A function that initiates the audio analysis process.
 * - AnalyzeAudioResponseInput - The input type for the analyzeAudioResponse function.
 * - AnalyzeAudioResponseOutput - The return type for the analyzeAudioResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AnalyzeAudioResponseInputSchema = z.object({
  question: z.string().describe('The question that was asked.'),
  modelAnswer: z.string().optional().describe('An optional model answer to compare against.'),
  audioDataUri: z
    .string()
    .describe(
      "The recorded audio response as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  transcript: z.string().optional().describe('An optional transcript of the audio.'),
});
export type AnalyzeAudioResponseInput = z.infer<typeof AnalyzeAudioResponseInputSchema>;

const AnalyzeAudioResponseOutputSchema = z.object({
  correctness: z.string().describe('Feedback on the correctness of the answer.'),
  completeness: z.string().describe('Feedback on the completeness of the answer.'),
  clarity: z.string().describe('Feedback on the clarity of the answer.'),
});
export type AnalyzeAudioResponseOutput = z.infer<typeof AnalyzeAudioResponseOutputSchema>;

export async function analyzeAudioResponse(
  input: AnalyzeAudioResponseInput
): Promise<AnalyzeAudioResponseOutput> {
  return analyzeAudioResponseFlow(input);
}

const analyzeAudioResponsePrompt = ai.definePrompt({
  name: 'analyzeAudioResponsePrompt',
  input: {schema: AnalyzeAudioResponseInputSchema},
  output: {schema: AnalyzeAudioResponseOutputSchema},
  prompt: `You are an AI assistant that analyzes spoken answers to questions and provides feedback.

  Analyze the following audio response to the question below, and provide feedback on its correctness, completeness, and clarity.

  Question: {{{question}}}
  {{#if modelAnswer}}
  A model answer has been provided for reference: {{{modelAnswer}}}
  When assessing correctness, please compare the user's spoken response to this model answer.
  {{/if}}
  Audio: {{media url=audioDataUri}}
  {{#if transcript}}
  Audio Transcript: {{{transcript}}}
  {{/if}}

  Provide detailed feedback on each of the following aspects:

  - Correctness: How accurate is the information provided in the response? {{#if modelAnswer}}Compare it to the provided model answer.{{/if}} The transcript may contain errors, so listen to the audio carefully.
  - Completeness: Does the response fully answer the question? Is any important information missing?
  - Clarity: How clear and easy to understand is the response? Consider factors like pronunciation, pacing, and filler words.

  Format your response as follows:

  Correctness: [Feedback on correctness]
  Completeness: [Feedback on completeness]
  Clarity: [Feedback on clarity]`,
});

const analyzeAudioResponseFlow = ai.defineFlow(
  {
    name: 'analyzeAudioResponseFlow',
    inputSchema: AnalyzeAudioResponseInputSchema,
    outputSchema: AnalyzeAudioResponseOutputSchema,
  },
  async input => {
    const {output} = await analyzeAudioResponsePrompt(input);
    return output!;
  }
);