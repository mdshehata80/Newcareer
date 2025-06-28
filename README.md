# Firebase Studio - MockInterviewer

This is a NextJS starter project for Firebase Studio that helps you practice for job interviews.

This project is configured for Firebase App Hosting. Deployments are triggered automatically when you push to the `main` branch.

## Local Development

To get started, take a look at `src/app/page.tsx`. You will need to create a `.env` file at the root of the project and add your `GOOGLE_AI_API_KEY`.

## Deployment

1.  Connect your GitHub repository.
2.  Create a backend in Firebase App Hosting.
3.  Ensure you have added the `GOOGLE_AI_API_KEY` as a secret in your Firebase App Hosting backend settings and granted the backend's service account the "Secret Manager Secret Accessor" role.
4.  App Hosting will automatically build and deploy your application upon every push to the `main` branch.

Ready for version control!
