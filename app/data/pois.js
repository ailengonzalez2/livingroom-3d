// Los meshNames reales se completan en la tarea de exploración de escena.
export const pois = []

export function validatePois (list) {
  const errors = []
  const ids = new Set()
  for (const p of list) {
    if (!p.id || typeof p.id !== 'string') { errors.push('POI sin id'); continue }
    if (ids.has(p.id)) errors.push(`id duplicado: ${p.id}`)
    ids.add(p.id)
    if (!Array.isArray(p.meshNames) || p.meshNames.length === 0) errors.push(`${p.id}: meshNames vacío`)
    if (!p.title) errors.push(`${p.id}: falta title`)
    if (!p.description) errors.push(`${p.id}: falta description`)
  }
  return errors
}
