// Íconos de marca generados proceduralmente para enlazar a los perfiles
// del usuario. Discos estilo "moneda" para combinar con el modelo de Telegram.
const BRAND = {
  linkedin: { bg: '#0A66C2', draw: drawLinkedIn },
  x: { bg: '#000000', draw: drawX }
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

function drawX (g, s) {
  g.fillStyle = '#000000'
  g.fillRect(0, 0, s, s)
  g.strokeStyle = '#ffffff'
  g.lineWidth = s * 0.115
  g.lineCap = 'butt'
  const a = s * 0.29, b = s * 0.71
  g.beginPath()
  g.moveTo(a, a); g.lineTo(b, b)
  g.moveTo(b, a); g.lineTo(a, b)
  g.stroke()
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
  const capMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.35,
    emissive: new THREE.Color(brand.bg),
    emissiveIntensity: 0.25
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
      m.dispose?.()
    }
  })
  group.removeFromParent()
}
