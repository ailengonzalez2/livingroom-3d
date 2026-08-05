<script setup>
import { pois } from '~/data/pois'
import { emitSceneAction } from '~/utils/sceneBus'

const { activePoiId } = useSceneState()
const poi = computed(() => pois.find(p => p.id === activePoiId.value) ?? null)

// "01 / 05": además de ordenar, le avisa al visitante cuántos capítulos hay.
// Sin esto no tiene forma de saber que la escena esconde cinco.
const total = String(pois.length).padStart(2, '0')
const index = computed(() => {
  const i = pois.findIndex(p => p.id === activePoiId.value)
  return i < 0 ? '' : String(i + 1).padStart(2, '0')
})

function close () { emitSceneAction('resetCamera') }

function onKey (e) { if (e.key === 'Escape' && activePoiId.value) close() }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95 blur-sm"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="opacity-0 scale-95 blur-sm"
  >
    <div
      v-if="poi"
      class="absolute top-4 right-4 z-10 w-[21rem] max-w-[calc(100vw-2rem)] origin-top-right
             overflow-hidden rounded-xl bg-dusk-950/70 shadow-2xl shadow-black/50
             ring-1 ring-white/10 backdrop-blur-xl"
    >
      <!-- Filete de acento: la lámpara del loft, reducida a una línea. -->
      <div class="h-px bg-gradient-to-r from-amber-300/80 via-amber-300/20 to-transparent" />
      <!-- Luz cálida cayendo desde arriba, como el reflejo del atardecer sobre el vidrio. -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-200/[0.07] to-transparent" />

      <div class="relative p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono text-[11px] tracking-[0.2em] text-amber-300/80 tabular-nums">
              {{ index }} / {{ total }}
            </p>
            <h2 class="mt-2 text-lg leading-snug font-semibold tracking-tight text-dusk-50">
              {{ poi.title }}
            </h2>
            <!-- El ámbar queda reservado para el índice y el filete; si el meta
                 también es ámbar los dos compiten y el tono se ensucia. -->
            <p v-if="poi.meta" class="mt-1.5 text-xs tracking-wide text-dusk-400">
              {{ poi.meta }}
            </p>
          </div>
          <UButton
            icon="i-lucide-x" variant="ghost" color="neutral" size="sm"
            class="-mt-1 -mr-1 shrink-0" aria-label="Cerrar panel" @click="close"
          />
        </div>
        <p class="mt-4 text-sm leading-relaxed text-dusk-200">{{ poi.description }}</p>
      </div>
    </div>
  </Transition>
</template>
