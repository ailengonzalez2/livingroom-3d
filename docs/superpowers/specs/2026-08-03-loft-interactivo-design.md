# Loft interactivo 3D — Diseño

**Fecha:** 2026-08-03
**Estado:** Aprobado
**Proyecto:** `/Users/Ailen/Documentos/code/livingroom-3d`

## Resumen

Experiencia interactiva web: un loft 3D (modelo de Sketchfab, licencia en `model-source/license.txt`) que el usuario explora con órbita libre limitada. Al clickear objetos de interés la cámara hace zoom cinemático, se abre un panel de información y suenan efectos. Desktop primero; mobile básico funcional. Personajes, diálogos y deploy quedan para una fase 2.

## Stack

- Nuxt 4 + Nuxt UI 4 (incluye Tailwind 4)
- `three` + `camera-controls` (reemplazo de OrbitControls con límites y transiciones nativas)
- JavaScript (sin TypeScript)
- Sin librería de audio (Audio nativo) ni GSAP en fase 1

## Pipeline del modelo

- Origen: `model-source/` (scene.gltf 33 MB + texturas, movido desde la raíz).
- Optimización: `npm run optimize-model` → ejecuta `@gltf-transform/cli optimize` con Draco + texturas WebP → `public/models/loft.glb` (esperado: 3–8 MB).
- La app carga solo el `.glb` con `GLTFLoader` + `DRACOLoader` (decoder servido localmente desde `public/draco/`).

## Arquitectura

```
app/
├── pages/index.vue              # monta Scene + overlay UI
├── components/
│   ├── three/Scene.vue          # canvas, ciclo de vida, orquesta composables
│   ├── InfoPanel.vue            # panel Nuxt UI del POI activo
│   ├── LoadingScreen.vue        # progreso real de carga + fade-in
│   └── HudControls.vue          # botón volver, mute, ayuda
├── composables/
│   ├── useSceneState.js         # useState Nuxt: poi activo, loading, mute
│   └── useAudio.js              # sfx sintetizado + ambiente opcional, mute persistido
├── utils/
│   ├── sceneBus.js              # canal de acciones UI -> escena
│   └── three/                   # módulos JS puros (no composables: funciones con args)
│       ├── core.js              # renderer, escena, luces, resize, loop con delta, dispose
│       ├── loadModel.js         # GLTFLoader + DRACOLoader con progreso
│       ├── cameraRig.js         # camera-controls: límites órbita/zoom, fitToBox, reset
│       ├── interactions.js      # raycasting hover/click sobre meshes de POIs
│       └── poiAnimations.js     # registry de animaciones reversibles por POI
└── data/pois.js                 # config declarativa de POIs
```

Reglas de aislamiento:

- La UI HTML nunca importa Three.js: lee `useSceneState` y llama acciones expuestas (`focusPoi(id)`, `resetCamera()`).
- Los composables 3D no conocen componentes Vue; se comunican solo vía estado y callbacks.
- Todo recurso Three (geometrías, materiales, texturas, renderer) se dispone en `onUnmounted`.

## POIs (`data/pois.js`)

Cada entrada:

```js
{
  id: 'sofa',
  meshNames: ['Cube.006_Material.017_0'],   // nombres reales del GLB
  title: '...', description: '...',
  camera: { /* padding/offset para fitToBox */ },
  sfx: 'click',                              // opcional
  onFocus/onBlur                             // animación opcional (lámpara, TV)
}
```

Los nombres de mesh del modelo son genéricos (`Cube.001`…); tras el scaffold se explora la escena en el browser para mapear mesh → mueble real. Fase 1: 4–6 POIs, 2–3 con animación (p. ej. lámpara con luz + emissive, TV encendida).

## Flujo de interacción

1. **Vista general:** órbita libre con restricciones de camera-controls (polar/azimuth/distance clamps + boundary box) para no atravesar paredes/piso.
2. **Hover** sobre mesh de POI: cursor pointer + highlight emissive sutil.
3. **Click:** `fitToBox` animado hacia el objeto + InfoPanel + sfx. Input de órbita deshabilitado mientras hay POI activo.
4. **Volver:** botón del panel, Escape o click fuera → cámara vuelve a la vista general, panel se cierra.

## Audio

Sfx cortos al enfocar, sintetizados con Web Audio (sin assets que licenciar). Loop ambiente opcional: se reproduce solo si existe `public/audio/ambient.mp3` (el usuario puede agregarlo después), arrancando en la primera interacción (política de autoplay). Mute en HUD, persistido en localStorage.

## Carga y errores

- LoadingScreen con progreso real (`onProgress`) y fade-in al terminar.
- Chequeo de soporte WebGL al montar; mensaje amable si no hay.
- Mobile: touch nativo de camera-controls (orbitar/pinch/tap); `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

## Verificación

- La escena carga y renderiza el loft optimizado sin errores de consola.
- Órbita respeta límites (no se atraviesan paredes, zoom acotado).
- Cada POI: hover destaca, click enfoca + abre panel, volver restaura.
- Animaciones de lámpara/TV se activan y revierten.
- Mute persiste tras recargar.
- Test unitario liviano: validación de la forma de `data/pois.js` (ids únicos, meshNames presentes).

## Fuera de alcance (fase 2)

Personajes y diálogos, mobile pulido, deploy, SEO, i18n.

## Notas as-built (2026-08-03)

- `optimize-model` corre con `--join false`: el join de gltf-transform fusiona meshes y eso rompe el raycasting por nombre de mesh (los POIs dependen de `meshNames` estables). No quitar la flag.
- GLTFLoader sanitiza los nombres de nodos al cargar (sin puntos: `Cube.001` → `Cube001`), y dos nombres traen bytes EF BF BD (U+FFFD) literales heredados del asset fuente — ver comentario en `app/data/pois.js`.
- La forma final de POI es `{id, meshNames, title, description, animation?, cameraPadding?}`, con un registry `poiAnimations` (lamp/tv) para las animaciones por-POI y sfx global no-por-POI. Los límites de cámara se derivan del interior del loft (piso + cielorraso), no del modelo completo, para excluir los edificios exteriores del fondo.
