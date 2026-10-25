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

const isExternalRental = (appointment: AppointmentRecord) => {
  const isRentalSource = (appointment as any).source === 'rentals';
  const proId = appointment.professionalId || appointment.proId;
  const title = (appointment.title || '').toLowerCase();
  return (isRentalSource && !proId) || title.includes('subalquiler') || title.includes('alquiler externo') || title.startsWith('alquiler ');
};

const getAppointmentTypeLabel = (appointment: AppointmentRecord) => {
  if (isExternalRental(appointment)) {
    return 'Alquiler externo';
  }
  const kind = appointment.kind || appointment.type;
  if (kind === 'interview') return 'Entrevista';
  if (kind === 'block') return 'Reserva terapeuta';
  return 'Sesión clínica';
};

const getBadgeClass = (appointment: AppointmentRecord) => {
  if (isExternalRental(appointment)) return 'external';
  const kind = appointment.kind || appointment.type;
  if (kind === 'interview') return 'interview';
  if (kind === 'block') return 'block';
  return 'session';
};

const getAppointmentName = (appointment: AppointmentRecord, professionals?: ProfessionalRecord[]) => {
  if (isExternalRental(appointment)) {
    const occupant = appointment.patient?.trim();
    if (occupant) return occupant;
    const cleanTitle = appointment.title
      ?.replace(/^(Subalquiler externo|Alquiler consultorio)\s*·?\s*/i, '')
      .trim();
    return cleanTitle || 'Subalquiler externo';
  }

  const kind = appointment.kind || appointment.type;
  if (kind === 'block') {
    const raw = appointment.title?.trim();
    if (raw && raw !== 'Nueva Reserva' && raw !== 'Reserva sala' && raw !== 'Reserva de consultorio') {
      return raw;
    }
    const proId = appointment.professionalId || appointment.proId;
    const proName = professionals?.find((p) => p.id === proId)?.name;
    return proName ? `Reserva · ${proName}` : (raw || 'Reserva de consultorio');
  }

  const raw = appointment.patient?.trim() || appointment.title?.trim() || '';
  if (!raw || raw === 'Nueva Reserva') {
    return 'Sin nombre';
  }
  return raw;
};

const getCoverageLabel = (appointment: AppointmentRecord) => appointment.coverageType || 'particular';

const getProfessionalLabel = (appointment: AppointmentRecord, professionals: ProfessionalRecord[]) => {
  if (isExternalRental(appointment)) {
    const occupant = appointment.patient?.trim();
    return occupant ? `Externo · ${occupant}` : 'Alquiler a terceros';
  }
  const pro = professionals.find((p) => p.id === (appointment.professionalId || appointment.proId));
  const kind = appointment.kind || appointment.type;
  if (kind === 'block') {
    return pro ? `Terapeuta: ${pro.name}` : 'Reserva de espacio';
  }
  return pro ? `Prof. ${pro.name}` : 'Sin profesional';
};

const getCorrespondsToLabel = (appointment: AppointmentRecord, professionals: ProfessionalRecord[]) => {
  const room = ROOMS.find((r) => r.id === appointment.roomId);
  const roomName = room ? room.name.split('—')[0].trim() : '';

  if (isExternalRental(appointment)) {
    const occupant = appointment.patient?.trim() || 'Tercero';
    return roomName ? `Externo (${occupant}) · ${roomName}` : `Externo (${occupant})`;
  }

  const pro = professionals.find((p) => p.id === (appointment.professionalId || appointment.proId));
  if (pro && roomName) return `${pro.name} · ${roomName}`;
  if (pro) return pro.name;
  if (roomName) return roomName;
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

const sortByStart = (items: AppointmentRecord[]) =>
  [...items].sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

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
      const key = getAppointmentTypeLabel(appointment);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {
      'Sesión clínica': 0,
      'Entrevista': 0,
      'Reserva terapeuta': 0,
      'Alquiler externo': 0,
    } as Record<string, number>,
  );

  return { coverage, types };
};

const getWeekRange = (selectedDate: Date) => {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return { weekStart, weekEnd, weekDays };
};

const getWeekKey = (value: Date) => format(value, 'yyyy-MM-dd');

const buildWeeklyRoomMatrix = (selectedDate: Date, appointments: AppointmentRecord[]) => {
  const { weekStart, weekEnd, weekDays } = getWeekRange(selectedDate);
  const weekAppointments = appointments.filter((appointment) => {
    const parsed = parseDay(appointment.date);
    if (!parsed) return false;
    return parsed >= weekStart && parsed <= weekEnd && appointment.roomId;
  });

  const grouped = weekAppointments.reduce<Record<string, AppointmentRecord[]>>((acc, appointment) => {
    const parsed = parseDay(appointment.date);
    if (!parsed) return acc;

    const key = `${appointment.roomId}:${getWeekKey(parsed)}`;
    acc[key] = acc[key] || [];
    acc[key].push(appointment);
    return acc;
  }, {});

  const rooms = ROOMS.map((room) => {
    const dayCells = weekDays.map((day) => {
      const dayKey = `${room.id}:${getWeekKey(day)}`;
      const dayAppointments = sortByStart(grouped[dayKey] || []);

      return {
        day,
        appointments: dayAppointments,
        free: dayAppointments.length === 0,
      };
    });

    const freeDays = dayCells.filter((cell) => cell.free).length;
    return {
      room,
      dayCells,
      totalAppointments: dayCells.reduce((acc, cell) => acc + cell.appointments.length, 0),
      freeDays,
    };
  });

  const daySummary = weekDays.map((day) => {
    const dayKey = getWeekKey(day);
    const dayAppointments = weekAppointments.filter((appointment) => {
      const parsed = parseDay(appointment.date);
      return parsed ? getWeekKey(parsed) === dayKey : false;
    });
    const occupiedRooms = new Set(dayAppointments.map((appointment) => appointment.roomId).filter(Boolean));
    const freeRooms = ROOMS.filter((room) => !occupiedRooms.has(room.id));

    return {
      day,
      appointments: sortByStart(dayAppointments),
      freeRooms,
      occupiedRooms: ROOMS.length - freeRooms.length,
    };
  });

  return {
    weekStart,
    weekEnd,
    weekDays,
    weekAppointments,
    rooms,
    daySummary,
  };
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
        margin: 8mm 10mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #f8fafc;
        color: #1e293b;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .preview-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background: rgba(255, 255, 255, 0.98);
        border-bottom: 1px solid #cbd5e1;
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }
      .preview-bar .title {
        font-size: 13px;
        font-weight: 800;
        color: #1d3e35;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .preview-bar .actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .preview-btn {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .preview-btn.primary {
        background: #46766B;
        color: white;
      }
      .preview-btn.primary:hover {
        background: #3B675D;
      }
      .preview-btn.secondary {
        background: white;
        color: #475569;
        border: 1px solid #cbd5e1;
      }
      .preview-btn.secondary:hover {
        background: #f1f5f9;
      }
      .sheet {
        max-width: ${landscape ? '1140px' : '840px'};
        margin: 0 auto;
        padding: 68px 16px 40px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        padding: 14px 18px;
        border-radius: 16px;
        background: linear-gradient(135deg, #1D3E35 0%, #264A40 60%, #3B675D 100%);
        color: white;
        margin-bottom: 12px;
      }
      .hero .brand {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #a7f3d0;
        margin-bottom: 2px;
      }
      .hero h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1.15;
      }
      .hero p {
        margin: 2px 0 0;
        color: rgba(255, 255, 255, 0.88);
        font-size: 11.5px;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;
        color: white;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }
      .card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 9px 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .card .label {
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
        font-weight: 800;
      }
      .card .value {
        margin-top: 3px;
        font-size: 18px;
        font-weight: 900;
        color: #1e293b;
        line-height: 1.1;
      }
      .section {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 12px 14px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f1f5f9;
      }
      .section-header h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 800;
        color: #1d3e35;
      }
      .section-header span {
        font-size: 11px;
        color: #64748b;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      th, td {
        text-align: left;
        padding: 7px 6px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
      }
      th {
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 9px;
        color: #64748b;
        font-weight: 800;
        background: #f8fafc;
      }
      .subtle {
        color: #64748b;
        font-size: 10px;
        font-weight: 600;
        margin-top: 2px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
      .badge.session {
        background: #E8F3EE;
        color: #1D4E38;
        border: 1px solid #C4DCD0;
      }
      .badge.interview {
        background: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
      }
      .badge.block {
        background: #F3E8FF;
        color: #6B21A8;
        border: 1px solid #E9D5FF;
      }
      .badge.external {
        background: #FFFBEB;
        color: #92400E;
        border: 1px solid #FDE68A;
      }
      .badge.coverage {
        background: #F0F4F2;
        color: #2C4F44;
        border: 1px solid #D6E2DC;
      }
      .footer {
        margin-top: 10px;
        color: #94a3b8;
        font-size: 9.5px;
        text-align: right;
      }
      .month-calendar {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 4px;
        margin-top: 4px;
      }
      .month-head {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
        font-weight: 800;
        text-align: center;
        padding: 3px 0;
      }
      .month-cell {
        min-height: 74px;
        max-height: 102px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #ffffff;
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow: hidden;
      }
      .month-cell.outside {
        background: #f8fafc;
        opacity: 0.4;
      }
      .month-day {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
      }
      .month-day .number {
        width: 19px;
        height: 19px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10.5px;
        font-weight: 900;
        color: #1d3e35;
        background: #e8f3ee;
      }
      .month-day .count {
        font-size: 8.5px;
        font-weight: 700;
        color: #64748b;
      }
      .month-badges {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;
      }
      .month-badge {
        border-radius: 5px;
        padding: 2px 4px;
        font-size: 8.5px;
        font-weight: 700;
        display: flex;
        justify-content: space-between;
        gap: 4px;
        align-items: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border: 1px solid transparent;
      }
      .month-badge.session {
        background: #E8F3EE;
        color: #1D4E38;
        border-color: #C4DCD0;
      }
      .month-badge.interview {
        background: #FEF3C7;
        color: #92400E;
        border-color: #FDE68A;
      }
      .month-badge.block {
        background: #F3E8FF;
        color: #6B21A8;
        border-color: #E9D5FF;
      }
      .month-badge.external {
        background: #FFFBEB;
        color: #92400E;
        border-color: #FDE68A;
      }
      .month-badge .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .month-badge .time {
        font-size: 8px;
        font-family: monospace;
        font-weight: 800;
        flex-shrink: 0;
      }
      .week-grid {
        display: grid;
        grid-template-columns: 125px repeat(7, minmax(0, 1fr));
        gap: 4px;
        align-items: stretch;
      }
      .week-head {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
        font-weight: 800;
        padding: 3px 6px;
        text-align: center;
      }
      .week-room {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #f8fafc;
        padding: 8px;
        min-height: 82px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .week-room .room-name {
        font-size: 11px;
        font-weight: 900;
        color: #1d3e35;
        margin: 0;
      }
      .week-room .room-meta {
        font-size: 8.5px;
        color: #64748b;
        font-weight: 700;
        margin-top: 2px;
      }
      .week-cell {
        min-height: 82px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #ffffff;
        padding: 5px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .week-cell.free {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }
      .week-cell.busy {
        border-color: #cbd5e1;
      }
      .week-cell .count {
        font-size: 8px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #64748b;
      }
      .week-cell .free-label {
        font-size: 10.5px;
        font-weight: 900;
        color: #15803d;
        margin: auto 0;
        text-align: center;
      }
      .week-cell .mini-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .week-pill {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 3px 5px;
        border-radius: 6px;
        font-size: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #1e293b;
      }
      .week-pill.session {
        background: #E8F3EE;
        color: #1D4E38;
        border-color: #C4DCD0;
      }
      .week-pill.interview {
        background: #FEF3C7;
        color: #92400E;
        border-color: #FDE68A;
      }
      .week-pill.block {
        background: #F3E8FF;
        color: #6B21A8;
        border-color: #E9D5FF;
      }
      .week-pill.external {
        background: #FFFBEB;
        color: #92400E;
        border-color: #FDE68A;
      }
      .week-pill .pill-top {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        align-items: center;
        font-weight: 800;
      }
      .week-pill .time {
        font-family: monospace;
        font-size: 7.5px;
        font-weight: 800;
      }
      .week-pill .title {
        font-size: 8px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .week-pill .professional {
        font-size: 7.5px;
        font-weight: 600;
        opacity: 0.85;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .day-free-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .day-free-list .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border-radius: 999px;
        padding: 4px 10px;
        background: #ecfeff;
        color: #155e75;
        border: 1px solid #a5f3fc;
        font-size: 9.5px;
        font-weight: 800;
      }
      @media print {
        @page {
          size: ${landscape ? 'A4 landscape' : 'A4 portrait'};
          margin: 8mm 10mm;
        }
        body {
          background: white !important;
          color: #0f172a !important;
        }
        .preview-bar {
          display: none !important;
        }
        .sheet {
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .hero, .card, .section, .day-card, .month-cell, .week-cell, .week-room {
          box-shadow: none !important;
        }
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
        }
        .no-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid !important;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
      }
    </style>
  </head>
  <body>
    <div class="preview-bar">
      <div class="title">
        <span>CREAR</span>
        <span>•</span>
        <span>${escapeHtml(title)}</span>
      </div>
      <div class="actions">
        <button class="preview-btn secondary" onclick="window.close()">✕ Cerrar</button>
        <button class="preview-btn primary" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      </div>
    </div>
    <div class="sheet">
      ${body}
    </div>
  </body>
</html>`;

const openPrintWindow = (title: string, html: string) => {
  if (typeof window === 'undefined') return;

  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      window.location.href = blobUrl;
      return;
    }
    win.focus();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch {
    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.document.title = title;
      printWindow.focus();
    }
  }
};

export const buildDailyPdfHtml = (selectedDate: Date, appointments: AppointmentRecord[]) => {
  const professionals = getProfessionalsSnapshot();
  const dateLabel = format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const sorted = sortByStart(
    appointments.filter((appointment) => {
      const appointmentDate = parseDay(appointment.date);
      return appointmentDate ? isSameDay(appointmentDate, selectedDate) : false;
    })
  );
  const { coverage, types } = getStats(sorted);
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

  const rows = sorted.length
    ? sorted
        .map((appointment) => {
          const badgeClass = getBadgeClass(appointment);
          const typeLabel = getAppointmentTypeLabel(appointment);
          const name = getAppointmentName(appointment, professionals);
          const correspondsTo = getCorrespondsToLabel(appointment, professionals);

          return `
      <tr>
        <td>
          <strong>${escapeHtml(formatTimeOnly(appointment.start))}</strong>
          <div class="subtle">${escapeHtml(formatTimeOnly(appointment.end))}</div>
        </td>
        <td>
          <strong>${escapeHtml(name)}</strong>
          <div class="subtle">${escapeHtml(correspondsTo)}</div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${escapeHtml(typeLabel)}</span>
        </td>
        <td>
          <span class="badge coverage">${escapeHtml(getCoverageLabel(appointment))}</span>
        </td>
        <td>${escapeHtml(appointment.notes || '-')}</td>
      </tr>
    `;
        })
        .join('')
    : `<tr><td colspan="5"><div style="text-align:center; padding: 24px; color: #64748b; font-weight: 700;">No hay turnos registrados para este día.</div></td></tr>`;

  return renderReportShell(
    `Agenda diaria - ${dateLabel}`,
    'Reporte de agenda diaria de consultorios y terapeutas.',
    `
      <div class="hero">
        <div>
          <div class="brand">CREAR · Centro de Rehabilitación y Aprendizaje</div>
          <h1>Agenda diaria</h1>
          <p>${escapeHtml(dateLabel)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${escapeHtml(generatedAt)}</span>
          <span class="pill">Total: ${sorted.length} turnos</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Total turnos</div><div class="value">${sorted.length}</div></div>
        <div class="card"><div class="label">Particular</div><div class="value">${coverage.particular || 0}</div></div>
        <div class="card"><div class="label">Obra social</div><div class="value">${coverage['obra social'] || 0}</div></div>
        <div class="card"><div class="label">Sesiones / Reservas</div><div class="value">${types['Sesión clínica'] || 0} / ${types['Reserva terapeuta'] + types['Alquiler externo']}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Detalle de turnos del día</h2>
          <span>${escapeHtml(dateLabel)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Horario</th>
              <th style="width: 35%;">Paciente / Ocupante y Consultorio</th>
              <th style="width: 20%;">Tipo</th>
              <th style="width: 15%;">Cobertura</th>
              <th style="width: 15%;">Observaciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="footer">CREAR · Reporte oficial listo para imprimir o guardar como PDF.</div>
    `,
    false
  );
};

export const buildMonthlyPdfHtml = (selectedDate: Date, appointments: AppointmentRecord[]) => {
  const professionals = getProfessionalsSnapshot();
  const monthLabel = format(selectedDate, "MMMM 'de' yyyy", { locale: es });
  const monthAppointments = appointments.filter((appointment) => {
    const appointmentDate = parseDay(appointment.date);
    return appointmentDate
      ? appointmentDate.getMonth() === selectedDate.getMonth() &&
          appointmentDate.getFullYear() === selectedDate.getFullYear()
      : false;
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

  const monthGrid = `
    <div class="section" style="margin-bottom: 0;">
      <div class="section-header">
        <h2>Calendario mensual</h2>
        <span>${escapeHtml(monthLabel)}</span>
      </div>
      <div class="month-calendar">
        ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
          .map((day) => `<div class="month-head">${day}</div>`)
          .join('')}
        ${monthDays
          .map((day) => {
            const dayAppointments = sortByStart(grouped[format(day, 'yyyy-MM-dd')] || []);
            const outside = !isSameMonth(day, selectedDate);
            return `
              <div class="month-cell ${outside ? 'outside' : ''}">
                <div class="month-day">
                  <span class="number">${format(day, 'd')}</span>
                  <span class="count">${dayAppointments.length > 0 ? `${dayAppointments.length} ${dayAppointments.length === 1 ? 'turno' : 'turnos'}` : ''}</span>
                </div>
                <div class="month-badges">
                  ${dayAppointments
                    .slice(0, 3)
                    .map((appointment) => {
                      const badgeClass = getBadgeClass(appointment);
                      const name = getAppointmentName(appointment, professionals);
                      return `
                    <div class="month-badge ${badgeClass}">
                      <span class="name">${escapeHtml(name)}</span>
                      <span class="time">${escapeHtml(formatTimeOnly(appointment.start))}</span>
                    </div>
                  `;
                    })
                    .join('')}
                  ${dayAppointments.length > 3 ? `<div class="subtle" style="font-size: 8px; font-weight: 800;">+ ${dayAppointments.length - 3} más</div>` : ''}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;

  // Resumen por profesional
  const proSummary = professionals
    .map((pro) => {
      const proApps = monthAppointments.filter(
        (a) => (a.professionalId || a.proId) === pro.id
      );
      return { pro, count: proApps.length };
    })
    .filter((entry) => entry.count > 0);

  return renderReportShell(
    `Agenda mensual - ${monthLabel}`,
    'Almanaque mensual y balance operativo del centro.',
    `
      <!-- PÁGINA 1: CALENDARIO MENSUAL COMPLETO -->
      <div class="hero">
        <div>
          <div class="brand">CREAR · Centro de Rehabilitación y Aprendizaje</div>
          <h1>Agenda mensual</h1>
          <p>${escapeHtml(monthLabel)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${escapeHtml(generatedAt)}</span>
          <span class="pill">Total: ${monthAppointments.length} turnos</span>
          <span class="pill">Particular: ${coverage.particular || 0}</span>
          <span class="pill">Obra social: ${coverage['obra social'] || 0}</span>
        </div>
      </div>

      ${monthGrid}
      <div class="footer">Página 1 de 2 · Almanaque mensual completo listo para imprimir.</div>

      <!-- PÁGINA 2: RESUMEN DE GESTIÓN Y ESTADÍSTICAS -->
      <div class="page-break"></div>

      <div class="hero" style="margin-top: 10px;">
        <div>
          <div class="brand">CREAR · Centro de Rehabilitación y Aprendizaje</div>
          <h1>Resumen operativo del mes</h1>
          <p>${escapeHtml(monthLabel)} · Métricas de atención y profesionales</p>
        </div>
        <div class="meta">
          <span class="pill">Mes: ${escapeHtml(monthLabel)}</span>
        </div>
      </div>

      <div class="summary">
        <div class="card"><div class="label">Total turnos</div><div class="value">${monthAppointments.length}</div></div>
        <div class="card"><div class="label">Sesiones clínicas</div><div class="value">${types['Sesión clínica'] || 0}</div></div>
        <div class="card"><div class="label">Entrevistas</div><div class="value">${types['Entrevista'] || 0}</div></div>
        <div class="card"><div class="label">Reservas / Alquileres</div><div class="value">${(types['Reserva terapeuta'] || 0) + (types['Alquiler externo'] || 0)}</div></div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2>Desglose por tipo de prestación</h2>
          <span>${escapeHtml(monthLabel)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo de turno</th>
              <th>Cantidad</th>
              <th>Particular</th>
              <th>Obra social</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sesiones clínicas</strong></td>
              <td>${types['Sesión clínica'] || 0}</td>
              <td>${coverage.particular || 0}</td>
              <td>${coverage['obra social'] || 0}</td>
            </tr>
            <tr>
              <td><strong>Entrevistas diagnósticas</strong></td>
              <td>${types['Entrevista'] || 0}</td>
              <td colspan="2">Registro institucional</td>
            </tr>
            <tr>
              <td><strong>Reservas de consultorio (Terapeutas)</strong></td>
              <td>${types['Reserva terapeuta'] || 0}</td>
              <td colspan="2">Horarios bloqueados para atención</td>
            </tr>
            <tr>
              <td><strong>Alquileres externos a terceros</strong></td>
              <td>${types['Alquiler externo'] || 0}</td>
              <td colspan="2">Uso ocasional de consultorios</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${
        proSummary.length > 0
          ? `
      <div class="section">
        <div class="section-header">
          <h2>Distribución de turnos por profesional</h2>
          <span>${monthAppointments.length} turnos totales</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Especialidad</th>
              <th>Total turnos en el mes</th>
            </tr>
          </thead>
          <tbody>
            ${proSummary
              .map(
                ({ pro, count }) => `
              <tr>
                <td><strong>${escapeHtml(pro.name)}</strong></td>
                <td>${escapeHtml(pro.specialty || 'Profesional CREAR')}</td>
                <td><strong>${count}</strong></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      <div class="footer">Página 2 de 2 · Reporte mensual CREAR listo para imprimir o guardar como PDF.</div>
    `,
    true
  );
};

export const buildWeeklyAvailabilityPdfHtml = (
  selectedDate: Date,
  appointments: AppointmentRecord[]
) => {
  const professionals = getProfessionalsSnapshot();
  const weekLabel = `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: es })} al ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: es })}`;
  const { weekDays, weekAppointments, rooms, daySummary } = buildWeeklyRoomMatrix(
    selectedDate,
    appointments
  );
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
  const { coverage, types } = getStats(weekAppointments);
  const freeRoomDays = rooms.reduce((acc, room) => acc + room.freeDays, 0);
  const fullyFreeDays = daySummary.filter((day) => day.freeRooms.length === ROOMS.length).length;
  const todayKey = getWeekKey(selectedDate);
  const selectedDaySummary = daySummary.find((day) => getWeekKey(day.day) === todayKey);
  const todayFreeRooms = selectedDaySummary?.freeRooms.length || 0;

  const matrix = `
    <div class="section" style="margin-bottom: 8px;">
      <div class="section-header">
        <h2>Disponibilidad por consultorio</h2>
        <span>${escapeHtml(weekLabel)}</span>
      </div>
      <div class="week-grid">
        <div></div>
        ${weekDays.map((day) => `<div class="week-head">${escapeHtml(format(day, 'EEE dd', { locale: es }))}</div>`).join('')}
        ${rooms
          .map(
            ({ room, dayCells, totalAppointments, freeDays }) => `
          <div class="week-room">
            <div>
              <p class="room-name">${escapeHtml(room.name.split('—')[0].trim())}</p>
              <div class="room-meta">${totalAppointments} turnos · ${freeDays} libres</div>
            </div>
            <div class="room-meta" style="color: #46766B; font-weight: 800;">Consultorio CREAR</div>
          </div>
          ${dayCells
            .map((cell) => `
            <div class="week-cell ${cell.free ? 'free' : 'busy'}">
              <div class="count">${cell.appointments.length} ${cell.appointments.length === 1 ? 'turno' : 'turnos'}</div>
              ${
                cell.free
                  ? '<div class="free-label">Libre</div>'
                  : `
                <div class="mini-list">
                  ${cell.appointments
                    .map((appointment) => {
                      const badgeClass = getBadgeClass(appointment);
                      const typeLabel = getAppointmentTypeLabel(appointment);
                      const name = getAppointmentName(appointment, professionals);
                      const proLabel = getProfessionalLabel(appointment, professionals);
                      return `
                    <div class="week-pill ${badgeClass}">
                      <div class="pill-top">
                        <span>${escapeHtml(typeLabel)}</span>
                        <span class="time">${escapeHtml(formatTimeOnly(appointment.start))}</span>
                      </div>
                      <div class="title">${escapeHtml(name)}</div>
                      <div class="professional">${escapeHtml(proLabel)}</div>
                    </div>
                  `;
                    })
                    .join('')}
                </div>
              `
              }
            </div>
          `)
            .join('')}
        `
          )
          .join('')}
      </div>
    </div>
  `;

  const freeDaysList = daySummary
    .filter((day) => day.freeRooms.length > 0)
    .map(
      (day) => `
      <span class="chip">
        <strong>${escapeHtml(format(day.day, 'EEE dd', { locale: es }))}:</strong> ${day.freeRooms.length} ${day.freeRooms.length === 1 ? 'consultorio libre' : 'consultorios libres'}
      </span>
    `
    )
    .join('');

  return renderReportShell(
    `Disponibilidad semanal - ${weekLabel}`,
    'Resumen semanal de disponibilidad de consultorios y turnos.',
    `
      <div class="hero">
        <div>
          <div class="brand">CREAR · Centro de Rehabilitación y Aprendizaje</div>
          <h1>Disponibilidad semanal</h1>
          <p>Semana del ${escapeHtml(weekLabel)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${escapeHtml(generatedAt)}</span>
          <span class="pill">Consultorios: ${ROOMS.length}</span>
          <span class="pill">Turnos semana: ${weekAppointments.length}</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Turnos semana</div><div class="value">${weekAppointments.length}</div></div>
        <div class="card"><div class="label">Consultorios libres hoy</div><div class="value">${todayFreeRooms}/${ROOMS.length}</div></div>
        <div class="card"><div class="label">Días totalmente libres</div><div class="value">${fullyFreeDays}</div></div>
        <div class="card"><div class="label">Bloques libres</div><div class="value">${freeRoomDays}</div></div>
      </div>
      ${matrix}
      <div class="section" style="margin-top: 8px;">
        <div class="section-header">
          <h2>Días con consultorios disponibles esta semana</h2>
          <span>${escapeHtml(weekLabel)}</span>
        </div>
        <div class="day-free-list">
          ${freeDaysList || '<div style="color: #64748b; font-size: 11px;">No hay días libres en esta semana.</div>'}
        </div>
      </div>
      <div class="footer">CREAR · Reporte semanal listo para imprimir o guardar como PDF.</div>
    `,
    true
  );
};

export const openPrintableReport = (title: string, html: string) => {
  openPrintWindow(title, html);
};
