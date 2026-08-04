import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

function makeSunsetBackground () {
  const c = document.createElement('canvas')
  c.width = 2
  c.height = 1024
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 1024)
  grad.addColorStop(0.0, '#8f8ab5')
  grad.addColorStop(0.45, '#b3a6c6')
  grad.addColorStop(0.75, '#cfb3bd')
  grad.addColorStop(1.0, '#e2c1a4')
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
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = makeSunsetBackground()

  let envDisposed = false
  new RGBELoader().load('/hdri/dusk.hdr', (hdr) => {
    if (envDisposed) { hdr.dispose(); return }
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envMap = pmrem.fromEquirectangular(hdr).texture
    pmrem.dispose()
    hdr.dispose()
    scene.environment = envMap
    scene.environmentIntensity = 0.35
  })

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200)
  camera.position.set(4, 3, 6)

  scene.add(new THREE.AmbientLight(0xffe9d6, 0.55))
  const sun = new THREE.DirectionalLight(0xffc9a0, 2.5)
  sun.position.set(-2, 7, -12)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 40
  sun.shadow.camera.left = -12
  sun.shadow.camera.right = 12
  sun.shadow.camera.top = 12
  sun.shadow.camera.bottom = -12
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.02
  scene.add(sun)
  scene.add(sun.target)

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
    enableShadows: (root) => {
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })
    },
    dispose () {
      envDisposed = true
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
      scene.environment?.dispose?.()
      scene.background?.dispose?.()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
