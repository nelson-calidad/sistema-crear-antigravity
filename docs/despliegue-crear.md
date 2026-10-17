# Despliegue compartido de CREAR

## Arquitectura

El navegador no accede directamente a Google Sheets. Google Identity Services entrega un ID token; `server/index.mjs` verifica firma, audiencia, emisor y vencimiento. El servidor asigna el rol desde variables privadas y reenvía la operación a Apps Script usando un secreto ausente del bundle web.

Apps Script rechaza GET y cualquier POST sin el secreto. Para profesionales devuelve únicamente su perfil, acuerdos, entrevistas y turnos. Finanzas, consultas y datos de otras profesionales requieren rol administrativo.

## Configuración

1. Crear un cliente OAuth 2.0 web en Google Cloud y agregar el dominio HTTPS de producción a los orígenes JavaScript autorizados.
2. Configurar las variables de `.env.example`. `VITE_GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_ID` deben contener el mismo ID.
3. Generar un secreto aleatorio de al menos 32 caracteres. Guardarlo como `CREAR_PROXY_SECRET` en el servidor y como propiedad del proyecto Apps Script.
4. Configurar `CREAR_ADMIN_EMAILS` y `CREAR_PROFESSIONAL_ACCOUNTS`. Los IDs deben coincidir con las fichas profesionales.
5. Publicar `apps-script/Code.gs` como Web App ejecutado por el propietario. Todas las operaciones requieren el secreto del proxy. Nunca colocar ese secreto en variables `VITE_`.
6. Definir `APPS_SCRIPT_URL`, usar `VITE_BACKEND_MODE=sheet`, ejecutar `npm run build` y desplegar con `npm start` en un proveedor Node HTTPS. El servidor entrega `dist` y `/api/crear` desde el mismo origen.
7. Configurar la zona horaria del proyecto Apps Script y de la planilla como `America/Argentina/Jujuy`.

## Validación previa a datos reales

- Crear un registro de prueba no sensible desde una administradora y consultarlo desde un segundo dispositivo.
- Confirmar HTTP 403 para una cuenta no autorizada.
- Confirmar que una profesional solo ve sus turnos y no puede leer finanzas o consultas.
- Guardar simultáneamente dos reservas incompatibles y verificar que una sea rechazada.

Hasta completar estas pruebas con credenciales reales, usar `VITE_BACKEND_MODE=local` y datos no identificatorios. Ese modo muestra una advertencia y no sincroniza entre dispositivos.
