<script setup>
import { createThree, webglAvailable } from '~/utils/three/core'
import { loadModel } from '~/utils/three/loadModel'
import { createCameraRig } from '~/utils/three/cameraRig'

const { webglError, loading } = useSceneState()
const root = ref(null)
let ctx = null
let model = null
let rig = null
let disposed = false

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
    const floor = model.getObjectByName('Plane_Material.002_0')
    const ceiling = model.getObjectByName('Plane.004_Material.003_0')
    let bounds = null
    if (floor) {
      bounds = new ctx.THREE.Box3().setFromObject(floor)
      if (ceiling) bounds.union(new ctx.THREE.Box3().setFromObject(ceiling))
    }

    rig = createCameraRig({ THREE: ctx.THREE, camera: ctx.camera, domElement: ctx.renderer.domElement, model, bounds })
    ctx.addTick(d => rig.update(d))
    ctx.start()
    loading.value = { active: false, progress: 100 }

    // TEMPORAL (se elimina en Task 8): logger de clicks + handle de debug
    // para mapear POIs desde el browser durante la Task 7.
    if (import.meta.dev) {
      const raycaster = new ctx.THREE.Raycaster()
      const pointer = new ctx.THREE.Vector2()
      const debugPick = (e) => {
        const r = ctx.renderer.domElement.getBoundingClientRect()
        pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
        raycaster.setFromCamera(pointer, ctx.camera)
        const hit = raycaster.intersectObjects(model.children, true)[0]
        if (hit) console.log('[poi-debug]', hit.object.name, hit.object.position)
      }
      ctx.renderer.domElement.addEventListener('click', debugPick)
      window.__loft = { ctx, model, rig }
    }
  } catch (err) {
    if (disposed) return
    console.error('Error cargando el modelo', err)
    webglError.value = true
    loading.value = { active: false, progress: 0 }
  }
})

onUnmounted(() => { disposed = true; rig?.dispose(); ctx?.dispose() })
</script>

<template>
  <div ref="root" class="absolute inset-0" />
</template>
