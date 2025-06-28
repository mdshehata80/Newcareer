import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const googleApiKey = process.env.GOOGLE_AI_API_KEY;

if (!googleApiKey) {
  // This error will be thrown on the server during initialization if the key is missing.
  // It provides a clear message for debugging deployment issues.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'The GOOGLE_AI_API_KEY environment variable is not set. ' +
      'Please add it to your environment secrets in your Firebase App Hosting backend settings.'
    );
  } else {
    throw new Error(
      'The GOOGLE_AI_API_KEY environment variable is not set. ' +
      'Please add it to your .env.local file for local development.'
    );
  }
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleApiKey,
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
