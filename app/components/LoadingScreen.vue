<script setup>
const { loading, webglError } = useSceneState()
</script>

<template>
  <Transition
    leave-active-class="transition-opacity duration-700"
    leave-to-class="opacity-0"
  >
    <div
      v-if="loading.active || webglError"
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-neutral-950"
    >
      <template v-if="webglError">
        <UIcon name="i-lucide-monitor-x" class="size-10 text-neutral-400" />
        <p class="max-w-xs text-center text-sm text-neutral-300">
          Tu navegador no puede mostrar esta experiencia 3D. Probá con una
          versión reciente de Chrome, Firefox o Safari.
        </p>
      </template>
      <template v-else>
        <p class="text-sm tracking-widest text-neutral-400 uppercase">Cargando el loft</p>
        <UProgress :model-value="loading.progress" class="w-56" />
      </template>
    </div>
  </Transition>
</template>
