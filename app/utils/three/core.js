import * as THREE from 'three'

function makeSunsetBackground (container) {
  const c = document.createElement('canvas')
  c.width = 2
  c.height = 1024
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 1024)
  grad.addColorStop(0.0, '#0d0f2b')   // índigo nocturno
  grad.addColorStop(0.38, '#2e2350')  // púrpura profundo
  grad.addColorStop(0.62, '#7a3b5e')  // rosa viejo
  grad.addColorStop(0.82, '#c95b3f')  // naranja atardecer
  grad.addColorStop(1.0, '#e8975a')   // ámbar cálido en el horizonte
  g.fillStyle = grad
  g.fillRect(0, 0, 2, 1024)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

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
  scene.background = makeSunsetBackground()

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200)
  camera.position.set(4, 3, 6)

  scene.add(new THREE.AmbientLight(0xffe9d6, 0.7))
  const sun = new THREE.DirectionalLight(0xffd9b3, 1.4)
  sun.position.set(8, 6, 4)
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
      scene.background?.dispose?.()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
