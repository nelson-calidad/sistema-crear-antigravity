import { useState } from 'react';
import { isDemo, resetDemoData, save, useRecords } from '../lib/crearStore';
import { Button, cardClass, ErrorMessage, Field, PageHeader } from './ui';

export function SettingsReal() {
  const { rows, error } = useRecords('settings');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const value = (id: string, fallback = '') => draft[id] ?? rows.find(x => x.id === id)?.value ?? fallback;
  async function commit() { setSaving(true); setMessage(''); try { await Promise.all(['thirdAdmin', 'buildingRent'].map(id => save('settings', { id, value: value(id) }))); setMessage('Configuración guardada.'); } catch (e) { setMessage(String(e)); } finally { setSaving(false); } }
  return <div className="max-w-3xl space-y-6">
    <PageHeader title="Configuración" description="Parámetros administrativos simples que CREAR utiliza en sus módulos." />
    {error && <ErrorMessage>{error}</ErrorMessage>}
    <section className={`${cardClass} grid gap-5 sm:grid-cols-2`}>
      <Field label="Nombre de la tercera administradora" value={value('thirdAdmin')} onChange={e => setDraft({ ...draft, thirdAdmin: e.target.value })} />
      <Field label="Alquiler mensual del inmueble" type="number" min="0" value={value('buildingRent', '770000')} onChange={e => setDraft({ ...draft, buildingRent: e.target.value })} />
      <p className="text-sm leading-6 text-[#6D7C76] sm:col-span-2">El importe funciona como referencia editable. Cada pago se registra en Finanzas para que forme parte del resultado mensual.</p>
    </section>
    {message && <p role="status" className="rounded-xl bg-[#DDEAE2] px-4 py-3 text-sm">{message}</p>}
    <Button disabled={saving} onClick={() => void commit()}>{saving ? 'Guardando…' : 'Guardar configuración'}</Button>
    {isDemo && <section className={cardClass}><h2 className="font-semibold">Escenario de demostración</h2><p className="mt-1 text-sm leading-6 text-[#6D7C76]">Restaura consultas, entrevista, acuerdo, alquiler, gasto y aporte ficticios. Se eliminan únicamente los cambios guardados en este navegador.</p><Button tone="secondary" className="mt-4" onClick={() => { if (window.confirm('¿Restaurar los datos ficticios de demostración?')) resetDemoData(); }}>Restaurar datos demo</Button></section>}
  </div>;
}
