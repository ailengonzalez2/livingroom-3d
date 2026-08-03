export const pois = [
  {
    id: 'living',
    meshNames: [
      'node_0.001_Material.004_0',
      'node_0.005_Material.007_0',
      'node_0.006_Material.007_0',
      'node_0.007_Material.007_0'
    ],
    title: 'Living en cuero',
    description: 'El sofá y los tres sillones de cuero organizan el living alrededor de la mesa ratona. Su volumen marca el centro social del loft, con la pared de ladrillo como telón de fondo.'
  },
  {
    id: 'mesa',
    meshNames: [`Cube.002_${'�'.repeat(10)}_0`],
    title: 'Mesa ratona',
    description: 'Una mesa ratona baja, apoyada sobre una alfombra persa que aporta color y textura al piso del living. Funciona como punto de apoyo entre el sofá y los sillones.'
  },
  {
    id: 'lampara',
    meshNames: [
      'Sphere_metal_0',
      'Cube.007_ff_0',
      `Cylinder.007_${'�'.repeat(8)}_0`
    ],
    title: 'Lámpara colgante',
    description: 'Una lámpara colgante de esfera metálica desciende del techo junto a la escultura, aportando un acento de iluminación cálida sobre el rincón del busto clásico.',
    animation: 'lamp'
  },
  {
    id: 'cuadro',
    meshNames: ['Cube.003_Material.009_0'],
    title: 'Obra enmarcada',
    description: 'Una obra enmarcada cuelga sobre la pared de ladrillo expuesto, contrastando la textura rústica del muro con su marco prolijo. Un juego de luz resalta la pieza al enfocarla.',
    animation: 'tv'
  },
  {
    id: 'escultura',
    meshNames: ['node_0.008_Material.018_0', 'Cube.005_ff_0'],
    title: 'Busto clásico',
    description: 'Un busto de estilo clásico descansa sobre su pedestal, aportando un contrapunto escultórico al mobiliario contemporáneo del loft.'
  },
  {
    id: 'plantas',
    meshNames: ['node_0.004_Material.006_0'],
    title: 'Plantas de interior',
    description: 'Plantas de interior de gran porte se ubican junto al ventanal de metal negro, sumando verde natural frente a la vista de los edificios urbanos del fondo.'
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
  }
  return errors
}
