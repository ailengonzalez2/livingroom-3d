import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const TARGET_WIDTH = 0.06
const SPEED = 2.2
const T_OPEN = 2.0
const LYING_X = -Math.PI / 2
const LIFT = 0.07

export async function createAirpods ({ THREE, scene, position, onIntent }) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync('/models/airpods.glb')
  draco.dispose()

  const object = gltf.scene
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = TARGET_WIDTH / Math.max(size.x, size.z)
  object.scale.setScalar(scale)
  // apoyar la base del case sobre `position` (el min.y escalado toca la mesa)
  const min = box.min.clone().multiplyScalar(scale)
  object.position.set(position.x, position.y - min.y, position.z)
  scene.add(object)

  // acostado boca arriba (tapa hacia arriba) sobre la mesa; recalcular el
  // bbox después de rotar para volver a apoyar la base sobre `position`
  object.rotation.x = LYING_X
  object.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(object)
  object.position.y += position.y - box2.min.y
  const baseY = object.position.y

  const mixer = new THREE.AnimationMixer(object)
  const action = mixer.clipAction(gltf.animations[0])
  action.setLoop(THREE.LoopOnce)
  action.clampWhenFinished = true
  action.play()
  action.paused = true
  action.time = 0

  let open = false
  let animating = false

  const onFinished = (e) => {
    if (e.action !== action) return
    // el clip original es ida y vuelta (abre y luego se vuelve a cerrar solo);
    // la apertura se corta antes con el tope T_OPEN en update(), así que este
    // handler solo puede dispararse en la reversa (cierre, dirección -1).
    animating = false
    open = false
  }
  mixer.addEventListener('finished', onFinished)

  return {
    object,
    toggle () {
      if (animating) {
        // invertir el sentido a mitad de animación
        action.timeScale = -action.timeScale
      } else if (open) {
        action.timeScale = -SPEED
      } else {
        action.timeScale = SPEED
      }
      action.paused = false
      animating = true
      // Se avisa la intención en el click, no al terminar la animación: así el
      // fade de la música ya está a volumen cuando la tapa terminó de abrirse.
      onIntent?.(action.timeScale > 0)
    },
    update (delta) {
      mixer.update(delta)
      if (!action.paused && action.timeScale > 0 && action.time >= T_OPEN) {
        action.time = T_OPEN
        action.paused = true
        animating = false
        open = true
      }
      const p = Math.min(Math.max(action.time / T_OPEN, 0), 1)
      const e = p * p * (3 - 2 * p) // smoothstep
      object.position.y = baseY + LIFT * e
      object.rotation.x = LYING_X * (1 - e) // acostado (p=0) → derecho (p=1)
    },
    dispose () {
      mixer.stopAllAction()
      mixer.removeEventListener('finished', onFinished)
      object.traverse((o) => {
        o.geometry?.dispose?.()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          if (!m) continue
          for (const v of Object.values(m)) v?.isTexture && v.dispose()
          m.dispose?.()
        }
      })
      object.removeFromParent()
    }
  }
}
