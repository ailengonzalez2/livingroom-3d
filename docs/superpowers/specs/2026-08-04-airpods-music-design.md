# Música espacial en los AirPods — Diseño

**Fecha:** 2026-08-04 · **Estado:** Aprobado · **Base:** `9b83d08`

## Resumen

Al clickear los AirPods y abrirlos, arranca un loop de música que sale **del objeto en 3D**: se escucha más fuerte cuando la cámara se acerca a la mesa y se desvanece al alejarse. Al cerrarlos hace fade-out y pausa; al reabrir retoma donde iba, no reinicia. Respeta el botón de mute del loft.

Los fades (~0.6 s) arrancan en el momento del click, no cuando la animación de la tapa termina: así la música ya está a volumen cuando la tapa se terminó de abrir, y se siente como que los auriculares "se conectan". Si se clickea rápido abrir/cerrar, el fade se invierte sin cortes ni saltos.

## Asset

- **Track:** *Soft Gold Sky*, de la colección [OpenLo-Fi](https://github.com/btahir/open-lofi) (166 tracks). Chillhop cálido, 2:23.
- **Licencia:** CC0 1.0 Universal — dominio público. Uso comercial permitido, sin atribución obligatoria.
- **Destino:** `public/audio/airpods.mp3`, convertido a **mono 96 kbps** con ffmpeg (~1.7 MB, contra 2.7 MB del original estéreo 157 kbps). Mono no es una pérdida: el `PannerNode` que da la espacialidad colapsa el estéreo de todas formas, así que la conversión solo saca peso.
- **Créditos:** `public/audio/CREDITS.md` con título, fuente y licencia.
- **Carga:** lazy, en la primera apertura. Quien nunca toca los AirPods no descarga el archivo.

## Arquitectura

### `app/utils/three/airpodsMusic.js` (nuevo)

Dueño del `THREE.PositionalAudio`, anclado al objeto de los AirPods.

`createAirpodsMusic({ THREE, listener, object }) => { open(), close(), setMuted(bool), dispose() }`

- La carga del buffer (`THREE.AudioLoader`) se dispara en la primera llamada a `open()`. Si el `open()` inicial se resuelve después de que ya llegó un `close()`, no arranca la reproducción (guard de estado, no de timing).
- Fades por rampa sobre el gain del nodo (`gain.gain.linearRampToValueAtTime`), sin trabajo por frame — el módulo no registra ningún tick.
- `close()` programa la pausa al final del fade; si llega un `open()` antes, se cancela la pausa pendiente y la rampa se invierte desde el valor actual.
- `THREE.Audio` conserva el offset entre `pause()` y `play()`, que es lo que da el "retoma donde iba".
- Constantes, calibradas contra la distancia real cámara→mesa medida en el navegador (no contra el tamaño del case, que fue el error de la primera pasada). El rig limita el zoom a `[radius*0.15, radius*2.2]` ≈ **[2.5, 37] unidades**, con **~10.3 en la vista por defecto**:
  - `FADE = 0.6` s, para ambos sentidos.
  - `VOLUME = 0.8` — volumen tope del nodo, antes de la atenuación por distancia.
  - `refDistance = 2.5` (= el mínimo alcanzable por el zoom), `rolloffFactor = 0.6`, `distanceModel = 'inverse'`.
  - Volumen efectivo resultante: **0.80** pegado a la mesa, **0.28** en la vista por defecto, **0.09** con el zoom afuera del todo.
  - Un `refDistance` menor al mínimo alcanzable deja la música siempre en la zona de caída abrupta: con `refDistance = 0.6` el volumen efectivo en la vista por defecto era **0.023**, o sea inaudible.

### `app/composables/useAudio.js`

Dos agregados chicos, sin tocar lo existente:

- `getContext()`: devuelve el `AudioContext` del composable, creándolo si hace falta. Scene.vue lo pasa a `THREE.AudioContext.setContext(...)` **antes** de crear el `AudioListener`, para que Three comparta contexto con el SFX de focus en vez de abrir un segundo. Crear el contexto antes del primer gesto es válido: nace `suspended` y el `ensureCtx()` existente lo resume.
- `onMuteChange(fn)`: registro de suscriptores que el `watch(muted)` actual dispara además de lo que ya hace. Llama a `fn` una vez con el valor inicial al suscribir, y devuelve la función para desuscribirse. Así la música respeta el mute sin que `useAudio` tenga que conocer a los AirPods.

### `app/utils/three/airpods.js`

Un solo cambio: `createAirpods` acepta `onIntent` y lo llama dentro de `toggle()` con `action.timeScale > 0` una vez resuelta la dirección. El módulo sigue sin saber nada de audio.

### `app/components/three/Scene.vue`

- Crea el `AudioListener` y lo agrega a la cámara (después del `setContext`).
- En el `.then()` de `createAirpods`: crea la música, la cablea a `onIntent`, y suscribe `onMuteChange → setMuted`.
- `onUnmounted`: dispose de la música y desuscripción del mute, junto al cleanup que ya existe.

## Errores

Mismo patrón que los demás loaders de la escena: si `/audio/airpods.mp3` no se puede cargar (404, red caída, formato no soportado), `console.warn` y la escena sigue andando sin sonido. Los AirPods abren y cierran igual. Nada de esto bloquea el render ni la carga del modelo.

## Verificación

WebAudio no se testea razonablemente en vitest (no hay `AudioContext` en el entorno de test y mockearlo verificaría el mock, no el comportamiento). La verificación es manual, con `npm run dev` y el handle `window.__loft`:

1. Click en los AirPods → abren y la música entra con fade.
2. Alejar la cámara con la rueda → el volumen baja; acercarla → sube.
3. Segundo click → fade-out y la música se detiene.
4. Tercer click → retoma desde donde había quedado, no desde el principio.
5. Botón de mute con la música sonando → silencio; desmutear → vuelve.
6. Abrir/cerrar rápido varias veces → sin cortes, clicks ni audio superpuesto.
7. Navegar fuera de la escena y volver → sin audio huérfano ni un segundo `AudioContext` (verificable en el panel de memoria del navegador).
8. `npm test` verde y `npm run build` OK.

## Fuera de alcance

- Crossfade en el punto de loop: a los 2:23 la costura se va a notar.
- Duckear el `ambient.mp3` mientras suena la música (hoy ese archivo ni existe).
- Control de volumen separado del mute.
- Sonido propio de la animación de la tapa (click de apertura).
