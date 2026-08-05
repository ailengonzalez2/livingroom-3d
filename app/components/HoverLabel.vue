<script setup>
const { hoverLabel } = useSceneState()

// Separación vertical sobre el puntero y margen mínimo contra los bordes.
const OFFSET_Y = 18
const EDGE = 12

// El tooltip se ancla por su borde inferior centrado (translate -50%, -100%),
// así que el clamp horizontal necesita la mitad del ancho. Se mide después de
// pintar, porque depende del texto.
const el = ref(null)
const halfWidth = ref(0)
watch(() => hoverLabel.value?.text, async () => {
  await nextTick()
  halfWidth.value = el.value ? el.value.offsetWidth / 2 : 0
})

const style = computed(() => {
  const l = hoverLabel.value
  if (!l) return {}
  const maxX = (import.meta.client ? window.innerWidth : 0) - EDGE - halfWidth.value
  return {
    left: `${Math.min(Math.max(l.x, EDGE + halfWidth.value), maxX)}px`,
    top: `${Math.max(l.y - OFFSET_Y, EDGE)}px`
  }
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="hoverLabel"
      ref="el"
      class="font-display pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full
             rounded-full bg-dusk-950/75 px-3 py-1 text-[11px] tracking-[0.12em]
             whitespace-nowrap text-dusk-100 uppercase shadow-lg shadow-black/40
             ring-1 ring-white/10 backdrop-blur-md"
      :style="style"
    >
      {{ hoverLabel.text }}
    </div>
  </Transition>
</template>
