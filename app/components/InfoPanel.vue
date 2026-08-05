<script setup>
import { pois } from '~/data/pois'
import { emitSceneAction } from '~/utils/sceneBus'

const { activePoiId } = useSceneState()
const poi = computed(() => pois.find(p => p.id === activePoiId.value) ?? null)

function close () { emitSceneAction('resetCamera') }

function onKey (e) { if (e.key === 'Escape' && activePoiId.value) close() }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-300" enter-from-class="translate-x-6 opacity-0"
    leave-active-class="transition duration-200" leave-to-class="translate-x-6 opacity-0"
  >
    <UCard
      v-if="poi"
      class="absolute top-4 right-4 z-10 w-80 max-w-[calc(100vw-2rem)] backdrop-blur"
    >
      <template #header>
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <!-- Dato duro arriba para escanear rápido; el título es el capítulo. -->
            <p v-if="poi.meta" class="text-xs text-neutral-400 dark:text-neutral-500">{{ poi.meta }}</p>
            <h2 class="text-base font-semibold">{{ poi.title }}</h2>
          </div>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" aria-label="Cerrar panel" @click="close" />
        </div>
      </template>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ poi.description }}</p>
    </UCard>
  </Transition>
</template>
