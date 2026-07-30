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
    const requestedEntity = e && e.parameter ? String(e.parameter.entity || '') : '';
    const entity = requestedEntity === 'professionals' || requestedEntity === 'activities' ? requestedEntity : 'appointments';

    if (entity === 'activities') {
      return json_(handleActivitiesGet_(e));
    }

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
    const requestedEntity = String(body.entity || '');
    const entity = requestedEntity === 'professionals' || requestedEntity === 'activities' ? requestedEntity : 'appointments';

    if (entity === 'activities') {
      return json_(handleActivitiesPost_(body));
    }

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


// ===== Módulo Responsabilidades =====
const ACTIVITY_SHEETS_ = {
  founders: 'FUNDADORAS', periods: 'PERIODOS_ACTIVIDADES', activities: 'ACTIVIDADES', history: 'HISTORIAL_ACTIVIDADES', config: 'CONFIG_ACTIVIDADES',
};
const ACTIVITY_HEADERS_ = {
  founders: ['ID_FUNDADORA', 'NOMBRE', 'APELLIDO', 'NOMBRE_MOSTRAR', 'EMAIL', 'ROL', 'ORDEN', 'ACTIVA', 'FECHA_ALTA', 'OBSERVACIONES'],
  periods: ['ID_PERIODO', 'NOMBRE', 'DESCRIPCION', 'FECHA_INICIO', 'FECHA_FIN', 'TOTAL_PUNTOS_OBJETIVO', 'ESTADO', 'FECHA_CIERRE', 'CERRADO_POR', 'OBSERVACIONES', 'FECHA_CREACION', 'CREADO_POR'],
  activities: ['ID_ACTIVIDAD', 'ID_PERIODO', 'CATEGORIA', 'ACTIVIDAD', 'DESCRIPCION', 'RESULTADO_ESPERADO', 'ID_RESPONSABLE', 'COLABORADORAS', 'FECHA_INICIO', 'FECHA_VENCIMIENTO', 'PUNTOS', 'PRIORIDAD', 'ESTADO', 'PORCENTAJE_AVANCE', 'FACTOR_CUMPLIMIENTO', 'PUNTOS_OBTENIDOS', 'EVIDENCIA', 'OBSERVACIONES', 'ORDEN_TABLERO', 'CREADA_POR', 'FECHA_CREACION', 'MODIFICADA_POR', 'FECHA_MODIFICACION', 'FECHA_FINALIZACION', 'VALIDADA_POR', 'FECHA_VALIDACION', 'ACTIVA'],
  history: ['ID_HISTORIAL', 'FECHA_HORA', 'USUARIO', 'ACCION', 'ID_ACTIVIDAD', 'CAMPO_MODIFICADO', 'VALOR_ANTERIOR', 'VALOR_NUEVO', 'MOTIVO'],
  config: ['CLAVE', 'VALOR', 'DESCRIPCION'],
};
const ACTIVITY_CONFIG_DEFAULTS_ = [
  ['PERIODO_ACTIVO', '', 'ID del período activo'], ['PERMITIR_REASIGNACION', 'Sí', 'Permite reasignar actividades'],
];

function getActivitiesSpreadsheet_() {
  const configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (configuredId) return SpreadsheetApp.openById(configuredId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  return active || SpreadsheetApp.openById(SPREADSHEET_ID);
}

function activitySuccess_(data, message) { return { ok: true, data: data || {}, message: message || '' }; }
function activityError_(message) { return { ok: false, data: null, message: message || 'No se pudo completar la operación.' }; }
function activityText_(value) { return value === null || value === undefined ? '' : String(value); }
function activityYes_(value) { return ['si', 'sí', 'true'].indexOf(activityText_(value).toLowerCase()) >= 0; }
function activityNumber_(value, fallback) { const number = Number(value); return isNaN(number) ? (fallback || 0) : number; }
function activityDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const raw = activityText_(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) { const parts = raw.split('/'); return parts[2] + '-' + parts[1] + '-' + parts[0]; }
  return raw;
}
function activityNow_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function activitySheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); sheet.setFrozenRows(1); return sheet; }
  const current = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(activityText_);
  if (!current.some(Boolean)) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); sheet.setFrozenRows(1); return sheet; }
  const missing = headers.filter((header) => current.indexOf(header) < 0);
  if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  sheet.setFrozenRows(1); return sheet;
}
function activityHeaderMap_(sheet) { const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(activityText_); const map = {}; headers.forEach((header, index) => { if (header) map[header] = index; }); return { headers: headers, map: map }; }
function activityRecords_(sheet) { if (sheet.getLastRow() <= 1) return []; const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues(); const headers = data[0].map(activityText_); return data.slice(1).filter((row) => row.some((value) => value !== '')).map((row) => { const record = {}; headers.forEach((header, index) => { record[header] = row[index]; }); return record; }); }
function activityAppend_(sheet, record) { const headerData = activityHeaderMap_(sheet); sheet.appendRow(headerData.headers.map((header) => record[header] === undefined ? '' : record[header])); }
function activityFindRow_(sheet, idHeader, id) { const records = activityRecords_(sheet); const found = records.findIndex((record) => activityText_(record[idHeader]) === activityText_(id)); return found < 0 ? -1 : found + 2; }
function activityReadRow_(sheet, row) { const headerData = activityHeaderMap_(sheet); const values = sheet.getRange(row, 1, 1, headerData.headers.length).getValues()[0]; const record = {}; headerData.headers.forEach((header, index) => { record[header] = values[index]; }); return record; }
function activityWriteRow_(sheet, row, record) { const headerData = activityHeaderMap_(sheet); sheet.getRange(row, 1, 1, headerData.headers.length).setValues([headerData.headers.map((header) => record[header] === undefined ? '' : record[header])]); }
function activityConfig_(sheet) { const config = {}; activityRecords_(sheet).forEach((record) => { config[activityText_(record.CLAVE)] = activityText_(record.VALOR); }); return config; }

function crearHojasActividades() {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const spreadsheet = getActivitiesSpreadsheet_(); const sheets = {};
    Object.keys(ACTIVITY_SHEETS_).forEach((key) => { sheets[key] = activitySheet_(spreadsheet, ACTIVITY_SHEETS_[key], ACTIVITY_HEADERS_[key]); });
    const existing = activityConfig_(sheets.config);
    ACTIVITY_CONFIG_DEFAULTS_.filter((item) => !existing[item[0]]).forEach((item) => activityAppend_(sheets.config, { CLAVE: item[0], VALOR: item[1], DESCRIPCION: item[2] }));
    return activitySuccess_({ sheets: Object.keys(ACTIVITY_SHEETS_).map((key) => ACTIVITY_SHEETS_[key]) }, 'Hojas de actividades listas.');
  } finally { lock.releaseLock(); }
}
function activitySheets_() { const sheets = activitySheetsUnlocked_(); if (sheets.founders && sheets.periods && sheets.activities && sheets.history && sheets.config) return sheets; crearHojasActividades(); return activitySheetsUnlocked_(); }
function activityPublicFounder_(record) { return { id: activityText_(record.ID_FUNDADORA), firstName: activityText_(record.NOMBRE), lastName: activityText_(record.APELLIDO), displayName: activityText_(record.NOMBRE_MOSTRAR || record.NOMBRE), email: activityText_(record.EMAIL), role: activityText_(record.ROL), order: activityNumber_(record.ORDEN, 999), active: activityYes_(record.ACTIVA), createdAt: activityDate_(record.FECHA_ALTA), notes: activityText_(record.OBSERVACIONES) }; }
function activityPublicPeriod_(record) { return { id: activityText_(record.ID_PERIODO), name: activityText_(record.NOMBRE), description: activityText_(record.DESCRIPCION), startDate: activityDate_(record.FECHA_INICIO), endDate: activityDate_(record.FECHA_FIN), status: activityText_(record.ESTADO || 'Borrador'), closedAt: activityDate_(record.FECHA_CIERRE), closedBy: activityText_(record.CERRADO_POR), notes: activityText_(record.OBSERVACIONES), createdAt: activityText_(record.FECHA_CREACION), createdBy: activityText_(record.CREADO_POR) }; }
function activityCollaborators_(value) { if (Array.isArray(value)) return value.map(activityText_).filter(Boolean); if (!value) return []; try { const parsed = JSON.parse(activityText_(value)); return Array.isArray(parsed) ? parsed.map(activityText_).filter(Boolean) : []; } catch (error) { return activityText_(value).split(',').map((item) => item.trim()).filter(Boolean); } }
function activityPublic_(record) { return { id: activityText_(record.ID_ACTIVIDAD), periodId: activityText_(record.ID_PERIODO), category: activityText_(record.CATEGORIA || 'Otros'), title: activityText_(record.ACTIVIDAD), description: activityText_(record.DESCRIPCION), expectedResult: activityText_(record.RESULTADO_ESPERADO), responsibleId: activityText_(record.ID_RESPONSABLE) || undefined, collaboratorIds: activityCollaborators_(record.COLABORADORAS), startDate: activityDate_(record.FECHA_INICIO), dueDate: activityDate_(record.FECHA_VENCIMIENTO), priority: activityText_(record.PRIORIDAD || 'Media'), status: activityText_(record.ESTADO || 'Sin asignar'), progress: activityNumber_(record.PORCENTAJE_AVANCE), notes: activityText_(record.OBSERVACIONES), boardOrder: activityNumber_(record.ORDEN_TABLERO, 999999), createdBy: activityText_(record.CREADA_POR), createdAt: activityText_(record.FECHA_CREACION), modifiedBy: activityText_(record.MODIFICADA_POR), modifiedAt: activityText_(record.FECHA_MODIFICACION), finishedAt: activityText_(record.FECHA_FINALIZACION), active: record.ACTIVA === '' || record.ACTIVA === undefined ? true : activityYes_(record.ACTIVA) }; }

function activityNextId_(propertyKey, prefix, digits, sheet, header) {
  const properties = PropertiesService.getScriptProperties(); let sequence = Number(properties.getProperty(propertyKey) || 0);
  if (!sequence) activityRecords_(sheet).forEach((record) => { const match = activityText_(record[header]).match(/(\d+)$/); if (match) sequence = Math.max(sequence, Number(match[1])); });
  sequence += 1; properties.setProperty(propertyKey, String(sequence)); return prefix + String(sequence).padStart(digits, '0');
}
function activityValidate_(record, founders, periods) {
  if (!activityText_(record.ACTIVIDAD).trim()) throw new Error('El nombre de la actividad es obligatorio.');
  if (!activityText_(record.ID_PERIODO)) throw new Error('La actividad debe pertenecer a un período.');
  if (!periods.some((period) => activityText_(period.ID_PERIODO) === activityText_(record.ID_PERIODO))) throw new Error('El período seleccionado no existe.');
  if (record.FECHA_INICIO && record.FECHA_VENCIMIENTO && activityDate_(record.FECHA_VENCIMIENTO) < activityDate_(record.FECHA_INICIO)) throw new Error('La fecha de vencimiento no puede ser anterior a la de inicio.');
  const responsibleId = activityText_(record.ID_RESPONSABLE); const collaborators = activityCollaborators_(record.COLABORADORAS);
  if (responsibleId && !founders.some((founder) => activityText_(founder.ID_FUNDADORA) === responsibleId && activityYes_(founder.ACTIVA))) throw new Error('La responsable seleccionada no existe o no está activa.');
  if (new Set(collaborators).size !== collaborators.length) throw new Error('No se permiten colaboradoras duplicadas.');
  if (responsibleId && collaborators.indexOf(responsibleId) >= 0) throw new Error('La responsable principal no puede ser colaboradora.');
  if (activityNumber_(record.PORCENTAJE_AVANCE) < 0 || activityNumber_(record.PORCENTAJE_AVANCE) > 100) throw new Error('El porcentaje de avance debe estar entre 0 y 100.');
}
function activityRecordFromInput_(input, current, founders, periods, user, isNew) {
  const source = input || {}; const record = Object.assign({}, current || {}); const now = activityNow_();
  const get = (name, fallback) => source[name] === undefined || source[name] === null ? fallback : source[name];
  record.ID_ACTIVIDAD = current ? activityText_(current.ID_ACTIVIDAD) : '';
  record.ID_PERIODO = activityText_(get('periodId', record.ID_PERIODO)); record.CATEGORIA = activityText_(get('category', record.CATEGORIA || 'Otros')); record.ACTIVIDAD = activityText_(get('title', record.ACTIVIDAD)); record.DESCRIPCION = activityText_(get('description', record.DESCRIPCION)); record.RESULTADO_ESPERADO = activityText_(get('expectedResult', record.RESULTADO_ESPERADO)); record.ID_RESPONSABLE = activityText_(get('responsibleId', record.ID_RESPONSABLE));
  const collaboratorInput = get('collaboratorIds', activityCollaborators_(record.COLABORADORAS)); record.COLABORADORAS = JSON.stringify(activityCollaborators_(collaboratorInput));
  record.FECHA_INICIO = activityDate_(get('startDate', record.FECHA_INICIO)); record.FECHA_VENCIMIENTO = activityDate_(get('dueDate', record.FECHA_VENCIMIENTO)); record.PUNTOS = current ? activityNumber_(current.PUNTOS) : 0; record.PRIORIDAD = activityText_(get('priority', record.PRIORIDAD || 'Media')); record.ESTADO = activityText_(get('status', record.ESTADO || 'Sin asignar')); record.PORCENTAJE_AVANCE = activityNumber_(get('progress', record.PORCENTAJE_AVANCE)); record.EVIDENCIA = current ? activityText_(current.EVIDENCIA) : ''; record.OBSERVACIONES = activityText_(get('notes', record.OBSERVACIONES)); record.ORDEN_TABLERO = activityNumber_(get('boardOrder', record.ORDEN_TABLERO || Date.now()));
  if (!record.ID_RESPONSABLE) record.ESTADO = 'Sin asignar'; else if (record.ESTADO === 'Sin asignar') record.ESTADO = 'Pendiente';
  if (record.ESTADO === 'Completada') { record.PORCENTAJE_AVANCE = 100; record.FECHA_FINALIZACION = activityDate_(get('finishedAt', record.FECHA_FINALIZACION)) || now; } else { record.FECHA_FINALIZACION = ''; } record.FACTOR_CUMPLIMIENTO = 0;
  record.PUNTOS_OBTENIDOS = 0; record.MODIFICADA_POR = user; record.FECHA_MODIFICACION = now; record.ACTIVA = source.active === false ? 'No' : (current ? (activityYes_(current.ACTIVA) ? 'Sí' : 'No') : 'Sí');
  if (isNew) { record.CREADA_POR = user; record.FECHA_CREACION = now; }
  activityValidate_(record, founders, periods); return record;
}
function activityLog_(sheets, activityId, user, action, field, previousValue, newValue, reason) { activityAppend_(sheets.history, { ID_HISTORIAL: activityNextId_('ACTIVITIES_HISTORY_SEQUENCE', 'HIS-', 6, sheets.history, 'ID_HISTORIAL'), FECHA_HORA: activityNow_(), USUARIO: user || 'Sistema', ACCION: action, ID_ACTIVIDAD: activityId, CAMPO_MODIFICADO: field || '', VALOR_ANTERIOR: activityText_(previousValue), VALOR_NUEVO: activityText_(newValue), MOTIVO: reason || '' }); }
function activityLogChanges_(sheets, previous, next, user, reason, action) { const fields = ['ID_PERIODO', 'CATEGORIA', 'ACTIVIDAD', 'ID_RESPONSABLE', 'COLABORADORAS', 'FECHA_INICIO', 'FECHA_VENCIMIENTO', 'PRIORIDAD', 'ESTADO', 'PORCENTAJE_AVANCE', 'OBSERVACIONES', 'ORDEN_TABLERO', 'ACTIVA']; let changed = false; fields.forEach((field) => { if (activityText_(previous[field]) !== activityText_(next[field])) { changed = true; activityLog_(sheets, next.ID_ACTIVIDAD, user, action || 'Edición', field, previous[field], next[field], reason); } }); if (!changed) activityLog_(sheets, next.ID_ACTIVIDAD, user, action || 'Edición', '', '', '', reason); }
function handleActivitiesGet_(event) {
  try {
    const sheets = activitySheets_(); const params = event && event.parameter ? event.parameter : {}; const idActivity = activityText_(params.idActivity);
    if (idActivity) { const history = activityRecords_(sheets.history).filter((record) => activityText_(record.ID_ACTIVIDAD) === idActivity).map((record) => ({ id: activityText_(record.ID_HISTORIAL), timestamp: activityText_(record.FECHA_HORA), user: activityText_(record.USUARIO), action: activityText_(record.ACCION), activityId: activityText_(record.ID_ACTIVIDAD), field: activityText_(record.CAMPO_MODIFICADO), previousValue: activityText_(record.VALOR_ANTERIOR), newValue: activityText_(record.VALOR_NUEVO), reason: activityText_(record.MOTIVO) })).reverse(); return activitySuccess_({ history: history }); }
    return activitySuccess_({ founders: activityRecords_(sheets.founders).map(activityPublicFounder_).sort((a, b) => a.order - b.order), periods: activityRecords_(sheets.periods).map(activityPublicPeriod_), activities: activityRecords_(sheets.activities).map(activityPublic_), config: activityConfig_(sheets.config) });
  } catch (error) { Logger.log(error && error.stack ? error.stack : error); return activityError_('No se pudieron cargar las responsabilidades.'); }
}
function activityCreatePeriod_(body) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheets = activitySheetsUnlocked_(); const input = body.period || {}; const name = activityText_(input.name).trim(); if (!name) throw new Error('El nombre del período es obligatorio.'); const start = activityDate_(input.startDate); const end = activityDate_(input.endDate); if (start && end && end < start) throw new Error('La fecha final no puede ser anterior a la inicial.'); const user = activityText_(body.user || 'Admin CREAR'); const id = activityNextId_('ACTIVITIES_PERIOD_SEQUENCE', 'PER-', 4, sheets.periods, 'ID_PERIODO'); const status = ['Borrador', 'Activo', 'En revisión', 'Cerrado'].indexOf(activityText_(input.status)) >= 0 ? activityText_(input.status) : 'Activo';
    if (status === 'Activo') { activityRecords_(sheets.periods).forEach((period) => { if (activityText_(period.ESTADO) === 'Activo') { period.ESTADO = 'En revisión'; activityWriteRow_(sheets.periods, activityFindRow_(sheets.periods, 'ID_PERIODO', period.ID_PERIODO), period); } }); }
    const record = { ID_PERIODO: id, NOMBRE: name, DESCRIPCION: activityText_(input.description), FECHA_INICIO: start, FECHA_FIN: end, TOTAL_PUNTOS_OBJETIVO: 0, ESTADO: status, FECHA_CIERRE: '', CERRADO_POR: '', OBSERVACIONES: activityText_(input.notes), FECHA_CREACION: activityNow_(), CREADO_POR: user }; activityAppend_(sheets.periods, record); if (status === 'Activo') { const configRows = activityRecords_(sheets.config); const index = configRows.findIndex((row) => activityText_(row.CLAVE) === 'PERIODO_ACTIVO'); if (index >= 0) { const row = configRows[index]; row.VALOR = id; activityWriteRow_(sheets.config, index + 2, row); } } return activitySuccess_(activityPublicPeriod_(record), 'Período creado.');
  } finally { lock.releaseLock(); }
}

function activitySheetsUnlocked_() { const spreadsheet = getActivitiesSpreadsheet_(); return { founders: spreadsheet.getSheetByName(ACTIVITY_SHEETS_.founders), periods: spreadsheet.getSheetByName(ACTIVITY_SHEETS_.periods), activities: spreadsheet.getSheetByName(ACTIVITY_SHEETS_.activities), history: spreadsheet.getSheetByName(ACTIVITY_SHEETS_.history), config: spreadsheet.getSheetByName(ACTIVITY_SHEETS_.config) }; }
function activityCreate_(body) { const lock = LockService.getScriptLock(); lock.waitLock(10000); try { const sheets = activitySheetsUnlocked_(); const user = activityText_(body.user || 'Admin CREAR'); const record = activityRecordFromInput_(body.activity, null, activityRecords_(sheets.founders), activityRecords_(sheets.periods), user, true); record.ID_ACTIVIDAD = activityNextId_('ACTIVITIES_SEQUENCE', 'ACT-', 6, sheets.activities, 'ID_ACTIVIDAD'); activityAppend_(sheets.activities, record); activityLog_(sheets, record.ID_ACTIVIDAD, user, 'Creación', '', '', record.ACTIVIDAD, body.reason); return activitySuccess_(activityPublic_(record), 'Actividad creada.'); } finally { lock.releaseLock(); } }
function activityUpdate_(body) { const lock = LockService.getScriptLock(); lock.waitLock(10000); try { const sheets = activitySheetsUnlocked_(); const id = activityText_(body.activity && body.activity.id); const row = activityFindRow_(sheets.activities, 'ID_ACTIVIDAD', id); if (row < 2) throw new Error('No se encontró la actividad a actualizar.'); const previous = activityReadRow_(sheets.activities, row); const user = activityText_(body.user || 'Admin CREAR'); const next = activityRecordFromInput_(body.activity, previous, activityRecords_(sheets.founders), activityRecords_(sheets.periods), user, false); const action = activityText_(previous.ID_RESPONSABLE) !== activityText_(next.ID_RESPONSABLE) ? 'Reasignación' : activityText_(previous.ESTADO) !== activityText_(next.ESTADO) ? 'Cambio de estado' : 'Edición'; activityWriteRow_(sheets.activities, row, next); activityLogChanges_(sheets, previous, next, user, body.reason, action); return activitySuccess_(activityPublic_(next), 'Actividad actualizada.'); } finally { lock.releaseLock(); } }
function activityReorder_(body) { const lock = LockService.getScriptLock(); lock.waitLock(10000); try { const sheets = activitySheetsUnlocked_(); const orders = Array.isArray(body.orders) ? body.orders : []; const user = activityText_(body.user || 'Admin CREAR'); orders.forEach((order) => { const row = activityFindRow_(sheets.activities, 'ID_ACTIVIDAD', order.id); if (row < 2) return; const record = activityReadRow_(sheets.activities, row); const previous = record.ORDEN_TABLERO; record.ORDEN_TABLERO = activityNumber_(order.boardOrder); record.MODIFICADA_POR = user; record.FECHA_MODIFICACION = activityNow_(); activityWriteRow_(sheets.activities, row, record); if (activityText_(previous) !== activityText_(record.ORDEN_TABLERO)) activityLog_(sheets, record.ID_ACTIVIDAD, user, 'Cambio de orden', 'ORDEN_TABLERO', previous, record.ORDEN_TABLERO, 'Reordenamiento en tablero'); }); return activitySuccess_({ updated: orders.length }, 'Orden actualizado.'); } finally { lock.releaseLock(); } }
function handleActivitiesPost_(body) { try { const action = activityText_(body.action || ''); if (action === 'setup') return crearHojasActividades(); activitySheets_(); if (action === 'createPeriod') return activityCreatePeriod_(body); if (action === 'createActivity') return activityCreate_(body); if (action === 'updateActivity') return activityUpdate_(body); if (action === 'reorderActivities') return activityReorder_(body); return activityError_('La operación solicitada no está disponible.'); } catch (error) { Logger.log(error && error.stack ? error.stack : error); return activityError_(error && error.message ? error.message : 'No se pudo guardar la información.'); } }

// Funciones públicas para ejecutar desde Apps Script o reutilizar en futuros módulos.
function obtenerFundadoras() { const sheets = activitySheets_(); return activityRecords_(sheets.founders).map(activityPublicFounder_).filter((founder) => founder.active).sort((a, b) => a.order - b.order); }
function obtenerPeriodos() { const sheets = activitySheets_(); return activityRecords_(sheets.periods).map(activityPublicPeriod_); }
function obtenerActividades() { const sheets = activitySheets_(); return activityRecords_(sheets.activities).map(activityPublic_); }
function obtenerHistorialActividad(idActividad) { const sheets = activitySheets_(); return activityRecords_(sheets.history).filter((record) => activityText_(record.ID_ACTIVIDAD) === activityText_(idActividad)); }
function obtenerConfiguracionActividades() { const sheets = activitySheets_(); return activityConfig_(sheets.config); }
function obtenerResumenActividades(idPeriodo) { const activities = obtenerActividades().filter((activity) => !idPeriodo || activity.periodId === idPeriodo); const founders = obtenerFundadoras(); return founders.map((founder) => { const assigned = activities.filter((activity) => activity.responsibleId === founder.id && activity.active && activity.status !== 'Cancelada'); return { founderId: founder.id, founder: founder.displayName, assigned: assigned.length, completed: assigned.filter((activity) => activity.status === 'Completada').length, pending: assigned.filter((activity) => !['Completada', 'Cancelada'].includes(activity.status)).length }; }); }
