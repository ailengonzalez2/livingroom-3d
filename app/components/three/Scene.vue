<script setup>
import { createThree, webglAvailable } from '~/utils/three/core'

const { webglError, loading } = useSceneState()
const root = ref(null)
let ctx = null

onMounted(() => {
  if (!webglAvailable()) {
    webglError.value = true
    loading.value = { active: false, progress: 0 }
    return
  }
  ctx = createThree(root.value)
  // Cubo temporal para verificar el render; se reemplaza por el modelo en la próxima tarea.
  const cube = new ctx.THREE.Mesh(
    new ctx.THREE.BoxGeometry(1, 1, 1),
    new ctx.THREE.MeshStandardMaterial({ color: '#22c55e' })
  )
  ctx.scene.add(cube)
  ctx.addTick(d => { cube.rotation.y += d })
  ctx.start()
  loading.value = { active: false, progress: 100 }
})

onUnmounted(() => ctx?.dispose())
</script>

<template>
  <div ref="root" class="absolute inset-0" />
</template>
