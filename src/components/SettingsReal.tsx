import React, { useEffect, useState } from 'react';
import { save, useRecords } from '../lib/crearStore';
import { Button, cardClass, ErrorMessage, Field, PageHeader } from './ui';
import {
  fetchAuthorizedUsersFromSheets,
  saveAuthorizedUserInSheets,
  fetchServicesFromSheets,
  saveServiceInSheets,
  fetchAuditLogsFromSheets,
  fetchPatientsFromSheets,
} from '../lib/googleSheetsService';
import type {
  AuditLogRecord,
  AuthorizedUserRecord,
  PatientRecord,
  ServiceCatalogItem,
} from '../types';
import { CREAR_TEAM } from '../lib/crearAuth';
import { useProfessionals } from '../lib/professionalsStore';
import { Plus, ShieldCheck, Layers, History, Users, Check, ExternalLink } from 'lucide-react';

export function SettingsReal({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const { rows, error } = useRecords('settings');
  const [allProfessionals] = useProfessionals();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [section, setSection] = useState<'users' | 'services' | 'patients' | 'audit' | 'general'>('users');

  // Usuarios autorizados
  const [users, setUsers] = useState<AuthorizedUserRecord[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<AuthorizedUserRecord> | null>(null);

  // Catálogo de prestaciones
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(45);

  // Pacientes consolidados y Auditoría
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    void fetchAuthorizedUsersFromSheets().then(setUsers);
    void fetchServicesFromSheets().then(setServices);
    void fetchPatientsFromSheets().then(setPatients);
    void fetchAuditLogsFromSheets().then(setAuditLogs);
  }, []);

  const value = (id: string, fallback = '') =>
    draft[id] ?? rows.find((x) => x.id === id)?.value ?? fallback;

  async function commitGeneral() {
    setSaving(true);
    setMessage('');
    try {
      await Promise.all(
        ['thirdAdmin', 'fourthAdmin', 'buildingRent', 'googleClientId'].map((id) =>
          save('settings', { id, value: value(id) })
        )
      );
      if (value('googleClientId').trim()) {
        localStorage.setItem('crear.google.clientId', value('googleClientId').trim());
      }
      setMessage('Configuración general guardada en Google Sheets.');
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser?.name || !editingUser?.email) return;

    const record: AuthorizedUserRecord = {
      id: editingUser.id || `user-${Date.now()}`,
      name: editingUser.name.trim(),
      email: editingUser.email.trim().toLowerCase().includes('@')
        ? editingUser.email.trim().toLowerCase()
        : `${editingUser.email.trim().toLowerCase()}@crear.com`,
      googleEmail: (editingUser.googleEmail || '').trim().toLowerCase(),
      password: editingUser.password || undefined,
      role: editingUser.role === 'admin' ? 'admin' : 'professional',
      professionalId: editingUser.professionalId || '',
      specialty: editingUser.specialty || '',
      active: editingUser.active !== false,
      createdAt: editingUser.createdAt || new Date().toISOString().slice(0, 10),
    };

    setUsers((prev) =>
      prev.some((u) => u.id === record.id)
        ? prev.map((u) => (u.id === record.id ? { ...u, ...record } : u))
        : [...prev, record]
    );
    setEditingUser(null);
    setMessage(`Cuenta ${record.email} guardada en Google Sheets.`);
    await saveAuthorizedUserInSheets(record);
  }

  async function toggleUserActive(u: AuthorizedUserRecord) {
    const updated = { ...u, active: !u.active };
    setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
    await saveAuthorizedUserInSheets(updated);
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const item: ServiceCatalogItem = {
      id: `srv-${Date.now()}`,
      name: newServiceName.trim(),
      durationMinutes: Number(newServiceDuration) || 45,
      active: true,
    };
    setServices((prev) => [...prev, item]);
    setNewServiceName('');
    await saveServiceInSheets(item);
  }

  async function toggleServiceActive(srv: ServiceCatalogItem) {
    const next = { ...srv, active: !srv.active };
    setServices((prev) => prev.map((s) => (s.id === srv.id ? next : s)));
    await saveServiceInSheets(next);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Administración y Configuración"
        description="Gestión de cuentas de acceso (@crear.com y Google), catálogo de prestaciones, pacientes y auditoría."
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl bg-[#DDEAE2] px-4 py-3 text-xs font-bold text-[#1D3E35]">
          <Check className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Pestañas de Configuración Adaptadas para Celular y Escritorio */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-[#E5EAE5] bg-white p-1.5">
        <button
          type="button"
          onClick={() => setSection('users')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            section === 'users' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76] hover:bg-[#F2F5F3]'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Usuarios y Accesos ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('services')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            section === 'services' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76] hover:bg-[#F2F5F3]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Catálogo de Prestaciones ({services.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('patients')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            section === 'patients' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76] hover:bg-[#F2F5F3]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Pacientes Vinculados ({patients.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('audit')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            section === 'audit' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76] hover:bg-[#F2F5F3]'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Historial de Cambios</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('general')}
          className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            section === 'general' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76] hover:bg-[#F2F5F3]'
          }`}
        >
          <span>Parámetros Generales</span>
        </button>
      </div>

      {/* 1. GESTIÓN DE USUARIOS Y CUENTAS (@crear.com / Gmail) */}
      {section === 'users' && (
        <div className="space-y-4">
          <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <h2 className="text-base font-bold text-[#34433F]">
                Supervisión de Cuentas y Políticas de Acceso
              </h2>
              <p className="text-xs text-[#6D7C76]">
                El alta y habilitación de terapeutas se realiza desde su ficha en <strong>Profesionales</strong>. Aquí se supervisa la seguridad global y las cuentas administrativas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onNavigate && (
                <Button tone="secondary" onClick={() => onNavigate('professionals')}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5 inline" />
                  Gestionar fichas en Profesionales
                </Button>
              )}
              <Button
                onClick={() =>
                  setEditingUser({
                    name: '',
                    email: '@crear.com',
                    googleEmail: '',
                    password: '',
                    role: 'admin',
                    professionalId: '',
                    specialty: '',
                    active: true,
                  })
                }
              >
                <Plus className="mr-1.5 h-4 w-4 inline" />
                Cuenta administrativa
              </Button>
            </div>
          </div>

          {editingUser && (
            <form onSubmit={handleSaveUser} className={`${cardClass} space-y-4 border-2 border-[#46766B]`}>
              <h3 className="text-sm font-bold text-[#34433F]">
                {editingUser.id ? `Editar cuenta: ${editingUser.name}` : 'Alta de cuenta autorizada'}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field
                  label="Nombre y apellido"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
                <Field
                  label="Usuario o Correo (@crear.com)"
                  required
                  placeholder="ej. ariadna@crear.com"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
                <Field
                  label="Contraseña de acceso"
                  placeholder={editingUser.id ? 'Dejar vacío para mantener actual' : 'Ingresar clave individual segura'}
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                />
                <Field
                  label="Correo Gmail (para botón Google)"
                  placeholder="opcional@gmail.com"
                  value={editingUser.googleEmail || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, googleEmail: e.target.value })}
                />
                <label className="block text-sm">
                  <span className="font-medium text-[#34433F]">Rol en el sistema</span>
                  <select
                    value={editingUser.role || 'professional'}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value as 'admin' | 'professional',
                      })
                    }
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[#DDE3DF] bg-white px-3.5 text-sm"
                  >
                    <option value="professional">Terapeuta</option>
                    <option value="admin">Responsable (Administradora)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#34433F]">
                    Profesional vinculada {editingUser.role === 'admin' ? '(opcional si también atiende)' : ''}
                  </span>
                  <select
                    value={editingUser.professionalId || ''}
                    onChange={(e) => {
                      const pro =
                        allProfessionals.find((t) => t.id === e.target.value) ||
                        CREAR_TEAM.find((t) => t.id === e.target.value);
                      setEditingUser({
                        ...editingUser,
                        professionalId: e.target.value,
                        specialty: pro?.specialty || editingUser.specialty,
                      });
                    }}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[#DDE3DF] bg-white px-3.5 text-sm"
                  >
                    <option value="">Sin vincular a agenda individual...</option>
                    {allProfessionals.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialty || 'Profesional'})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button tone="secondary" type="button" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar cuenta</Button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E5EAE5] bg-white p-3.5 sm:p-4 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-[#34433F]">{u.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-[#E8F3EE] text-[#46766B]'
                      }`}
                    >
                      {u.role === 'admin' ? 'Responsable' : u.specialty || 'Terapeuta'}
                    </span>
                    {!u.active && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#52635D] break-all">{u.email}</p>
                  {u.googleEmail && (
                    <p className="text-[11px] text-[#6D7C76] break-all">Google: {u.googleEmail}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#F0F4F2] shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingUser(u)}
                    className="flex-1 sm:flex-initial rounded-xl border border-[#D5DDD7] px-3 py-1.5 text-xs font-bold text-[#34433F] hover:bg-[#F9FBF9] text-center"
                  >
                    Clave / Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleUserActive(u)}
                    className={`flex-1 sm:flex-initial rounded-xl px-3 py-1.5 text-xs font-bold text-center ${
                      u.active
                        ? 'border border-rose-200 bg-rose-50 text-rose-700'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {u.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CATÁLOGO DE PRESTACIONES */}
      {section === 'services' && (
        <div className="space-y-4">
          <form onSubmit={handleAddService} className={`${cardClass} flex flex-wrap items-end gap-3`}>
            <div className="flex-1 min-w-[200px]">
              <Field
                label="Nueva prestación / especialidad"
                placeholder="Ej.: Kinesiología, Estimulación Temprana..."
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Field
                label="Duración (min)"
                type="number"
                min={15}
                max={240}
                value={newServiceDuration}
                onChange={(e) => setNewServiceDuration(Number(e.target.value))}
              />
            </div>
            <Button type="submit">Agregar prestación</Button>
          </form>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="flex items-center justify-between rounded-2xl border border-[#E5EAE5] bg-white p-4 shadow-xs"
              >
                <div>
                  <p className="text-sm font-bold text-[#34433F]">{srv.name}</p>
                  <p className="text-xs text-[#6D7C76]">Duración sugerida: {srv.durationMinutes} min</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleServiceActive(srv)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                    srv.active
                      ? 'bg-[#E8F3EE] text-[#46766B]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {srv.active ? 'Activa' : 'Oculta'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PACIENTES CONSOLIDADOS */}
      {section === 'patients' && (
        <div className={`${cardClass} space-y-3`}>
          <h2 className="text-base font-bold text-[#34433F]">
            Padrón Consolidado de Pacientes Vinculados a Turnos
          </h2>
          {patients.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6D7C76]">
              Todavía no se registraron pacientes en la hoja crear_patients.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {patients.map((p) => {
                const pro =
                  allProfessionals.find((t) => t.id === p.professionalId) ||
                  CREAR_TEAM.find((t) => t.id === p.professionalId);
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-[#EAEFEA] bg-[#FDFEFC] p-3 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-[#34433F]">{p.name}</p>
                      <p className="text-[#6D7C76]">
                        Profesional: {pro?.name || p.professionalId || 'General'}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#E8F3EE] px-2 py-0.5 text-[10px] font-bold text-[#46766B]">
                      {p.status === 'inactive' ? 'Inactivo' : 'Activo'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. HISTORIAL DE AUDITORÍA */}
      {section === 'audit' && (
        <div className={`${cardClass} space-y-3`}>
          <h2 className="text-base font-bold text-[#34433F]">
            Registro de Auditoría (Creaciones, Modificaciones y Cancelaciones)
          </h2>
          {auditLogs.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6D7C76]">
              Los nuevos eventos de reservas y cancelaciones quedarán registrados aquí.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-xl border border-[#EAEFEA] bg-[#FDFEFC] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-[#34433F] break-words">{log.summary}</span>
                    <p className="text-[11px] text-[#6D7C76] break-words">
                      Usuario: {log.actorEmail} ({log.actorRole}) · Acción: {log.action}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-[#889892] shrink-0">
                    {log.timestamp.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. PARÁMETROS GENERALES */}
      {section === 'general' && (
        <div className="space-y-4">
          <section className={`${cardClass} grid gap-5 sm:grid-cols-2`}>
            <Field
              label="Nombre de la tercera responsable"
              value={value('thirdAdmin')}
              onChange={(e) => setDraft({ ...draft, thirdAdmin: e.target.value })}
            />
            <Field
              label="Nombre de la cuarta responsable"
              value={value('fourthAdmin')}
              onChange={(e) => setDraft({ ...draft, fourthAdmin: e.target.value })}
            />
            <Field
              label="Alquiler mensual del inmueble"
              type="number"
              min="0"
              value={value('buildingRent', '770000')}
              onChange={(e) => setDraft({ ...draft, buildingRent: e.target.value })}
            />
            <Field
              label="Google OAuth Client ID (para botón Ingresar con Google)"
              placeholder="Ej.: 1234567890-abc.apps.googleusercontent.com"
              value={value('googleClientId')}
              onChange={(e) => setDraft({ ...draft, googleClientId: e.target.value })}
            />
            <p className="text-xs leading-5 text-[#6D7C76] sm:col-span-2">
              El Client ID de Google es público y permite activar la ventana emergente de Google Identity Services. Los tokens emitidos por Google son verificados criptográficamente en el servidor de Apps Script contra las cuentas autorizadas en <code>crear_users</code>.
            </p>
          </section>
          <Button disabled={saving} onClick={() => void commitGeneral()}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      )}
    </div>
  );
}
