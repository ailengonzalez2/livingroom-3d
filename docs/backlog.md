# Backlog — Loft interactivo

Priorizado por dependencia y multiplicador: cada tier hace que el siguiente valga más.
Última revisión: 2026-08-04.

## En curso (sesión del 2026-08-04)

- [x] **#1 — Peso del `instax`.** Era geometría, no texturas: ~2.9 M de vértices para un prop
  chico. `--texture-size 512` solo bajó 3.5 → 3.4 MB; lo que sirvió fue `--simplify-ratio 0.30
  --simplify-error 0.01` (el `--simplify-error` por defecto, 0.0001, es tan conservador que no
  simplifica nada). Resultado: **3.5 → 1.5 MB**. Con ratio 0.12 baja a 756 KB si se quiere más,
  a costa de calidad sin verificar visualmente.
- [x] **#2 — Deploy + repo público.** El deploy ya existía en Railway
  (`livingroom-3d-production.up.railway.app`, responde 200 en 0.73 s). Se hizo público el repo
  con descripción y homepage, y se agregó README. **Hallazgo:** cinco modelos son CC-BY-4.0 y
  exigen crédito visible donde se publica la obra — se agregaron los créditos al README y al
  popover de ayuda del sitio.
- [x] **#4 — Discoverability.** Highlight de hover extendido a los objetos extra (antes solo los
  POIs se iluminaban) y rescate por cercanía en espacio de pantalla: si el rayo no acierta, gana
  el extra más cercano dentro de 14 px, verificando que no esté ocluido. Medido en el navegador:
  los tres objetos de la mesa están a 18–29 px entre sí y el desempate por cercanía los resuelve.
- [x] **#5 — POIs reescritos** como capítulos sobre Ailen, con campo `meta` nuevo (dato duro) y
  cuerpo en primera persona. Se descartó la presentación al entrar por decisión del usuario, así
  que el nombre aparece dentro del POI del busto.

## Pendiente

### Tier 1 — que exista para alguien más

- [ ] **#3 — OG image + meta tags.** Sin esto el link pegado en LinkedIn sale como un rectángulo
  gris. Un screenshot del loft al atardecer hace la mitad del trabajo. ~45 min.

### Tier 3 — que funcione donde lo van a abrir

- [ ] **#6 — Mobile / touch.** `camera-controls` maneja los gestos solo, así que orbitar y zoom
  andan. El problema es que el hover no existe en touch: la discoverability pasa de mala a nula.
  Buena parte del tráfico que llega de LinkedIn es mobile. 2–3 h.

### Tier 4 — sumar un músculo nuevo

Elegir **uno solo**; los tres juntos son ruido.

- [ ] **#7a — Ciclo día/noche.** Interpolar HDRI, sol y luces. El que mejor pega con el loft, que
  ya es una escena de atardecer. 4–6 h.
- [ ] **#7b — Post-procesado.** Bloom en la lámpara, viñeta sutil. Mejor relación impacto/esfuerzo. 3–4 h.
- [ ] **#7c — Shader propio.** Disolución, outline, agua. El que más "sé shaders" grita, y el más caro. 5–8 h.

### Tier 5 — pulido

- [ ] Crossfade en el punto de loop de la música: la costura se nota a los 2:23.
- [ ] `ambient.mp3`: el slot existe en `useAudio.js` pero nunca se agregó el archivo.

## Decisiones abiertas

- **Idioma.** El loft está en español; el CV y buena parte de los clientes potenciales
  (Upwork, equipos remotos) están en inglés. Si la pieza es para conseguir trabajo internacional,
  en algún momento hay que decidir si va bilingüe. No está resuelto.
