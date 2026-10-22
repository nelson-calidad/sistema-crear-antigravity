import { useMemo, useState } from 'react';
import { localDate, moneyFormat, Money, save, uid, useRecords, type Agreement, type Rental, type Interview } from '../lib/crearStore';
import { useProfessionals } from '../lib/professionalsStore';
import { ROOMS } from '../constants';
import { Button, cardClass, EmptyState, ErrorMessage, Field, LoadingState, Modal, PageHeader, SelectField, StatCard } from './ui';

const blank = (): Money => ({ id: uid(), date: localDate(), kind: 'gasto', category: '', description: '', amount: 0, method: '', person: '', sourceId: '', status: 'pagado', nature: '' });
const kindLabel: Record<Money['kind'], string> = { ingreso: 'Ingreso', gasto: 'Gasto', aporte: 'Aporte personal', devolución: 'Devolución' };

export function FinanceReal() {
  const { rows, error, loading } = useRecords('money');
  const agreements = useRecords('agreements');
  const rentals = useRecords('rentals');
  const interviews = useRecords('interviews');
  const [professionals] = useProfessionals();

  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [kind, setKind] = useState('');
  const [form, setForm] = useState<Money | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const resolveProName = (proId?: string) => {
    if (!proId) return 'Profesional';
    return professionals.find((p) => p.id === proId)?.name || proId;
  };

  const monthly = useMemo(() => rows.filter((row) => row.date?.startsWith(month)), [rows, month]);
  const filtered = useMemo(
    () => monthly.filter((row) => !kind || row.kind === kind).sort((a, b) => b.date.localeCompare(a.date)),
    [monthly, kind]
  );

  const total = (type: Money['kind']) =>
    monthly
      .filter((row) => row.kind === type && row.status === 'pagado')
      .reduce((sum, row) => sum + Number(row.amount), 0);

  const income = total('ingreso');
  const expense = total('gasto');
  const contributions = total('aporte');

  // Acuerdos mensuales activos y su estado en el mes seleccionado
  const activeAgreementsWithStatus = useMemo(() => {
    return agreements.rows
      .filter((item) => item.status === 'activo')
      .map((item) => {
        const moneyId = `rent-${item.id}-${month}`;
        const paidRow = rows.find((row) => row.id === moneyId && row.status === 'pagado');
        return {
          agreement: item,
          moneyId,
          isPaid: Boolean(paidRow),
          paidAmount: paidRow ? Number(paidRow.amount) : 0,
          agreedAmount: Number(item.amount || 0),
        };
      });
  }, [agreements.rows, rows, month]);

  // Subalquileres / ocasionales del mes
  const monthlyRentalsWithStatus = useMemo(() => {
    return rentals.rows
      .filter((item) => item.status !== 'cancelled' && item.date?.startsWith(month))
      .map((item) => {
        const moneyId = `occasional-rental-${item.id}`;
        const paidRow = rows.find((row) => row.id === moneyId && row.status === 'pagado');
        const isPaid = item.paymentStatus === 'cobrado' || Boolean(paidRow);
        return {
          rental: item,
          moneyId,
          isPaid,
          agreedAmount: Number(item.amount || 0),
          paidAmount: isPaid ? Number(paidRow?.amount ?? item.amount ?? 0) : 0,
        };
      });
  }, [rentals.rows, rows, month]);

  // Entrevistas del mes con importe
  const monthlyInterviewsWithStatus = useMemo(() => {
    return interviews.rows
      .filter((item) => item.status !== 'cancelada' && item.date?.startsWith(month) && Number(item.amount || 0) > 0)
      .map((item) => {
        const moneyId = `interview-${item.id}`;
        const paidRow = rows.find((row) => row.id === moneyId && row.status === 'pagado');
        const isPaid = item.paymentStatus === 'cobrado' || Boolean(paidRow);
        return {
          interview: item,
          moneyId,
          isPaid,
          agreedAmount: Number(item.amount || 0),
          paidAmount: isPaid ? Number(paidRow?.amount ?? item.amount ?? 0) : 0,
        };
      });
  }, [interviews.rows, rows, month]);

  const totalAgreedCommitments =
    activeAgreementsWithStatus.reduce((s, x) => s + x.agreedAmount, 0) +
    monthlyRentalsWithStatus.reduce((s, x) => s + x.agreedAmount, 0) +
    monthlyInterviewsWithStatus.reduce((s, x) => s + x.agreedAmount, 0);

  const totalCollectedCommitments =
    activeAgreementsWithStatus.reduce((s, x) => s + x.paidAmount, 0) +
    monthlyRentalsWithStatus.reduce((s, x) => s + x.paidAmount, 0) +
    monthlyInterviewsWithStatus.reduce((s, x) => s + x.paidAmount, 0);

  const rentPending = activeAgreementsWithStatus
    .filter((x) => !x.isPaid)
    .reduce((sum, x) => sum + x.agreedAmount, 0);
  const occasionalPending = monthlyRentalsWithStatus
    .filter((x) => !x.isPaid)
    .reduce((sum, x) => sum + x.agreedAmount, 0);
  const interviewsPending = monthlyInterviewsWithStatus
    .filter((x) => !x.isPaid)
    .reduce((sum, x) => sum + x.agreedAmount, 0);

  const totalPendingBalance = rentPending + occasionalPending + interviewsPending;

  const update = <K extends keyof Money>(key: K, value: Money[K]) =>
    setForm((current) => current && { ...current, [key]: value });

  const openAgreementCollection = (agreement: Agreement) => {
    const proName = resolveProName(agreement.professionalId);
    const existing = rows.find((r) => r.id === `rent-${agreement.id}-${month}`);
    setForm(
      existing
        ? { ...existing, status: 'pagado' }
        : {
            id: `rent-${agreement.id}-${month}`,
            date: localDate(),
            kind: 'ingreso',
            category: 'Alquiler mensual',
            description: `Alquiler ${month} · ${proName}`,
            amount: Number(agreement.amount || 0),
            method: 'Transferencia',
            person: proName,
            sourceId: agreement.id,
            status: 'pagado',
            nature: '',
          }
    );
  };

  const openRentalCollection = (rental: Rental) => {
    const existing = rows.find((r) => r.id === `occasional-rental-${rental.id}`);
    setForm(
      existing
        ? { ...existing, status: 'pagado' }
        : {
            id: `occasional-rental-${rental.id}`,
            date: localDate(),
            kind: 'ingreso',
            category: 'Alquiler ocasional',
            description: `${rental.period === 'hora' ? 'Alquiler por hora' : 'Alquiler por jornada'} · ${rental.occupant}`,
            amount: Number(rental.amount || 0),
            method: rental.method || 'Transferencia',
            person: rental.occupant,
            sourceId: rental.id,
            status: 'pagado',
            nature: '',
          }
    );
  };

  const openInterviewCollection = (interview: Interview) => {
    const existing = rows.find((r) => r.id === `interview-${interview.id}`);
    const proName = resolveProName(interview.professionalId);
    setForm(
      existing
        ? { ...existing, status: 'pagado' }
        : {
            id: `interview-${interview.id}`,
            date: localDate(),
            kind: 'ingreso',
            category: 'Entrevista inicial',
            description: `Entrevista inicial · ${proName}`,
            amount: Number(interview.amount || 0),
            method: interview.paymentMethod || 'Transferencia',
            person: interview.receivedBy || proName,
            sourceId: interview.id,
            status: 'pagado',
            nature: '',
          }
    );
  };

  async function commit() {
    if (!form || !form.category.trim() || form.amount <= 0) {
      setMessage('Completá categoría e importe mayor que cero.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await save('money', form);
      // Si corresponde a un subalquiler o entrevista y se marca pagado, sincronizar su estado de cobro por su ID único
      if (form.status === 'pagado' && form.sourceId) {
        const linkedRental = rentals.rows.find((r) => r.id === form.sourceId);
        if (linkedRental && linkedRental.paymentStatus !== 'cobrado') {
          await save('rentals', {
            ...linkedRental,
            paymentStatus: 'cobrado',
            method: form.method || linkedRental.method,
            updatedAt: new Date().toISOString(),
          });
        }
        const linkedInterview = interviews.rows.find((i) => i.id === form.sourceId);
        if (linkedInterview && linkedInterview.paymentStatus !== 'cobrado') {
          await save('interviews', {
            ...linkedInterview,
            paymentStatus: 'cobrado',
            paymentMethod: form.method || linkedInterview.paymentMethod,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      setForm(null);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Finanzas"
        description="Centro único de registro de ingresos, gastos, cobros de consultorios y saldos de CREAR."
        action={<Button onClick={() => setForm(blank())}>Nuevo movimiento</Button>}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ingresos cobrados" value={moneyFormat(income)} detail={`Acordado mes: ${moneyFormat(totalAgreedCommitments)}`} tone="sage" />
        <StatCard label="Gastos" value={moneyFormat(expense)} tone="peach" />
        <StatCard label="Resultado operativo" value={moneyFormat(income - expense)} tone="blue" />
        <StatCard label="Aportes personales" value={moneyFormat(contributions)} tone="lavender" />
        <StatCard
          label="Saldos pendientes"
          value={moneyFormat(totalPendingBalance)}
          detail={`Cobrado de acuerdos: ${moneyFormat(totalCollectedCommitments)}`}
        />
      </div>

      {/* Compromisos vinculados desde Consultorios y Admisiones (Importes acordados vs cobrados vs saldos) */}
      {(activeAgreementsWithStatus.length > 0 || monthlyRentalsWithStatus.length > 0 || monthlyInterviewsWithStatus.length > 0) && (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-[#34433F]">
                Compromisos de consultorios y entrevistas ({month})
              </h2>
              <p className="text-xs text-[#6D7C76]">
                Los acuerdos mensuales y subalquileres se configuran en Consultorios y se cobran una única vez aquí. Los turnos de pacientes no generan cobros por sesión.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <span className="rounded-xl bg-[#F2F5F3] px-3 py-1.5 text-[#34433F]">
                Acordado: <strong>{moneyFormat(totalAgreedCommitments)}</strong>
              </span>
              <span className="rounded-xl bg-[#DDEAE2] px-3 py-1.5 text-[#1D4E38]">
                Cobrado: <strong>{moneyFormat(totalCollectedCommitments)}</strong>
              </span>
              <span className="rounded-xl bg-[#F6E9DB] px-3 py-1.5 text-[#8A521D]">
                Saldo pendiente: <strong>{moneyFormat(totalPendingBalance)}</strong>
              </span>
            </div>
          </div>

          <div className="mt-4 divide-y divide-[#E5EAE5]">
            {activeAgreementsWithStatus.map(({ agreement, isPaid, agreedAmount, paidAmount }) => {
              const roomName = ROOMS.find((r) => r.id === agreement.roomId)?.name.split('—')[0].trim() || agreement.roomId;
              return (
                <div key={agreement.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#34433F]">{resolveProName(agreement.professionalId)}</strong>
                      <span className="rounded-full bg-[#EEF2EE] px-2.5 py-0.5 text-xs font-medium text-[#46766B]">
                        Acuerdo mensual fijo · {roomName}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isPaid ? 'bg-[#DDEAE2] text-[#1D4E38]' : 'bg-[#F6E9DB] text-[#8A521D]'
                        }`}
                      >
                        {isPaid ? 'Cobrado' : 'Saldo pendiente'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#6D7C76]">
                      Importe acordado: {moneyFormat(agreedAmount)} · Cobrado: {moneyFormat(paidAmount)} · Saldo:{' '}
                      {moneyFormat(Math.max(agreedAmount - paidAmount, 0))}
                    </p>
                  </div>
                  {!isPaid && (
                    <Button
                      tone="secondary"
                      className="min-h-9 px-3 py-1 text-xs"
                      onClick={() => openAgreementCollection(agreement)}
                    >
                      Registrar cobro
                    </Button>
                  )}
                </div>
              );
            })}

            {monthlyRentalsWithStatus.map(({ rental, isPaid, agreedAmount, paidAmount }) => {
              const roomName = ROOMS.find((r) => r.id === rental.roomId)?.name.split('—')[0].trim() || rental.roomId;
              return (
                <div key={rental.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#34433F]">{rental.occupant}</strong>
                      <span className="rounded-full bg-[#F1F3EF] px-2.5 py-0.5 text-xs font-medium text-[#52635D]">
                        Subalquiler ({roomName} · {rental.date})
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isPaid ? 'bg-[#DDEAE2] text-[#1D4E38]' : 'bg-[#F6E9DB] text-[#8A521D]'
                        }`}
                      >
                        {isPaid ? 'Cobrado' : 'Saldo pendiente'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#6D7C76]">
                      Importe acordado: {moneyFormat(agreedAmount)} · Cobrado: {moneyFormat(paidAmount)} · Saldo:{' '}
                      {moneyFormat(Math.max(agreedAmount - paidAmount, 0))}
                    </p>
                  </div>
                  {!isPaid && (
                    <Button
                      tone="secondary"
                      className="min-h-9 px-3 py-1 text-xs"
                      onClick={() => openRentalCollection(rental)}
                    >
                      Registrar cobro
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">Movimientos</h2>
            <p className="text-sm text-[#6D7C76]">
              Los aportes se muestran por separado y no integran los ingresos operativos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mes" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <SelectField label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(kindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
        <div className="mt-5">
          {loading ? (
            <LoadingState label="Cargando movimientos…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No hay movimientos"
              detail="Cambiá el mes o registrá un nuevo ingreso, gasto o aporte."
            />
          ) : (
            <div className="divide-y divide-[#E5EAE5]">
              {filtered.map((row) => (
                <article
                  key={row.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{row.description || row.category}</strong>
                      <span className="rounded-full bg-[#F1F3EF] px-2.5 py-1 text-xs">
                        {kindLabel[row.kind]}
                      </span>
                      {row.status === 'previsto' && (
                        <span className="rounded-full bg-[#F6E9DB] px-2.5 py-1 text-xs">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#6D7C76]">
                      {row.date.split('-').reverse().join('/')} · {row.category}
                      {row.person ? ` · ${row.person}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <strong className={row.kind === 'gasto' ? 'text-[#9A5D49]' : 'text-[#46766B]'}>
                      {moneyFormat(row.amount)}
                    </strong>
                    <Button
                      tone="secondary"
                      className="min-h-9 px-3 py-1"
                      onClick={() => setForm(row)}
                    >
                      Editar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      {form && (
        <Modal
          title={form.id.startsWith('demo-') ? 'Editar movimiento demo' : 'Movimiento'}
          onClose={() => setForm(null)}
          footer={
            <Button disabled={saving} onClick={() => void commit()}>
              {saving ? 'Guardando…' : 'Guardar movimiento'}
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            <SelectField
              label="Tipo"
              value={form.kind}
              onChange={(e) => update('kind', e.target.value as Money['kind'])}
            >
              {Object.entries(kindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <Field label="Categoría" value={form.category} onChange={(e) => update('category', e.target.value)} />
            <Field
              label="Importe"
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => update('amount', Number(e.target.value))}
            />
            <Field
              label="Descripción"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
            <Field
              label="Medio de pago"
              value={form.method}
              onChange={(e) => update('method', e.target.value)}
            />
            <Field label="Persona" value={form.person} onChange={(e) => update('person', e.target.value)} />
            <SelectField
              label="Estado"
              value={form.status}
              onChange={(e) => update('status', e.target.value as Money['status'])}
            >
              <option value="previsto">Pendiente</option>
              <option value="pagado">Pagado</option>
            </SelectField>
            {form.kind === 'aporte' && (
              <SelectField
                label="Naturaleza"
                className="sm:col-span-2"
                value={form.nature}
                onChange={(e) => update('nature', e.target.value)}
              >
                <option value="">Pendiente de clasificación</option>
                <option value="Aporte">Aporte</option>
                <option value="Préstamo">Préstamo</option>
              </SelectField>
            )}
          </div>
          {message && (
            <div className="mt-4">
              <ErrorMessage>{message}</ErrorMessage>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
