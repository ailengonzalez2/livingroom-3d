# Shiba en el loft — Diseño (fase 2a)

**Fecha:** 2026-08-03 · **Estado:** Aprobado · **Base:** fase 1 completa (`48c2592`)

## Resumen

Un perro Shiba Inu (Quaternius, CC0, `model-source/shiba.glb`) vive en el piso del loft. En reposo queda en animación de idle. Mientras hay actividad de rueda del mouse (el zoom de cámara sigue funcionando igual), camina un recorrido de waypoints por la zona libre del loft con la animación `Walk`, rotando hacia su dirección de avance; ~600 ms después del último evento de rueda vuelve a `Idle`. Al clickearlo salta (`Gallop_Jump` una vez, transición suave de vuelta); durante el salto ignora clicks. Hover sobre el perro muestra cursor pointer. El perro NO es un POI: no abre panel ni hace zoom de cámara.

## Asset

- Fuente: `model-source/shiba.glb` (831 KB, 20+ AnimationClips; se usan `Idle`, `Walk`, `Gallop_Jump`).
- Pipeline: `npm run optimize-dog` → `gltf-transform optimize model-source/shiba.glb public/models/shiba.glb --compress draco --texture-compress webp --join false`. Las animaciones deben sobrevivir la optimización (verificar con inspect).

## Arquitectura

- Nuevo `app/utils/three/dog.js`: `createDog({ THREE, scene, floorY, waypoints }) => Promise<{ object, update(delta), setWalking(bool), jump(), dispose() }>`. Encapsula carga (GLTFLoader+Draco), escala (~0.5 unidades de alto al hombro, derivada del bbox), posición inicial sobre el piso, AnimationMixer y crossfades, avance por waypoints y rotación.
- `interactions.js` gana `addExtraTarget(object3d, onClick)`: el raycast combinado (POIs + extras, nearest wins) dispara `onClick` del extra o el flujo POI según qué quedó más cerca. Extras: cursor pointer en hover, sin highlight emissive.
- `Scene.vue`: listener `wheel` (passive) sobre el canvas registra `lastScroll`; en el tick, `dog.setWalking(now - lastScroll < 600)`. Tras cargar el perro: `interactions.addExtraTarget(dog.object, () => dog.jump())`.
- Waypoints: rectángulo en la mitad derecha del loft (zona libre de muebles), y = piso (~0.91): `[2.5, 2.2] → [6.0, 2.0] → [6.2, -1.5] → [2.5, -1.8]` (x, z), loop.

## Verificación

- El perro aparece sobre el piso a escala creíble, en idle animado.
- Rueda del mouse: camina mientras hay actividad (y el zoom sigue funcionando); se frena al dejar de scrollear.
- Click sobre el perro: salta una vez y retoma; clicks durante el salto no encolan; clicks en POIs siguen abriendo panel normalmente.
- Ciclos repetidos sin animaciones colgadas; `npm test` verde; build OK.

## Fuera de alcance

Ladrido/sonido del perro, seguimiento al usuario, colisiones físicas con muebles, más animales, panel de info del perro.

## Iteración post-cierre (2026-08-03, pedidos del usuario)

- **Ruta frontal:** los waypoints cruzan el living por delante de los sillones (derecha de la mesa → frente del sillón del fondo → pasillo sofá/mesa → frente de los sillones de la ventana), en vez del perímetro junto al ventanal.
- **Salto a sillón:** el click alterna — en el piso salta al sillón más cercano (parábola sincronizada con `Gallop_Jump`, aterriza en el asiento a `box.min.y + altura*0.45`) y queda en idle arriba (el scroll se ignora); otro click lo baja a un punto de piso libre y retoma su rutina. Config de sillones derivada en Scene.vue de los bboxes de `node_0005/0006/0007_Material007_0`.
- La orientación del modelo es +Z en reposo (un fix intermedio que asumió −Z fue revertido; evidencia: vector Head−Body vs rotY).
