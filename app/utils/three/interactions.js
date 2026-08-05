// Radio de tolerancia (en px de pantalla) para rescatar clicks que pasaron
// cerca de un target extra sin acertarle. Los objetos de la mesa son diminutos
// a distancia de cámara normal —los airpods miden 6×3 px en la vista por
// defecto— así que sin esto son prácticamente inclickeables.
const SNAP_PX = 14

function isDescendantOf (obj, root) {
  let o = obj
  while (o) { if (o === root) return true; o = o.parent }
  return false
}

export function createInteractions ({ THREE, renderer, camera, scene, model, pois, onPoiClick, onMissClick, onHoverLabel }) {
  const raycaster = new THREE.Raycaster()
  const occluder = new THREE.Raycaster()
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

  // Estado de hover: la clave identifica qué está resaltado (un mesh de POI o
  // el objeto raíz de un extra) y `hoveredMeshes` son los meshes a restaurar.
  let hoveredKey = null
  let hoveredMeshes = []

  // Targets adicionales (no-POI) que reaccionan al click: shiba, airpods, laptop,
  // set de foto y cámara.
  const extras = []
  // `label` es opcional: si está, se muestra al pasar el puntero por encima.
  function addExtraTarget (object, onClick, label = null) {
    const meshes = []
    object.traverse((o) => {
      if (!o.isMesh) return
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone()
      meshes.push(o)
    })
    // Centro en espacio local, calculado una sola vez: transformarlo por la
    // matriz del objeto en cada pick es mucho más barato que rehacer un Box3
    // por movimiento del puntero, y sigue siendo correcto para objetos que se
    // mueven (el perro camina, los airpods se levantan al abrirse).
    const box = new THREE.Box3().setFromObject(object)
    const centerLocal = object.worldToLocal(box.getCenter(new THREE.Vector3()))
    extras.push({ object, onClick, meshes, centerLocal, label })
  }

  const _center = new THREE.Vector3()
  const _dir = new THREE.Vector3()

  function centerOf (entry) {
    return _center.copy(entry.centerLocal).applyMatrix4(entry.object.matrixWorld)
  }

  // ¿El objeto está realmente a la vista, o hay algo tapándolo? Sin este
  // control el snap podría enganchar un objeto detrás de una pared.
  function isVisible (entry, center) {
    _dir.copy(center).sub(camera.position).normalize()
    occluder.set(camera.position, _dir)
    const h = occluder.intersectObjects(scene.children, true)[0]
    return h ? isDescendantOf(h.object, entry.object) : false
  }

  // Extra más cercano al puntero en espacio de pantalla, dentro de SNAP_PX.
  function snapToExtra (px, py, rect) {
    let best = null
    let bestDist = SNAP_PX
    for (const entry of extras) {
      const p = centerOf(entry).clone().project(camera)
      if (p.z > 1) continue // detrás de la cámara
      const sx = (p.x + 1) / 2 * rect.width
      const sy = (-p.y + 1) / 2 * rect.height
      const d = Math.hypot(sx - px, sy - py)
      if (d < bestDist) { bestDist = d; best = entry }
    }
    // La verificación de oclusión se hace solo sobre el candidato ganador.
    return best && isVisible(best, centerOf(best)) ? best : null
  }

  function pick (e) {
    const r = dom.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    pointer.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)

    // Se raycastea la escena entera para respetar la oclusión: solo cuenta lo
    // que el usuario ve primero. Si delante del POI hay un mueble no
    // interactivo (la mesa, una pared), el click no lo atraviesa.
    const hit = raycaster.intersectObjects(scene.children, true)[0]
    if (hit) {
      if (meshToPoi.has(hit.object)) return { mesh: hit.object, extra: null }
      const extra = extras.find(en => isDescendantOf(hit.object, en.object))
      if (extra) return { mesh: null, extra }
    }
    // Nada acertado: rescate por cercanía, solo para extras. Los POIs son
    // muebles grandes y no necesitan ayuda; darles snap les haría robar clicks.
    return { mesh: null, extra: snapToExtra(px, py, r) }
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

  function setHovered (key, meshes) {
    if (key === hoveredKey) return
    for (const m of hoveredMeshes) setHighlight(m, false)
    hoveredKey = key
    hoveredMeshes = meshes
    for (const m of hoveredMeshes) setHighlight(m, true)
  }

  // Última etiqueta emitida, para no escribir el estado de Vue en cada
  // pointermove cuando no hay nada que mostrar.
  let labelShown = false
  function emitLabel (data) {
    if (!data && !labelShown) return
    labelShown = !!data
    onHoverLabel?.(data)
  }

  const onMove = (e) => {
    const { mesh, extra } = pick(e)
    setHovered(mesh ?? extra?.object ?? null, mesh ? [mesh] : (extra ? extra.meshes : []))
    dom.style.cursor = (mesh || extra) ? 'pointer' : ''
    // En touch no hay hover: la etiqueta aparecería durante el drag de órbita
    // y quedaría colgada, porque no llega ningún pointerleave que la limpie.
    const label = e.pointerType === 'touch' ? null : extra?.label
    emitLabel(label ? { text: label, x: e.clientX, y: e.clientY } : null)
  }

  const onLeave = () => {
    setHovered(null, [])
    emitLabel(null)
    dom.style.cursor = ''
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
  dom.addEventListener('pointerleave', onLeave)

  return {
    // fitToBox acepta cualquier Object3D; para POIs de varios meshes se usa el
    // primero (suele ser el cuerpo principal). Ajustar con cameraPadding si hace falta.
    getPoiObject: id => poiMeshes.get(id)?.[0] ?? null,
    // Fuerza el hover-out sin esperar al próximo pointermove. Necesario antes de
    // disparar animaciones de foco (poiAnimations): el mesh recién clickeado sigue
    // "hovered" y su emissive de highlight no debe confundirse con el estado
    // original que la animación guarda para restaurar en el blur (ver Task 10).
    clearHover () {
      setHovered(null, [])
      emitLabel(null)
      dom.style.cursor = ''
    },
    addExtraTarget,
    dispose () {
      setHovered(null, [])
      emitLabel(null)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointerleave', onLeave)
      dom.style.cursor = ''
      extras.length = 0
    }
  }
}
