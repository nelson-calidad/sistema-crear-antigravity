import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  KeyRound,
  Layers,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  UserX,
} from 'lucide-react';
import { ROOMS } from '../constants';
import { DEFAULT_PROFILES_SEED, Profile, save, useRecords } from '../lib/crearStore';
import { buildUnifiedOccupancyAppointments } from '../lib/occupancy';
import {
  fetchAuthorizedUsersFromSheets,
  fetchRoomsFromSheets,
  fetchServicesFromSheets,
  fetchTherapistAvailabilitiesFromSheets,
  saveAuthorizedUserInSheets,
  subscribeToSheetsAppointments,
} from '../lib/googleSheetsService';
import type {
  AppointmentRecord,
  AuthorizedUserRecord,
  ConfiguredRoom,
  ServiceCatalogItem,
  TherapistAvailability,
} from '../types';
import { Button, cardClass, ErrorMessage, Field, Modal, PageHeader, SelectField } from './ui';

type FichaSection = 'general' | 'services' | 'schedule' | 'access';

interface NewProfessionalWizardState {
  step: 1 | 2;
  firstName: string;
  lastName: string;
  specialty: string;
  subSpecialty: string;
  licenseNumber: string;
  phone: string;
  email: string;
  joinedDate: string;
  responsible: string;
  roomId: string;
  availability: string;
  acceptingPatients: boolean;
  serviceIds: string[];
  notes: string;
  // Paso 2: Acceso
  accessDecision: 'now' | 'later';
  loginEmail: string;
  googleEmail: string;
  password: string;
  role: 'professional' | 'admin';
}

function slugifyId(firstName: string, lastName: string): string {
  const base = `${firstName} ${lastName}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? `pro-${base}-${Date.now().toString().slice(-4)}` : `pro-${Date.now()}`;
}

function splitFullName(profile: Profile): { firstName: string; lastName: string } {
  if (profile.firstName || profile.lastName) {
    return {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
    };
  }
  const parts = (profile.name || '').trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] || '', lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function ProfilesReal({ onAgenda }: { onAgenda: () => void }) {
  const { rows, error, refresh: refreshProfiles } = useRecords('profiles');
  const settings = useRecords('settings');
  const agreements = useRecords('agreements');
  const rentals = useRecords('rentals');
  const interviews = useRecords('interviews');

  // Datos vinculados desde Google Sheets
  const [users, setUsers] = useState<AuthorizedUserRecord[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [rooms, setRooms] = useState<ConfiguredRoom[]>(
    ROOMS.map((r) => ({ id: r.id, name: r.name, description: r.type, active: true }))
  );
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [availabilities, setAvailabilities] = useState<TherapistAvailability[]>([]);

  // Filtros de listado
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal Ficha Individual (4 secciones)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [fichaSection, setFichaSection] = useState<FichaSection>('general');
  const [accessForm, setAccessForm] = useState<{
    id?: string;
    email: string;
    googleEmail: string;
    password: string;
    role: 'professional' | 'admin';
    active: boolean;
    lastLoginAt?: string;
  } | null>(null);

  // Modal Alta en 2 pasos
  const [wizard, setWizard] = useState<NewProfessionalWizardState | null>(null);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const thirdAdmin = settings.rows.find((s) => s.id === 'thirdAdmin')?.value || 'Florencia';
  const fourthAdmin = settings.rows.find((s) => s.id === 'fourthAdmin')?.value || 'Responsable 4';

  useEffect(() => {
    void fetchAuthorizedUsersFromSheets().then(setUsers);
    void fetchServicesFromSheets().then(setServices);
    void fetchRoomsFromSheets().then((r) => {
      if (r.length > 0) setRooms(r);
    });
    void fetchTherapistAvailabilitiesFromSheets().then(setAvailabilities);

    const unsubscribe = subscribeToSheetsAppointments(
      (apps) => setAppointments(apps),
      () => {}
    );
    return () => unsubscribe();
  }, []);

  // Unificar perfiles semilla con los guardados en Google Sheets sin duplicar
  const profiles: Profile[] = useMemo(() => {
    const merged = new Map<string, Profile>();
    DEFAULT_PROFILES_SEED.forEach((seed) => merged.set(seed.id, seed));
    rows.forEach((row) => {
      const prev = merged.get(row.id);
      merged.set(row.id, prev ? { ...prev, ...row } : row);
    });
    return Array.from(merged.values());
  }, [rows]);

  // Resolver cuenta de usuario vinculada a una profesional
  const findLinkedUser = (profile: Profile): AuthorizedUserRecord | undefined => {
    return users.find(
      (u) =>
        u.professionalId === profile.id ||
        (profile.email && u.email.toLowerCase() === profile.email.toLowerCase()) ||
        (profile.email && u.googleEmail && u.googleEmail.toLowerCase() === profile.email.toLowerCase())
    );
  };

  // Resolver estado de acceso para mostrar en listado y ficha
  const getAccessStatus = (profile: Profile): {
    label: 'Habilitado' | 'Pendiente' | 'Desactivado';
    badgeClass: string;
    user?: AuthorizedUserRecord;
  } => {
    const linked = findLinkedUser(profile);
    if (!linked) {
      return {
        label: 'Pendiente',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    }
    if (!linked.active || !profile.active) {
      return {
        label: 'Desactivado',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        user: linked,
      };
    }
    return {
      label: 'Habilitado',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      user: linked,
    };
  };

  const todayIso = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Jujuy',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    []
  );

  const unifiedAppointments = useMemo(
    () =>
      buildUnifiedOccupancyAppointments({
        appointments,
        agreements: agreements.rows,
        rentals: rentals.rows,
        interviews: interviews.rows,
        profiles,
      }),
    [appointments, agreements.rows, rentals.rows, interviews.rows, profiles]
  );

  // Turnos futuros activos de una profesional (unificados desde reservas, acuerdos mensuales, alquileres y entrevistas)
  const getFutureAppointments = (proId: string): AppointmentRecord[] => {
    return unifiedAppointments
      .filter(
        (a) =>
          (a.professionalId === proId || a.proId === proId) &&
          a.status !== 'cancelled' &&
          (a.date >= todayIso || a.recurrence === 'weekly')
      )
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  };

  // Especialidades únicas para el filtro
  const availableSpecialties = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.specialty?.trim()) set.add(p.specialty.trim());
    });
    return Array.from(set).sort();
  }, [profiles]);

  // Listado filtrado
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (statusFilter === 'active' && !p.active) return false;
      if (statusFilter === 'inactive' && p.active) return false;
      if (specialtyFilter !== 'all' && p.specialty !== specialtyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSpec = (p.specialty || '').toLowerCase().includes(q);
        const matchSub = (p.subSpecialty || '').toLowerCase().includes(q);
        const matchEmail = (p.email || '').toLowerCase().includes(q);
        return matchName || matchSpec || matchSub || matchEmail;
      }
      return true;
    });
  }, [profiles, statusFilter, specialtyFilter, searchQuery]);

  // Abrir ficha individual de la profesional
  const openFicha = (profile: Profile, initialTab: FichaSection = 'general') => {
    const { firstName, lastName } = splitFullName(profile);
    const linkedUser = findLinkedUser(profile);
    const availRecord = availabilities.find((a) => a.therapistId === profile.id);

    setSelectedProfile({
      ...profile,
      firstName,
      lastName,
      availability: profile.availability || availRecord?.summary || '',
      acceptingPatients: profile.acceptingPatients ?? availRecord?.acceptingPatients ?? true,
      serviceIds:
        profile.serviceIds && profile.serviceIds.length > 0
          ? profile.serviceIds
          : services
              .filter((s) => s.name.toLowerCase() === (profile.specialty || '').toLowerCase())
              .map((s) => s.id),
    });

    setAccessForm({
      id: linkedUser?.id,
      email: linkedUser?.email || profile.email || `${profile.id}@crear.com`,
      googleEmail: linkedUser?.googleEmail || '',
      password: '',
      role: linkedUser?.role === 'admin' ? 'admin' : 'professional',
      active: linkedUser ? linkedUser.active && profile.active : profile.active,
      lastLoginAt: linkedUser?.lastLoginAt,
    });

    setFichaSection(initialTab);
    setFeedback(null);
  };

  // Guardar cambios de la Ficha Individual (Perfil + Acceso si fue modificado)
  async function handleSaveFicha() {
    if (!selectedProfile) return;
    const fullName = `${selectedProfile.firstName || ''} ${selectedProfile.lastName || ''}`.trim() || selectedProfile.name.trim();
    if (!fullName) {
      setFeedback({ tone: 'err', text: 'Ingresá el nombre y apellido de la profesional.' });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const normalizedProfile: Profile = {
        ...selectedProfile,
        name: fullName,
        firstName: selectedProfile.firstName?.trim() || splitFullName({ ...selectedProfile, name: fullName }).firstName,
        lastName: selectedProfile.lastName?.trim() || splitFullName({ ...selectedProfile, name: fullName }).lastName,
        updatedAt: new Date().toISOString(),
      };

      await save('profiles', normalizedProfile);

      // Si se configuró cuenta de acceso o ya tenía una vinculada, sincronizar con crear_users
      const existingUser = findLinkedUser(normalizedProfile);
      if (accessForm && (existingUser || accessForm.email.trim())) {
        const cleanEmail = accessForm.email.trim().toLowerCase().includes('@')
          ? accessForm.email.trim().toLowerCase()
          : `${accessForm.email.trim().toLowerCase()}@crear.com`;

        // Si la profesional pasa a inactiva, revocar acceso automáticamente
        const finalUserActive = normalizedProfile.active ? accessForm.active : false;

        const userRecord: AuthorizedUserRecord = {
          id: existingUser?.id || accessForm.id || `user-${normalizedProfile.id}`,
          name: fullName,
          email: cleanEmail,
          googleEmail: accessForm.googleEmail.trim().toLowerCase(),
          password: accessForm.password.trim() ? accessForm.password.trim() : undefined,
          role: accessForm.role,
          professionalId: normalizedProfile.id,
          specialty: normalizedProfile.specialty || '',
          active: finalUserActive,
          createdAt: existingUser?.createdAt || new Date().toISOString().slice(0, 10),
          lastLoginAt: existingUser?.lastLoginAt,
        };

        await saveAuthorizedUserInSheets(userRecord);
        const refreshedUsers = await fetchAuthorizedUsersFromSheets();
        setUsers(refreshedUsers);
      }

      await refreshProfiles();
      setFeedback({
        tone: 'ok',
        text: 'Ficha profesional y permisos actualizados en Google Sheets.',
      });
      setTimeout(() => {
        setSelectedProfile(null);
        setFeedback(null);
      }, 900);
    } catch (e) {
      setFeedback({
        tone: 'err',
        text: e instanceof Error ? e.message : 'No se pudo guardar en Google Sheets.',
      });
    } finally {
      setBusy(false);
    }
  }

  // Iniciar asistente de Alta en 2 pasos
  const openNewProfessionalWizard = () => {
    setFeedback(null);
    setWizard({
      step: 1,
      firstName: '',
      lastName: '',
      specialty: 'Psicología',
      subSpecialty: '',
      licenseNumber: '',
      phone: '',
      email: '',
      joinedDate: new Date().toISOString().slice(0, 10),
      responsible: 'Karina',
      roomId: '',
      availability: '',
      acceptingPatients: true,
      serviceIds: ['srv-psicologia'],
      notes: '',
      accessDecision: 'now',
      loginEmail: '',
      googleEmail: '',
      password: '',
      role: 'professional',
    });
  };

  // Confirmar Alta en 2 pasos
  async function handleConfirmNewProfessional() {
    if (!wizard) return;
    const first = wizard.firstName.trim();
    const last = wizard.lastName.trim();
    if (!first || !last) {
      setFeedback({ tone: 'err', text: 'Completá nombre y apellido de la profesional.' });
      return;
    }

    const fullName = `${first} ${last}`.trim();
    const proId = slugifyId(first, last);
    const institutionalEmail = (wizard.loginEmail || wizard.email || `${first.toLowerCase()}.${last.toLowerCase()}@crear.com`)
      .trim()
      .toLowerCase();

    setBusy(true);
    setFeedback(null);
    try {
      const newProfile: Profile = {
        id: proId,
        name: fullName,
        firstName: first,
        lastName: last,
        specialty: wizard.specialty.trim() || 'Psicología',
        subSpecialty: wizard.subSpecialty.trim(),
        licenseNumber: wizard.licenseNumber.trim(),
        phone: wizard.phone.trim(),
        email: wizard.email.trim() || institutionalEmail,
        joinedDate: wizard.joinedDate,
        active: true,
        responsible: wizard.responsible,
        roomId: wizard.roomId,
        availability: wizard.availability.trim(),
        acceptingPatients: wizard.acceptingPatients,
        serviceIds: wizard.serviceIds,
        rent: 65000,
        dueDay: 10,
        notes: wizard.notes.trim(),
        color: 'bg-emerald-500',
        updatedAt: new Date().toISOString(),
      };

      // 1. Guardar ficha en crear_profiles (sin inventar reservas ni pacientes falsos)
      await save('profiles', newProfile);

      // 2. Si eligió habilitar acceso ahora, crear cuenta individual en crear_users
      if (wizard.accessDecision === 'now') {
        const cleanLoginEmail = institutionalEmail.includes('@')
          ? institutionalEmail
          : `${institutionalEmail}@crear.com`;

        const newUser: AuthorizedUserRecord = {
          id: `user-${proId}`,
          name: fullName,
          email: cleanLoginEmail,
          googleEmail: wizard.googleEmail.trim().toLowerCase(),
          password: wizard.password.trim() || undefined,
          role: wizard.role,
          professionalId: proId,
          specialty: newProfile.specialty,
          active: true,
          createdAt: new Date().toISOString().slice(0, 10),
        };

        await saveAuthorizedUserInSheets(newUser);
        const refreshedUsers = await fetchAuthorizedUsersFromSheets();
        setUsers(refreshedUsers);
      }

      await refreshProfiles();
      setWizard(null);
    } catch (e) {
      setFeedback({
        tone: 'err',
        text: e instanceof Error ? e.message : 'Error al registrar la profesional en Google Sheets.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profesionales y Accesos"
        description="Registro central del equipo interdisciplinario, prestaciones vinculadas, consultorios y permisos de ingreso al portal."
        action={
          <Button onClick={openNewProfessionalWizard}>
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar profesional
          </Button>
        }
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Resumen Rápido y Barra de Búsqueda / Filtros */}
      <div className={`${cardClass} space-y-4`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#889892]" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, especialidad o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-[#DDE3DF] bg-[#FAFCFA] pl-10 pr-3.5 py-2 text-sm text-[#34433F] outline-none focus:border-[#46766B] focus:bg-white"
            />
          </div>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#DDE3DF] bg-[#FAFCFA] px-3 py-2 text-sm font-medium text-[#34433F] outline-none focus:border-[#46766B] focus:bg-white"
          >
            <option value="all">Todas las disciplinas</option>
            {availableSpecialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="min-h-11 w-full rounded-xl border border-[#DDE3DF] bg-[#FAFCFA] px-3 py-2 text-sm font-medium text-[#34433F] outline-none focus:border-[#46766B] focus:bg-white"
          >
            <option value="all">Activas e inactivas ({profiles.length})</option>
            <option value="active">Solo activas ({profiles.filter((p) => p.active).length})</option>
            <option value="inactive">Solo inactivas ({profiles.filter((p) => !p.active).length})</option>
          </select>
        </div>
      </div>

      {/* Tarjetas Adaptables al Celular y Escritorio */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredProfiles.map((profile) => {
          const agreement = agreements.rows.find(
            (item) => item.professionalId === profile.id && item.status === 'activo'
          );
          const access = getAccessStatus(profile);
          const futureTurns = getFutureAppointments(profile.id);
          const nextTurn = futureTurns[0];
          const availRecord = availabilities.find((a) => a.therapistId === profile.id);
          const realScheduleSummary =
            futureTurns.length > 0
              ? futureTurns
                  .slice(0, 2)
                  .map((t) => {
                    const rShort = rooms.find((r) => r.id === t.roomId)?.name.split('—')[0].replace('Consultorio ', 'C') || t.roomId;
                    return `${t.recurrence === 'weekly' ? 'Semanal' : t.date.slice(5).split('-').reverse().join('/')} ${t.start}-${t.end} (${rShort})`;
                  })
                  .join(' · ')
              : '';
          const scheduleSummary =
            realScheduleSummary ||
            profile.availability ||
            availRecord?.notes ||
            'Sin horario habitual cargado';

          // Consultorios vinculados (habitual + donde tiene reservas futuras)
          const usedRoomIds = new Set<string>();
          if (profile.roomId) usedRoomIds.add(profile.roomId);
          if (agreement?.roomId) usedRoomIds.add(agreement.roomId);
          futureTurns.forEach((t) => {
            if (t.roomId) usedRoomIds.add(t.roomId);
          });
          const usedRoomsLabel =
            Array.from(usedRoomIds)
              .map((rid) => rooms.find((r) => r.id === rid)?.name.split('—')[0].trim() || rid)
              .join(', ') || 'Sin consultorio asignado';

          // Prestaciones vinculadas
          const linkedServices = services.filter((s) =>
            profile.serviceIds && profile.serviceIds.length > 0
              ? profile.serviceIds.includes(s.id)
              : s.name.toLowerCase() === (profile.specialty || '').toLowerCase()
          );

          return (
            <article
              key={profile.id}
              className={`${cardClass} flex flex-col justify-between transition hover:border-[#BFD2C8]`}
            >
              <div>
                {/* Cabecera de la Profesional */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold ${
                        profile.active
                          ? 'bg-[#DDEAE2] text-[#2F5E53]'
                          : 'bg-[#F1F3EF] text-[#7A8882]'
                      }`}
                    >
                      {profile.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="truncate text-base font-bold text-[#34433F]">{profile.name}</h2>
                        {access.user?.role === 'admin' && (
                          <span className="rounded-md bg-[#F6E9DB] px-1.5 py-0.5 text-[10px] font-bold text-[#8A521D]">
                            Responsable
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[#52635D]">
                        {profile.specialty || 'Disciplina sin definir'}
                        {profile.subSpecialty ? ` · ${profile.subSpecialty}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Estado Activa / Inactiva */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      profile.active
                        ? 'bg-[#DDEAE2] text-[#1D4E38]'
                        : 'bg-[#F1F3EF] text-[#6D7C76]'
                    }`}
                  >
                    {profile.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Badges de Acceso al Portal y Prestaciones */}
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openFicha(profile, 'access')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${access.badgeClass}`}
                    title="Configurar acceso al portal"
                  >
                    <KeyRound className="h-3 w-3" />
                    <span>Acceso: {access.label}</span>
                  </button>

                  {linkedServices.map((srv) => (
                    <span
                      key={srv.id}
                      className="rounded-lg bg-[#F2F6F4] px-2 py-1 text-[11px] font-semibold text-[#46766B]"
                    >
                      {srv.name}
                    </span>
                  ))}
                </div>

                {/* Datos de Contacto, Consultorios y Próximos Horarios */}
                <div className="mt-4 space-y-2 border-t border-[#F0F4F1] pt-3 text-xs text-[#4C5B56]">
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#82918B]" />
                    <span className="truncate">
                      {access.user?.email || profile.email || 'Sin correo registrado'}
                    </span>
                  </p>

                  {profile.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#82918B]" />
                      <span>{profile.phone}</span>
                    </p>
                  )}

                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#82918B]" />
                    <span className="truncate">{usedRoomsLabel}</span>
                  </p>

                  <p className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[#82918B] mt-0.5" />
                    <span className="line-clamp-2">{scheduleSummary}</span>
                  </p>

                  <div className="rounded-xl bg-[#F9FBF9] border border-[#EAEFEA] px-3 py-2 mt-1">
                    <p className="text-[11px] font-bold text-[#34433F]">
                      {nextTurn
                        ? `Próximo turno: ${nextTurn.date.split('-').reverse().join('/')} · ${nextTurn.start} a ${nextTurn.end}`
                        : 'Sin reservas futuras en agenda'}
                    </p>
                    <p className="text-[11px] text-[#6D7C76]">
                      {futureTurns.length > 0
                        ? `${futureTurns.length} reserva(s) activa(s) vinculada(s)`
                        : profile.acceptingPatients !== false
                          ? 'Disponible para incorporar pacientes'
                          : 'Cupo completo temporalmente'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-[#F0F4F1]">
                <Button
                  tone="secondary"
                  className="flex-1 text-xs py-2"
                  onClick={() => openFicha(profile, 'general')}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Ficha y Accesos
                </Button>
                <Button tone="quiet" className="text-xs py-2" onClick={onAgenda}>
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                  Agenda
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FICHA INDIVIDUAL DE LA PROFESIONAL (4 SECCIONES CLARAS)          */}
      {/* ========================================================================= */}
      {selectedProfile && (
        <Modal
          title={`Ficha de ${selectedProfile.name || 'Profesional'}`}
          onClose={() => setSelectedProfile(null)}
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              <Button tone="secondary" onClick={() => setSelectedProfile(null)}>
                Cancelar
              </Button>
              <Button disabled={busy} onClick={() => void handleSaveFicha()}>
                {busy ? 'Guardando en Google Sheets…' : 'Guardar cambios'}
              </Button>
            </div>
          }
        >
          {/* Navegación por las 4 secciones de la Ficha */}
          <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#EEF2EE] p-1 sm:grid-cols-4">
            {[
              { id: 'general', label: '1. Datos generales', icon: UserRound },
              { id: 'services', label: '2. Prestaciones', icon: Layers },
              { id: 'schedule', label: '3. Horarios y cons.', icon: Clock },
              { id: 'access', label: '4. Acceso portal', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCurrent = fichaSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFichaSection(tab.id as FichaSection)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-white text-[#34433F] shadow-xs'
                      : 'text-[#5D6D67] hover:text-[#34433F]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${
                feedback.tone === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {feedback.tone === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Advertencia si se marca Inactiva y tiene reservas futuras activas */}
          {!selectedProfile.active && getFutureAppointments(selectedProfile.id).length > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Atención: esta profesional tiene {getFutureAppointments(selectedProfile.id).length} reserva(s) activa(s) en la agenda.
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Al guardarla como <strong>Inactiva</strong> se deshabilitará su ingreso al portal y no podrá recibir turnos nuevos, pero sus reservas existentes <strong>no se cancelan automáticamente</strong> sin autorización. Revisalas en la pestaña &ldquo;Horarios y cons.&rdquo; o en la Agenda General.
              </p>
            </div>
          )}

          {/* SECCIÓN 1: DATOS GENERALES */}
          {fichaSection === 'general' && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                label="Nombre *"
                value={selectedProfile.firstName || ''}
                onChange={(e) =>
                  setSelectedProfile((curr) =>
                    curr
                      ? {
                          ...curr,
                          firstName: e.target.value,
                          name: `${e.target.value} ${curr.lastName || ''}`.trim(),
                        }
                      : curr
                  )
                }
              />
              <Field
                label="Apellido *"
                value={selectedProfile.lastName || ''}
                onChange={(e) =>
                  setSelectedProfile((curr) =>
                    curr
                      ? {
                          ...curr,
                          lastName: e.target.value,
                          name: `${curr.firstName || ''} ${e.target.value}`.trim(),
                        }
                      : curr
                  )
                }
              />
              <Field
                label="Profesión o disciplina *"
                placeholder="Ej.: Psicología, Fonoaudiología"
                value={selectedProfile.specialty}
                onChange={(e) =>
                  setSelectedProfile((curr) => (curr ? { ...curr, specialty: e.target.value } : curr))
                }
              />
              <Field
                label="Especialidad / orientación (opcional)"
                placeholder="Ej.: Infanto-juvenil, TCC, Neurodesarrollo"
                value={selectedProfile.subSpecialty || ''}
                onChange={(e) =>
                  setSelectedProfile((curr) => (curr ? { ...curr, subSpecialty: e.target.value } : curr))
                }
              />
              <Field
                label="Matrícula profesional (opcional)"
                placeholder="Ej.: MP 1245"
                value={selectedProfile.licenseNumber || ''}
                onChange={(e) =>
                  setSelectedProfile((curr) =>
                    curr ? { ...curr, licenseNumber: e.target.value } : curr
                  )
                }
              />
              <Field
                label="Fecha de incorporación (opcional)"
                type="date"
                value={selectedProfile.joinedDate || ''}
                onChange={(e) =>
                  setSelectedProfile((curr) => (curr ? { ...curr, joinedDate: e.target.value } : curr))
                }
              />
              <Field
                label="Teléfono de contacto laboral"
                placeholder="Ej.: 388..."
                value={selectedProfile.phone}
                onChange={(e) =>
                  setSelectedProfile((curr) => (curr ? { ...curr, phone: e.target.value } : curr))
                }
              />
              <Field
                label="Correo electrónico"
                type="email"
                placeholder="profesional@crear.com"
                value={selectedProfile.email}
                onChange={(e) =>
                  setSelectedProfile((curr) => (curr ? { ...curr, email: e.target.value } : curr))
                }
              />
              <SelectField
                label="Referente administrativa"
                value={selectedProfile.responsible}
                onChange={(e) =>
                  setSelectedProfile((curr) =>
                    curr ? { ...curr, responsible: e.target.value } : curr
                  )
                }
              >
                <option value="">Sin asignar</option>
                <option value="Karina">Karina</option>
                <option value="Janina">Janina</option>
                <option value={thirdAdmin}>{thirdAdmin}</option>
                <option value={fourthAdmin}>{fourthAdmin}</option>
              </SelectField>

              <div className="flex flex-col justify-end">
                <label className="flex min-h-11 items-center justify-between rounded-xl border border-[#DDE3DF] bg-white px-3.5 py-2 text-sm font-semibold text-[#34433F] cursor-pointer">
                  <span>Estado en CREAR: {selectedProfile.active ? 'Activa' : 'Inactiva'}</span>
                  <input
                    type="checkbox"
                    checked={selectedProfile.active}
                    onChange={(e) => {
                      const nextActive = e.target.checked;
                      setSelectedProfile((curr) => (curr ? { ...curr, active: nextActive } : curr));
                      if (!nextActive && accessForm) {
                        setAccessForm({ ...accessForm, active: false });
                      }
                    }}
                    className="h-4 w-4 accent-[#46766B]"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-[#4C5B56] sm:col-span-2">
                Observaciones administrativas internas (opcionales)
                <textarea
                  rows={3}
                  placeholder="Acuerdos internos, notas de disponibilidad o referencias..."
                  value={selectedProfile.notes}
                  onChange={(e) =>
                    setSelectedProfile((curr) => (curr ? { ...curr, notes: e.target.value } : curr))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#DDE3DF] bg-white p-3 text-sm text-[#34433F] outline-none focus:border-[#46766B]"
                />
              </label>
            </div>
          )}

          {/* SECCIÓN 2: PRESTACIONES VINCULADAS */}
          {fichaSection === 'services' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5EAE5] bg-white p-4">
                <h3 className="text-sm font-bold text-[#34433F]">
                  Prestaciones institucionales que brinda {selectedProfile.name}
                </h3>
                <p className="mt-0.5 text-xs text-[#6D7C76]">
                  Seleccioná una o más prestaciones del catálogo oficial de CREAR. Estas opciones se sugerirán al registrar turnos para esta profesional.
                </p>

                <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                  {services.map((srv) => {
                    const checked = (selectedProfile.serviceIds || []).includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold cursor-pointer transition ${
                          checked
                            ? 'border-[#46766B] bg-[#EBF4F0] text-[#1D3E35]'
                            : 'border-[#E5EAE5] bg-[#FAFCFA] text-[#52635D] hover:bg-white'
                        }`}
                      >
                        <div>
                          <p className="font-bold">{srv.name}</p>
                          <p className="text-[11px] opacity-80">
                            Duración sugerida: {srv.durationMinutes} min
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedProfile((curr) => {
                              if (!curr) return curr;
                              const prev = curr.serviceIds || [];
                              const next = isChecked
                                ? Array.from(new Set([...prev, srv.id]))
                                : prev.filter((id) => id !== srv.id);
                              return { ...curr, serviceIds: next };
                            });
                          }}
                          className="h-4 w-4 accent-[#46766B]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: HORARIOS Y CONSULTORIOS */}
          {fichaSection === 'schedule' && (
            <div className="space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <SelectField
                  label="Consultorio habitual / preferido"
                  value={selectedProfile.roomId}
                  onChange={(e) =>
                    setSelectedProfile((curr) => (curr ? { ...curr, roomId: e.target.value } : curr))
                  }
                >
                  <option value="">Sin consultorio fijo asignado</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SelectField>

                <Field
                  label="Días y horarios habituales de atención"
                  placeholder="Ej.: Lun y Mié (14:00 - 18:00)"
                  value={selectedProfile.availability}
                  onChange={(e) =>
                    setSelectedProfile((curr) =>
                      curr ? { ...curr, availability: e.target.value } : curr
                    )
                  }
                />
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-[#DDE3DF] bg-white p-3.5 text-xs font-bold text-[#34433F] cursor-pointer">
                <span>Disponible actualmente para incorporar nuevos pacientes / derivaciones</span>
                <input
                  type="checkbox"
                  checked={selectedProfile.acceptingPatients !== false}
                  onChange={(e) =>
                    setSelectedProfile((curr) =>
                      curr ? { ...curr, acceptingPatients: e.target.checked } : curr
                    )
                  }
                  className="h-4 w-4 accent-[#46766B]"
                />
              </label>

              {/* Listado en vivo de Reservas y Turnos vinculados en la Agenda */}
              <div className="rounded-2xl border border-[#E5EAE5] bg-white p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#52635D]">
                    Reservas y turnos activos en la agenda ({getFutureAppointments(selectedProfile.id).length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProfile(null);
                      onAgenda();
                    }}
                    className="text-xs font-bold text-[#46766B] hover:underline"
                  >
                    Abrir Agenda General →
                  </button>
                </div>

                {getFutureAppointments(selectedProfile.id).length === 0 ? (
                  <p className="py-3 text-xs text-[#6D7C76]">
                    No registra turnos ni bloques futuros en este momento.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {getFutureAppointments(selectedProfile.id).map((app) => {
                      const roomName =
                        rooms.find((r) => r.id === app.roomId)?.name.split('—')[0].trim() || app.roomId;
                      return (
                        <div
                          key={app.id}
                          className="flex items-center justify-between rounded-xl border border-[#EAEFEA] bg-[#F9FBF9] px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#34433F]">
                              {app.date.split('-').reverse().join('/')} · {app.start} a {app.end}
                            </span>
                            <span className="ml-2 text-[#6D7C76]">
                              ({roomName}) —{' '}
                              {app.kind === 'block'
                                ? 'Bloque de consultorio'
                                : `Paciente: ${app.patient || app.title}`}
                            </span>
                          </div>
                          {app.recurrence === 'weekly' && (
                            <span className="rounded-md bg-[#DDEAE2] px-2 py-0.5 text-[10px] font-bold text-[#2F5E53]">
                              Semanal
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN 4: ACCESO A LA PLATAFORMA */}
          {fichaSection === 'access' && accessForm && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5EAE5] bg-white p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#34433F]">
                      Credenciales y permisos en el portal
                    </h3>
                    <p className="text-xs text-[#6D7C76]">
                      Cada profesional ingresa con su cuenta individual. No existen claves compartidas.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      accessForm.active && selectedProfile.active
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {accessForm.active && selectedProfile.active ? 'Acceso Habilitado' : 'Acceso Deshabilitado'}
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field
                    label="Correo institucional (@crear.com)"
                    placeholder="nombre@crear.com"
                    value={accessForm.email}
                    onChange={(e) => setAccessForm({ ...accessForm, email: e.target.value })}
                  />
                  <Field
                    label="Correo Google autorizado (para botón Google)"
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    value={accessForm.googleEmail}
                    onChange={(e) => setAccessForm({ ...accessForm, googleEmail: e.target.value })}
                  />
                  <Field
                    label="Nueva contraseña individual (dejar vacío para conservar)"
                    type="password"
                    placeholder="Ingresar nueva clave..."
                    value={accessForm.password}
                    onChange={(e) => setAccessForm({ ...accessForm, password: e.target.value })}
                  />
                  <SelectField
                    label="Rol en el sistema"
                    value={accessForm.role}
                    onChange={(e) =>
                      setAccessForm({
                        ...accessForm,
                        role: e.target.value as 'professional' | 'admin',
                      })
                    }
                  >
                    <option value="professional">Terapeuta (Agenda de consultorios y sus propios turnos)</option>
                    <option value="admin">
                      Responsable + Profesional (Panel Administrativo Completo + su propia agenda)
                    </option>
                  </SelectField>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F9FBF9] border border-[#EAEFEA] p-3">
                  <div className="text-xs text-[#52635D]">
                    {accessForm.lastLoginAt ? (
                      <span>
                        <strong>Último ingreso verificado:</strong>{' '}
                        {new Date(accessForm.lastLoginAt).toLocaleString('es-AR')}
                      </span>
                    ) : (
                      <span>Sin registro de ingreso reciente en esta cuenta.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAccessForm((curr) => (curr ? { ...curr, active: !curr.active } : curr))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      accessForm.active
                        ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-[#46766B] text-white hover:bg-[#3B675D]'
                    }`}
                  >
                    {accessForm.active ? (
                      <>
                        <UserX className="h-3.5 w-3.5" />
                        <span>Deshabilitar acceso al portal</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Habilitar acceso al portal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ALTA DE PROFESIONAL EN 2 PASOS (FICHA + ACCESO OPCIONAL)         */}
      {/* ========================================================================= */}
      {wizard && (
        <Modal
          title={
            wizard.step === 1
              ? 'Agregar profesional — Paso 1 de 2: Datos y Prestaciones'
              : 'Agregar profesional — Paso 2 de 2: Acceso al Portal'
          }
          onClose={() => setWizard(null)}
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              {wizard.step === 2 ? (
                <Button tone="secondary" onClick={() => setWizard({ ...wizard, step: 1 })}>
                  ← Volver al Paso 1
                </Button>
              ) : (
                <Button tone="secondary" onClick={() => setWizard(null)}>
                  Cancelar
                </Button>
              )}

              {wizard.step === 1 ? (
                <Button
                  onClick={() => {
                    if (!wizard.firstName.trim() || !wizard.lastName.trim()) {
                      setFeedback({
                        tone: 'err',
                        text: 'Ingresá el nombre y apellido antes de continuar.',
                      });
                      return;
                    }
                    setFeedback(null);
                    const suggestedEmail =
                      wizard.loginEmail ||
                      wizard.email ||
                      `${wizard.firstName
                        .trim()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '')}@crear.com`;
                    setWizard({ ...wizard, step: 2, loginEmail: suggestedEmail });
                  }}
                >
                  Continuar al Paso 2 (Acceso) →
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => void handleConfirmNewProfessional()}>
                  {busy
                    ? 'Guardando en Google Sheets…'
                    : wizard.accessDecision === 'now'
                      ? 'Crear profesional y habilitar acceso'
                      : 'Guardar profesional (sin acceso aún)'}
                </Button>
              )}
            </div>
          }
        >
          {feedback && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {wizard.step === 1 ? (
            <div className="space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field
                  label="Nombre *"
                  placeholder="Ej.: Lucía"
                  value={wizard.firstName}
                  onChange={(e) => setWizard({ ...wizard, firstName: e.target.value })}
                />
                <Field
                  label="Apellido *"
                  placeholder="Ej.: Fernández"
                  value={wizard.lastName}
                  onChange={(e) => setWizard({ ...wizard, lastName: e.target.value })}
                />
                <Field
                  label="Profesión o disciplina *"
                  placeholder="Ej.: Psicología, Terapia Ocupacional..."
                  value={wizard.specialty}
                  onChange={(e) => setWizard({ ...wizard, specialty: e.target.value })}
                />
                <Field
                  label="Especialidad (opcional)"
                  placeholder="Ej.: Clínica niños y adolescentes"
                  value={wizard.subSpecialty}
                  onChange={(e) => setWizard({ ...wizard, subSpecialty: e.target.value })}
                />
                <Field
                  label="Teléfono laboral"
                  placeholder="Ej.: 388..."
                  value={wizard.phone}
                  onChange={(e) => setWizard({ ...wizard, phone: e.target.value })}
                />
                <Field
                  label="Correo electrónico"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={wizard.email}
                  onChange={(e) => setWizard({ ...wizard, email: e.target.value })}
                />
                <Field
                  label="Matrícula profesional (opcional)"
                  placeholder="Ej.: MP 980"
                  value={wizard.licenseNumber}
                  onChange={(e) => setWizard({ ...wizard, licenseNumber: e.target.value })}
                />
                <Field
                  label="Días y horarios orientativos (opcional)"
                  placeholder="Ej.: Mar y Jue de 15 a 19"
                  value={wizard.availability}
                  onChange={(e) => setWizard({ ...wizard, availability: e.target.value })}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#52635D] mb-2">
                  Prestaciones que brinda
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.map((srv) => {
                    const checked = wizard.serviceIds.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                          checked
                            ? 'border-[#46766B] bg-[#EBF4F0] text-[#1D3E35]'
                            : 'border-[#E5EAE5] bg-white text-[#52635D]'
                        }`}
                      >
                        <span>{srv.name}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...wizard.serviceIds, srv.id]
                              : wizard.serviceIds.filter((id) => id !== srv.id);
                            setWizard({ ...wizard, serviceIds: next });
                          }}
                          className="h-4 w-4 accent-[#46766B]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#DDEAE2] bg-[#F4F9F6] p-4">
                <p className="text-xs font-bold text-[#2F5E53] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    Profesional: {wizard.firstName} {wizard.lastName} ({wizard.specialty})
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#52635D]">
                  ¿Querés habilitar su cuenta ahora para que pueda ingresar a la agenda desde su celular o computadora?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setWizard({ ...wizard, accessDecision: 'now' })}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    wizard.accessDecision === 'now'
                      ? 'border-[#46766B] bg-[#EBF4F0] text-[#1D3E35] ring-2 ring-[#46766B]/20'
                      : 'border-[#E5EAE5] bg-white text-[#52635D]'
                  }`}
                >
                  <p className="text-xs font-bold">Habilitar acceso ahora</p>
                  <p className="mt-0.5 text-[11px] opacity-85">
                    Autoriza su correo o contraseña individual en Google Sheets.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setWizard({ ...wizard, accessDecision: 'later' })}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    wizard.accessDecision === 'later'
                      ? 'border-[#46766B] bg-[#EBF4F0] text-[#1D3E35] ring-2 ring-[#46766B]/20'
                      : 'border-[#E5EAE5] bg-white text-[#52635D]'
                  }`}
                >
                  <p className="text-xs font-bold">Más adelante</p>
                  <p className="mt-0.5 text-[11px] opacity-85">
                    Guarda la ficha de la profesional y deja el acceso pendiente.
                  </p>
                </button>
              </div>

              {wizard.accessDecision === 'now' && (
                <div className="grid gap-3.5 rounded-2xl border border-[#E5EAE5] bg-white p-4 sm:grid-cols-2">
                  <Field
                    label="Usuario / Correo de ingreso *"
                    placeholder="lucia@crear.com"
                    value={wizard.loginEmail}
                    onChange={(e) => setWizard({ ...wizard, loginEmail: e.target.value })}
                  />
                  <Field
                    label="Contraseña inicial individual *"
                    type="text"
                    placeholder="Ej.: Crear2026!"
                    value={wizard.password}
                    onChange={(e) => setWizard({ ...wizard, password: e.target.value })}
                  />
                  <Field
                    label="Correo Google autorizado (opcional)"
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    value={wizard.googleEmail}
                    onChange={(e) => setWizard({ ...wizard, googleEmail: e.target.value })}
                  />
                  <SelectField
                    label="Rol asignado"
                    value={wizard.role}
                    onChange={(e) =>
                      setWizard({ ...wizard, role: e.target.value as 'professional' | 'admin' })
                    }
                  >
                    <option value="professional">Terapeuta (Portal de agenda y turnos propios)</option>
                    <option value="admin">Responsable + Profesional (Administración + Agenda)</option>
                  </SelectField>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
