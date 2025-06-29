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
2.  Create a `.env.local` file at the root of the project.
3.  Add your Google AI API Key to the `.env.local` file. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
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

**Before your first deployment**, you must manually grant your backend permission to access your Google AI API Key.

1.  **Create a secret in Secret Manager:**
    *   In your Google Cloud project, go to Secret Manager.
    *   Create a secret with the **exact name** `GOOGLE_AI_API_KEY`.
    *   Put your API key in the secret's value.

2.  **Grant your backend access to the secret:**
    *   Go to Cloud Run in the Google Cloud Console.
    *   Find and click on your service (e.g., `mockinterviewer`).
    *   Go to the **Security** tab of the latest revision and copy the **Service account** email.
    *   Go back to Secret Manager, select the `GOOGLE_AI_API_KEY` secret, and **Add Principal**.
    *   Paste the service account email and give it the **`Secret Manager Secret Accessor`** role.

Once these permissions are set, push a commit to the `main` branch to trigger a successful deployment.
