<script setup>
import { createThree, webglAvailable } from '~/utils/three/core'
import { loadModel } from '~/utils/three/loadModel'
import { createCameraRig } from '~/utils/three/cameraRig'
import { createInteractions } from '~/utils/three/interactions'
import { poiAnimations } from '~/utils/three/poiAnimations'
import { createDog } from '~/utils/three/dog'
import { createAirpods } from '~/utils/three/airpods'
import { createAirpodsMusic } from '~/utils/three/airpodsMusic'
import { placeDecor } from '~/utils/three/decor'
import { createTableSet } from '~/utils/three/tableSet'
import { createLaptop } from '~/utils/three/laptop'
import { pois } from '~/data/pois'
import { socialLinks } from '~/data/social'
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
let airpods = null
let cup = null
let tableSet = null
let laptop = null
let airpodsMusic = null
let listener = null
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

  // Compartir el AudioContext del composable con Three, en vez de que su
  // AudioListener abra un segundo contexto en paralelo al del SFX de focus.
  ctx.THREE.AudioContext.setContext(useAudio().getContext())
  listener = new ctx.THREE.AudioListener()
  ctx.camera.add(listener)

  try {
    model = await loadModel((pct) => { loading.value = { active: true, progress: pct } })
    if (disposed) return
    ctx.scene.add(model)
    ctx.enableShadows(model)

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
      scene: ctx.scene,
      model,
      pois,
      onPoiClick: id => emitSceneAction('focusPoi', id),
      onMissClick: () => { if (activePoiId.value) emitSceneAction('resetCamera') }
    })

    // brillo de base de la lámpara colgante
    for (const name of ['Sphere_metal_0', `Cylinder007_${'�'.repeat(8)}_0`]) {
      const mesh = model.getObjectByName(name)
      if (!mesh?.material?.emissive) continue
      mesh.material.emissive.setHex(0xffd9a0)
      mesh.material.emissiveIntensity = 0.55
    }
    const esfera = model.getObjectByName('Sphere_metal_0')
    if (esfera) {
      const c = new ctx.THREE.Box3().setFromObject(esfera).getCenter(new ctx.THREE.Vector3())
      const lampBase = new ctx.THREE.PointLight(0xffc9a0, 1.3, 4, 1.8)
      lampBase.position.copy(c)
      lampBase.name = '__lamp-base'
      ctx.scene.add(lampBase)
    }

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
        ctx.enableShadows(dog.object)
        ctx.addTick(delta => dog.update(delta))
        interactions.addExtraTarget(dog.object, () => dog.jump())
      })
      .catch(err => console.warn('No se pudo cargar el shiba', err))

    createAirpods({
      THREE: ctx.THREE,
      scene: ctx.scene,
      position: new ctx.THREE.Vector3(0.27, 1.24, 0.39),
      // `airpodsMusic` ya está asignado cuando esto puede dispararse: el toggle
      // requiere un click, y el click requiere que el .then() de abajo haya corrido.
      onIntent: opening => opening ? airpodsMusic?.open() : airpodsMusic?.close()
    })
      .then((a) => {
        if (disposed) { a.dispose(); return }
        airpods = a
        ctx.enableShadows(airpods.object)
        ctx.addTick(delta => airpods.update(delta))
        interactions.addExtraTarget(airpods.object, () => airpods.toggle())

        airpodsMusic = createAirpodsMusic({ THREE: ctx.THREE, listener, object: airpods.object })
        unsubscribers.push(useAudio().onMuteChange(v => airpodsMusic?.setMuted(v)))
      })
      .catch(err => console.warn('No se pudieron cargar los airpods', err))

    placeDecor({
      THREE: ctx.THREE, scene: ctx.scene, url: '/models/cup.glb',
      position: new ctx.THREE.Vector3(0.47, 1.24, 0.68),
      targetHeight: 0.135, rotationY: Math.PI * 0.75
    }).then((obj) => { if (disposed) return; cup = obj; ctx.enableShadows(cup) })
      .catch(err => console.warn('No se pudo cargar el vaso', err))

    createTableSet({ THREE: ctx.THREE, scene: ctx.scene, position: new ctx.THREE.Vector3(0.08, 1.24, 0.70) })
      .then((t) => {
        if (disposed) { t.dispose(); return }
        tableSet = t
        ctx.enableShadows(tableSet.object)
        ctx.addTick(d => tableSet.update(d))
        interactions.addExtraTarget(tableSet.object, () => tableSet.toggle())
      })
      .catch(err => console.warn('No se pudo cargar el set de foto y cámara', err))

    createLaptop({
      THREE: ctx.THREE, scene: ctx.scene, camera: ctx.camera,
      position: new ctx.THREE.Vector3(0.30, 1.24, 0.10),
      rotationY: Math.PI * 0.3
    })
      .then((l) => {
        if (disposed) { l.dispose(); return }
        laptop = l
        ctx.enableShadows(laptop.object)
        ctx.addTick(d => laptop.update(d))
        interactions.addExtraTarget(laptop.object, () => laptop.toggle())

        for (const t of laptop.iconTargets) {
          const url = socialLinks[t.kind]
          if (!url) continue
          interactions.addExtraTarget(t.object, () => window.open(url, '_blank', 'noopener,noreferrer'))
        }
      })
      .catch(err => console.warn('No se pudo cargar la laptop', err))

    const meshesOf = poi => poi ? poi.meshNames.map(n => model.getObjectByName(n)).filter(Boolean) : []

    unsubscribers.push(onSceneAction('focusPoi', async (id) => {
      // Guard de re-entrada: con un POI enfocado la cámara sigue habilitada
      // (se puede orbitar/zoomear sobre el objeto), así que un segundo
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
      const poi = pois.find(p => p.id === id)
      poiAnimations[poi?.animation]?.onFocus({ THREE: ctx.THREE, scene: ctx.scene, meshes: meshesOf(poi) })
      await rig.focusObject(obj, poi?.cameraPadding)
    }))

    function closePoi () {
      const prev = pois.find(p => p.id === activePoiId.value)
      poiAnimations[prev?.animation]?.onBlur({ THREE: ctx.THREE, scene: ctx.scene, meshes: meshesOf(prev) })
      activePoiId.value = null
    }

    function releaseFocus () {
      closePoi()
      rig.clearFocusDistance()
    }

    unsubscribers.push(onSceneAction('resetCamera', async () => {
      closePoi()
      await rig.reset()
    }))

    ctx.addTick(() => { if (activePoiId.value && rig.isZoomedOut()) releaseFocus() })

    // Handle de verificación en dev (import.meta.dev: no llega al build de prod).
    if (import.meta.dev) { window.__loft = { ctx, model, rig, interactions, getDog: () => dog, getAirpods: () => airpods, getCup: () => cup, getTableSet: () => tableSet, getLaptop: () => laptop, getAirpodsMusic: () => airpodsMusic } }
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
  airpodsMusic?.dispose()
  listener?.removeFromParent()
  interactions?.dispose()
  rig?.dispose()
  dog?.dispose()
  airpods?.dispose()
  tableSet?.dispose()
  laptop?.dispose()
  ctx?.dispose()
})
</script>

<template>
  <div ref="root" class="absolute inset-0" />
</template>
