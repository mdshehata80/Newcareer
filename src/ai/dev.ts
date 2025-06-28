import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-audio-response.ts';
import '@/ai/flows/speak-question-flow.ts';
import '@/ai/flows/generate-question-flow.ts';
import '@/ai/flows/speak-feedback-flow.ts';
