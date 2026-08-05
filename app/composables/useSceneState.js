export function useSceneState () {
  const activePoiId = useState('scene-active-poi', () => null)
  const loading = useState('scene-loading', () => ({ active: true, progress: 0 }))
  const muted = useState('scene-muted', () => false)
  const webglError = useState('scene-webgl-error', () => false)
  // Etiqueta del objeto bajo el puntero: null, o { text, x, y } en coordenadas
  // de viewport. La escribe `interactions`, la lee HoverLabel.
  const hoverLabel = useState('scene-hover-label', () => null)
  return { activePoiId, loading, muted, webglError, hoverLabel }
}
