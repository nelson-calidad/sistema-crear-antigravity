import { format, isSameDay, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import { getProfessionalsSnapshot, ProfessionalRecord } from './professionalsStore';

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

const getAppointmentName = (appointment: AppointmentRecord) => {
  const raw = appointment.patient?.trim() || appointment.title?.trim() || '';

  if (!raw || raw === 'Nueva Reserva') {
    return 'Sin nombre';
  }

  return raw;
};

const getTypeLabel = (kind?: string) => {
  if (kind === 'interview') return 'Entrevista';
  if (kind === 'block') return 'Bloqueo';
  return 'Sesion';
};

const getCoverageLabel = (appointment: AppointmentRecord) => appointment.coverageType || 'particular';

const getCorrespondsToLabel = (appointment: AppointmentRecord, professionals: ProfessionalRecord[]) => {
  const pro = professionals.find((p) => p.id === appointment.professionalId || appointment.proId);
  const room = ROOMS.find((r) => r.id === appointment.roomId);

  if (pro && room) return `${pro.name} · ${room.name}`;
  if (pro) return pro.name;
  if (room) return room.name;
  return 'Sin asignar';
};

const parseTimeToMinutes = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;

  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.POSITIVE_INFINITY;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.POSITIVE_INFINITY;
  }

  return hours * 60 + minutes;
};

const sortByStart = (items: AppointmentRecord[]) => [...items].sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

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
      const key = getTypeLabel(appointment.kind || appointment.type);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { Sesion: 0, Entrevista: 0, Bloqueo: 0 } as Record<string, number>,
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
      .sheet { max-width: 1120px; margin: 0 auto; padding: 80px 0 0; }
      .preview-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 20;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        background: rgba(248, 250, 252, 0.95);
        border-bottom: 1px solid #e2e8f0;
        backdrop-filter: blur(10px);
      }
      .preview-bar .title { font-size: 14px; font-weight: 900; color: #0f172a; }
      .preview-bar .actions { display: flex; gap: 8px; }
      .preview-btn {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }
      .preview-btn.primary { background: #67b7c9; color: white; }
      .preview-btn.secondary { background: white; color: #334155; border: 1px solid #dbe4ee; }
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
      .badge.block { background: #0f172a; color: white; }
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
      .month-calendar {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 10px;
      }
      .month-head {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .12em;
        color: #64748b;
        font-weight: 800;
      }
      .month-cell {
        min-height: 128px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        break-inside: avoid;
      }
      .month-cell.outside { opacity: .38; }
      .month-day {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .month-day .number {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
        background: #eff6ff;
      }
      .month-day .count {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
      }
      .month-badges {
        display: grid;
        gap: 6px;
      }
      .month-badge {
        border-radius: 999px;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        border: 1px solid transparent;
      }
      .month-badge.session { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
      .month-badge.interview { background: #fef3c7; color: #92400e; border-color: #fde68a; }
      .month-badge.block { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
      .month-badge .time { font-size: 9px; }
      @media print {
        body { background: white; }
        .sheet { max-width: none; }
        .hero, .card, .section, .day-card { box-shadow: none; }
        .preview-bar { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="preview-bar">
      <div class="title">${escapeHtml(title)} - Vista previa</div>
      <div class="actions">
        <button class="preview-btn secondary" onclick="window.close()">Cerrar</button>
        <button class="preview-btn primary" onclick="window.print()">Imprimir</button>
      </div>
    </div>
    <div class="sheet">
      ${body}
    </div>
  </body>
</html>`;

const openPrintWindow = (title: string, html: string) => {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=1280,height=900');
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
  const professionals = getProfessionalsSnapshot();
  const dateLabel = format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es });
  const sorted = sortByStart(appointments.filter((appointment) => {
    const appointmentDate = parseDay(appointment.date);
    return appointmentDate ? isSameDay(appointmentDate, selectedDate) : false;
  }));
  const { coverage, types } = getStats(sorted);
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

  const rows = sorted.length
    ? sorted.map((appointment) => `
      <tr>
        <td><strong>${escapeHtml(formatTimeOnly(appointment.start))}</strong><div class="subtle">${escapeHtml(formatTimeOnly(appointment.end))}</div></td>
        <td><strong>${escapeHtml(getAppointmentName(appointment))}</strong><div class="subtle">${escapeHtml(getCorrespondsToLabel(appointment, professionals))}</div></td>
        <td><span class="badge ${appointment.kind || appointment.type}">${escapeHtml(getTypeLabel(appointment.kind || appointment.type))}</span></td>
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
        <div class="card"><div class="label">Tipos</div><div class="value">${types.Sesion || 0}/${types.Entrevista || 0}/${types.Bloqueo || 0}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Detalle del día</h2>
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
  const professionals = getProfessionalsSnapshot();
  const monthLabel = format(selectedDate, 'MMMM yyyy', { locale: es });
  const monthAppointments = appointments.filter((appointment) => {
    const appointmentDate = parseDay(appointment.date);
    return appointmentDate ? appointmentDate.getMonth() === selectedDate.getMonth() && appointmentDate.getFullYear() === selectedDate.getFullYear() : false;
  });
  const { coverage, types } = getStats(monthAppointments);
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

  const grouped = monthAppointments.reduce<Record<string, AppointmentRecord[]>>((acc, appointment) => {
    const parsed = parseDay(appointment.date);
    if (!parsed) return acc;
    const key = format(parsed, 'yyyy-MM-dd');
    acc[key] = acc[key] || [];
    acc[key].push(appointment);
    return acc;
  }, {});

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }),
  });

  const monthGrid = monthDays.length
    ? `
      <div class="section">
        <div class="section-header">
          <h2>Calendario mensual</h2>
          <span>${escapeHtml(monthLabel)}</span>
        </div>
        <div class="month-calendar">
          ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<div class="month-head">${day}</div>`).join('')}
          ${monthDays.map((day) => {
            const dayAppointments = sortByStart(
              grouped[format(day, 'yyyy-MM-dd')] || [],
            );
            return `
              <div class="month-cell ${isSameMonth(day, selectedDate) ? '' : 'outside'}">
                <div class="month-day">
                  <span class="number">${format(day, 'd')}</span>
                  <span class="count">${dayAppointments.length} turno${dayAppointments.length === 1 ? '' : 's'}</span>
                </div>
                <div class="month-badges">
                  ${dayAppointments.slice(0, 3).map((appointment) => `
                    <div class="month-badge ${appointment.kind || appointment.type}">
                      <span>${escapeHtml(getAppointmentName(appointment))}</span>
                      <span class="time">${escapeHtml(formatTimeOnly(appointment.start))}</span>
                    </div>
                  `).join('')}
                  ${dayAppointments.length > 3 ? `<div class="subtle">+ ${dayAppointments.length - 3} más</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
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
        <div class="card"><div class="label">Tipos</div><div class="value">${types.Sesion || 0}/${types.Entrevista || 0}/${types.Bloqueo || 0}</div></div>
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
            <tr><td>Sesión</td><td>${types.Sesion || 0}</td><td>${coverage.particular || 0}</td><td>${coverage['obra social'] || 0}</td></tr>
            <tr><td>Entrevista</td><td>${types.Entrevista || 0}</td><td colspan="2">Ver detalle diario</td></tr>
            <tr><td>Bloqueo</td><td>${types.Bloqueo || 0}</td><td colspan="2">Ver detalle diario</td></tr>
          </tbody>
        </table>
      </div>
      ${monthGrid}
      <div class="footer">Reporte mensual listo para imprimir o guardar como PDF.</div>
    `,
    true,
  );
};

export const openPrintableReport = (title: string, html: string) => {
  openPrintWindow(title, html);
};
