'use server';

/**
 * @fileOverview A Genkit flow for generating a common interview question for a given job role.
 *
 * - generateInterviewQuestion - A function that takes a job role and returns a relevant interview question.
 * - GenerateInterviewQuestionOutput - The return type for the generateInterviewQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateInterviewQuestionOutputSchema = z.object({
  question: z.string().describe('A common interview question for the specified job role.'),
});
export type GenerateInterviewQuestionOutput = z.infer<typeof GenerateInterviewQuestionOutputSchema>;

export async function generateInterviewQuestion(jobRole: string): Promise<GenerateInterviewQuestionOutput> {
  return generateInterviewQuestionFlow(jobRole);
}

const generateInterviewQuestionPrompt = ai.definePrompt({
  name: 'generateInterviewQuestionPrompt',
  input: {schema: z.object({ jobRole: z.string() })},
  output: {schema: GenerateInterviewQuestionOutputSchema},
  prompt: `You are an expert career coach and interview preparer. Your task is to generate a single, insightful interview question for a specific job role. Avoid overly common or generic questions like "Tell me about yourself." Instead, provide a question that is relevant to the role but encourages a thoughtful, non-rehearsed answer. Ensure the questions you generate are varied each time this prompt is used.
  
  Generate one interview question for the following job role: {{{jobRole}}}
  
  Please provide only the question itself.`,
  config: {
    temperature: 0.8,
  },
});


const generateInterviewQuestionFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionFlow',
    inputSchema: z.string(),
    outputSchema: GenerateInterviewQuestionOutputSchema,
  },
  async (jobRole) => {
    const {output} = await generateInterviewQuestionPrompt({ jobRole });
    return output!;
  }
);
