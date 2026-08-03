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
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ poi.title }}</h2>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="close" />
        </div>
      </template>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ poi.description }}</p>
      <template #footer>
        <UButton icon="i-lucide-undo-2" variant="soft" block @click="close">
          Volver a la vista general
        </UButton>
      </template>
    </UCard>
  </Transition>
</template>
