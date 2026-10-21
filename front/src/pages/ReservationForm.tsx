import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Input } from '../services/api';
import { useFetch } from '../hooks/useFetch';

function draftFromAssistant(text: string): Partial<Input> {
  const lower = text.toLowerCase(); const people = lower.match(/(\d+)\s*personas?/); const hour = lower.match(/(?:a las|a)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?(?:m|m)?|p\.?(?:m|m)?)?/);
  const months: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
  const date = lower.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
  const result: Partial<Input> = {};
  if (people) result.personas = Number(people[1]);
  if (hour) { let h = Number(hour[1]); if (hour[3]?.startsWith('p') && h < 12) h += 12; if (hour[3]?.startsWith('a') && h === 12) h = 0; result.hora_inicio = `${String(h).padStart(2, '0')}:${hour[2] || '00'}`; }
  if (date) result.fecha = `2026-${months[date[2]]}-${date[1].padStart(2, '0')}`;
  return result;
}

export default function Form() { const nav = useNavigate(); const location = useLocation(); const prefill = draftFromAssistant((location.state as { assistantText?: string } | null)?.assistantText || ''); const clients = useFetch(useCallback(api.clients, [])); const tables = useFetch(useCallback(api.tables, [])); const [form, setForm] = useState<Input>({ cliente_id: 0, mesa_id: 0, fecha: prefill.fecha || '', hora_inicio: prefill.hora_inicio || '', personas: prefill.personas || 1, nota: '' }); const [error, setError] = useState(''); async function submit(event: FormEvent) { event.preventDefault(); try { const reservation = await api.create(form); nav(`/reservas/${reservation.id}`); } catch (err) { setError(err instanceof Error ? err.message : 'Error'); } } if (clients.loading || tables.loading) return <p>Cargando...</p>; return <><p className="eyebrow">AGENDA</p><h1>Nueva reserva</h1><form className="card form" onSubmit={submit}>{error && <p className="error">{error}</p>}<label>Cliente<select required value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: +event.target.value })}><option value="">Selecciona</option>{clients.data?.map((client) => <option value={client.id} key={client.id}>{client.nombre}</option>)}</select></label><label>Mesa<select required value={form.mesa_id} onChange={(event) => setForm({ ...form, mesa_id: +event.target.value })}><option value="">Selecciona</option>{tables.data?.filter((table) => table.activa).map((table) => <option value={table.id} key={table.id}>Mesa {table.numero} ({table.capacidad})</option>)}</select></label><label>Fecha<input required type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} /></label><label>Hora<input required type="time" value={form.hora_inicio} onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })} /></label><label>Personas<input required min="1" type="number" value={form.personas} onChange={(event) => setForm({ ...form, personas: +event.target.value })} /></label><label>Nota<textarea value={form.nota} onChange={(event) => setForm({ ...form, nota: event.target.value })} /></label><button className="button">Crear reserva</button></form></>; }
