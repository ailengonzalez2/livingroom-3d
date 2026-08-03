<template>
  <div class="relative h-dvh w-full overflow-hidden bg-neutral-950">
    <ClientOnly>
      <ThreeScene />
    </ClientOnly>
    <LoadingScreen />
    <InfoPanel />
    <HudControls />
  </div>
</template>
