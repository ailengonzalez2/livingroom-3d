<script setup>
import { createThree, webglAvailable } from '~/utils/three/core'
import { loadModel } from '~/utils/three/loadModel'

const { webglError, loading } = useSceneState()
const root = ref(null)
let ctx = null
let model = null

onMounted(async () => {
  if (!webglAvailable()) {
    webglError.value = true
    loading.value = { active: false, progress: 0 }
    return
  }
  ctx = createThree(root.value)

  try {
    model = await loadModel((pct) => { loading.value = { active: true, progress: pct } })
    ctx.scene.add(model)
    ctx.start()
    loading.value = { active: false, progress: 100 }
  } catch (err) {
    console.error('Error cargando el modelo', err)
    webglError.value = true
    loading.value = { active: false, progress: 0 }
  }
})

onUnmounted(() => ctx?.dispose())
</script>

<template>
  <div ref="root" class="absolute inset-0" />
</template>
