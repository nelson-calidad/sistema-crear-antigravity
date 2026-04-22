# Google Sheets Backend Setup

This app can use the Google Sheet with ID:

`17eRyphluofIxIhH99Vq1KYINTJ8sY3nQT8JIahzXDJo`

## What this backend does

- `GET` returns all appointments as JSON.
- `POST` supports `create`, `update`, and `delete`.
- Data is stored in a sheet named `appointments`.

## Deploy steps

1. Open the spreadsheet.
2. Go to `Extensions -> Apps Script`.
3. Paste the contents of [apps-script/Code.gs](../apps-script/Code.gs).
4. Save the project.
5. Click `Deploy -> New deployment`.
6. Choose `Web app`.
7. Set `Execute as` to `Me`.
8. Set `Who has access` to `Anyone`.
9. Deploy and copy the Web App URL.

## App configuration

Set this in `.env.local`:

```env
VITE_BACKEND_MODE="sheet"
VITE_SHEETS_ENDPOINT_URL="YOUR_WEB_APP_URL"
```

## Notes

- The first request will create the `appointments` sheet and header row if they do not exist.
- `selectedDays` is stored as JSON in a single cell.
- If the browser blocks direct calls to Apps Script, we can switch to a small proxy endpoint next.
