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
        <div class="max-w-72 p-3 text-xs text-neutral-500 dark:text-neutral-400">
          <p>
            Arrastrá para orbitar y usá la rueda para acercarte. Todo lo que se
            ilumina al pasarle el mouse se puede clickear: los muebles abren un
            panel, y las cosas sobre la mesa —y el perro— hacen otras cosas.
            Para salir de un objeto, alejate con la rueda.
          </p>
          <!-- Varios modelos son CC-BY-4.0: el crédito es obligatorio donde se
               publica la obra, no solo en el repo. -->
          <hr class="my-2 border-neutral-200 dark:border-neutral-800">
          <p class="text-[11px] leading-relaxed">
            Modelos de Sketchfab por
            <a class="underline" href="https://sketchfab.com/dasy444" target="_blank" rel="noopener">dasy444</a>,
            <a class="underline" href="https://sketchfab.com/jedlas012" target="_blank" rel="noopener">Jed Falcone</a>,
            <a class="underline" href="https://sketchfab.com/Metazeon" target="_blank" rel="noopener">Metazeon</a>,
            <a class="underline" href="https://sketchfab.com/edoardogalati" target="_blank" rel="noopener">Edoardo Galati</a>,
            <a class="underline" href="https://sketchfab.com/Eliplayslive" target="_blank" rel="noopener">Eliplays</a>,
            <a class="underline" href="https://sketchfab.com/albert_victory" target="_blank" rel="noopener">AlbertVictory</a> y
            <a class="underline" href="https://sketchfab.com/Gonsaku" target="_blank" rel="noopener">Gonsaku</a>
            (CC-BY-4.0 y licencia estándar de Sketchfab). Shiba de
            <a class="underline" href="https://quaternius.com/" target="_blank" rel="noopener">Quaternius</a> (CC0).
            Música: "Soft Gold Sky",
            <a class="underline" href="https://github.com/btahir/open-lofi" target="_blank" rel="noopener">OpenLo-Fi</a> (CC0).
          </p>
        </div>
      </template>
    </UPopover>
  </div>
</template>
