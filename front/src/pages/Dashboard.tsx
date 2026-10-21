import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import MetricCard from '../components/MetricCard';

type Message = { role: 'user' | 'assistant'; text: string };
const AGENT_RULES = 'Eres OrquestAI, asistente de reservas. Usa todo el historial. Si la ultima propuesta ya tiene fecha, hora y personas, un si confirma esa propuesta: no pidas los datos otra vez. Responde en maximo 2 frases, sin inventar disponibilidad. Si faltan datos, pregunta solo por los que falten. Cuando esten completos, resume fecha, hora y personas e indica que se registran con Nueva reserva.';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error } = useFetch(useCallback(api.summary, []));
  const [draft, setDraft] = useState(''); const [messages, setMessages] = useState<Message[]>([]); const [aiError, setAiError] = useState(''); const [sending, setSending] = useState(false);
  async function ask() {
    const text = draft.trim(); if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, text }]; setDraft(''); setAiError(''); setMessages(next); setSending(true);
    const history = next.slice(-6).map((item) => `${item.role === 'user' ? 'Usuario' : 'Asistente'}: ${item.text}`).join('\n');
    try { const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: `${AGENT_RULES}\n\nHistorial:\n${history}` }) }); const raw = await response.text(); let body: { ok?: boolean; data?: { respuesta?: string }; error?: string }; try { body = JSON.parse(raw); } catch { throw new Error('El workflow devolvio una respuesta vacia o no valida. Revisa Respond to Webhook y publica el workflow.'); } const answer = body.data?.respuesta; if (!response.ok || !body.ok || !answer) throw new Error(body.error || 'No fue posible contactar el agente'); setMessages((current) => [...current, { role: 'assistant', text: answer }]); }
    catch (requestError) { setAiError(requestError instanceof Error ? requestError.message : 'Error inesperado'); } finally { setSending(false); }
  }
  if (loading) return <p>Cargando...</p>; if (error) return <p className="error">{error}</p>;
  const confirmed = messages.some((item) => item.role === 'assistant' && /propuesta:|confirmado:/i.test(item.text));
  return <><p className="eyebrow">OPERACION DEL DIA</p><h1>Panel de reservas</h1><section className="metrics"><MetricCard label="Reservas activas" value={data?.hoy.reservas_activas_hoy || 0}/><MetricCard label="Comensales" value={data?.hoy.comensales_hoy || 0}/></section><section className="card"><h2>Por estado</h2>{data?.por_estado.map((item) => <p key={item.estado}>{item.estado}: <b>{item.cantidad}</b></p>)}</section><section className="card assistant"><div className="assistant-title"><h2>Asistente IA</h2>{messages.length > 0 && <button className="link-button" onClick={() => setMessages([])}>Limpiar</button>}</div><div className="chat" aria-live="polite">{messages.length === 0 ? <p className="hint">Pide una reserva: Mesa para 4 el viernes a las 13:00.</p> : messages.map((item, index) => <p className={`bubble ${item.role}`} key={`${item.role}-${index}`}>{item.text}</p>)}</div>{confirmed && <button type="button" className="button" onClick={() => navigate('/reservas/nueva', { state: { assistantText: messages.map((item) => item.text).join(' ') } })}>Crear esta reserva</button>}<label>Solicitud<input value={draft} placeholder="Mesa para 4 el viernes a las 13:00" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void ask(); }} /></label><button type="button" onClick={() => void ask()} disabled={sending}>{sending ? 'Consultando...' : 'Consultar agente'}</button>{aiError && <p className="error">{aiError}</p>}</section></>;
}
