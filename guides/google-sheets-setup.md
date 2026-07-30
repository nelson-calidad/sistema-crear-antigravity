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

## Módulo Responsabilidades

El archivo `apps-script/Code.gs` también contiene el módulo de Responsabilidades. Luego de pegarlo y desplegar una nueva versión del Web App:

1. Abrí la nueva sección **Responsabilidades** en la aplicación. En su primera carga se crearán automáticamente las hojas `FUNDADORAS`, `PERIODOS_ACTIVIDADES`, `ACTIVIDADES`, `HISTORIAL_ACTIVIDADES` y `CONFIG_ACTIVIDADES`.
2. Como alternativa, desde el editor de Apps Script ejecutá manualmente `crearHojasActividades()` y autorizá el acceso al spreadsheet.
3. En `FUNDADORAS`, cargá las cuatro fundadoras con `ID_FUNDADORA` únicos (por ejemplo `FUN-0001`), `NOMBRE_MOSTRAR`, `ORDEN` del 1 al 4 y `ACTIVA` = `Sí`.
4. Desde la aplicación creá el primer período y luego las actividades.

La versión actual sólo solicita el nombre de la actividad y, de forma opcional, su responsable. Las columnas antiguas de puntos y evidencia se conservan en Sheets sin usarse, para no borrar información previa.

Si el Apps Script es un proyecto independiente, guardá el ID del spreadsheet en **Project Settings → Script properties** con la clave `SPREADSHEET_ID`. Si está vinculado al spreadsheet, no hace falta configurar esa propiedad.
