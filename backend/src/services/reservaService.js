const db = require('../db');
const { error } = require('../utils');
const activeStates = ['pendiente', 'confirmada'];

function minutes(value) { const [h, m] = value.split(':').map(Number); return h * 60 + m; }
function time(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}:00`; }
function dayOfWeek(date) { return new Date(`${date}T12:00:00`).getDay(); }

async function create(data) {
  const { cliente_id, mesa_id, fecha, hora_inicio, personas, nota = null } = data;
  if (!cliente_id || !mesa_id || !fecha || !hora_inicio || !personas) throw error(400, 'cliente_id, mesa_id, fecha, hora_inicio y personas son obligatorios');
  const start = minutes(hora_inicio); const end = start + 120;
  if (start < 0 || end > 24 * 60) throw error(400, 'La reserva debe durar 2 horas válidas');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const customer = await client.query('SELECT * FROM clientes WHERE id = $1 FOR UPDATE', [cliente_id]);
    if (!customer.rowCount) throw error(404, 'Cliente no existe');
    if (customer.rows[0].no_shows >= 3) throw error(409, 'El cliente tiene 3 o más no-shows y no puede reservar');
    const table = await client.query('SELECT * FROM mesas WHERE id = $1', [mesa_id]);
    if (!table.rowCount) throw error(404, 'Mesa no existe');
    if (!table.rows[0].activa) throw error(409, 'La mesa está inactiva');
    if (Number(personas) > table.rows[0].capacidad) throw error(409, 'La cantidad de personas supera la capacidad de la mesa');
    const hours = await client.query('SELECT apertura, cierre FROM horarios WHERE dia_semana = $1', [dayOfWeek(fecha)]);
    if (!hours.rowCount || start < minutes(hours.rows[0].apertura) || end > minutes(hours.rows[0].cierre)) throw error(409, 'La reserva está fuera del horario de atención');
    const collision = await client.query("SELECT id FROM reservas WHERE mesa_id = $1 AND fecha = $2 AND estado = ANY($3) AND hora_inicio < $4 AND hora_fin > $5", [mesa_id, fecha, activeStates, time(end), time(start)]);
    if (collision.rowCount) throw error(409, 'La mesa ya tiene una reserva que se solapa en ese horario');
    const result = await client.query('INSERT INTO reservas (cliente_id, mesa_id, fecha, hora_inicio, hora_fin, personas, nota) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [cliente_id, mesa_id, fecha, time(start), time(end), personas, nota]);
    await client.query('COMMIT'); return result.rows[0];
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function list(filters) {
  const values = []; const where = [];
  if (filters.fecha) { values.push(filters.fecha); where.push(`r.fecha = $${values.length}`); }
  if (filters.estado) { values.push(filters.estado); where.push(`r.estado = $${values.length}`); }
  const result = await db.query(`SELECT r.*, c.nombre AS cliente_nombre, m.numero AS mesa_numero FROM reservas r JOIN clientes c ON c.id=r.cliente_id JOIN mesas m ON m.id=r.mesa_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.fecha DESC, r.hora_inicio`, values);
  return result.rows;
}

async function get(id) {
  const result = await db.query('SELECT r.*, c.nombre AS cliente_nombre, c.telefono, m.numero AS mesa_numero, m.ubicacion FROM reservas r JOIN clientes c ON c.id=r.cliente_id JOIN mesas m ON m.id=r.mesa_id WHERE r.id=$1', [id]);
  if (!result.rowCount) throw error(404, 'Reserva no existe'); return result.rows[0];
}

async function updateState(id, estado) {
  const allowed = { pendiente: ['confirmada', 'cancelada'], confirmada: ['cumplida', 'cancelada', 'no_show'] };
  const client = await db.connect();
  try {
    await client.query('BEGIN'); const existing = await client.query('SELECT * FROM reservas WHERE id=$1 FOR UPDATE', [id]);
    if (!existing.rowCount) throw error(404, 'Reserva no existe');
    if (!allowed[existing.rows[0].estado]?.includes(estado)) throw error(409, 'Transición de estado no válida');
    const updated = await client.query('UPDATE reservas SET estado=$1 WHERE id=$2 RETURNING *', [estado, id]);
    if (estado === 'no_show') await client.query('UPDATE clientes SET no_shows=no_shows+1 WHERE id=$1', [existing.rows[0].cliente_id]);
    await client.query('COMMIT'); return updated.rows[0];
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function summary() {
  const [states, occupancy] = await Promise.all([
    db.query('SELECT estado, COUNT(*)::int AS cantidad FROM reservas GROUP BY estado ORDER BY estado'),
    db.query("SELECT COUNT(*) FILTER (WHERE estado = ANY($1))::int AS reservas_activas_hoy, COALESCE(SUM(personas) FILTER (WHERE estado = ANY($1)),0)::int AS comensales_hoy FROM reservas WHERE fecha=CURRENT_DATE", [activeStates]),
  ]);
  return { por_estado: states.rows, hoy: occupancy.rows[0] };
}
async function availability({ fecha, hora_inicio, personas, ubicacion }) {
  if (!fecha || !hora_inicio || !personas) throw error(400, 'fecha, hora_inicio y personas son obligatorios');
  const start = minutes(hora_inicio); const end = start + 120;
  if (end > 24 * 60) throw error(400, 'Hora inválida');
  const values = [Number(personas), fecha, time(end), time(start), activeStates];
  let sql = "SELECT m.id, m.numero, m.capacidad, m.ubicacion FROM mesas m WHERE m.activa=true AND m.capacidad >= $1 AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.mesa_id=m.id AND r.fecha=$2 AND r.estado = ANY($5) AND r.hora_inicio < $3 AND r.hora_fin > $4)";
  if (ubicacion) { values.push(ubicacion); sql += ` AND m.ubicacion=$${values.length}`; }
  const result = await db.query(`${sql} ORDER BY m.capacidad, m.numero`, values);
  return result.rows;
}
module.exports = { create, list, get, updateState, summary, availability };
