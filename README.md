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

**IMPORTANT: Before your first deployment**, you must manually grant your backend permission to access your Google AI API Key. This only needs to be done once for each new backend. The first deployment will fail if this step is not completed first.

### Step 1: Find the Backend's Service Account

After creating your backend in Firebase App Hosting, a corresponding service is created in Cloud Run.

1.  Go to **Cloud Run** in the Google Cloud Console for your project.
2.  It may take a few minutes for the service to appear. Wait and refresh the page.
3.  Find your service. If your backend ID is `my-app`, the service name will look like `ssrmy-app-` followed by a random hash (e.g., `ssrinterviewtrainer-a1b2c3d4`).
4.  Click the service name, go to the **Revisions** tab, select the latest revision, and find the **Service account** email under the **Security** tab. Copy this full email address.

### Step 2: Grant Access to the API Key Secret

1.  Go to **Secret Manager** in the Google Cloud Console.
2.  Find the secret with the exact name **`GOOGLE_AI_API_KEY`**.
3.  Select the secret, and in the permissions panel on the right, click **"Add Principal"**.
4.  Paste the service account email you just copied.
5.  In the "Select a role" dropdown, grant it the **`Secret Manager Secret Accessor`** role.
6.  Click **"Save"**.

### Step 3: Trigger the Deployment

Once the permissions are set, push a commit to the `main` branch to trigger a successful deployment.
