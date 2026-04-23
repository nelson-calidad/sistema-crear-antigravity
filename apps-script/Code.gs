const SPREADSHEET_ID = '17eRyphluofIxIhH99Vq1KYINTJ8sY3nQT8JIahzXDJo';
const SHEET_NAME = 'appointments';
const PROFESSIONALS_SHEET_NAME = 'professionals';
const HEADER = [
  'id',
  'title',
  'type',
  'proId',
  'professionalId',
  'roomId',
  'patient',
  'notes',
  'date',
  'start',
  'end',
  'recurrence',
  'selectedDays',
  'createdBy',
  'createdAt',
  'updatedAt',
  'coverageType',
  'kind',
  'status',
];
const PROFESSIONALS_HEADER = [
  'id',
  'name',
  'specialty',
  'color',
  'status',
  'email',
  'phone',
  'hours',
  'retention',
  'image',
];
const PROFESSIONALS_SEED = [
  {
    id: '1',
    name: 'Vero',
    specialty: 'Psicomotricidad',
    color: 'bg-blue-500',
    status: 'Activo',
    email: 'vero@lab.com',
    phone: '+54 11 2345-6789',
    hours: 'Lun, Mie, Vie (08:00 - 14:00)',
    retention: '20%',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  },
  {
    id: '2',
    name: 'Carlos',
    specialty: 'Fonoaudiología',
    color: 'bg-indigo-500',
    status: 'Activo',
    email: 'carlos@lab.com',
    phone: '+54 11 2345-6789',
    hours: 'Mar, Jue (09:00 - 15:00)',
    retention: '20%',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
  },
  {
    id: '3',
    name: 'Laura',
    specialty: 'Kinesiología Infantil',
    color: 'bg-emerald-500',
    status: 'En Pausa',
    email: 'laura@lab.com',
    phone: '+54 11 2345-6789',
    hours: 'Lun, Mie (08:00 - 12:00)',
    retention: '20%',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
  },
  {
    id: '4',
    name: 'Marta',
    specialty: 'Terapia Ocupacional',
    color: 'bg-rose-500',
    status: 'Activo',
    email: 'marta@lab.com',
    phone: '+54 11 2345-6789',
    hours: 'Mar, Jue, Vie (10:00 - 16:00)',
    retention: '20%',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&h=150&fit=crop',
  },
  {
    id: '5',
    name: 'Sofia',
    specialty: 'Psicopedagogía',
    color: 'bg-amber-500',
    status: 'Activo',
    email: 'sofia@lab.com',
    phone: '+54 11 2345-6789',
    hours: 'Lun, Mie, Vie (09:00 - 13:00)',
    retention: '20%',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  },
  {
    id: '6',
    name: 'Diego',
    specialty: 'Psicología',
    color: 'bg-purple-500',
    status: 'Activo',
    email: 'diego@lab.com',
    phone: '+54 11 2345-6789',
    hours: 'Lun, Mar, Jue (14:00 - 18:00)',
    retention: '20%',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
  },
];

function doGet(e) {
  try {
    const entity = e && e.parameter && e.parameter.entity === 'professionals' ? 'professionals' : 'appointments';

    if (entity === 'professionals') {
      const sheet = ensureProfessionalsSheet_();
      const professionals = readProfessionals_(sheet);
      return json_({ ok: true, professionals });
    }

    const sheet = ensureSheet_();
    const appointments = readAppointments_(sheet);
    return json_({ ok: true, appointments });
  } catch (error) {
    return json_({ ok: false, error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const entity = body.entity === 'professionals' ? 'professionals' : 'appointments';

    if (entity === 'professionals') {
      const sheet = ensureProfessionalsSheet_();

      if (body.action === 'reset') {
        const professionals = resetProfessionals_(sheet);
        return json_({ ok: true, entity: 'professionals', action: 'reset', professionals, lastRow: sheet.getLastRow() });
      }

      if (body.action === 'delete') {
        if (!body.id) {
          throw new Error('Missing id');
        }

        const deleted = deleteProfessional_(sheet, String(body.id));
        const professionals = readProfessionals_(sheet);
        return json_({
          ok: true,
          entity: 'professionals',
          action: 'delete',
          id: String(body.id),
          deleted,
          professionals,
          lastRow: sheet.getLastRow(),
        });
      }

      const professional = normalizeProfessional_(body.professional || {});

      if (body.action === 'update') {
        const updatedId = String(body.id || professional.id);
        const normalizedProfessional = { ...professional, id: updatedId };
        const rowNumber = upsertProfessional_(sheet, normalizedProfessional, true);
        const professionals = readProfessionals_(sheet);
        return json_({
          ok: true,
          entity: 'professionals',
          action: 'update',
          id: updatedId,
          rowNumber,
          professional: normalizedProfessional,
          professionals,
          lastRow: sheet.getLastRow(),
        });
      }

      const rowNumber = upsertProfessional_(sheet, professional, false);
      const professionals = readProfessionals_(sheet);
      return json_({
        ok: true,
        entity: 'professionals',
        action: 'create',
        id: professional.id,
        rowNumber,
        professional,
        professionals,
        lastRow: sheet.getLastRow(),
      });
    }

    const action = body.action || 'create';
    const sheet = ensureSheet_();

    if (action === 'delete') {
      if (!body.id) {
        throw new Error('Missing id');
      }

      const deleted = deleteAppointment_(sheet, String(body.id));
      return json_({ ok: true, action: 'delete', id: String(body.id), deleted, lastRow: sheet.getLastRow() });
    }

    const appointment = normalizeAppointment_(body.appointment || {});

    if (action === 'update') {
      if (!body.id && !appointment.id) {
        throw new Error('Missing id');
      }

      const updatedId = String(body.id || appointment.id);
      const rowNumber = upsertAppointment_(sheet, { ...appointment, id: updatedId }, true);
      return json_({ ok: true, action: 'update', id: updatedId, rowNumber, lastRow: sheet.getLastRow() });
    }

    const rowNumber = upsertAppointment_(sheet, appointment, false);
    return json_({ ok: true, action: 'create', id: appointment.id, rowNumber, lastRow: sheet.getLastRow() });
  } catch (error) {
    return json_({ ok: false, error: error.message }, 500);
  }
}

function ensureSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADER.length).getValues()[0];
  const isEmptyHeader = firstRow.every((value) => !value);

  if (isEmptyHeader) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    sheet.setFrozenRows(1);
  } else {
    HEADER.forEach((key, index) => {
      if (!firstRow[index]) {
        sheet.getRange(1, index + 1).setValue(key);
      }
    });
  }

  return sheet;
}

function readAppointments_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }

  const rows = values.slice(1);
  return rows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => rowToObject_(row));
}

function rowToObject_(row) {
  const appointment = {};
  HEADER.forEach((key, index) => {
    appointment[key] = row[index];
  });

  return normalizeAppointment_(appointment);
}

function normalizeAppointment_(appointment) {
  const kind = appointment.kind || appointment.type || 'session';
  const resolvedKind = kind === 'survey' ? 'block' : kind;
  const professionalId = appointment.professionalId || appointment.proId || '';
  const selectedDays = appointment.selectedDays;
  let parsedSelectedDays = [];

  if (Array.isArray(selectedDays)) {
    parsedSelectedDays = selectedDays.map(Number).filter((value) => !Number.isNaN(value));
  } else if (typeof selectedDays === 'string' && selectedDays.trim()) {
    try {
      const parsed = JSON.parse(selectedDays);
      if (Array.isArray(parsed)) {
        parsedSelectedDays = parsed.map(Number).filter((value) => !Number.isNaN(value));
      }
    } catch (error) {
      parsedSelectedDays = selectedDays
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => !Number.isNaN(value));
    }
  }

  return {
    id: String(appointment.id || newId_()),
    title: String(appointment.title || 'Nueva Reserva'),
    type: String(resolvedKind),
    coverageType: String(appointment.coverageType || 'particular'),
    proId: professionalId ? String(professionalId) : '',
    professionalId: professionalId ? String(professionalId) : '',
    roomId: appointment.roomId ? String(appointment.roomId) : '',
    patient: appointment.patient ? String(appointment.patient) : '',
    notes: appointment.notes ? String(appointment.notes) : '',
    date: formatDateValue_(appointment.date),
    start: formatTimeValue_(appointment.start, '08:00'),
    end: formatTimeValue_(appointment.end, '08:45'),
    recurrence: String(appointment.recurrence || 'none'),
    selectedDays: parsedSelectedDays,
    createdBy: appointment.createdBy ? String(appointment.createdBy) : '',
    createdAt: appointment.createdAt ? String(appointment.createdAt) : '',
    updatedAt: appointment.updatedAt ? String(appointment.updatedAt) : '',
    kind: String(resolvedKind),
    status: String(appointment.status || 'scheduled'),
  };
}

function formatDateValue_(value) {
  if (!value) {
    return '';
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) {
      return '';
    }

    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return raw;
}

function formatTimeValue_(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) {
      return fallback;
    }

    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }

  const raw = String(value).trim();
  if (!raw) {
    return fallback;
  }

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'HH:mm');
  }

  return fallback;
}

function upsertAppointment_(sheet, appointment, allowUpdate) {
  const values = sheet.getDataRange().getValues();
  const rows = values.length > 1 ? values.slice(1) : [];
  const normalized = normalizeAppointment_(appointment);
  const rowValues = objectToRow_(normalized);

  let targetRow = -1;
  if (allowUpdate) {
    targetRow = rows.findIndex((row) => String(row[0]) === normalized.id) + 2;
  }

  if (targetRow > 1) {
    sheet.getRange(targetRow, 1, 1, HEADER.length).setValues([rowValues]);
    return targetRow;
  }

  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, HEADER.length).setValues([rowValues]);
  return 2;
}

function deleteAppointment_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }

  for (let row = values.length; row >= 2; row -= 1) {
    if (String(values[row - 1][0]) === id) {
      sheet.deleteRow(row);
      return true;
    }
  }

  return false;
}

function objectToRow_(appointment) {
  return HEADER.map((key) => {
    if (key === 'selectedDays') {
      return JSON.stringify(appointment[key] || []);
    }

    return appointment[key] || '';
  });
}

function ensureProfessionalsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PROFESSIONALS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PROFESSIONALS_SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, PROFESSIONALS_HEADER.length).getValues()[0];
  const isEmptyHeader = firstRow.every((value) => !value);

  if (isEmptyHeader) {
    sheet.getRange(1, 1, 1, PROFESSIONALS_HEADER.length).setValues([PROFESSIONALS_HEADER]);
    sheet.setFrozenRows(1);
  } else {
    PROFESSIONALS_HEADER.forEach((key, index) => {
      if (!firstRow[index]) {
        sheet.getRange(1, index + 1).setValue(key);
      }
    });
  }

  if (sheet.getLastRow() <= 1) {
    seedProfessionals_(sheet);
  }

  return sheet;
}

function readProfessionals_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return PROFESSIONALS_SEED.map((professional) => normalizeProfessional_(professional));
  }

  const rows = values.slice(1).filter((row) => row.some((cell) => cell !== ''));
  if (!rows.length) {
    return PROFESSIONALS_SEED.map((professional) => normalizeProfessional_(professional));
  }

  return rows.map((row) => professionalRowToObject_(row));
}

function professionalRowToObject_(row) {
  const professional = {};
  PROFESSIONALS_HEADER.forEach((key, index) => {
    professional[key] = row[index];
  });

  return normalizeProfessional_(professional);
}

function normalizeProfessional_(professional) {
  const seed = PROFESSIONALS_SEED.find((item) => String(item.id) === String(professional.id)) || PROFESSIONALS_SEED[0];
  const name = String(professional.name || seed.name || 'Sin nombre');

  return {
    id: String(professional.id || newId_()),
    name,
    specialty: String(professional.specialty || seed.specialty || ''),
    color: String(professional.color || seed.color || 'bg-slate-500'),
    status: String(professional.status || seed.status || 'Activo') === 'En Pausa' ? 'En Pausa' : 'Activo',
    email: String(professional.email || seed.email || `${slugify_(name)}@lab.com`),
    phone: String(professional.phone || seed.phone || ''),
    hours: String(professional.hours || seed.hours || 'Lun, Mie, Vie (08:00 - 14:00)'),
    retention: formatRetentionValue_(professional.retention || seed.retention || '20%'),
    image: String(professional.image || seed.image || ''),
  };
}

function seedProfessionals_(sheet) {
  const rows = PROFESSIONALS_SEED.map((professional) => objectToProfessionalRow_(normalizeProfessional_(professional)));
  if (!rows.length) {
    return;
  }

  sheet.getRange(2, 1, rows.length, PROFESSIONALS_HEADER.length).setValues(rows);
}

function upsertProfessional_(sheet, professional, allowUpdate) {
  const values = sheet.getDataRange().getValues();
  const rows = values.length > 1 ? values.slice(1) : [];
  const normalized = normalizeProfessional_(professional);
  const rowValues = objectToProfessionalRow_(normalized);

  let targetRow = -1;
  if (allowUpdate) {
    targetRow = rows.findIndex((row) => String(row[0]) === normalized.id) + 2;
  }

  if (targetRow > 1) {
    sheet.getRange(targetRow, 1, 1, PROFESSIONALS_HEADER.length).setValues([rowValues]);
    return targetRow;
  }

  sheet.appendRow(rowValues);
  return sheet.getLastRow();
}

function deleteProfessional_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }

  for (let row = values.length; row >= 2; row -= 1) {
    if (String(values[row - 1][0]) === id) {
      sheet.deleteRow(row);
      return true;
    }
  }

  return false;
}

function resetProfessionals_(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  seedProfessionals_(sheet);
  return readProfessionals_(sheet);
}

function objectToProfessionalRow_(professional) {
  return PROFESSIONALS_HEADER.map((key) => professional[key] || '');
}

function slugify_(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '');
}

function formatRetentionValue_(value) {
  if (value === null || value === undefined || value === '') {
    return '20%';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '20%';
  }

  if (raw.endsWith('%')) {
    return raw;
  }

  const numeric = Number(raw);
  if (!Number.isNaN(numeric)) {
    if (numeric > 0 && numeric < 1) {
      return `${Math.round(numeric * 100)}%`;
    }

    return `${Math.round(numeric)}%`;
  }

  return raw;
}

function newId_() {
  return Utilities.getUuid();
}

function json_(payload, status) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
