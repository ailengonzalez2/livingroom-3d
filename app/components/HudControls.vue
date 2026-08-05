<script setup>
import { emitSceneAction } from '~/utils/sceneBus'

const { activePoiId, muted, loading } = useSceneState()
const { toggleMute } = useAudio()
</script>

<template>
  <div v-if="!loading.active" class="absolute bottom-4 left-4 z-10 flex items-center gap-2">
    <UButton
      v-if="activePoiId"
      icon="i-lucide-house" variant="soft" color="neutral"
      @click="emitSceneAction('resetCamera')"
    >
      Vista general
    </UButton>
    <UButton
      :icon="muted ? 'i-lucide-volume-off' : 'i-lucide-volume-2'"
      variant="soft" color="neutral" square
      :aria-label="muted ? 'Activar sonido' : 'Silenciar'"
      @click="toggleMute()"
    />
    <UPopover>
      <UButton icon="i-lucide-circle-help" variant="soft" color="neutral" square aria-label="Ayuda" />
      <template #content>
        <div class="max-w-60 p-3 text-xs text-neutral-500 dark:text-neutral-400">
          Arrastrá para orbitar y usá la rueda para acercarte. Todo lo que se
          ilumina al pasarle el mouse se puede clickear: los muebles abren un
          panel, y las cosas sobre la mesa —y el perro— hacen otras cosas.
          Para salir de un objeto, alejate con la rueda.
        </div>
      </template>
    </UPopover>
  </div>
</template>
