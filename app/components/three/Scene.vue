<script setup>
import { createThree, webglAvailable } from '~/utils/three/core'
import { loadModel } from '~/utils/three/loadModel'
import { createCameraRig } from '~/utils/three/cameraRig'
import { createInteractions } from '~/utils/three/interactions'
import { poiAnimations } from '~/utils/three/poiAnimations'
import { createDog } from '~/utils/three/dog'
import { pois } from '~/data/pois'
import { onSceneAction, emitSceneAction } from '~/utils/sceneBus'

const WAYPOINTS = [
  [2.3, 0.4],    // derecha de la mesa
  [1.4, 1.15],   // cruce por delante del sillón del fondo
  [0.15, 1.1],   // frente del sillón del fondo, detrás de la mesa
  [-0.31, 1.02], // esquina noroeste de la mesa
  [-0.31, -0.45],// pasillo entre el sofá y la mesa, hacia el sur
  [1.5, -0.45]   // por delante de los sillones de la ventana
]

const CHAIR_MESHES = ['node_0005_Material007_0', 'node_0006_Material007_0', 'node_0007_Material007_0']

const { activePoiId, webglError, loading } = useSceneState()
const root = ref(null)
let ctx = null
let model = null
let rig = null
let interactions = null
let dog = null
let disposed = false
let onWheel = null
const unsubscribers = []

onMounted(async () => {
  useAudio().initOnFirstGesture()

  if (!webglAvailable()) {
    webglError.value = true
    loading.value = { active: false, progress: 0 }
    return
  }
  ctx = createThree(root.value)

  try {
    model = await loadModel((pct) => { loading.value = { active: true, progress: pct } })
    if (disposed) return
    ctx.scene.add(model)

    // Bounds del interior del loft (piso + cielorraso), para no incluir los
    // edificios exteriores del fondo al calcular límites/encuadre de cámara.
    const floor = model.getObjectByName('Plane_Material002_0')
    const ceiling = model.getObjectByName('Plane004_Material003_0')
    let bounds = null
    if (floor) {
      bounds = new ctx.THREE.Box3().setFromObject(floor)
      if (ceiling) bounds.union(new ctx.THREE.Box3().setFromObject(ceiling))
    }

    rig = createCameraRig({ THREE: ctx.THREE, camera: ctx.camera, domElement: ctx.renderer.domElement, model, bounds })
    ctx.addTick(d => rig.update(d))
    ctx.start()
    loading.value = { active: false, progress: 100 }

    interactions = createInteractions({
      THREE: ctx.THREE,
      renderer: ctx.renderer,
      camera: ctx.camera,
      model,
      pois,
      onPoiClick: id => emitSceneAction('focusPoi', id),
      onMissClick: () => { if (activePoiId.value) emitSceneAction('resetCamera') }
    })

    let lastScroll = 0
    onWheel = () => { lastScroll = performance.now() }
    ctx.renderer.domElement.addEventListener('wheel', onWheel, { passive: true })
    ctx.addTick(() => { dog?.setWalking(performance.now() - lastScroll < 600) })

    const floorTopY = bounds ? bounds.min.y + 0.01 : 0.92

    const chairs = CHAIR_MESHES.map((name) => {
      const mesh = model.getObjectByName(name)
      if (!mesh) return null
      const box = new ctx.THREE.Box3().setFromObject(mesh)
      const c = box.getCenter(new ctx.THREE.Vector3())
      const seatY = box.min.y + (box.max.y - box.min.y) * 0.45
      const center = new ctx.THREE.Vector3(c.x, seatY, c.z)
      // punto de bajada: alejado del centro del living (mesa en ~[0.27, 0.39]) para caer en piso libre
      const away = new ctx.THREE.Vector3(c.x - 0.27, 0, c.z - 0.39).normalize().multiplyScalar(0.8)
      const dismount = new ctx.THREE.Vector3(c.x + away.x, floorTopY, c.z + away.z)
      return { position: center, dismount }
    }).filter(Boolean)

    createDog({ THREE: ctx.THREE, scene: ctx.scene, floorY: floorTopY, waypoints: WAYPOINTS, chairs })
      .then((d) => {
        if (disposed) { d.dispose(); return }
        dog = d
        ctx.addTick(delta => dog.update(delta))
        interactions.addExtraTarget(dog.object, () => dog.jump())
      })
      .catch(err => console.warn('No se pudo cargar el shiba', err))

    const meshesOf = poi => poi ? poi.meshNames.map(n => model.getObjectByName(n)).filter(Boolean) : []

    unsubscribers.push(onSceneAction('focusPoi', async (id) => {
      // Guard de re-entrada: el canvas sigue clickeable con un POI enfocado
      // (setEnabled(false) solo apaga CameraControls), así que un segundo
      // click sobre el mismo POI no debe re-disparar onFocus.
      if (id === activePoiId.value) return
      const obj = interactions.getPoiObject(id)
      if (!obj) return
      useAudio().playFocusSfx()
      // Los meshes del POI clickeado están hovered por definición: se limpia el
      // highlight antes de onFocus para que este no lo capture como estado
      // "original" a restaurar en el blur (ver nota en interactions.clearHover).
      interactions.clearHover()
      // Si había otro POI activo (click directo a un POI sin pasar por
      // resetCamera), hay que blurearlo antes de pisar activePoiId.value:
      // si no, su animación queda huérfana (luz/emissive sin restaurar).
      if (activePoiId.value) {
        const prevPoi = pois.find(p => p.id === activePoiId.value)
        poiAnimations[prevPoi?.animation]?.onBlur({ THREE: ctx.THREE, scene: ctx.scene, meshes: meshesOf(prevPoi) })
      }
      activePoiId.value = id
      rig.setEnabled(false)
      const poi = pois.find(p => p.id === id)
      poiAnimations[poi?.animation]?.onFocus({ THREE: ctx.THREE, scene: ctx.scene, meshes: meshesOf(poi) })
      await rig.focusObject(obj, poi?.cameraPadding)
    }))

    unsubscribers.push(onSceneAction('resetCamera', async () => {
      const prev = pois.find(p => p.id === activePoiId.value)
      poiAnimations[prev?.animation]?.onBlur({ THREE: ctx.THREE, scene: ctx.scene, meshes: meshesOf(prev) })
      activePoiId.value = null
      await rig.reset()
      rig.setEnabled(true)
    }))

    // Handle de verificación en dev (import.meta.dev: no llega al build de prod).
    if (import.meta.dev) { window.__loft = { ctx, model, rig, interactions, getDog: () => dog } }
  } catch (err) {
    if (disposed) return
    console.error('Error cargando el modelo', err)
    webglError.value = true
    loading.value = { active: false, progress: 0 }
  }
})

onUnmounted(() => {
  disposed = true
  unsubscribers.splice(0).forEach(unsub => unsub())
  if (onWheel) ctx?.renderer?.domElement?.removeEventListener('wheel', onWheel)
  interactions?.dispose()
  rig?.dispose()
  dog?.dispose()
  ctx?.dispose()
})
</script>

<template>
  <div ref="root" class="absolute inset-0" />
</template>
