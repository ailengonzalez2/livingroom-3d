export function createInteractions ({ THREE, renderer, camera, model, pois, onPoiClick, onMissClick }) {
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

  // Targets adicionales (no-POI) que reaccionan al click, ej. el shiba.
  const extras = []
  function addExtraTarget (object, onClick) {
    extras.push({ object, onClick })
  }

  function pick (e) {
    const r = dom.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)

    let bestMesh = null
    let bestExtra = null
    let bestDistance = Infinity

    const meshHit = raycaster.intersectObjects(interactive, false)[0]
    if (meshHit) { bestMesh = meshHit.object; bestDistance = meshHit.distance }

    for (const entry of extras) {
      const hit = raycaster.intersectObject(entry.object, true)[0]
      if (hit && hit.distance < bestDistance) {
        bestDistance = hit.distance
        bestExtra = entry
        bestMesh = null
      }
    }

    return { mesh: bestMesh, extra: bestExtra }
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
    const { mesh, extra } = pick(e)
    if (mesh !== hovered) {
      if (hovered) setHighlight(hovered, false)
      hovered = mesh
      if (hovered) setHighlight(hovered, true)
    }
    dom.style.cursor = (mesh || extra) ? 'pointer' : ''
  }

  // Distinguir click de drag de órbita
  let downAt = null
  const onDown = e => { downAt = [e.clientX, e.clientY] }
  const onUp = (e) => {
    if (!downAt) return
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1])
    downAt = null
    if (moved > 6) return
    const { mesh, extra } = pick(e)
    if (extra) extra.onClick()
    else if (mesh) onPoiClick(meshToPoi.get(mesh))
    else onMissClick?.()
  }

  dom.addEventListener('pointermove', onMove)
  dom.addEventListener('pointerdown', onDown)
  dom.addEventListener('pointerup', onUp)

  return {
    // fitToBox acepta cualquier Object3D; para POIs de varios meshes se usa el
    // primero (suele ser el cuerpo principal). Ajustar con cameraPadding si hace falta.
    getPoiObject: id => poiMeshes.get(id)?.[0] ?? null,
    // Fuerza el hover-out sin esperar al próximo pointermove. Necesario antes de
    // disparar animaciones de foco (poiAnimations): el mesh recién clickeado sigue
    // "hovered" y su emissive de highlight no debe confundirse con el estado
    // original que la animación guarda para restaurar en el blur (ver Task 10).
    clearHover () {
      if (hovered) setHighlight(hovered, false)
      hovered = null
      dom.style.cursor = ''
    },
    addExtraTarget,
    dispose () {
      if (hovered) setHighlight(hovered, false)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.style.cursor = ''
      extras.length = 0
    }
  }
}
