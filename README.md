<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/89e034de-f2ac-4550-8cb4-4a7357993b8c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Data Backend

The app now uses a backend adapter for appointments instead of Firebase.

1. Default mode is `sheet`, which expects a Google Apps Script or Web App endpoint.
2. If `VITE_SHEETS_ENDPOINT_URL` is not set, the app uses `localStorage` so you can keep building immediately.
3. Later, you can switch the same adapter to Supabase by changing `VITE_BACKEND_MODE` and replacing the adapter internals, without changing the UI.

See [guides/google-sheets-setup.md](guides/google-sheets-setup.md) for the exact Google Sheets deployment steps and the Apps Script file to paste.
