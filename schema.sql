-- OrquestAI Reservas. Ejecutar en Supabase SQL Editor.
DROP TABLE IF EXISTS reservas, horarios, clientes, mesas CASCADE;

CREATE TABLE mesas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero INT NOT NULL UNIQUE CHECK (numero > 0),
  capacidad INT NOT NULL CHECK (capacidad > 0),
  ubicacion TEXT NOT NULL CHECK (ubicacion IN ('salon', 'terraza', 'privado')),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE clientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,
  no_shows INT NOT NULL DEFAULT 0 CHECK (no_shows >= 0)
);
CREATE TABLE horarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dia_semana SMALLINT NOT NULL UNIQUE CHECK (dia_semana BETWEEN 0 AND 6),
  apertura TIME NOT NULL,
  cierre TIME NOT NULL,
  CHECK (cierre > apertura)
);
CREATE TABLE reservas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  mesa_id BIGINT NOT NULL REFERENCES mesas(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  personas INT NOT NULL CHECK (personas > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','cumplida','cancelada','no_show')),
  nota TEXT,
  CHECK (hora_fin > hora_inicio)
);

CREATE INDEX reservas_mesa_fecha_idx ON reservas (mesa_id, fecha, hora_inicio);
CREATE INDEX reservas_cliente_id_idx ON reservas (cliente_id);
INSERT INTO mesas (numero, capacidad, ubicacion) VALUES (1,2,'salon'),(2,4,'salon'),(3,4,'terraza'),(4,6,'terraza'),(5,8,'privado');
INSERT INTO clientes (nombre, telefono) VALUES ('Ana Mora','8888-1111'),('Luis Rojas','8888-2222'),('Sofía Vargas','8888-3333');
INSERT INTO horarios (dia_semana, apertura, cierre) VALUES (0,'12:00','21:00'),(1,'12:00','22:00'),(2,'12:00','22:00'),(3,'12:00','22:00'),(4,'12:00','22:00'),(5,'12:00','23:00'),(6,'12:00','23:00');

-- No se expone la Data API: Express es el único acceso de la aplicación.
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Esta aplicación accede mediante el backend; la Data API pública no expone filas.
CREATE POLICY "no_direct_client_access_mesas" ON mesas FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no_direct_client_access_clientes" ON clientes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no_direct_client_access_horarios" ON horarios FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no_direct_client_access_reservas" ON reservas FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
