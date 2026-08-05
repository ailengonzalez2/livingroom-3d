// Íconos de marca generados proceduralmente para enlazar a los perfiles
// del usuario. Discos estilo "moneda" para combinar con el modelo de Telegram.
//
// `lighting` describe cómo se comporta el material de las tapas bajo la luz
// cálida de la escena:
// - linkedin: emissive del color de marca a baja intensidad (look de hoy).
// - x: el propio glifo emite luz vía emissiveMap (el fondo negro del mapa no
//   emite), así el contraste blanco-sobre-negro se mantiene con cualquier
//   iluminación sin lavar el disco entero como pasaría con un emissive plano.
const BRAND = {
  linkedin: {
    bg: '#0A66C2',
    draw: drawLinkedIn,
    lighting: { emissive: '#0A66C2', emissiveIntensity: 0.25, roughness: 0.35, emissiveMap: false }
  },
  x: {
    bg: '#050505',
    draw: drawX,
    lighting: { emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.85, emissiveMap: true }
  }
}

function drawLinkedIn (g, s) {
  g.fillStyle = '#0A66C2'
  g.fillRect(0, 0, s, s)
  g.fillStyle = '#ffffff'
  g.font = `bold ${Math.round(s * 0.58)}px Helvetica, Arial, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('in', s * 0.5, s * 0.55)
}

// Glifo oficial de X (path del set de marca, viewBox 24×24): trazos de grosor
// variable y extremos cortados, no una equis simétrica.
const X_PATH = 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z'

function drawX (g, s) {
  g.fillStyle = '#000000'
  g.fillRect(0, 0, s, s)
  g.fillStyle = '#ffffff'
  const k = s * 0.46 / 24
  g.save()
  g.translate(s / 2 - 12 * k, s / 2 - 12 * k)
  g.scale(k, k)
  g.fill(new Path2D(X_PATH), 'evenodd')   // evenodd: deja el hueco interno del glifo
  g.restore()
}

export function createSocialIcon ({ THREE, kind }) {
  const brand = BRAND[kind]
  if (!brand) throw new Error(`createSocialIcon: marca desconocida "${kind}"`)

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const g = canvas.getContext('2d')
  brand.draw(g, 512)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.center.set(0.5, 0.5)
  tex.rotation = Math.PI / 2

  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.16, 64)
  // orden de grupos de CylinderGeometry: [lateral, tapa superior, tapa inferior]
  const sideMat = new THREE.MeshStandardMaterial({ color: brand.bg, roughness: 0.45 })
  const { lighting } = brand
  const capMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: lighting.roughness,
    emissive: new THREE.Color(lighting.emissive),
    emissiveIntensity: lighting.emissiveIntensity,
    ...(lighting.emissiveMap ? { emissiveMap: tex } : {})
  })
  const materials = [sideMat, capMat, capMat]

  const mesh = new THREE.Mesh(geometry, materials)
  mesh.rotation.x = Math.PI / 2

  const group = new THREE.Group()
  group.add(mesh)

  return group
}

export function disposeSocialIcon (group) {
  group.traverse((o) => {
    if (!o.isMesh) return
    o.geometry?.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!m) continue
      if (m.map) m.map.dispose()
      if (m.emissiveMap && m.emissiveMap !== m.map) m.emissiveMap.dispose()
      m.dispose?.()
    }
  })
  group.removeFromParent()
}
