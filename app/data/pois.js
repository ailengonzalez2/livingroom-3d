// Cada POI es un capítulo sobre Ailen, anclado al objeto del loft que mejor le
// pega. El objeto es el gancho; el contenido es la persona. `meta` es la línea
// de dato duro que se escanea rápido, `description` va en primera persona.
export const pois = [
  {
    id: 'living',
    meshNames: [
      'node_0001_Material004_0',
      'node_0005_Material007_0',
      'node_0006_Material007_0',
      'node_0007_Material007_0'
    ],
    title: 'Cómo trabajo',
    meta: 'Remoto · Scrum y Kanban · Inglés C1',
    description: 'Más de 20 productos entregados para startups y agencias, siempre con equipos repartidos en varios husos horarios: developers, diseñadores y stakeholders. Cinco años de remoto me enseñaron que la mitad del trabajo es dejar por escrito lo que se decidió.'
  },
  // La mesa ratona no es un POI: sostiene los objetos interactivos (laptop,
  // airpods, foto y cámara) y clickearla competía con ellos.
  {
    id: 'lampara',
    meshNames: [
      'Sphere_metal_0',
      'Cube007_ff_0',
      `Cylinder007_${'�'.repeat(8)}_0`
    ],
    title: 'El stack',
    meta: 'Vue · Nuxt · TypeScript · Tailwind',
    description: 'Vue y Nuxt son mi terreno principal. También construyo interfaces Web3 con integración de wallets, y automatizaciones con n8n para sacarme de encima el trabajo repetitivo. Este loft está hecho con Nuxt y Three.js, si tenías la duda.',
    animation: 'lamp'
  },
  {
    id: 'cuadro',
    meshNames: ['Cube003_Material009_0'],
    title: 'El lado de diseño',
    meta: 'Figma · Design systems · User research',
    description: 'Antes de que exista una línea de código hago research, arquitectura de información y prototipos. Diseñar y programar la misma pieza me deja cerrar el ciclo sin traducciones de por medio, y sin lo que siempre se pierde en esa traducción.',
    animation: 'tv'
  },
  {
    id: 'escultura',
    meshNames: ['node_0008_Material018_0', 'Cube005_ff_0'],
    title: 'De la guardia al código',
    meta: 'Cambio de carrera · 2021',
    description: 'Soy Ailen Gonzalez, Product Designer y Frontend Developer. Hasta 2021 trabajé en medicina de emergencias. Decidir rápido con información incompleta resultó ser la misma habilidad que necesito acá: entender el problema real antes de escribir la solución.'
  },
  {
    id: 'plantas',
    meshNames: ['node_0004_Material006_0'],
    title: 'Dónde estoy',
    meta: 'Córdoba, Argentina',
    description: 'Vivo en Córdoba y trabajo remoto para equipos de donde sea. Si algo de lo que viste te sirve, los discos que flotan por el loft llevan a mi LinkedIn, mi X y mi Telegram. También podés escribirme a ailengonzalez21.ag@gmail.com.'
  }
]

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
    if (!p.meta) errors.push(`${p.id}: falta meta`)
  }
  return errors
}
