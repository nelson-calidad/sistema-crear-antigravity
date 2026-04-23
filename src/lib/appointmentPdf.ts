import { format, isSameDay } from 'date-fns';
import { AppointmentRecord } from '../types';
import { PROFESSIONALS, ROOMS } from '../constants';

const parseDay = (value?: string | Date | null) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatTimeOnly = (value?: string) => {
  if (!value) return '--:--';

  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return String(value).slice(0, 5);
};

const getTypeLabel = (type?: string) => {
  if (type === 'interview') return 'Entrevista';
  if (type === 'survey') return 'Encuesta';
  return 'Sesion';
};

const getCoverageLabel = (appointment: AppointmentRecord) => appointment.coverageType || 'particular';

const getCorrespondsToLabel = (appointment: AppointmentRecord) => {
  const pro = PROFESSIONALS.find((p) => p.id === appointment.proId);
  const room = ROOMS.find((r) => r.id === appointment.roomId);

  if (pro && room) return `${pro.name} · ${room.name}`;
  if (pro) return pro.name;
  if (room) return room.name;
  return 'Sin asignar';
};

const sortByStart = (items: AppointmentRecord[]) => [...items].sort((a, b) => a.start.localeCompare(b.start));

const getStats = (appointments: AppointmentRecord[]) => {
  const coverage = appointments.reduce(
    (acc, appointment) => {
      const key = getCoverageLabel(appointment);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { particular: 0, 'obra social': 0 } as Record<string, number>,
  );

  const types = appointments.reduce(
    (acc, appointment) => {
      const key = getTypeLabel(appointment.type);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { Sesion: 0, Entrevista: 0, Encuesta: 0 } as Record<string, number>,
  );

  return { coverage, types };
};

const renderReportShell = (title: string, subtitle: string, body: string, landscape = false) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: ${landscape ? 'A4 landscape' : 'A4 portrait'};
        margin: 14mm;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #f8fafc; color: #0f172a; font-family: Inter, Arial, sans-serif; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { max-width: 1120px; margin: 0 auto; padding: 0; }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        padding: 18px 20px;
        border-radius: 24px;
        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
        color: white;
        margin-bottom: 16px;
      }
      .hero h1 { margin: 0; font-size: 28px; line-height: 1.05; }
      .hero p { margin: 6px 0 0; color: rgba(255,255,255,.8); font-size: 12px; }
      .meta { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,.14);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }
      .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 800; }
      .card .value { margin-top: 8px; font-size: 24px; font-weight: 900; color: #0f172a; }
      .grid { display: grid; gap: 12px; }
      .section {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 12px;
      }
      .section-header h2 { margin: 0; font-size: 18px; }
      .section-header span { font-size: 12px; color: #64748b; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        text-align: left;
        padding: 10px 8px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 12px;
        vertical-align: top;
      }
      th {
        text-transform: uppercase;
        letter-spacing: .08em;
        font-size: 10px;
        color: #64748b;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .badge.session { background: #dbeafe; color: #1d4ed8; }
      .badge.interview { background: #fef3c7; color: #92400e; }
      .badge.survey { background: #0f172a; color: white; }
      .badge.coverage { background: #eef2ff; color: #4338ca; }
      .day-card {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 14px;
        margin-bottom: 12px;
        background: #fff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .day-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
        margin-bottom: 10px;
      }
      .day-top h3 { margin: 0; font-size: 16px; }
      .day-top p { margin: 0; font-size: 12px; color: #64748b; font-weight: 700; }
      .appointment-list { display: grid; gap: 8px; }
      .appointment-item {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      }
      .time { font-weight: 900; color: #0f172a; }
      .subtle { color: #64748b; font-size: 11px; font-weight: 700; margin-top: 4px; }
      .empty {
        padding: 22px;
        border: 1px dashed #cbd5e1;
        border-radius: 18px;
        text-align: center;
        color: #64748b;
        background: #f8fafc;
        font-weight: 700;
      }
      .footer {
        margin-top: 14px;
        color: #94a3b8;
        font-size: 11px;
        text-align: right;
      }
      @media print {
        body { background: white; }
        .sheet { max-width: none; }
        .hero, .card, .section, .day-card { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${body}
    </div>
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => window.print(), 250);
      });
    </script>
  </body>
</html>`;

const openPrintWindow = (title: string, html: string) => {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');
  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
  printWindow.focus();
};

export const buildDailyPdfHtml = (selectedDate: Date, appointments: AppointmentRecord[]) => {
  const dateLabel = format(selectedDate, 'EEEE, d MMMM yyyy');
  const sorted = sortByStart(appointments.filter((appointment) => {
    const appointmentDate = parseDay(appointment.date);
    return appointmentDate ? isSameDay(appointmentDate, selectedDate) : false;
  }));
  const { coverage, types } = getStats(sorted);
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  const rows = sorted.length
    ? sorted.map((appointment) => `
      <tr>
        <td><strong>${escapeHtml(formatTimeOnly(appointment.start))}</strong><div class="subtle">${escapeHtml(formatTimeOnly(appointment.end))}</div></td>
        <td><strong>${escapeHtml(appointment.patient || appointment.title || 'Sin título')}</strong><div class="subtle">${escapeHtml(getCorrespondsToLabel(appointment))}</div></td>
        <td><span class="badge ${appointment.type}">${escapeHtml(getTypeLabel(appointment.type))}</span></td>
        <td><span class="badge coverage">${escapeHtml(getCoverageLabel(appointment))}</span></td>
        <td>${escapeHtml(appointment.notes || '-')}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="5"><div class="empty">No hay turnos para este dia.</div></td></tr>`;

  return renderReportShell(
    `Agenda diaria - ${dateLabel}`,
    'Resumen listo para compartir con el equipo.',
    `
      <div class="hero">
        <div>
          <h1>Agenda diaria</h1>
          <p>${escapeHtml(dateLabel)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${escapeHtml(generatedAt)}</span>
          <span class="pill">Turnos: ${sorted.length}</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Total</div><div class="value">${sorted.length}</div></div>
        <div class="card"><div class="label">Particular</div><div class="value">${coverage.particular || 0}</div></div>
        <div class="card"><div class="label">Obra social</div><div class="value">${coverage['obra social'] || 0}</div></div>
        <div class="card"><div class="label">Tipos</div><div class="value">${types.Sesion || 0}/${types.Entrevista || 0}/${types.Encuesta || 0}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Detalle del dia</h2>
          <span>${escapeHtml(dateLabel)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Horario</th>
              <th>Paciente / destino</th>
              <th>Tipo</th>
              <th>Cobertura</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="footer">Reporte diario listo para imprimir o guardar como PDF.</div>
    `,
    false,
  );
};

export const buildMonthlyPdfHtml = (selectedDate: Date, appointments: AppointmentRecord[]) => {
  const monthLabel = format(selectedDate, 'MMMM yyyy');
  const monthAppointments = appointments.filter((appointment) => {
    const appointmentDate = parseDay(appointment.date);
    return appointmentDate ? appointmentDate.getMonth() === selectedDate.getMonth() && appointmentDate.getFullYear() === selectedDate.getFullYear() : false;
  });
  const { coverage, types } = getStats(monthAppointments);
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  const grouped = monthAppointments.reduce<Record<string, AppointmentRecord[]>>((acc, appointment) => {
    const parsed = parseDay(appointment.date);
    if (!parsed) return acc;
    const key = format(parsed, 'yyyy-MM-dd');
    acc[key] = acc[key] || [];
    acc[key].push(appointment);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();
  const daySections = sortedDates.length
    ? sortedDates.map((key) => {
        const parsed = parseDay(key);
        if (!parsed) return '';
        const dayAppointments = sortByStart(grouped[key]);
        return `
          <div class="day-card">
            <div class="day-top">
              <div>
                <h3>${escapeHtml(format(parsed, 'EEEE, d MMMM'))}</h3>
                <p>${dayAppointments.length} turno${dayAppointments.length === 1 ? '' : 's'}</p>
              </div>
              <div class="pill" style="background:#eff6ff;color:#1d4ed8">Dia ${escapeHtml(format(parsed, 'dd/MM'))}</div>
            </div>
            <div class="appointment-list">
              ${dayAppointments.map((appointment) => `
                <div class="appointment-item">
                  <div>
                    <div class="time">${escapeHtml(formatTimeOnly(appointment.start))} - ${escapeHtml(formatTimeOnly(appointment.end))}</div>
                    <div class="subtle">${escapeHtml(getCorrespondsToLabel(appointment))}</div>
                  </div>
                  <div>
                    <div><strong>${escapeHtml(appointment.patient || appointment.title || 'Sin título')}</strong></div>
                    <div class="subtle">
                      <span class="badge ${appointment.type}">${escapeHtml(getTypeLabel(appointment.type))}</span>
                      <span style="display:inline-block;width:6px"></span>
                      <span class="badge coverage">${escapeHtml(getCoverageLabel(appointment))}</span>
                    </div>
                    ${appointment.notes ? `<div class="subtle">${escapeHtml(appointment.notes)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')
    : `<div class="section"><div class="empty">No hay turnos para este mes.</div></div>`;

  return renderReportShell(
    `Agenda mensual - ${monthLabel}`,
    'Vista general para compartir con colaboradores.',
    `
      <div class="hero">
        <div>
          <h1>Agenda mensual</h1>
          <p>${escapeHtml(monthLabel)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${escapeHtml(generatedAt)}</span>
          <span class="pill">Turnos: ${monthAppointments.length}</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Total</div><div class="value">${monthAppointments.length}</div></div>
        <div class="card"><div class="label">Particular</div><div class="value">${coverage.particular || 0}</div></div>
        <div class="card"><div class="label">Obra social</div><div class="value">${coverage['obra social'] || 0}</div></div>
        <div class="card"><div class="label">Tipos</div><div class="value">${types.Sesion || 0}/${types.Entrevista || 0}/${types.Encuesta || 0}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Resumen del mes</h2>
          <span>${escapeHtml(monthLabel)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Total</th>
              <th>Cobertura particular</th>
              <th>Cobertura obra social</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Sesion</td><td>${types.Sesion || 0}</td><td>${coverage.particular || 0}</td><td>${coverage['obra social'] || 0}</td></tr>
            <tr><td>Entrevista</td><td>${types.Entrevista || 0}</td><td colspan="2">Ver detalle diario</td></tr>
            <tr><td>Encuesta</td><td>${types.Encuesta || 0}</td><td colspan="2">Ver detalle diario</td></tr>
          </tbody>
        </table>
      </div>
      <div class="grid">${daySections}</div>
      <div class="footer">Reporte mensual listo para imprimir o guardar como PDF.</div>
    `,
    true,
  );
};

export const openPrintableReport = (title: string, html: string) => {
  openPrintWindow(title, html);
};
