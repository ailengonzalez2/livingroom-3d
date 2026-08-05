# Loft interactivo

Un loft 3D explorable, hecho como pieza de portfolio. Cada objeto cuenta una parte
de quién soy: los muebles abren paneles y las cosas sobre la mesa reaccionan al click.

**En vivo:** https://livingroom-3d-production.up.railway.app

## Stack

Nuxt 4 · Three.js · Nuxt UI · Tailwind · camera-controls

Sin rutas de servidor: es una escena 100% cliente, prerenderizada con `nuxi generate`.

## Cómo está hecho

Lo que puede resultar interesante de mirar:

- **`app/utils/three/core.js`** — setup del renderer, HDRI vía PMREM, iluminación de
  atardecer y el loop de ticks al que se suscriben los objetos animados.
- **`app/utils/three/interactions.js`** — raycasting contra la escena entera para respetar
  la oclusión, más un rescate por cercanía en espacio de pantalla: los objetos sobre la
  mesa miden pocos píxeles a distancia de cámara normal, así que un click que pasa a
  menos de 14 px del centro se le asigna al más cercano, verificando antes que no esté
  tapado por una pared.
- **`app/utils/three/airpods.js`** — el clip original del GLB abre y cierra de corrido;
  se corta en un tope y se reproduce en reversa para poder invertir el sentido a mitad
  de la animación.
- **`app/utils/three/airpodsMusic.js`** — audio posicional. `refDistance` y `rolloffFactor`
  están calibrados contra la distancia real cámara→mesa, no contra el tamaño del objeto:
  el rig limita el zoom a ~[2.5, 37] unidades y un `refDistance` por debajo de ese mínimo
  deja la música siempre en la zona de caída abrupta, o sea inaudible.
- **`app/utils/three/dog.js`** — recorrido por waypoints, crossfades entre clips y salto
  a los sillones con parábola sincronizada con la animación.
- **`app/utils/three/socialIcons.js`** — texturas de marca generadas por canvas, sin assets.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build      # build de producción
npx nuxi generate  # salida estática en .output/public
```

Los modelos se optimizan desde `model-source/` con scripts dedicados, por ejemplo:

```bash
npm run optimize-instax
```

Cada uno pasa por `gltf-transform optimize` con compresión Draco y texturas WebP.
Ojo con `--simplify-error`: viene en 0.0001 por defecto, tan conservador que no
simplifica nada. El `instax` bajó de 3.5 MB a 1.5 MB recién al bajar la geometría,
no las texturas.

## Créditos

### Modelos

Bajo [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/), con crédito obligatorio:

- "[AirPods Pro](https://sketchfab.com/3d-models/airpods-pro-3f84ddc3d87a4ec0a5e5f379abfecd9c)" por [Jed Falcone](https://sketchfab.com/jedlas012)
- "[FUJIFILM Instax mini40](https://sketchfab.com/3d-models/fujifilm-instax-mini40-b889ee1a9cad45a091bc15ee6cb0878e)" por [Metazeon](https://sketchfab.com/Metazeon)
- "[Polaroid Photo Sample](https://sketchfab.com/3d-models/polaroid-photo-sample-fe1d05e189dc4da197f6ba2717abe182)" por [Edoardo Galati](https://sketchfab.com/edoardogalati)
- "[StarbucksCoffeCupLP](https://sketchfab.com/3d-models/starbuckscoffecuplp-b4c6b8a4b9f6420db97ab911f5793c87)" por [Eliplays](https://sketchfab.com/Eliplayslive)
- "[Telegram 3D-icon](https://sketchfab.com/3d-models/telegram-3d-icon-80421c5d474f4a3c8145ba4b9aaa7d2d)" por [AlbertVictory](https://sketchfab.com/albert_victory)

Bajo [licencia estándar de Sketchfab](https://sketchfab.com/licenses):

- "[loft(2) FREE interior](https://sketchfab.com/3d-models/loft2-free-interior-77e04a00deec4bcc926e521b589f3d84)" por [dasy444](https://sketchfab.com/dasy444)
- "[Laptop](https://sketchfab.com/3d-models/laptop-603062a9eae348b99c8f34533c201964)" por [Gonsaku](https://sketchfab.com/Gonsaku)

El shiba es de [Quaternius](https://quaternius.com/), CC0.

### Música

"Soft Gold Sky", de [OpenLo-Fi](https://github.com/btahir/open-lofi) — CC0 1.0.
Ver `public/audio/CREDITS.md`.
