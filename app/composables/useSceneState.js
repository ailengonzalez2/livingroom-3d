export function useSceneState () {
  const activePoiId = useState('scene-active-poi', () => null)
  const loading = useState('scene-loading', () => ({ active: true, progress: 0 }))
  const muted = useState('scene-muted', () => false)
  const webglError = useState('scene-webgl-error', () => false)
  return { activePoiId, loading, muted, webglError }
}
