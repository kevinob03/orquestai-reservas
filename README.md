# OrquestAI Reservas

Caso 2 del Laboratorio 2: gestión de reservas de restaurante con horarios reales, React, Express, PostgreSQL/Supabase y un agente en n8n.

## Diagrama entidad-relación

```text
clientes (1) ───< reservas >─── (1) mesas
                    |
                    └── se valida contra horarios por día de semana

clientes: id, nombre, telefono, no_shows
mesas: id, numero, capacidad, ubicacion, activa
horarios: id, dia_semana, apertura, cierre
reservas: id, cliente_id, mesa_id, fecha, hora_inicio, hora_fin, personas, estado, nota
```

## Ejecutar

1. En Supabase SQL Editor ejecute `schema.sql`.
2. Copie `backend/.env.example` como `backend/.env`. Use el URI **Shared Pooler - Session mode** en `DATABASE_URL` y `DB_SSL=true`.
3. Copie `frontend/.env.example` como `frontend/.env`.
4. Terminal 1: `cd backend && npm run dev`.
5. Terminal 2: `cd frontend && npm run dev`.
6. En n8n importe `n8n/ORQUESTAI_RESERVAS_FINAL.json`, asigne la credencial DeepSeek y publique el workflow.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/mesas` | listar y crear mesas |
| GET/PUT/DELETE | `/api/mesas/:id` | detalle, edición y baja |
| GET/POST | `/api/clientes` | listar y crear clientes |
| GET/PUT/DELETE | `/api/clientes/:id` | detalle, edición y baja |
| GET/POST | `/api/reservas` | listar y crear reservas |
| GET | `/api/reservas/:id` | detalle con cliente y mesa |
| PATCH | `/api/reservas/:id/estado` | transición de estado |
| GET | `/api/disponibilidad` | mesas libres por fecha, hora y personas |
| GET | `/api/resumen` | métricas SQL |

## Reglas de negocio

- Las reservas duran 2 horas y deben caer dentro del horario de atención.
- No pueden solaparse reservas activas de una misma mesa.
- La capacidad de la mesa debe alcanzar para todas las personas.
- Estados permitidos: pendiente → confirmada → cumplida, cancelada o no_show.
- Un no_show aumenta el contador; con 3, el cliente recibe 409 y no puede reservar.
- Crear reserva y registrar no_show son transacciones.

## Pruebas

Importe `pruebas/OrquestAI.postman_collection.json` y ejecute las carpetas en orden. Incluye CRUD de mesas y clientes, disponibilidad, resumen y los casos 400, 404 y 409. La evidencia para la entrega es la colección junto con una captura de su ejecución.

## Cierre de entrega

- Verifique que `backend/.env` y `frontend/.env` no se suban al repositorio.
- En n8n, publique el workflow y luego use **Download/Export** para guardar el JSON real sin credenciales en `n8n/ORQUESTAI_RESERVAS_FINAL.json`.
- Durante la demostración muestre: CRUD, un conflicto 409 por horario/solapamiento y una consulta del agente.

## n8n

El front envía el historial al webhook. El agente usa DeepSeek y la herramienta HTTP `consultar_disponibilidad`, que consulta `GET /api/disponibilidad?fecha=YYYY-MM-DD&hora_inicio=HH:MM&personas=N`. La respuesta respeta `{ ok, data, error }`.
