import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { realBounds } from './measure.js'

const TARGET_WIDTH = 0.28
const SPEED = 1.6

export async function createLaptop ({ THREE, scene, position, rotationY = 0 }) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync('/models/laptop.glb')
  draco.dispose()

  const object = gltf.scene

  // escalar por dimensión horizontal mayor (bounds reales: geometría rotada
  // internamente sobreestimaría con Box3.setFromObject)
  const box0 = realBounds(THREE, object)
  const size0 = box0.getSize(new THREE.Vector3())
  const scale = TARGET_WIDTH / Math.max(size0.x, size0.z)
  object.scale.setScalar(scale)
  object.rotation.y = rotationY
  scene.add(object)
  object.updateMatrixWorld(true)

  // apoyar la base sobre `position` y centrar en xz (bounds recalculados
  // después de rotar/escalar)
  const box1 = realBounds(THREE, object)
  const center1 = box1.getCenter(new THREE.Vector3())
  object.position.x += position.x - center1.x
  object.position.z += position.z - center1.z
  object.position.y += position.y - box1.min.y
  object.updateMatrixWorld(true)

  const screens = []
  object.traverse((o) => {
    if (!o.isMesh) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (m?.emissiveMap) {
        m.emissiveIntensity = 0
        screens.push(m)
      }
    }
  })

  const lid = object.getObjectByName('Bone1_1')
  if (!lid) console.warn('createLaptop: no se encontró el hueso Bone1_1, sin animación de tapa')

  const qClosed = lid ? lid.quaternion.clone() : null
  const qOpen = new THREE.Quaternion(0, 0.9848, -0.1736, 0)

  let target = 0
  let p = 0

  return {
    object,
    toggle () {
      target = target === 1 ? 0 : 1
    },
    update (delta) {
      const diff = target - p
      const step = SPEED * delta
      p = Math.abs(diff) <= step ? target : p + Math.sign(diff) * step
      p = Math.min(1, Math.max(0, p))
      const e = p * p * (3 - 2 * p) // smoothstep

      if (lid) lid.quaternion.slerpQuaternions(qClosed, qOpen, e)
      for (const m of screens) m.emissiveIntensity = e
    },
    dispose () {
      object.traverse((o) => {
        o.geometry?.dispose?.()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          if (!m) continue
          for (const v of Object.values(m)) v?.isTexture && v.dispose()
          m.dispose?.()
        }
        o.skeleton?.dispose()
      })
      object.removeFromParent()
    }
  }
}
