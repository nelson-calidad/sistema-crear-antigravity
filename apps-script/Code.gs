const SPREADSHEET_ID = '17eRyphluofIxIhH99Vq1KYINTJ8sY3nQT8JIahzXDJo';
const SHEET_NAME = 'appointments';
const HEADER = [
  'id',
  'title',
  'type',
  'proId',
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
];

function doGet() {
  try {
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
    const action = body.action || 'create';
    const sheet = ensureSheet_();

    if (action === 'delete') {
      if (!body.id) {
        throw new Error('Missing id');
      }

      deleteAppointment_(sheet, String(body.id));
      return json_({ ok: true });
    }

    const appointment = normalizeAppointment_(body.appointment || {});

    if (action === 'update') {
      if (!body.id && !appointment.id) {
        throw new Error('Missing id');
      }

      upsertAppointment_(sheet, { ...appointment, id: String(body.id || appointment.id) }, true);
      return json_({ ok: true });
    }

    upsertAppointment_(sheet, appointment, false);
    return json_({ ok: true });
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
    type: String(appointment.type || 'session'),
    proId: appointment.proId ? String(appointment.proId) : '',
    roomId: appointment.roomId ? String(appointment.roomId) : '',
    patient: appointment.patient ? String(appointment.patient) : '',
    notes: appointment.notes ? String(appointment.notes) : '',
    date: String(appointment.date || ''),
    start: String(appointment.start || '08:00'),
    end: String(appointment.end || '08:45'),
    recurrence: String(appointment.recurrence || 'none'),
    selectedDays: parsedSelectedDays,
    createdBy: appointment.createdBy ? String(appointment.createdBy) : '',
    createdAt: appointment.createdAt ? String(appointment.createdAt) : '',
    updatedAt: appointment.updatedAt ? String(appointment.updatedAt) : '',
  };
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
    return;
  }

  sheet.appendRow(rowValues);
}

function deleteAppointment_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return;
  }

  for (let row = values.length; row >= 2; row -= 1) {
    if (String(values[row - 1][0]) === id) {
      sheet.deleteRow(row);
      return;
    }
  }
}

function objectToRow_(appointment) {
  return HEADER.map((key) => {
    if (key === 'selectedDays') {
      return JSON.stringify(appointment[key] || []);
    }

    return appointment[key] || '';
  });
}

function newId_() {
  return Utilities.getUuid();
}

function json_(payload, status) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
