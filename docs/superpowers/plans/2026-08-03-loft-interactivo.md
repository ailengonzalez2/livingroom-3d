# Loft interactivo 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Experiencia web interactiva de un loft 3D con órbita limitada, zoom cinemático a objetos clickeables, panel de información, animaciones y sonido.

**Architecture:** Three.js imperativo encapsulado en módulos JS puros (`utils/three/`), orquestados por un único componente `Scene.vue`. La UI (Nuxt UI 4) nunca importa Three; se comunica vía `useSceneState` (estado) y `sceneBus` (acciones). El modelo GLTF se optimiza offline a un GLB con Draco+WebP.

**Tech Stack:** Nuxt 4, Nuxt UI 4 (incluye Tailwind 4), three, camera-controls, @gltf-transform/cli (dev), vitest (dev).

## Global Constraints

- **JavaScript only** — ningún archivo `.ts`; `nuxt.config.js`, no `nuxt.config.ts`.
- **npm** como package manager (no bun, no pnpm).
- **Commits:** solo si el usuario aprobó commitear al inicio de la ejecución (preferencia registrada: nunca commitear sin pedido explícito). Si no aprobó, saltear los pasos "Commit" — el resto del plan no depende de ellos.
- La UI HTML no importa `three` ni `camera-controls`; solo `useSceneState` + `sceneBus`.
- Todo recurso Three (renderer, geometrías, materiales, listeners, RAF) se libera en `onUnmounted`.
- Los archivos fuente del modelo viven en `model-source/` y **no** se sirven; la app solo carga `public/models/loft.glb`.
- Spec de referencia: `docs/superpowers/specs/2026-08-03-loft-interactivo-design.md`.
- Ajuste al spec (aprobar en ejecución): los sfx se sintetizan con Web Audio (sin assets); el loop ambiente se carga desde `public/audio/ambient.mp3` **solo si existe** — no hay fuente de audio con licencia clara para incluir uno.

---

### Task 1: Scaffold del proyecto Nuxt

**Files:**
- Move: `scene.gltf`, `scene.bin`, `textures/`, `license.txt`, `loft2_free_interior.zip` → `model-source/`
- Create: `package.json`, `nuxt.config.js`, `.gitignore`, `app/app.vue`, `app/assets/css/main.css`, `app/pages/index.vue`

**Interfaces:**
- Produces: proyecto Nuxt 4 corriendo con `npm run dev`; página `/` con contenedor full-screen `#scene-root` donde Task 4 monta el canvas.

- [ ] **Step 1: Mover los archivos del modelo a `model-source/`**

```bash
cd /Users/Ailen/Documentos/code/livingroom-3d
mkdir -p model-source
mv scene.gltf scene.bin textures license.txt loft2_free_interior.zip model-source/
```

- [ ] **Step 2: Crear `package.json`**

```json
{
  "name": "livingroom-3d",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "test": "vitest run",
    "optimize-model": "gltf-transform optimize model-source/scene.gltf public/models/loft.glb --compress draco --texture-compress webp"
  }
}
```

- [ ] **Step 3: Instalar dependencias**

```bash
npm install nuxt @nuxt/ui three camera-controls
npm install -D vitest @gltf-transform/cli
```

- [ ] **Step 4: Crear `nuxt.config.js`**

```js
export default defineNuxtConfig({
  compatibilityDate: '2026-08-03',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Loft interactivo',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  }
})
```

- [ ] **Step 5: Crear `app/assets/css/main.css`**

```css
@import "tailwindcss";
@import "@nuxt/ui";
```

- [ ] **Step 6: Crear `app/app.vue`**

```vue
<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
```

- [ ] **Step 7: Crear `app/pages/index.vue` (placeholder de esta tarea)**

```vue
<template>
  <div class="relative h-dvh w-full overflow-hidden bg-neutral-950">
    <div id="scene-root" class="absolute inset-0" />
  </div>
</template>
```

- [ ] **Step 8: Crear `.gitignore`**

```
node_modules
.nuxt
.output
dist
.DS_Store
*.log
```

- [ ] **Step 9: Verificar que el dev server levanta**

Run: `npm run dev` (background) y `curl -s http://localhost:3000 | head -5`
Expected: HTML de Nuxt sin errores en la consola del server. Matar el server después.

- [ ] **Step 10: Commit**

```bash
git init -b main
git add -A
git commit -m "feat: scaffold Nuxt 4 + Nuxt UI, modelo fuente en model-source/"
```

---

### Task 2: Pipeline del modelo (GLB optimizado + decoder Draco)

**Files:**
- Create: `public/models/loft.glb` (generado), `public/draco/` (copiado de three)

**Interfaces:**
- Produces: `public/models/loft.glb` (< 10 MB) cargable con `GLTFLoader` + `DRACOLoader` apuntando a `/draco/`.

- [ ] **Step 1: Generar el GLB optimizado**

```bash
npm run optimize-model
```

Expected: crea `public/models/loft.glb`. Si `--texture-compress webp` falla por dependencias de sharp, reintentar sin ese flag y reportar el tamaño resultante.

- [ ] **Step 2: Verificar tamaño y contenido**

```bash
ls -lh public/models/loft.glb
npx gltf-transform inspect public/models/loft.glb | head -40
```

Expected: tamaño entre 2 y 10 MB; el inspect lista ~40 meshes y extensión `KHR_draco_mesh_compression`.

- [ ] **Step 3: Copiar el decoder Draco que incluye three**

```bash
mkdir -p public/draco
cp node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/
ls public/draco
```

Expected: `draco_decoder.js`, `draco_decoder.wasm`, `draco_wasm_wrapper.js`.

- [ ] **Step 4: Commit**

```bash
git add public/models public/draco
git commit -m "feat: modelo optimizado a GLB (draco+webp) y decoder draco local"
```

---

### Task 3: Datos de POIs + estado compartido (con tests)

**Files:**
- Create: `app/data/pois.js`, `app/composables/useSceneState.js`, `app/utils/sceneBus.js`, `tests/pois.test.js`, `vitest.config.js`

**Interfaces:**
- Produces:
  - `pois: Array<{id, meshNames: string[], title, description, animation?: string, cameraPadding?: number}>` y `validatePois(list) => string[]` desde `app/data/pois.js`.
  - `useSceneState() => { activePoiId: Ref<string|null>, loading: Ref<{active:boolean, progress:number}>, muted: Ref<boolean>, webglError: Ref<boolean> }`.
  - `onSceneAction(name, fn)` / `emitSceneAction(name, ...args)` desde `app/utils/sceneBus.js`. Acciones usadas después: `'focusPoi'(id)`, `'resetCamera'()`.

- [ ] **Step 1: Crear `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.js'] }
})
```

- [ ] **Step 2: Escribir el test que falla — `tests/pois.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { pois, validatePois } from '../app/data/pois.js'

describe('validatePois', () => {
  it('acepta una lista válida', () => {
    expect(validatePois([
      { id: 'sofa', meshNames: ['Cube.001_Material.008_0'], title: 'Sofá', description: 'Un sofá.' }
    ])).toEqual([])
  })

  it('detecta ids duplicados', () => {
    const list = [
      { id: 'a', meshNames: ['m1'], title: 't', description: 'd' },
      { id: 'a', meshNames: ['m2'], title: 't', description: 'd' }
    ]
    expect(validatePois(list)).toContain('id duplicado: a')
  })

  it('detecta meshNames vacío y campos faltantes', () => {
    const errors = validatePois([{ id: 'x', meshNames: [] }])
    expect(errors).toContain('x: meshNames vacío')
    expect(errors).toContain('x: falta title')
    expect(errors).toContain('x: falta description')
  })

  it('los POIs reales del proyecto son válidos', () => {
    expect(validatePois(pois)).toEqual([])
  })
})
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL — no existe `app/data/pois.js`.

- [ ] **Step 4: Implementar `app/data/pois.js`**

```js
// Los meshNames reales se completan en la tarea de exploración de escena.
export const pois = []

export function validatePois (list) {
  const errors = []
  const ids = new Set()
  for (const p of list) {
    if (!p.id || typeof p.id !== 'string') { errors.push('POI sin id'); continue }
    if (ids.has(p.id)) errors.push(`id duplicado: ${p.id}`)
    ids.add(p.id)
    if (!Array.isArray(p.meshNames) || p.meshNames.length === 0) errors.push(`${p.id}: meshNames vacío`)
    if (!p.title) errors.push(`${p.id}: falta title`)
    if (!p.description) errors.push(`${p.id}: falta description`)
  }
  return errors
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS (4 tests).

- [ ] **Step 6: Implementar `app/composables/useSceneState.js`**

```js
export function useSceneState () {
  const activePoiId = useState('scene-active-poi', () => null)
  const loading = useState('scene-loading', () => ({ active: true, progress: 0 }))
  const muted = useState('scene-muted', () => false)
  const webglError = useState('scene-webgl-error', () => false)
  return { activePoiId, loading, muted, webglError }
}
```

- [ ] **Step 7: Implementar `app/utils/sceneBus.js`**

```js
// Canal mínimo UI -> escena. Solo cliente; los handlers los registra Scene.vue.
const handlers = new Map()

export function onSceneAction (name, fn) {
  handlers.set(name, fn)
  return () => handlers.delete(name)
}

export function emitSceneAction (name, ...args) {
  handlers.get(name)?.(...args)
}
```

- [ ] **Step 8: Commit**

```bash
git add app/data app/composables app/utils tests vitest.config.js
git commit -m "feat: config de POIs con validación testeada, estado compartido y sceneBus"
```

---

### Task 4: Núcleo Three.js + Scene.vue (escena vacía renderizando)

**Files:**
- Create: `app/utils/three/core.js`, `app/components/three/Scene.vue`
- Modify: `app/pages/index.vue`

**Interfaces:**
- Consumes: `useSceneState` (para `webglError`).
- Produces: `createThree(container) => { THREE, renderer, scene, camera, addTick(fn), start(), dispose() }` — `addTick` recibe `fn(delta)` llamada por frame. `Scene.vue` (auto-import `ThreeScene`) monta el canvas en su raíz.

- [ ] **Step 1: Implementar `app/utils/three/core.js`**

```js
import * as THREE from 'three'

export function webglAvailable () {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

export function createThree (container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#101014')

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200)
  camera.position.set(4, 3, 6)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(6, 10, 4)
  scene.add(sun)

  const clock = new THREE.Clock()
  const tickers = new Set()
  let raf = null

  function resize () {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  function loop () {
    const delta = clock.getDelta()
    for (const t of tickers) t(delta)
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }

  return {
    THREE,
    renderer,
    scene,
    camera,
    addTick: fn => { tickers.add(fn); return () => tickers.delete(fn) },
    start: () => { if (raf === null) loop() },
    dispose () {
      if (raf !== null) cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((obj) => {
        obj.geometry?.dispose?.()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) {
          if (!m) continue
          for (const v of Object.values(m)) v?.isTexture && v.dispose()
          m.dispose?.()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
```

- [ ] **Step 2: Implementar `app/components/three/Scene.vue` (versión de esta tarea: cubo de humo)**

```vue
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
```

- [ ] **Step 3: Actualizar `app/pages/index.vue`**

```vue
<template>
  <div class="relative h-dvh w-full overflow-hidden bg-neutral-950">
    <ClientOnly>
      <ThreeScene />
    </ClientOnly>
  </div>
</template>
```

- [ ] **Step 4: Verificar en el browser**

Run: `npm run dev` y abrir `http://localhost:3000` (Chrome MCP o screenshot).
Expected: cubo verde rotando sobre fondo oscuro, sin errores en consola, canvas ocupa toda la ventana y responde al resize.

- [ ] **Step 5: Commit**

```bash
git add app/utils/three app/components app/pages/index.vue
git commit -m "feat: núcleo Three.js con loop, resize y dispose; escena de prueba"
```

---

### Task 5: Carga del modelo + LoadingScreen + error WebGL

**Files:**
- Create: `app/utils/three/loadModel.js`, `app/components/LoadingScreen.vue`
- Modify: `app/components/three/Scene.vue`, `app/pages/index.vue`

**Interfaces:**
- Consumes: `createThree` (Task 4), `useSceneState` (Task 3).
- Produces: `loadModel(onProgress) => Promise<THREE.Group>` — resuelve con la escena del GLB lista para agregar; `onProgress(pct: number 0-100)`.

- [ ] **Step 1: Implementar `app/utils/three/loadModel.js`**

```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export async function loadModel (onProgress = () => {}) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const gltf = await loader.loadAsync('/models/loft.glb', (e) => {
    if (e.total > 0) onProgress(Math.round((e.loaded / e.total) * 100))
  })
  draco.dispose()
  return gltf.scene
}
```

- [ ] **Step 2: Reemplazar el cubo por el modelo en `Scene.vue`**

En `onMounted`, después de `ctx = createThree(...)` (eliminar cubo y su tick):

```js
import { loadModel } from '~/utils/three/loadModel'

try {
  const model = await loadModel((pct) => { loading.value = { active: true, progress: pct } })
  ctx.scene.add(model)
  ctx.start()
  loading.value = { active: false, progress: 100 }
} catch (err) {
  console.error('Error cargando el modelo', err)
  webglError.value = true
  loading.value = { active: false, progress: 0 }
}
```

(`onMounted` pasa a ser `async`; guardar `model` en una variable del setup — `let model = null` — porque las tareas siguientes lo usan.)

- [ ] **Step 3: Implementar `app/components/LoadingScreen.vue`**

```vue
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
```

- [ ] **Step 4: Agregar `LoadingScreen` a `index.vue`**

```vue
<template>
  <div class="relative h-dvh w-full overflow-hidden bg-neutral-950">
    <ClientOnly>
      <ThreeScene />
    </ClientOnly>
    <LoadingScreen />
  </div>
</template>
```

- [ ] **Step 5: Verificar en el browser**

Expected: barra de progreso real → fade-out → loft visible e iluminado, sin errores de consola. Si el modelo se ve negro o lavado, ajustar intensidades de luces en `core.js` (rango razonable: ambient 0.5–1.2, direccional 1–2.5).

- [ ] **Step 6: Commit**

```bash
git add app/utils/three/loadModel.js app/components/LoadingScreen.vue app/components/three/Scene.vue app/pages/index.vue
git commit -m "feat: carga del GLB con progreso real, pantalla de carga y fallback WebGL"
```

---

### Task 6: Cámara híbrida (camera-controls con límites + reset)

**Files:**
- Create: `app/utils/three/cameraRig.js`
- Modify: `app/components/three/Scene.vue`

**Interfaces:**
- Consumes: `ctx` de `createThree`, `model` cargado (Task 5).
- Produces: `createCameraRig({ THREE, camera, domElement, model }) => { update(delta), focusObject(object3d, padding?) => Promise, reset() => Promise, setEnabled(bool), dispose() }`.

- [ ] **Step 1: Implementar `app/utils/three/cameraRig.js`**

```js
import CameraControls from 'camera-controls'

let installed = false

export function createCameraRig ({ THREE, camera, domElement, model }) {
  if (!installed) { CameraControls.install({ THREE }); installed = true }

  const controls = new CameraControls(camera, domElement)
  controls.smoothTime = 0.35
  controls.draggingSmoothTime = 0.12

  // Límites derivados del tamaño real del modelo.
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const radius = Math.max(size.x, size.z) / 2

  controls.minDistance = radius * 0.15
  controls.maxDistance = radius * 2.2
  controls.maxPolarAngle = Math.PI / 2.05          // nunca por debajo del piso
  controls.minPolarAngle = Math.PI / 6
  controls.setBoundary(box)                        // el target no sale del loft

  const home = {
    pos: [center.x + radius * 1.4, center.y + size.y * 0.9, center.z + radius * 1.4],
    target: [center.x, center.y + size.y * 0.35, center.z]
  }
  controls.setLookAt(...home.pos, ...home.target, false)

  return {
    update: delta => controls.update(delta),
    focusObject (object3d, padding = 0.35) {
      return controls.fitToBox(object3d, true, {
        paddingLeft: padding, paddingRight: padding, paddingTop: padding, paddingBottom: padding
      })
    },
    reset: () => controls.setLookAt(...home.pos, ...home.target, true),
    setEnabled (v) { controls.enabled = v },
    dispose: () => controls.dispose()
  }
}
```

- [ ] **Step 2: Integrar el rig en `Scene.vue`**

Después de agregar el modelo a la escena:

```js
import { createCameraRig } from '~/utils/three/cameraRig'

let rig = null
// dentro de onMounted, tras ctx.scene.add(model):
rig = createCameraRig({ THREE: ctx.THREE, camera: ctx.camera, domElement: ctx.renderer.domElement, model })
ctx.addTick(d => rig.update(d))
```

Y en `onUnmounted`: `rig?.dispose()` antes de `ctx?.dispose()`.

- [ ] **Step 3: Verificar en el browser**

Expected: se puede orbitar con drag, panear con click derecho, zoomear con rueda. La cámara nunca pasa bajo el piso ni se aleja al infinito; el target queda dentro del loft. Ajustar los factores (`0.15`, `2.2`, `minPolarAngle`) si el encuadre inicial no muestra bien el interior.

- [ ] **Step 4: Commit**

```bash
git add app/utils/three/cameraRig.js app/components/three/Scene.vue
git commit -m "feat: cámara híbrida con camera-controls, límites derivados del modelo y vista home"
```

---

### Task 7: Exploración de la escena y definición de POIs reales ⚠️ checkpoint colaborativo

**Files:**
- Modify: `app/components/three/Scene.vue` (logger temporal), `app/data/pois.js`

**Interfaces:**
- Produces: `pois` poblado con 4–6 entradas con `meshNames` reales del GLB. Formato exacto (consumido por Tasks 8–10):

```js
{
  id: 'sofa',
  meshNames: ['Cube.006_Material.017_0'],
  title: 'Sofá',
  description: 'Texto del panel…',
  animation: 'lamp',        // opcional: clave del registry de Task 10
  cameraPadding: 0.35       // opcional
}
```

- [ ] **Step 1: Agregar logger temporal de clicks en `Scene.vue`**

Dentro de `onMounted`, tras crear el rig:

```js
// TEMPORAL (se elimina en Task 8): loguea el mesh clickeado para mapear POIs.
const raycaster = new ctx.THREE.Raycaster()
const pointer = new ctx.THREE.Vector2()
const debugPick = (e) => {
  const r = ctx.renderer.domElement.getBoundingClientRect()
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  raycaster.setFromCamera(pointer, ctx.camera)
  const hit = raycaster.intersectObjects(model.children, true)[0]
  if (hit) console.log('[poi-debug]', hit.object.name, hit.object.position)
}
ctx.renderer.domElement.addEventListener('click', debugPick)
```

- [ ] **Step 2: Identificar los objetos en el browser**

Con el dev server corriendo, abrir la escena (Chrome MCP), clickear los muebles principales (sofá, TV, lámparas, mesa, cocina, cama si hay) y registrar los nombres que aparecen en consola con `[poi-debug]`.

- [ ] **Step 3: Poblar `app/data/pois.js`**

Escribir 4–6 POIs con los nombres reales recolectados, títulos y descripciones en español (texto real, no lorem ipsum — describir el objeto y algún detalle del loft). Marcar 2–3 con `animation: 'lamp'` o `animation: 'tv'` según corresponda (implementadas en Task 10; hasta entonces el campo es inerte).

- [ ] **Step 4: Verificar con el test existente**

Run: `npm test`
Expected: PASS — incluye `validatePois(pois)` sobre los datos reales.

- [ ] **Step 5: Commit**

```bash
git add app/data/pois.js app/components/three/Scene.vue
git commit -m "feat: POIs reales mapeados desde la escena"
```

---

### Task 8: Interacciones (hover highlight + click a POI)

**Files:**
- Create: `app/utils/three/interactions.js`
- Modify: `app/components/three/Scene.vue` (reemplaza el logger temporal)

**Interfaces:**
- Consumes: `pois` (Task 7), `ctx`, `model`, `rig`.
- Produces: `createInteractions({ THREE, renderer, camera, model, pois, onPoiClick }) => { getPoiObject(id) => THREE.Object3D|null, dispose() }`. Internamente maneja hover (cursor + emissive) y click (llama `onPoiClick(poiId)`).

- [ ] **Step 1: Implementar `app/utils/three/interactions.js`**

```js
export function createInteractions ({ THREE, renderer, camera, model, pois, onPoiClick }) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const dom = renderer.domElement

  // mesh -> poiId, clonando materiales para no afectar meshes que los comparten
  const meshToPoi = new Map()
  const poiMeshes = new Map() // poiId -> THREE.Mesh[]
  for (const poi of pois) {
    const meshes = []
    for (const name of poi.meshNames) {
      const mesh = model.getObjectByName(name)
      if (!mesh) { console.warn(`POI ${poi.id}: mesh "${name}" no encontrado`); continue }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(m => m.clone())
        : mesh.material.clone()
      meshToPoi.set(mesh, poi.id)
      meshes.push(mesh)
    }
    poiMeshes.set(poi.id, meshes)
  }

  const interactive = [...meshToPoi.keys()]
  let hovered = null

  function pick (e) {
    const r = dom.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObjects(interactive, false)[0]?.object ?? null
  }

  function setHighlight (mesh, on) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!m.emissive) continue
      if (on) {
        m.userData.savedEmissive ??= m.emissive.getHex()
        m.userData.savedIntensity ??= m.emissiveIntensity
        m.emissive.setHex(0xffffff)
        m.emissiveIntensity = 0.18
      } else {
        m.emissive.setHex(m.userData.savedEmissive ?? 0x000000)
        m.emissiveIntensity = m.userData.savedIntensity ?? 1
      }
    }
  }

  const onMove = (e) => {
    const mesh = pick(e)
    if (mesh === hovered) return
    if (hovered) setHighlight(hovered, false)
    hovered = mesh
    if (hovered) setHighlight(hovered, true)
    dom.style.cursor = hovered ? 'pointer' : ''
  }

  // Distinguir click de drag de órbita
  let downAt = null
  const onDown = e => { downAt = [e.clientX, e.clientY] }
  const onUp = (e) => {
    if (!downAt) return
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1])
    downAt = null
    if (moved > 6) return
    const mesh = pick(e)
    if (mesh) onPoiClick(meshToPoi.get(mesh))
  }

  dom.addEventListener('pointermove', onMove)
  dom.addEventListener('pointerdown', onDown)
  dom.addEventListener('pointerup', onUp)

  return {
    // fitToBox acepta cualquier Object3D; para POIs de varios meshes se usa el
    // primero (suele ser el cuerpo principal). Ajustar con cameraPadding si hace falta.
    getPoiObject: id => poiMeshes.get(id)?.[0] ?? null,
    dispose () {
      if (hovered) setHighlight(hovered, false)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.style.cursor = ''
    }
  }
}
```

- [ ] **Step 2: Integrar en `Scene.vue` (quitar el logger de Task 7)**

```js
import { createInteractions } from '~/utils/three/interactions'
import { pois } from '~/data/pois'
import { onSceneAction, emitSceneAction } from '~/utils/sceneBus'

const { activePoiId } = useSceneState()
let interactions = null

// en onMounted, reemplazando el bloque debugPick:
interactions = createInteractions({
  THREE: ctx.THREE,
  renderer: ctx.renderer,
  camera: ctx.camera,
  model,
  pois,
  onPoiClick: id => emitSceneAction('focusPoi', id)
})

onSceneAction('focusPoi', async (id) => {
  const obj = interactions.getPoiObject(id)
  if (!obj) return
  activePoiId.value = id
  rig.setEnabled(false)
  const poi = pois.find(p => p.id === id)
  await rig.focusObject(obj, poi?.cameraPadding)
})

onSceneAction('resetCamera', async () => {
  activePoiId.value = null
  await rig.reset()
  rig.setEnabled(true)
})
```

En `onUnmounted`: `interactions?.dispose()` (y los `onSceneAction` devuelven un unsubscribe — guardarlos y llamarlos).

- [ ] **Step 3: Verificar en el browser**

Expected: hover sobre un POI → cursor pointer + brillo sutil; click → zoom cinemático al objeto y la órbita queda deshabilitada; drag largo no dispara click. En consola no hay warnings de meshes no encontrados.

- [ ] **Step 4: Commit**

```bash
git add app/utils/three/interactions.js app/components/three/Scene.vue
git commit -m "feat: hover highlight y click con zoom cinemático a POIs"
```

---

### Task 9: InfoPanel + HUD + flujo de volver

**Files:**
- Create: `app/components/InfoPanel.vue`, `app/components/HudControls.vue`
- Modify: `app/pages/index.vue`

**Interfaces:**
- Consumes: `useSceneState`, `emitSceneAction`, `pois`.
- Produces: UI completa del flujo enfocar/volver. `emitSceneAction('resetCamera')` es la única vía de volver.

- [ ] **Step 1: Implementar `app/components/InfoPanel.vue`**

```vue
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
```

- [ ] **Step 2: Implementar `app/components/HudControls.vue`**

```vue
<script setup>
import { emitSceneAction } from '~/utils/sceneBus'

const { activePoiId, muted, loading } = useSceneState()
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
      @click="muted = !muted"
    />
    <UPopover>
      <UButton icon="i-lucide-circle-help" variant="soft" color="neutral" square aria-label="Ayuda" />
      <template #content>
        <div class="max-w-60 p-3 text-xs text-neutral-500 dark:text-neutral-400">
          Arrastrá para orbitar, usá la rueda para acercarte y hacé click en los
          objetos iluminados para conocerlos.
        </div>
      </template>
    </UPopover>
  </div>
</template>
```

- [ ] **Step 3: Sumar ambos a `index.vue`**

```vue
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
```

- [ ] **Step 4: Verificar en el browser**

Expected: click en POI → panel entra desde la derecha con título/descr.; Escape, la X, "Volver" y "Vista general" cierran el panel y la cámara vuelve a home; la órbita se rehabilita al volver.

- [ ] **Step 5: Commit**

```bash
git add app/components/InfoPanel.vue app/components/HudControls.vue app/pages/index.vue
git commit -m "feat: panel de información y HUD con flujo de volver"
```

---

### Task 10: Animaciones de objetos (registry onFocus/onBlur)

**Files:**
- Create: `app/utils/three/poiAnimations.js`
- Modify: `app/components/three/Scene.vue`, `app/data/pois.js` (si hace falta ajustar qué POIs animan)

**Interfaces:**
- Consumes: `pois` (campo `animation`), meshes del modelo.
- Produces: `poiAnimations: { [key]: { onFocus(ctx), onBlur(ctx) } }` con `ctx = { THREE, scene, meshes }`. Claves fase 1: `'lamp'`, `'tv'`.

- [ ] **Step 1: Implementar `app/utils/three/poiAnimations.js`**

```js
// Cada animación recibe { THREE, scene, meshes } y debe ser reversible en onBlur.
export const poiAnimations = {
  lamp: {
    onFocus ({ THREE, scene, meshes }) {
      const target = meshes[0]
      if (!target) return
      const center = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3())
      const light = new THREE.PointLight(0xffd9a0, 6, 4, 1.6)
      light.position.copy(center)
      light.name = '__lamp-light'
      scene.add(light)
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.emissive) continue
          m.userData.animSaved = { hex: m.emissive.getHex(), i: m.emissiveIntensity }
          m.emissive.setHex(0xffd9a0)
          m.emissiveIntensity = 0.9
        }
      }
    },
    onBlur ({ scene, meshes }) {
      scene.getObjectByName('__lamp-light')?.removeFromParent()
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.userData.animSaved) continue
          m.emissive.setHex(m.userData.animSaved.hex)
          m.emissiveIntensity = m.userData.animSaved.i
          delete m.userData.animSaved
        }
      }
    }
  },

  tv: {
    onFocus ({ THREE, meshes }) {
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.emissive) continue
          m.userData.animSaved = { hex: m.emissive.getHex(), i: m.emissiveIntensity }
          m.emissive.setHex(0x9ecbff)
          m.emissiveIntensity = 1.4
        }
      }
    },
    onBlur ({ meshes }) {
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.userData.animSaved) continue
          m.emissive.setHex(m.userData.animSaved.hex)
          m.emissiveIntensity = m.userData.animSaved.i
          delete m.userData.animSaved
        }
      }
    }
  }
}
```

- [ ] **Step 2: Dispararlas desde `Scene.vue`**

En el handler de `'focusPoi'`, después de `activePoiId.value = id`:

```js
import { poiAnimations } from '~/utils/three/poiAnimations'

const meshesOf = poi => poi.meshNames.map(n => model.getObjectByName(n)).filter(Boolean)

// dentro del handler focusPoi:
const anim = poiAnimations[poi?.animation]
anim?.onFocus({ THREE: ctx.THREE, scene: ctx.scene, meshes: meshesOf(poi) })
```

Y en `'resetCamera'`, antes de resetear:

```js
const prev = pois.find(p => p.id === activePoiId.value)
poiAnimations[prev?.animation]?.onBlur({ THREE: ctx.THREE, scene: ctx.scene, meshes: prev ? meshesOf(prev) : [] })
```

- [ ] **Step 3: Verificar en el browser**

Expected: enfocar la lámpara la prende (luz cálida + emissive), volver la apaga; enfocar la TV enciende la pantalla azulada, volver la apaga. Repetir el ciclo dos veces sin efectos acumulados.

- [ ] **Step 4: Commit**

```bash
git add app/utils/three/poiAnimations.js app/components/three/Scene.vue app/data/pois.js
git commit -m "feat: animaciones reversibles de lámpara y TV por POI"
```

---

### Task 11: Audio (sfx sintetizado + ambiente opcional + mute persistido)

**Files:**
- Create: `app/composables/useAudio.js`
- Modify: `app/components/three/Scene.vue` (sfx al enfocar), `app/components/HudControls.vue` (persistencia via composable), `app/pages/index.vue` (init)

**Interfaces:**
- Produces: `useAudio() => { playFocusSfx(), toggleMute(), initOnFirstGesture() }` — lee/escribe `muted` de `useSceneState` y persiste en `localStorage['loft-muted']`.

- [ ] **Step 1: Implementar `app/composables/useAudio.js`**

```js
let audioCtx = null
let ambientEl = null
let initialized = false

export function useAudio () {
  const { muted } = useSceneState()

  function ensureCtx () {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  }

  function playFocusSfx () {
    if (muted.value) return
    ensureCtx()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.25)
  }

  async function startAmbient () {
    if (ambientEl) return
    // El loop ambiente es opcional: solo si el archivo existe en public/audio/.
    const res = await fetch('/audio/ambient.mp3', { method: 'HEAD' }).catch(() => null)
    if (!res?.ok) return
    ambientEl = new Audio('/audio/ambient.mp3')
    ambientEl.loop = true
    ambientEl.volume = 0.25
    if (!muted.value) ambientEl.play().catch(() => {})
  }

  function initOnFirstGesture () {
    if (initialized) return
    initialized = true
    muted.value = localStorage.getItem('loft-muted') === '1'
    const onGesture = () => {
      ensureCtx()
      startAmbient()
      window.removeEventListener('pointerdown', onGesture)
    }
    window.addEventListener('pointerdown', onGesture)
    watch(muted, (v) => {
      localStorage.setItem('loft-muted', v ? '1' : '0')
      if (ambientEl) v ? ambientEl.pause() : ambientEl.play().catch(() => {})
    })
  }

  return { playFocusSfx, toggleMute: () => { muted.value = !muted.value }, initOnFirstGesture }
}
```

- [ ] **Step 2: Inicializar y disparar**

En `Scene.vue` `onMounted` (cliente seguro): `useAudio().initOnFirstGesture()`, y en el handler `focusPoi`: `useAudio().playFocusSfx()`.
En `HudControls.vue`, reemplazar `@click="muted = !muted"` por `@click="toggleMute()"` usando `const { toggleMute } = useAudio()`.

- [ ] **Step 3: Verificar en el browser**

Expected: al enfocar un POI suena un blip suave; el mute lo silencia; recargar la página conserva el estado de mute. Sin `ambient.mp3` no hay errores en consola (el HEAD 404 se ignora). Si el usuario luego agrega `public/audio/ambient.mp3`, arranca solo tras el primer click.

- [ ] **Step 4: Commit**

```bash
git add app/composables/useAudio.js app/components/three/Scene.vue app/components/HudControls.vue
git commit -m "feat: sfx sintetizado, ambiente opcional y mute persistido"
```

---

### Task 12: Verificación final contra el spec

**Files:** ninguno nuevo (ajustes menores si la verificación falla).

- [ ] **Step 1: Correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 3: Recorrido completo en el browser (dev o preview)**

Checklist del spec, verificar cada punto:
- [ ] La escena carga el loft optimizado sin errores de consola.
- [ ] Órbita respeta límites (no atraviesa paredes/piso, zoom acotado).
- [ ] Cada POI: hover destaca, click enfoca + abre panel, volver restaura (probar TODOS los POIs).
- [ ] Lámpara y TV se animan y revierten en ciclos repetidos.
- [ ] Mute persiste tras recargar.
- [ ] DPR clampeado (revisar `renderer.getPixelRatio() <= 2` en consola).
- [ ] Emular touch en DevTools: un dedo orbita, pinch zoomea, tap abre POI.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: verificación final fase 1"
```
