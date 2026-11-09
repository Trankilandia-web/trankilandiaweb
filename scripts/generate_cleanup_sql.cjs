const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'realMembers.json');
const members = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const idList = members.map((m) => `'${m.id}'`).join(', ');

const sql = `-- ==============================================================================
-- TRANKILANDIA GYM · PURGA DE 156 REGISTROS ANTIGUOS OBSOLETOS
-- ==============================================================================
-- Deja la base de datos de Supabase en exactamente los 417 socios oficiales y actuales.

-- 1. Eliminar referencias en tablas secundarias de pruebas antiguas
DELETE FROM public.asistencias WHERE socio_id NOT IN (${idList});
DELETE FROM public.ingresos WHERE key_socio IS NOT NULL AND key_socio NOT IN (${idList});
DELETE FROM public.rutinas WHERE member_id NOT IN (${idList});
DELETE FROM public.progresos WHERE member_id NOT IN (${idList});

-- 2. Eliminar los socios antiguos de hace dos semanas que no existen en Gym.xlsm
DELETE FROM public.socios WHERE id NOT IN (${idList});

-- 3. Verificación final: debe dar EXACTAMENTE 417
SELECT count(*) as total_socios_oficiales FROM public.socios;
`;

const outPath = path.join(__dirname, '..', 'supabase', 'limpiar_socios_antiguos.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`✅ Generado ${outPath} con ${members.length} IDs.`);
