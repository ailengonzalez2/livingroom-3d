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
