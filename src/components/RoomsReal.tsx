import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, DoorOpen, Pencil, Plus, Repeat, Trash2, User } from 'lucide-react';
import { PROFESSIONALS, ROOMS } from '../constants';
import { Agreement, localDate, Rental, Room, save, uid, useRecords } from '../lib/crearStore';
import { deleteAppointment, subscribeToAppointments } from '../lib/appointmentsStore';
import {
  buildUnifiedOccupancyAppointments,
  getActiveOccupancyForDate,
  type UnifiedOccupancySlot,
} from '../lib/occupancy';
import type { AppointmentRecord } from '../types';

const HOURS_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const DEFAULT_ROOMS_INFO: Record<
  string,
  {
    tag: string;
    badgeTone: string;
    disciplines: string[];
    description: string;
  }
> = {
  c1: {
    tag: 'Pedagogía y Evaluación',
    badgeTone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    disciplines: ['Psicología', 'Psicopedagogía', 'Educación Especial'],
    description:
      'Espacio flexible para entrevistas diagnósticas, evaluaciones pedagógicas y sesiones interdisciplinarias.',
  },
  c2: {
    tag: 'Rehabilitación y Movimiento',
    badgeTone: 'bg-teal-50 text-teal-800 border-teal-200',
    disciplines: ['Psicomotricidad', 'Terapia Ocupacional'],
    description:
      'Equipado para estimulación temprana, actividades de movimiento, integración sensorial y psicomotricidad.',
  },
  c3: {
    tag: 'Atención Tranquila y Lenguaje',
    badgeTone: 'bg-sky-50 text-sky-800 border-sky-200',
    disciplines: ['Fonoaudiología', 'Psicología'],
    description:
      'Ambiente calmo y acústicamente protegido para atención individualizada, fonoaudiología y estimulación del lenguaje.',
  },
};

interface RoomsRealProps {
  onOpenModal?: (
    room?: string,
    pro?: string,
    app?: AppointmentRecord,
    options?: { date?: string; startTime?: string }
  ) => void;
  onNavigate?: (tab: string) => void;
}

export function RoomsReal({ onOpenModal, onNavigate }: RoomsRealProps = {}) {
  const rooms = useRecords('rooms');
  const agreements = useRecords('agreements');
  const rentals = useRecords('rentals');
  const interviews = useRecords('interviews');
  const profiles = useRecords('profiles');
  const money = useRecords('money');

  const [room, setRoom] = useState<Room | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rental, setRental] = useState<Rental | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState(localDate());
  const [selectedRoomTab, setSelectedRoomTab] = useState<string>('all');
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<UnifiedOccupancySlot | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);

  useEffect(
    () =>
      subscribeToAppointments(
        setAppointments,
        (value) => setError(value instanceof Error ? value.message : 'No se pudo leer la agenda.')
      ),
    []
  );

  const input = 'w-full rounded-xl border border-[#DDE3DF] bg-white p-2.5 text-sm text-[#34433F] outline-none focus:border-[#46766B]';

  const professionalOptions = useMemo(() => {
    const base = PROFESSIONALS.map((p) => profiles.rows.find((row) => row.id === p.id) || p);
    const extras = profiles.rows.filter((row) => !PROFESSIONALS.some((p) => p.id === row.id));
    return [...base, ...extras];
  }, [profiles.rows]);

  const resolveProName = (proId?: string) => {
    if (!proId) return 'Sin asignar';
    return professionalOptions.find((p) => p.id === proId)?.name || proId;
  };

  async function commit() {
    setBusy(true);
    setError('');
    try {
      if (room) await save('rooms', room);
      setRoom(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function commitRental() {
    if (!rental) return;
    if (rental.start >= rental.end) {
      setError('El horario de inicio debe ser anterior al de fin.');
      return;
    }
    const finalOccupant =
      rental.occupant.trim() ||
      (rental.audience === 'tercero' ? 'Subalquiler externo' : 'Reserva de consultorio');
    const finalAmount = Math.max(0, Number(rental.amount) || 0);
    const configuredRoom = rooms.rows.find((item) => item.id === rental.roomId);
    if (rental.audience === 'tercero' && !configuredRoom?.thirdPartyEnabled) {
      setError('El alquiler a terceros está desactivado para este consultorio. Habilitalo en la tarjeta del consultorio antes de guardar.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Guarda exclusivamente en crear_rentals (la ocupación se sincroniza con Agenda y Finanzas gestiona el cobro real sin asientos ficticios)
      await save('rentals', {
        ...rental,
        occupant: finalOccupant,
        amount: finalAmount,
        status: rental.status || 'confirmado',
        selectedDays:
          rental.recurrence === 'weekly'
            ? Array.isArray(rental.selectedDays) && rental.selectedDays.length > 0
              ? rental.selectedDays
              : [new Date(`${rental.date}T12:00:00`).getDay()]
            : [],
        updatedAt: new Date().toISOString(),
      });
      setRental(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Ocupación unificada desde la única fuente de verdad (appointments + agreements + rentals + interviews)
  const unifiedOccupancy = useMemo(
    () =>
      buildUnifiedOccupancyAppointments({
        appointments,
        agreements: agreements.rows,
        rentals: rentals.rows,
        interviews: interviews.rows,
        profiles: professionalOptions,
      }),
    [appointments, agreements.rows, rentals.rows, interviews.rows, professionalOptions]
  );

  const occupancy = useMemo(
    () =>
      ROOMS.map((defaultRoom) => {
        const roomValue = rooms.rows.find((r) => r.id === defaultRoom.id) || {
          id: defaultRoom.id,
          name: defaultRoom.name,
          description: '',
          disciplines: '',
          thirdPartyEnabled: false,
        };
        const activeSlots = getActiveOccupancyForDate(
          unifiedOccupancy,
          availabilityDate,
          defaultRoom.id
        );
        return {
          room: roomValue,
          slots: activeSlots,
        };
      }),
    [unifiedOccupancy, availabilityDate, rooms.rows]
  );

  const weekDates = useMemo(() => {
    const selected = new Date(`${availabilityDate}T12:00:00`);
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
  }, [availabilityDate]);

  const handleSlotAction = (slot: UnifiedOccupancySlot) => {
    if (slot.source === 'agreements') {
      setSelectedSlotDetail(slot);
      return;
    }
    if (slot.source === 'rentals') {
      const found = rentals.rows.find((r) => r.id === slot.id);
      if (found) setRental(found);
      return;
    }
    if (onOpenModal) {
      const roomName = ROOMS.find((r) => r.id === slot.roomId)?.name;
      const proName = resolveProName(slot.professionalId || slot.proId);
      onOpenModal(roomName, proName, slot);
    } else {
      setSelectedSlotDetail(slot);
    }
  };

  const handleFreeSlotReserve = (roomId: string, startTime: string) => {
    const roomName = ROOMS.find((r) => r.id === roomId)?.name;
    if (onOpenModal) {
      onOpenModal(roomName, undefined, undefined, {
        date: availabilityDate,
        startTime,
      });
    }
  };

  const getSlotBadge = (slot: UnifiedOccupancySlot) => {
    if (slot.source === 'agreements') {
      return { text: 'Acuerdo mensual fijo', tone: 'bg-[#DDEAE2] text-[#1D4E38]' };
    }
    if (slot.source === 'rentals') {
      return { text: 'Subalquiler / Ocasional', tone: 'bg-[#F6E9DB] text-[#8A521D]' };
    }
    if (slot.source === 'interviews' || slot.kind === 'interview') {
      return { text: 'Entrevista inicial', tone: 'bg-amber-100 text-amber-900' };
    }
    if (slot.kind === 'block') {
      return { text: 'Reserva de consultorio', tone: 'bg-violet-100 text-violet-900' };
    }
    if (slot.isNestedInBlock) {
      return { text: 'Turno en bloque propio', tone: 'bg-sky-100 text-sky-900' };
    }
    return { text: 'Turno de paciente', tone: 'bg-emerald-100 text-emerald-900' };
  };

  const visibleOccupancy = useMemo(() => {
    if (selectedRoomTab === 'all') return occupancy;
    return occupancy.filter((entry) => entry.room.id === selectedRoomTab);
  }, [occupancy, selectedRoomTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#34433F]">Consultorios</h1>
          <p className="text-sm text-[#6D7C76]">
            Espacios, alquileres y disponibilidad en tiempo real unificada con la agenda de terapeutas
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            className="min-h-11 rounded-xl bg-[#46766B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B675D] shadow-xs inline-flex items-center justify-center gap-1.5"
            onClick={() =>
              setRental({
                id: uid(),
                roomId: 'c1',
                professionalId: '',
                audience: 'habitual',
                occupant: '',
                period: 'hora',
                date: localDate(),
                start: '09:00',
                end: '10:00',
                recurrence: 'none',
                selectedDays: [],
                untilDate: '',
                excludedDates: [],
                status: 'confirmado',
                amount: 0,
                paymentStatus: 'pendiente',
                dueDate: localDate(),
                method: '',
                notes: '',
                updatedAt: new Date().toISOString(),
              })
            }
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo alquiler de consultorio</span>
          </button>
        </div>
      </div>

      {rooms.error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {rooms.error}
        </p>
      )}
      {error && !room && !rental && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      {/* Tarjetas de Consultorio 1, Consultorio 2 y Consultorio 3 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {ROOMS.map((defaultRoom) => {
          const value = rooms.rows.find((x) => x.id === defaultRoom.id) || {
            id: defaultRoom.id,
            name: defaultRoom.name,
            description: '',
            disciplines: '',
            thirdPartyEnabled: false,
          };
          const fallback = DEFAULT_ROOMS_INFO[defaultRoom.id] || {
            tag: 'Consultorio',
            badgeTone: 'bg-gray-50 text-gray-700 border-gray-200',
            disciplines: ['Atención clínica'],
            description: 'Espacio de atención interdisciplinaria.',
          };

          const displayDescription = value.description?.trim() || fallback.description;
          const displayDisciplines = value.disciplines?.trim()
            ? value.disciplines.split(',').map((d) => d.trim()).filter(Boolean)
            : fallback.disciplines;

          return (
            <section
              key={value.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${fallback.badgeTone}`}
                    >
                      {fallback.tag}
                    </span>
                    <h2 className="mt-2 text-lg font-bold text-[#34433F] truncate">
                      {value.name}
                    </h2>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F3EE] text-[#46766B]">
                    <DoorOpen className="h-5 w-5" />
                  </span>
                </div>

                <p className="mt-2.5 text-xs sm:text-sm text-[#556560] leading-relaxed">
                  {displayDescription}
                </p>

                <div className="mt-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6D7C76]">
                    Disciplinas preparadas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {displayDisciplines.map((d) => (
                      <span
                        key={d}
                        className="rounded-lg bg-[#F1F5F3] px-2 py-0.5 text-xs font-semibold text-[#2C4F44]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-[#34433F]">
                  <span className="font-semibold text-[#6D7C76]">Alquiler a terceros:</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      value.thirdPartyEnabled ? 'text-emerald-700' : 'text-[#8E9B96]'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        value.thirdPartyEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                    {value.thirdPartyEnabled ? 'Habilitado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F0F4F2] flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-[#D7DFDA] px-3 py-1.5 text-xs font-semibold text-[#34433F] hover:bg-[#F1F3EF] transition"
                  onClick={() => setRoom(value)}
                >
                  Configurar espacio
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#46766B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#3B675D] transition"
                  onClick={() => handleFreeSlotReserve(value.id, '09:00')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Reservar aquí</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {/* Sección Ocupación semanal y Calendario de disponibilidad unificados */}
      <section className="rounded-2xl border border-[#E5EAE5] bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#34433F]">Ocupación semanal</h2>
            <p className="text-sm text-[#6D7C76]">
              Sincronizada en tiempo real con la Agenda de Terapeutas, acuerdos mensuales y alquileres. El bloque reservado ocupa el espacio aunque todavía no tenga sesiones cargadas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Elegir fecha"
              type="date"
              className={`${input} sm:w-auto`}
              value={availabilityDate}
              onChange={(e) => setAvailabilityDate(e.target.value)}
            />
          </div>
        </div>

        {/* Selector de días de la semana (adaptable al celular) */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {weekDates.map((date) => {
            const countOnDay = getActiveOccupancyForDate(unifiedOccupancy, date).filter(
              (s) => !s.isNestedInBlock
            ).length;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setAvailabilityDate(date)}
                className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs transition ${
                  date === availabilityDate
                    ? 'border-[#46766B] bg-[#DDEAE2] font-semibold text-[#1D3E35]'
                    : 'border-[#E5EAE5] bg-white text-[#52635D] hover:bg-[#F9FBF9]'
                }`}
              >
                <span className="capitalize">
                  {new Intl.DateTimeFormat('es-AR', {
                    weekday: 'short',
                    day: 'numeric',
                  }).format(new Date(`${date}T12:00:00`))}
                </span>
                <span className="mt-0.5 text-[10px] opacity-80">
                  {countOnDay === 0 ? 'Libre' : `${countOnDay} ocup.`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtro rápido de consultorio para vista móvil cómoda sin desplazamiento horizontal */}
        <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedRoomTab('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold shrink-0 ${
              selectedRoomTab === 'all'
                ? 'bg-[#46766B] text-white'
                : 'border border-[#DDE3DF] bg-[#F9FBF9] text-[#52635D]'
            }`}
          >
            Todos (3)
          </button>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoomTab(r.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold shrink-0 ${
                selectedRoomTab === r.id
                  ? 'bg-[#46766B] text-white'
                  : 'border border-[#DDE3DF] bg-[#F9FBF9] text-[#52635D]'
              }`}
            >
              {r.name.split('—')[0].trim()}
            </button>
          ))}
        </div>

        {/* Columnas por Consultorio: Ocupaciones + Horarios libres */}
        <div className="grid gap-4 lg:grid-cols-3">
          {visibleOccupancy.map(({ room: currentRoom, slots }) => {
            const physicalBlocksCount = slots.filter((s) => !s.isNestedInBlock).length;
            const freeHours = HOURS_SLOTS.filter((slotHour) => {
              const slotH = Number(slotHour.slice(0, 2));
              return !slots.some((s) => {
                const startH = Number(s.start.slice(0, 2));
                const endH = Number(s.end.slice(0, 2));
                const endM = Number(s.end.slice(3, 5));
                return slotH >= startH && (slotH < endH || (slotH === endH && endM > 0));
              });
            });

            return (
              <div
                key={currentRoom.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E5EAE5] bg-[#F6F8F5] p-4 space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8E3] pb-2.5">
                    <div>
                      <strong className="text-sm font-bold text-[#34433F]">
                        {currentRoom.name}
                      </strong>
                      <p className="text-xs text-[#6D7C76]">
                        {physicalBlocksCount === 0
                          ? 'Disponible todo el día'
                          : `${physicalBlocksCount} franja(s) ocupada(s)`}
                      </p>
                    </div>
                    {onOpenModal && (
                      <button
                        type="button"
                        onClick={() => handleFreeSlotReserve(currentRoom.id, freeHours[0] || '15:00')}
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-xs font-bold text-[#46766B] border border-[#D5DDD7] hover:bg-[#E8F3EE]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Reservar</span>
                      </button>
                    )}
                  </div>

                  {/* Listado de reservas / ocupaciones confirmadas */}
                  {slots.length > 0 ? (
                    <div className="space-y-2">
                      {slots.map((slot, index) => {
                        const badge = getSlotBadge(slot);
                        const proName = resolveProName(slot.professionalId || slot.proId);
                        const detailLabel =
                          slot.source === 'rentals'
                            ? slot.patient || slot.title
                            : slot.kind === 'block'
                              ? proName
                              : `${slot.patient || slot.title}${proName !== 'Sin asignar' ? ` · ${proName}` : ''}`;

                        return (
                          <div
                            key={`${slot.id}-${index}`}
                            className={`rounded-xl border bg-white p-3 text-xs shadow-2xs transition ${
                              slot.isNestedInBlock
                                ? 'ml-3 border-dashed border-[#BFD2C8] bg-[#FBFDFB]'
                                : 'border-[#E2E8E3]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#34433F]">
                                    {slot.start}–{slot.end}
                                  </span>
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badge.tone}`}
                                  >
                                    {badge.text}
                                  </span>
                                  {slot.recurrence === 'weekly' && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-[#EEF2EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#52635D]">
                                      <Repeat className="h-2.5 w-2.5" /> Semanal
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 font-semibold text-[#34433F] truncate">
                                  {detailLabel}
                                </p>
                                {slot.serviceName && (
                                  <p className="text-[11px] text-[#6D7C76]">
                                    Prestación: {slot.serviceName}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSlotAction(slot)}
                                  className="rounded-lg border border-[#D7DFDA] bg-white px-2 py-1 text-[11px] font-semibold text-[#34433F] hover:bg-[#F1F3EF]"
                                  title="Ver o editar reserva"
                                >
                                  Editar
                                </button>
                                {(!slot.source || slot.source === 'appointments') && (
                                  <button
                                    type="button"
                                    onClick={() => void deleteAppointment(slot.id)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                    title="Cancelar reserva y liberar horario"
                                  >
                                    Liberar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[#CFE0D6] bg-white/80 p-3 text-sm font-medium text-[#46766B]">
                      Disponible todo el día
                    </p>
                  )}
                </div>

                {/* Calendario rápido de horarios libres del día */}
                <div className="border-t border-[#E2E8E3] pt-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#52635D] mb-1.5">
                    Horarios libres ({freeHours.length})
                  </p>
                  {freeHours.length === 0 ? (
                    <p className="text-xs text-[#6D7C76]">Sin franjas libres en este día.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {freeHours.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleFreeSlotReserve(currentRoom.id, h)}
                          className="rounded-lg border border-[#D5DDD7] bg-white px-2 py-1 font-mono text-[11px] font-semibold text-[#46766B] hover:border-[#46766B] hover:bg-[#E8F3EE]"
                          title={`Reservar ${currentRoom.name} a las ${h}`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sección Alquileres ocasionales / Subalquileres externos */}
      <section className="rounded-2xl border border-[#E5EAE5] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#34433F]">
              Alquileres ocasionales y subalquileres externos
            </h2>
            <p className="text-xs text-[#6D7C76]">
              Bloquean físicamente el consultorio en la agenda compartida y se vinculan con Finanzas respetando su estado de cobro.
            </p>
          </div>
        </div>
        {rentals.rows.length === 0 ? (
          <p className="mt-3 text-sm text-[#6D7C76]">
            Todavía no hay alquileres por hora o jornada.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-[#E5EAE5]">
            {rentals.rows.map((item) => {
              const matchingPaid = money.rows.filter(
                (row) =>
                  (row.id === `occasional-rental-${item.id}` ||
                    row.sourceId === item.id ||
                    row.id.startsWith(`occasional-rental-${item.id}`) ||
                    row.id.startsWith(`rental-${item.id}`)) &&
                  row.status === 'pagado'
              );
              const paidAmount =
                matchingPaid.length > 0
                  ? matchingPaid.reduce((sum, r) => sum + Number(r.amount || 0), 0)
                  : item.paymentStatus === 'cobrado'
                    ? Number(item.amount || 0)
                    : 0;
              const agreedAmount = Number(item.amount || 0);
              const pendingAmount = Math.max(agreedAmount - paidAmount, 0);
              const isPaid = paidAmount >= agreedAmount && agreedAmount > 0;
              const isPartial = paidAmount > 0 && paidAmount < agreedAmount;

              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-bold text-[#34433F]">{item.occupant}</strong>
                      <span className="rounded-full bg-[#F1F3EF] px-2.5 py-0.5 text-xs font-medium text-[#52635D]">
                        {item.audience === 'tercero' ? 'Tercero externo (subalquiler)' : 'Profesional habitual'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isPaid
                            ? 'bg-[#DDEAE2] text-[#1D4E38]'
                            : isPartial
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'bg-[#F6E9DB] text-[#8A521D]'
                        }`}
                      >
                        {isPaid ? 'Cobrado' : isPartial ? 'Parcialmente cobrado' : 'Pendiente de cobro'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#34433F]">
                      {ROOMS.find((r) => r.id === item.roomId)?.name || item.roomId} · {item.date} ·{' '}
                      {item.start}–{item.end} · {item.period === 'hora' ? 'Por hora' : 'Por jornada'} · {item.status}
                    </p>
                    <p className="text-xs text-[#6D7C76]">
                      Importe acordado: ${agreedAmount.toLocaleString('es-AR')} · Cobrado: ${paidAmount.toLocaleString('es-AR')} ·{' '}
                      <span className={pendingAmount > 0 ? 'font-semibold text-[#8A521D]' : ''}>
                        Saldo pendiente: ${pendingAmount.toLocaleString('es-AR')}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#D7DFDA] px-3.5 py-1.5 text-xs font-semibold text-[#34433F] hover:bg-[#F1F3EF]"
                      onClick={() => setRental(item)}
                    >
                      Editar
                    </button>
                    {onNavigate && (
                      <button
                        type="button"
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          pendingAmount > 0
                            ? 'border-[#46766B] bg-[#E8F3EE] text-[#46766B] hover:bg-[#DDEAE2]'
                            : 'border-[#D7DFDA] bg-white text-[#52635D] hover:bg-[#F1F3EF]'
                        }`}
                        onClick={() => onNavigate('finance')}
                      >
                        {pendingAmount > 0 ? 'Cobrar en Finanzas →' : 'Ver en Finanzas →'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal: Configurar Consultorio */}
      {room && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-3">
          <div className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#34433F]">
                Configurar Consultorio
              </h2>
              <button
                type="button"
                className="text-sm font-semibold text-[#6D7C76] hover:text-[#34433F]"
                onClick={() => setRoom(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <label className="block">
                Nombre
                <input
                  className={input}
                  value={room.name}
                  onChange={(e) => setRoom({ ...room, name: e.target.value })}
                />
              </label>
              <label className="block">
                Descripción
                <input
                  className={input}
                  value={room.description}
                  onChange={(e) => setRoom({ ...room, description: e.target.value })}
                />
              </label>
              <label className="block">
                Disciplinas compatibles (separadas por coma)
                <input
                  className={input}
                  value={room.disciplines}
                  onChange={(e) => setRoom({ ...room, disciplines: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 pt-1 font-medium">
                <input
                  type="checkbox"
                  checked={room.thirdPartyEnabled}
                  onChange={(e) => setRoom({ ...room, thirdPartyEnabled: e.target.checked })}
                />
                Habilitar alquiler a terceros
              </label>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-[#46766B] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void commit()}
              >
                {busy ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alquiler de consultorio / Reserva rápida de espacio */}
      {rental && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-3">
          <div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#E5EAE5] pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#34433F]">
                  {rental.id ? 'Reserva o alquiler de consultorio' : 'Nuevo alquiler de consultorio'}
                </h2>
                <p className="text-xs text-[#6D7C76] mt-0.5">
                  Completá los datos del horario para ocupar el espacio en agenda y consultorios.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-sm font-semibold text-[#6D7C76] hover:bg-slate-100 transition"
                onClick={() => setRental(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Sección 1: Espacio y horario (indispensable) */}
              <div className="rounded-2xl border border-[#D5DDD7] bg-[#FAF8F5]/60 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#46766B]">
                  1. Espacio y horario del turno
                </p>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Consultorio</span>
                    <select
                      className={input}
                      value={rental.roomId}
                      onChange={(e) => setRental({ ...rental, roomId: e.target.value })}
                    >
                      {ROOMS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Fecha</span>
                    <input
                      type="date"
                      className={input}
                      value={rental.date}
                      onChange={(e) => setRental({ ...rental, date: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Desde</span>
                    <input
                      type="time"
                      className={input}
                      value={rental.start}
                      onChange={(e) => setRental({ ...rental, start: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Hasta</span>
                    <input
                      type="time"
                      className={input}
                      value={rental.end}
                      onChange={(e) => setRental({ ...rental, end: e.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="font-medium text-[#34433F]">Ocupante o motivo del espacio (opcional)</span>
                    <input
                      className={input}
                      placeholder="Ej: Lic. Martínez, Taller, Subalquiler..."
                      value={rental.occupant}
                      onChange={(e) => setRental({ ...rental, occupant: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              {/* Sección 2: Registro de cobro (opcional, sin trabar el avance) */}
              <div className="rounded-2xl border border-[#E5EAE5] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6D7C76]">
                    2. Datos de cobro (opcional)
                  </p>
                  <span className="text-[11px] text-[#6D7C76]">Podés dejarlo en $0 o registrar importe</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Importe acordado ($)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 (o importe acordado)"
                      className={input}
                      value={rental.amount === 0 ? '' : rental.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRental({
                          ...rental,
                          amount: val === '' ? 0 : Math.max(0, Number(val)),
                        });
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Estado de cobro</span>
                    <select
                      className={input}
                      value={rental.paymentStatus}
                      onChange={(e) =>
                        setRental({
                          ...rental,
                          paymentStatus: e.target.value as Rental['paymentStatus'],
                        })
                      }
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="cobrado">Cobrado</option>
                      <option value="parcial">Parcialmente cobrado</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Vencimiento de pago</span>
                    <input
                      type="date"
                      className={input}
                      value={rental.dueDate}
                      onChange={(e) => setRental({ ...rental, dueDate: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Medio de pago</span>
                    <input
                      className={input}
                      placeholder="Efectivo, Transferencia, etc."
                      value={rental.method}
                      onChange={(e) => setRental({ ...rental, method: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              {/* Sección 3: Repetición y detalles adicionales */}
              <div className="rounded-2xl border border-[#E5EAE5] bg-white p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6D7C76]">
                  3. Opciones adicionales
                </p>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Repetición</span>
                    <select
                      className={input}
                      value={rental.recurrence}
                      onChange={(e) =>
                        setRental({
                          ...rental,
                          recurrence: e.target.value as Rental['recurrence'],
                        })
                      }
                    >
                      <option value="none">Única vez</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </label>
                  {rental.recurrence === 'weekly' && (
                    <label className="block">
                      <span className="font-medium text-[#34433F]">Repetir hasta</span>
                      <input
                        type="date"
                        className={input}
                        value={rental.untilDate}
                        onChange={(e) => setRental({ ...rental, untilDate: e.target.value })}
                      />
                    </label>
                  )}
                  <label className="block">
                    <span className="font-medium text-[#34433F]">Tipo de uso</span>
                    <select
                      className={input}
                      value={rental.audience}
                      onChange={(e) =>
                        setRental({ ...rental, audience: e.target.value as Rental['audience'] })
                      }
                    >
                      <option value="habitual">Profesional habitual</option>
                      <option
                        value="tercero"
                        disabled={!rooms.rows.some((r) => r.thirdPartyEnabled)}
                      >
                        Tercero autorizado
                      </option>
                    </select>
                  </label>
                  {rental.audience === 'habitual' && (
                    <label className="block">
                      <span className="font-medium text-[#34433F]">Profesional vinculada (opcional)</span>
                      <select
                        className={input}
                        value={rental.professionalId}
                        onChange={(e) =>
                          setRental({ ...rental, professionalId: e.target.value })
                        }
                      >
                        <option value="">Sin vincular</option>
                        {professionalOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block sm:col-span-2">
                    <span className="font-medium text-[#34433F]">Observaciones</span>
                    <textarea
                      rows={2}
                      className={input}
                      placeholder="Notas o comentarios sobre el espacio o reserva..."
                      value={rental.notes}
                      onChange={(e) => setRental({ ...rental, notes: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </div>

            {rental.audience === 'tercero' && (
              <p className="mt-3 rounded-xl bg-[#F6E9DB] p-3 text-sm text-[#8A521D]">
                Solo puede guardarse si el consultorio tiene habilitada expresamente la contratación a terceros.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-[#E5EAE5] pt-3">
              <button
                type="button"
                className="rounded-xl border border-[#D5DDD7] px-4 py-2.5 text-sm font-semibold text-[#52635D] hover:bg-[#F1F3EF] transition"
                onClick={() => setRental(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-[#46766B] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#3B645B] transition disabled:opacity-50"
                onClick={() => void commitRental()}
              >
                {busy ? 'Guardando...' : 'Confirmar y ocupar espacio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
