const db = require('../db');
const { error } = require('../utils');

const recursos = {
  mesas: {
    columns: ['numero', 'capacidad', 'ubicacion', 'activa'],
    required: ['numero', 'capacidad', 'ubicacion'],
    order: 'numero',
  },
  clientes: {
    columns: ['nombre', 'telefono'],
    required: ['nombre', 'telefono'],
    order: 'nombre',
  },
};

function config(resource) {
  if (!recursos[resource]) throw error(404, 'Recurso no existe');
  return recursos[resource];
}

function validate(resource, body) {
  const { required } = config(resource);
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw error(400, `${field} es obligatorio`);
    }
  }
  if (resource === 'mesas' && (!Number.isInteger(Number(body.capacidad)) || Number(body.capacidad) < 1)) {
    throw error(400, 'capacidad debe ser un entero mayor a cero');
  }
}

async function list(resource, search = '') {
  const { order } = config(resource);
  const field = resource === 'mesas' ? 'CAST(numero AS TEXT) || ubicacion' : "nombre || ' ' || telefono";
  const result = await db.query(`SELECT * FROM ${resource} WHERE ${field} ILIKE $1 ORDER BY ${order}`, [`%${search}%`]);
  return result.rows;
}

async function get(resource, id) {
  config(resource);
  const result = await db.query(`SELECT * FROM ${resource} WHERE id = $1`, [id]);
  if (!result.rowCount) throw error(404, `${resource.slice(0, -1)} no existe`);
  return result.rows[0];
}

async function create(resource, body) {
  validate(resource, body);
  const { columns } = config(resource);
  const values = columns.map((key) => body[key] ?? (key === 'activa' ? true : null));
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  try {
    const result = await db.query(`INSERT INTO ${resource} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') throw error(409, 'Ya existe un registro con ese dato único');
    throw err;
  }
}

async function update(resource, id, body) {
  await get(resource, id);
  validate(resource, body);
  const { columns } = config(resource);
  const values = columns.map((key) => body[key] ?? (key === 'activa' ? true : null));
  const fields = columns.map((key, index) => `${key} = $${index + 1}`).join(', ');
  try {
    const result = await db.query(`UPDATE ${resource} SET ${fields} WHERE id = $${values.length + 1} RETURNING *`, [...values, id]);
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') throw error(409, 'Ya existe un registro con ese dato único');
    throw err;
  }
}

async function remove(resource, id) {
  await get(resource, id);
  try {
    await db.query(`DELETE FROM ${resource} WHERE id = $1`, [id]);
  } catch (err) {
    if (err.code === '23503') throw error(409, 'No se puede eliminar porque tiene reservas relacionadas');
    throw err;
  }
}

module.exports = { list, get, create, update, remove };
