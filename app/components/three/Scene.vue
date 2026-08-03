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
    rig = createCameraRig({ THREE: ctx.THREE, camera: ctx.camera, domElement: ctx.renderer.domElement, model })
    ctx.addTick(d => rig.update(d))
    ctx.start()
    loading.value = { active: false, progress: 100 }
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
