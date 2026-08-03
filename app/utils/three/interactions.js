export function createInteractions ({ THREE, renderer, camera, model, pois, onPoiClick }) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const dom = renderer.domElement

  // mesh -> poiId, clonando materiales para no afectar meshes que los comparten
  const meshToPoi = new Map()
  const poiMeshes = new Map() // poiId -> THREE.Mesh[]
  for (const poi of pois) {
    const meshes = []
    for (const name of poi.meshNames) {
      const mesh = model.getObjectByName(name)
      if (!mesh) { console.warn(`POI ${poi.id}: mesh "${name}" no encontrado`); continue }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(m => m.clone())
        : mesh.material.clone()
      meshToPoi.set(mesh, poi.id)
      meshes.push(mesh)
    }
    poiMeshes.set(poi.id, meshes)
  }

  const interactive = [...meshToPoi.keys()]
  let hovered = null

  function pick (e) {
    const r = dom.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObjects(interactive, false)[0]?.object ?? null
  }

  function setHighlight (mesh, on) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!m.emissive) continue
      if (on) {
        m.userData.savedEmissive ??= m.emissive.getHex()
        m.userData.savedIntensity ??= m.emissiveIntensity
        m.emissive.setHex(0xffffff)
        m.emissiveIntensity = 0.18
      } else {
        m.emissive.setHex(m.userData.savedEmissive ?? 0x000000)
        m.emissiveIntensity = m.userData.savedIntensity ?? 1
      }
    }
  }

  const onMove = (e) => {
    const mesh = pick(e)
    if (mesh === hovered) return
    if (hovered) setHighlight(hovered, false)
    hovered = mesh
    if (hovered) setHighlight(hovered, true)
    dom.style.cursor = hovered ? 'pointer' : ''
  }

  // Distinguir click de drag de órbita
  let downAt = null
  const onDown = e => { downAt = [e.clientX, e.clientY] }
  const onUp = (e) => {
    if (!downAt) return
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1])
    downAt = null
    if (moved > 6) return
    const mesh = pick(e)
    if (mesh) onPoiClick(meshToPoi.get(mesh))
  }

  dom.addEventListener('pointermove', onMove)
  dom.addEventListener('pointerdown', onDown)
  dom.addEventListener('pointerup', onUp)

  return {
    // fitToBox acepta cualquier Object3D; para POIs de varios meshes se usa el
    // primero (suele ser el cuerpo principal). Ajustar con cameraPadding si hace falta.
    getPoiObject: id => poiMeshes.get(id)?.[0] ?? null,
    dispose () {
      if (hovered) setHighlight(hovered, false)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.style.cursor = ''
    }
  }
}
