<script setup>
import { createThree, webglAvailable } from '~/utils/three/core'
import { loadModel } from '~/utils/three/loadModel'
import { createCameraRig } from '~/utils/three/cameraRig'
import { createInteractions } from '~/utils/three/interactions'
import { pois } from '~/data/pois'
import { onSceneAction, emitSceneAction } from '~/utils/sceneBus'

const { activePoiId, webglError, loading } = useSceneState()
const root = ref(null)
let ctx = null
let model = null
let rig = null
let interactions = null
let disposed = false
const unsubscribers = []

onMounted(async () => {
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
      onPoiClick: id => emitSceneAction('focusPoi', id)
    })

    unsubscribers.push(onSceneAction('focusPoi', async (id) => {
      const obj = interactions.getPoiObject(id)
      if (!obj) return
      activePoiId.value = id
      rig.setEnabled(false)
      const poi = pois.find(p => p.id === id)
      await rig.focusObject(obj, poi?.cameraPadding)
    }))

    unsubscribers.push(onSceneAction('resetCamera', async () => {
      activePoiId.value = null
      await rig.reset()
      rig.setEnabled(true)
    }))

    // dev-only: acceso manual desde el browser para verificación visual
    // (el tab suele quedar hidden y no corre rAF; se fuerzan renders manuales).
    // Se elimina en la Task 12.
    if (import.meta.dev) {
      window.__loft = { ctx, model, rig, interactions }
    }
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
  interactions?.dispose()
  rig?.dispose()
  ctx?.dispose()
})
</script>

<template>
  <div ref="root" class="absolute inset-0" />
</template>
