# Créditos de audio

## `airpods.mp3` — "Soft Gold Sky"

- **Colección:** [OpenLo-Fi](https://github.com/btahir/open-lofi) (166 tracks lo-fi)
- **Licencia:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) — dominio público.
  Uso comercial permitido, sin atribución obligatoria. Este archivo existe por prolijidad, no por exigencia de la licencia.
- **Origen:** generado con Suno (según la metadata del archivo original).
- **Procesado:** convertido de estéreo 157 kbps a mono 96 kbps (1.6 MB) con
  `ffmpeg -i soft-gold-sky.mp3 -ac 1 -b:a 96k -map_metadata -1 airpods.mp3`.
  Mono es intencional: el `PannerNode` que espacializa el audio en la escena colapsa el estéreo
  de todas formas, así que la conversión solo saca peso.
