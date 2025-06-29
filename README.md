# LinguaLens: AI Interview Coach

This is a Next.js project for an AI-powered interview coach, built with Firebase App Hosting.

## Local Development

To run this project locally, you will need to:

1.  Install the dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env` file at the root of the project.
3.  Add your Google AI API Key to the `.env` file:
    ```
    GOOGLE_AI_API_KEY="your_api_key_here"
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

## Deployment with Firebase App Hosting

This project is configured for Firebase App Hosting. Deployments are triggered automatically when you push to the `main` branch of your connected GitHub repository.

Before your first deployment, ensure you have:

1.  Created a backend in Firebase App Hosting and connected your GitHub repository.
2.  Added your `GOOGLE_AI_API_KEY` as a secret in Secret Manager in your Google Cloud project.
3.  Granted the backend's service account the **Secret Manager Secret Accessor** IAM role so it can access the API key secret.
