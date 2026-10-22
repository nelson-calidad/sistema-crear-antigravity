import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import logoCrear from '../assets/logo-crear.png';
import { localDate, moneyFormat, useRecords } from '../lib/crearStore';
import { subscribeToAppointments } from '../lib/appointmentsStore';
import { buildUnifiedOccupancyAppointments, getActiveOccupancyForDate } from '../lib/occupancy';
import { useProfessionals } from '../lib/professionalsStore';
import { loadCoverageData, type CoverageShift } from '../lib/coverageStore';
import { loadActivitiesData, type ActivityRecord } from '../lib/activitiesStore';
import { logoutUser, useAuth } from '../lib/crearAuth';
import type { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import { ErrorMessage } from './ui';

interface HomeRealProps {
  onNewInquiry: () => void;
  onNavigate: (tab: string) => void;
}

export function HomeReal({ onNewInquiry, onNavigate }: HomeRealProps) {
  const authUser = useAuth();
  const inquiries = useRecords('inquiries');
  const interviews = useRecords('interviews');
  const rentals = useRecords('rentals');
  const agreements = useRecords('agreements');
  const money = useRecords('money');
  const [professionals] = useProfessionals();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [coverageShifts, setCoverageShifts] = useState<CoverageShift[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Carga de turnos unificados
  useEffect(() => {
    const unsub = subscribeToAppointments(setAppointments, () => {});
    return () => unsub();
  }, []);

  // Carga de guardias y responsabilidades
  useEffect(() => {
    let mounted = true;
    setCoverageLoading(true);
    loadCoverageData()
      .then((data) => {
        if (mounted && Array.isArray(data.shifts)) {
          setCoverageShifts(data.shifts);
        }
      })
      .catch((err) => console.warn('Error cargando guardias en Inicio:', err))
      .finally(() => {
        if (mounted) setCoverageLoading(false);
      });

    setActivitiesLoading(true);
    loadActivitiesData()
      .then((data) => {
        if (mounted && Array.isArray(data.activities)) {
          setActivities(data.activities);
        }
      })
      .catch((err) => console.warn('Error cargando responsabilidades en Inicio:', err))
      .finally(() => {
        if (mounted) setActivitiesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const today = localDate();
  const currentMonth = today.slice(0, 7);

  // Consultas pendientes
  const pendingInquiries = useMemo(
    () => inquiries.rows.filter((x) => !x.archived && x.status.includes('Pendiente')),
    [inquiries.rows]
  );

  // Entrevistas que requieren atención
  const dueInterviews = useMemo(
    () =>
      interviews.rows.filter(
        (x) =>
          x.reminderStatus === 'pendiente' &&
          x.status !== 'cancelada' &&
          x.status !== 'realizada'
      ),
    [interviews.rows]
  );

  // Turnos y ocupación unificada del día
  const unifiedToday = useMemo(
    () =>
      getActiveOccupancyForDate(
        buildUnifiedOccupancyAppointments({
          appointments,
          interviews: interviews.rows,
          agreements: agreements.rows,
          rentals: rentals.rows,
          profiles: professionals,
        }),
        today
      ),
    [appointments, interviews.rows, agreements.rows, rentals.rows, professionals, today]
  );

  // Consultorios ocupados vs disponibles hoy
  const occupiedRoomIdsToday = useMemo(
    () => new Set(unifiedToday.filter((s) => s.roomId).map((s) => s.roomId)),
    [unifiedToday]
  );
  const occupiedRoomsCount = occupiedRoomIdsToday.size;
  const freeRoomsCount = Math.max(0, ROOMS.length - occupiedRoomsCount);

  // Finanzas y saldos adeudados
  const unpaidMonthly = useMemo(
    () =>
      agreements.rows.filter(
        (x) =>
          x.status === 'activo' &&
          !money.rows.some(
            (row) => row.id === `rent-${x.id}-${currentMonth}` && row.status === 'pagado'
          )
      ),
    [agreements.rows, money.rows, currentMonth]
  );

  const pendingRentals = useMemo(
    () => rentals.rows.filter((x) => x.paymentStatus === 'pendiente' && x.status !== 'cancelled'),
    [rentals.rows]
  );

  const overdueRentals = useMemo(
    () => pendingRentals.filter((x) => x.dueDate && x.dueDate < today),
    [pendingRentals, today]
  );

  const unpaidInterviews = useMemo(
    () =>
      interviews.rows.filter(
        (x) => x.paymentStatus === 'pendiente' && x.status !== 'cancelada'
      ),
    [interviews.rows]
  );

  const totalPendingCobrosCount =
    unpaidMonthly.length + pendingRentals.length + unpaidInterviews.length;

  // Profesionales activas
  const activePros = useMemo(
    () => professionals.filter((p) => p.status === 'Activo'),
    [professionals]
  );

  // Próximas guardias
  const upcomingShifts = useMemo(() => {
    return coverageShifts
      .filter((s) => s.date >= today && s.status !== 'Cancelled')
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [coverageShifts, today]);

  // Responsabilidades pendientes
  const pendingActivities = useMemo(() => {
    return activities.filter((a) => a.status !== 'DONE' && a.status !== 'CANCELLED');
  }, [activities]);

  const errors = [
    inquiries.error,
    interviews.error,
    rentals.error,
    agreements.error,
    money.error,
  ].filter(Boolean);

  // Formato de fecha en español argentino
  const formattedTodayDate = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Argentina/Jujuy',
      }).format(new Date());
      return parts.charAt(0).toUpperCase() + parts.slice(1);
    } catch {
      return today;
    }
  }, [today]);

  const managerName = authUser?.name || 'Responsable CREAR';

  // Catálogo de los 9 módulos con igual jerarquía
  const MODULES_GRID = [
    {
      id: 'dashboard',
      title: 'Inicio',
      description: 'Supervisión institucional, indicadores clave, alertas y tablero ejecutivo.',
      icon: LayoutDashboard,
      badge: 'Estás acá',
      accentColor: 'border-[#46766B] bg-[#EBF3EF] text-[#2C5E50]',
    },
    {
      id: 'admissions',
      title: 'Consultas y Admisiones',
      description: 'Recepción de familias, derivaciones, coordinación de entrevistas y seguimiento.',
      icon: MessageCircle,
      accentColor: 'border-[#E8C2B3] bg-[#FDF2EC] text-[#8C4629]',
    },
    {
      id: 'agenda',
      title: 'Agenda',
      description: 'Calendario de turnos de pacientes, bloques de consultorio, entrevistas y actividades.',
      icon: Calendar,
      accentColor: 'border-[#BEDCEB] bg-[#EDF6FA] text-[#205272]',
    },
    {
      id: 'rooms',
      title: 'Consultorios',
      description: 'Administración de los 3 espacios (C1, C2, C3), acuerdos mensuales y subalquileres.',
      icon: DoorOpen,
      accentColor: 'border-[#C8DFD4] bg-[#F0F7F3] text-[#265A48]',
    },
    {
      id: 'professionals',
      title: 'Profesionales',
      description: 'Padrón del equipo, especialidades, prestaciones, consultorio base y accesos.',
      icon: Users,
      accentColor: 'border-[#D9CEEE] bg-[#F6F2FC] text-[#553E7E]',
    },
    {
      id: 'finance',
      title: 'Finanzas',
      description: 'Centro único de cobros, canon de alquileres, ingresos, egresos y balances.',
      icon: Wallet,
      accentColor: 'border-[#C5E1D5] bg-[#EBF5F0] text-[#1D5E45]',
    },
    {
      id: 'responsibilities',
      title: 'Responsabilidades',
      description: 'Distribución y seguimiento de compromisos institucionales entre las 4 socias.',
      icon: ClipboardList,
      accentColor: 'border-[#EBC2CF] bg-[#FCF0F4] text-[#863853]',
    },
    {
      id: 'coverage',
      title: 'Guardias CREAR',
      description: 'Organización semanal de coberturas presenciales, urgencias y atenciones pasivas.',
      icon: CalendarDays,
      accentColor: 'border-[#E6D4B7] bg-[#FAF4EA] text-[#7A5520]',
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Parámetros globales, catálogo de prestaciones, usuarios y auditoría del sistema.',
      icon: Settings,
      accentColor: 'border-[#D6DDD9] bg-[#F4F6F5] text-[#475952]',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* =========================================================================
          SECCIÓN A: ENCABEZADO INSTITUCIONAL
          ========================================================================= */}
      <header className="rounded-3xl border border-[#E5EAE5] bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border border-[#E8EEEA] bg-[#FAF8F5] p-2 shadow-xs">
              <img
                src={logoCrear}
                alt="Logo Institucional CREAR"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#E8F3EE] px-3 py-1 text-xs font-bold text-[#326456]">
                  Dashboard Institucional
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado con Google Sheets
                </span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-[#264A40]">
                ¡Buen día, {managerName}!
              </h1>
              <p className="text-xs sm:text-sm text-[#657570]">{formattedTodayDate}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F0F4F2] md:border-t-0 md:pt-0">
            <button
              type="button"
              onClick={onNewInquiry}
              className="flex items-center gap-2 rounded-2xl bg-[#46766B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#3B645B]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Nueva Consulta</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              title="Configuración y cuentas"
              className="flex items-center gap-1.5 rounded-2xl border border-[#D5DDD7] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#52635D] hover:bg-[#F9F8F5]"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
            </button>
            <button
              type="button"
              onClick={() => void logoutUser()}
              title="Cerrar sesión"
              className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alertas de error si falló alguna conexión */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <ErrorMessage key={index}>{error}</ErrorMessage>
          ))}
        </div>
      )}

      {/* =========================================================================
          SECCIÓN B: RESUMEN INSTITUCIONAL EQUILIBRADO
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#596963]">
            Resumen Institucional de Hoy
          </h2>
          <span className="text-xs text-[#7B8B85]">Datos consolidados en tiempo real</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {/* 1. Consultorios */}
          <button
            type="button"
            onClick={() => onNavigate('rooms')}
            className="flex flex-col justify-between rounded-2xl border border-[#CFE2D8] bg-[#F4FAF7] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#2C5E50]">Consultorios</span>
              <DoorOpen className="h-4 w-4 text-[#46766B]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#1E463B]">
                {occupiedRoomsCount}/{ROOMS.length}
              </span>
              <span className="text-[11px] text-[#4F6C62]">
                {freeRoomsCount > 0 ? `${freeRoomsCount} libre(s) hoy` : 'Salas completas'}
              </span>
            </div>
          </button>

          {/* 2. Actividades y Turnos */}
          <button
            type="button"
            onClick={() => onNavigate('agenda')}
            className="flex flex-col justify-between rounded-2xl border border-[#D3E6F2] bg-[#F4FAFD] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#2C6382]">Turnos Hoy</span>
              <Calendar className="h-4 w-4 text-[#3B7E9E]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#1C4861]">
                {unifiedToday.length}
              </span>
              <span className="text-[11px] text-[#557688]">Confirmados en agenda</span>
            </div>
          </button>

          {/* 3. Consultas y Admisiones */}
          <button
            type="button"
            onClick={() => onNavigate('admissions')}
            className="flex flex-col justify-between rounded-2xl border border-[#F0DDD4] bg-[#FDF7F4] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#8F4C30]">Consultas</span>
              <MessageCircle className="h-4 w-4 text-[#C97D5D]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#6D341C]">
                {pendingInquiries.length}
              </span>
              <span className="text-[11px] text-[#865B49]">Pendientes de contacto</span>
            </div>
          </button>

          {/* 4. Profesionales Activas */}
          <button
            type="button"
            onClick={() => onNavigate('professionals')}
            className="flex flex-col justify-between rounded-2xl border border-[#E2DAF2] bg-[#FAF7FE] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#5B4885]">Equipo</span>
              <Users className="h-4 w-4 text-[#7E6BA8]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#433368]">
                {activePros.length}
              </span>
              <span className="text-[11px] text-[#69588B]">Terapeutas activas</span>
            </div>
          </button>

          {/* 5. Cobros Pendientes */}
          <button
            type="button"
            onClick={() => onNavigate('finance')}
            className="flex flex-col justify-between rounded-2xl border border-[#CFE4DA] bg-[#F4FAF7] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#1F5443]">Finanzas</span>
              <Wallet className="h-4 w-4 text-[#3D8269]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#194235]">
                {totalPendingCobrosCount}
              </span>
              <span className="text-[11px] text-[#476B5E]">Cobros pendientes</span>
            </div>
          </button>

          {/* 6. Próximas Guardias */}
          <button
            type="button"
            onClick={() => onNavigate('coverage')}
            className="flex flex-col justify-between rounded-2xl border border-[#EADBCA] bg-[#FAF5EE] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#735227]">Guardias</span>
              <CalendarDays className="h-4 w-4 text-[#966838]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#543916]">
                {coverageLoading ? '...' : upcomingShifts.length}
              </span>
              <span className="text-[11px] text-[#786147]">Coberturas activas</span>
            </div>
          </button>

          {/* 7. Responsabilidades */}
          <button
            type="button"
            onClick={() => onNavigate('responsibilities')}
            className="col-span-2 sm:col-span-1 flex flex-col justify-between rounded-2xl border border-[#F0D5DD] bg-[#FDF6F8] p-4 text-left transition hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#823E53]">Tareas</span>
              <ClipboardList className="h-4 w-4 text-[#B86580]" />
            </div>
            <div className="mt-2">
              <span className="block text-xl font-bold text-[#632B3C]">
                {activitiesLoading ? '...' : pendingActivities.length}
              </span>
              <span className="text-[11px] text-[#865161]">Por cumplir entre socias</span>
            </div>
          </button>
        </div>
      </section>

      {/* =========================================================================
          SECCIÓN C: ÁREAS DE GESTIÓN DE CREAR (9 MÓDULOS EN IGUAL JERARQUÍA)
          ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#264A40]">Áreas de gestión de CREAR</h2>
          <p className="text-xs sm:text-sm text-[#657570]">
            Nueve módulos operativos de igual jerarquía. Ningún área reemplaza a otra: cada una resuelve una responsabilidad específica.
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES_GRID.map((mod) => {
            const Icon = mod.icon;
            const isCurrent = mod.id === 'dashboard';
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition hover:border-[#46766B] hover:shadow-md cursor-pointer ${
                  isCurrent ? 'border-[#46766B]/60 ring-2 ring-[#46766B]/10' : 'border-[#E5EAE5]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${mod.accentColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {mod.badge && (
                      <span className="rounded-full bg-[#E8F3EE] px-2.5 py-1 text-[10px] font-bold text-[#326456]">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3.5 text-base font-bold text-[#34433F] group-hover:text-[#264A40]">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#657570]">{mod.description}</p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#46766B] group-hover:translate-x-1 transition-transform">
                  <span>{isCurrent ? 'Visualizando este panel' : 'Abrir área'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECCIÓN D: PRÓXIMAS ACCIONES IMPORTANTES (SUPERVISIÓN SIN DUPLICADOS)
          ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#264A40]">Asuntos que requieren atención</h2>
          <p className="text-xs sm:text-sm text-[#657570]">
            Supervisión consolidada de admisiones, cobros y compromisos sin duplicar formularios.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Bloque 1: Consultas que esperan respuesta */}
          <div className="rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F2]">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FDF2EC] text-[#C97D5D]">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#34433F]">Consultas sin responder</h3>
                </div>
                <span className="text-xs font-semibold text-[#8C4629]">
                  {pendingInquiries.length} pendientes
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {pendingInquiries.length > 0 ? (
                  pendingInquiries.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate('admissions')}
                      className="cursor-pointer rounded-xl bg-[#FAF9F7] p-3 text-xs transition hover:bg-[#F4EFEB]"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[#34433F]">
                          {item.childName ? `${item.childName} (Paciente)` : item.consultantName || 'Familia'}
                        </strong>
                        <span className="text-[11px] text-[#7C8C85]">{item.date}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#6D7C76] line-clamp-1">
                        {item.reason || item.notes || 'Derivación recibida'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-[#7C8C85]">
                    No hay consultas pendientes en este momento.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('admissions')}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#D5DDD7] py-2 text-xs font-bold text-[#34433F] hover:bg-[#FAF9F7]"
            >
              <span>Gestionar en Consultas y Admisiones</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bloque 2: Cobros y alquileres pendientes */}
          <div className="rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F2]">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EBF5F0] text-[#2D7358]">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#34433F]">Cobros pendientes</h3>
                </div>
                <span className="text-xs font-semibold text-[#1F5443]">
                  {totalPendingCobrosCount} a gestionar
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-[#FAF9F7] p-2.5 text-xs">
                  <span>Alquileres mensuales fijos pendientes ({unpaidMonthly.length})</span>
                  <strong className="text-[#264A40]">
                    {moneyFormat(unpaidMonthly.reduce((sum, a) => sum + (Number(a.amount) || 65000), 0))}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#FAF9F7] p-2.5 text-xs">
                  <span>Subalquileres ocasionales por cobrar ({pendingRentals.length})</span>
                  <strong className="text-[#8C4629]">
                    {moneyFormat(pendingRentals.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))}
                  </strong>
                </div>

                {overdueRentals.length > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{overdueRentals.length} alquiler(es) ocasionales vencidos.</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#D5DDD7] py-2 text-xs font-bold text-[#34433F] hover:bg-[#FAF9F7]"
            >
              <span>Abrir Finanzas e Ingresos</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bloque 3: Turnos y bloques de hoy */}
          <div className="rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F2]">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF6FA] text-[#3B7E9E]">
                    <Clock className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#34433F]">Ocupación de salas hoy</h3>
                </div>
                <span className="text-xs font-semibold text-[#205272]">
                  {unifiedToday.length} bloque(s)
                </span>
              </div>

              <div className="mt-3 divide-y divide-[#F0F4F2] max-h-48 overflow-y-auto pr-1">
                {unifiedToday.length > 0 ? (
                  unifiedToday.slice(0, 4).map((item) => {
                    const roomName = ROOMS.find((r) => r.id === item.roomId)?.name.split('—')[0] || 'C?';
                    const proName =
                      professionals.find((p) => p.id === (item.professionalId || item.proId))?.name ||
                      item.title ||
                      'Reserva';
                    return (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#46766B]">{item.start} - {item.end}</span>
                          <span className="text-[#34433F] font-medium">{proName}</span>
                        </div>
                        <span className="rounded-lg bg-[#EBF3EF] px-2 py-0.5 text-[11px] font-semibold text-[#2C5E50]">
                          {roomName}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-4 text-center text-xs text-[#7C8C85]">
                    No hay turnos ni bloques programados para hoy.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('agenda')}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#D5DDD7] py-2 text-xs font-bold text-[#34433F] hover:bg-[#FAF9F7]"
            >
              <span>Ver Grilla en Agenda</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bloque 4: Guardias y responsabilidades próximas */}
          <div className="rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F2]">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5EE] text-[#966838]">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#34433F]">Guardias y compromisos</h3>
                </div>
                <span className="text-xs font-semibold text-[#7A5520]">Institucional</span>
              </div>

              <div className="mt-3 space-y-2.5">
                {/* Próxima guardia */}
                {upcomingShifts.length > 0 ? (
                  <div
                    onClick={() => onNavigate('coverage')}
                    className="cursor-pointer rounded-xl bg-[#FAF9F7] p-2.5 text-xs flex items-center justify-between hover:bg-[#F5EFE6]"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7A5520]">Próxima Guardia</span>
                      <p className="font-semibold text-[#34433F]">
                        {upcomingShifts[0].date} ({upcomingShifts[0].startTime} a {upcomingShifts[0].endTime})
                      </p>
                    </div>
                    <span className="text-[11px] text-[#657570]">{upcomingShifts[0].place || 'Sede CREAR'}</span>
                  </div>
                ) : (
                  <p className="text-xs text-[#7C8C85]">Sin guardias programadas esta semana.</p>
                )}

                {/* Próxima responsabilidad */}
                {pendingActivities.length > 0 ? (
                  <div
                    onClick={() => onNavigate('responsibilities')}
                    className="cursor-pointer rounded-xl bg-[#FAF9F7] p-2.5 text-xs flex items-center justify-between hover:bg-[#FCEEF2]"
                  >
                    <div className="line-clamp-1 pr-2">
                      <span className="text-[10px] uppercase font-bold text-[#863853]">Tarea Pendiente</span>
                      <p className="font-semibold text-[#34433F] truncate">{pendingActivities[0].name}</p>
                    </div>
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 shrink-0">
                      Pendiente
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-[#7C8C85]">Sin tareas pendientes entre socias.</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('coverage')}
                className="flex items-center justify-center gap-1 rounded-xl border border-[#D5DDD7] py-2 text-xs font-bold text-[#34433F] hover:bg-[#FAF9F7]"
              >
                <span>Guardias</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('responsibilities')}
                className="flex items-center justify-center gap-1 rounded-xl border border-[#D5DDD7] py-2 text-xs font-bold text-[#34433F] hover:bg-[#FAF9F7]"
              >
                <span>Tareas</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
