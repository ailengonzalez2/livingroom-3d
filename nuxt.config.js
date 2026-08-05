// Los crawlers de LinkedIn, X y WhatsApp exigen URLs absolutas en `og:image`:
// una ruta relativa se ignora y el link sale sin imagen. Está en una constante
// para que mudarse a un dominio propio sea una sola edición.
const SITE_URL = 'https://livingroom-3d-production.up.railway.app'
const TITLE = 'Ailen Gonzalez — Loft interactivo'
const DESCRIPTION = 'Un loft 3D explorable, hecho con Nuxt y Three.js. Cinco objetos cuentan quién soy: entrá, orbitá y tocá lo que se ilumina.'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-03',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  site: { url: SITE_URL },
  app: {
    head: {
      title: 'Loft interactivo',
      htmlAttrs: { lang: 'es' },
      link: [{ rel: 'canonical', href: SITE_URL }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: DESCRIPTION },
        { name: 'author', content: 'Ailen Gonzalez' },

        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Ailen Gonzalez' },
        { property: 'og:locale', content: 'es_AR' },
        { property: 'og:url', content: SITE_URL },
        { property: 'og:title', content: TITLE },
        { property: 'og:description', content: DESCRIPTION },
        { property: 'og:image', content: `${SITE_URL}/og.jpg` },
        // Ancho y alto declarados: sin esto algunos crawlers muestran la
        // tarjeta chica hasta que terminan de descargar la imagen.
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { property: 'og:image:alt', content: 'Vista del loft 3D: living de cuero frente a un ventanal al atardecer, con un shiba en el piso' },

        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: TITLE },
        { name: 'twitter:description', content: DESCRIPTION },
        { name: 'twitter:image', content: `${SITE_URL}/og.jpg` }
      ]
    }
  }
})
