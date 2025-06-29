# LinguaLens: AI Interview Coach

This is a Next.js project for an AI-powered interview coach, built with Firebase App Hosting. It allows users to practice answering interview questions and receive AI-generated feedback on their spoken responses.

## Features

- **Dynamic Question Generation:** Generates interview questions based on a specified job role.
- **Text-to-Speech:** Reads the generated question aloud.
- **Voice Recording:** Allows users to record their answers.
- **AI-Powered Analysis:** Analyzes the recorded audio for correctness, completeness, and clarity.
- **Audio Feedback:** Reads the AI-generated feedback aloud.

## Local Development

To run this project locally, you will need to:

1.  Install the dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env` file at the root of the project.
3.  Add your Google AI API Key to the `.env` file. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    ```
    GOOGLE_AI_API_KEY="your_api_key_here"
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
The application will be available at `http://localhost:3000`.

## Deployment with Firebase App Hosting

This project is configured for Firebase App Hosting. Deployments are triggered automatically when you push to the `main` branch of your connected GitHub repository.

Before your first deployment, ensure you have:

1.  Created a backend in Firebase App Hosting and connected it to your GitHub repository.
2.  In your Google Cloud project, created a secret in **Secret Manager** with the exact name `GOOGLE_AI_API_KEY` and placed your API key in its value.
3.  Granted the backend's service account the **`Secret Manager Secret Accessor`** IAM role so it can access the API key secret. You can find the service account email in the **Settings** tab of your backend in the Firebase App Hosting console.
