<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1ed43b03-f60a-41c6-b685-1af4fd8d07a5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env](.env) to your Gemini API key.
3. Run the app:
   `npm run dev`

## Deployment & Security

To maintain a secure environment and avoid API key exposure:
- **Never commit** your `.env` file.
- Add your API key to **Vercel** in settings > Environment Variables as `VITE_GEMINI_API_KEY`.
- We have optimized the configuration to prevent the key from being hardcoded into the build process, ensuring it's only available via environment variables.

