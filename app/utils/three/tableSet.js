import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const PHOTO_WIDTH = 0.13
const CAM_HEIGHT = 0.11
const SPEED = 1.6
const LIFT_CAM = 0.34
const SPIN_CAM = 0.6
const LIFT_PHOTO = 0.15
const SHOW_TILT = Math.PI / 2 - 0.6

// El mesh fuente de la polaroid no viene axis-aligned: la tarjeta está modelada
// con una inclinación compuesta (no es un simple -90° en un solo eje), así que
// un chequeo de bbox por eje no alcanza para "acostarla". Este vector es la
// normal de la cara de la foto en espacio local, obtenida haciendo PCA sobre
// los vértices del mesh (autovector del autovalor más chico de la covarianza)
// — verificado visualmente renderizando el modelo aislado. Rotar esa normal
// hacia +Y deja la foto plana con la imagen mirando hacia arriba.
const PHOTO_NORMAL_LOCAL = [0.5479259949017976, -0.8120793507979345, -0.2007591395640075]

async function loadGltf (url) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync(url)
  draco.dispose()
  return gltf.scene
}

function disposeObject (root) {
  root.traverse((o) => {
    o.geometry?.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!m) continue
      for (const v of Object.values(m)) v?.isTexture && v.dispose()
      m.dispose?.()
    }
  })
  root.removeFromParent()
}

export async function createTableSet ({ THREE, scene, position }) {
  const [photo, camera] = await Promise.all([
    loadGltf('/models/polaroid.glb'),
    loadGltf('/models/instax.glb')
  ])

  // --- Foto: acostarla plana (normal -> +Y), escalar y apoyar en `position` ---
  const normal = new THREE.Vector3(...PHOTO_NORMAL_LOCAL).normalize()
  const restQuaternion = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0))
  photo.quaternion.copy(restQuaternion)
  photo.updateMatrixWorld(true)

  const box1 = new THREE.Box3().setFromObject(photo) // acostada, escala 1
  const size1 = box1.getSize(new THREE.Vector3())
  const photoScale = PHOTO_WIDTH / Math.max(size1.x, size1.z)
  photo.scale.setScalar(photoScale)
  photo.updateMatrixWorld(true)

  const box2 = new THREE.Box3().setFromObject(photo) // acostada + escalada
  const center2 = box2.getCenter(new THREE.Vector3())
  photo.position.x += position.x - center2.x
  photo.position.z += position.z - center2.z
  photo.position.y += position.y - box2.min.y
  photo.updateMatrixWorld(true)

  const photoBox = new THREE.Box3().setFromObject(photo)
  const photoBaseY = photo.position.y
  const photoTopY = photoBox.max.y
  const photoCenter = photoBox.getCenter(new THREE.Vector3())

  // --- Cámara: escalar a CAM_HEIGHT de alto, apoyar sobre el tope de la foto, centrada en xz ---
  const camBox0 = new THREE.Box3().setFromObject(camera)
  const camSize0 = camBox0.getSize(new THREE.Vector3())
  const camScale = CAM_HEIGHT / camSize0.y
  camera.scale.setScalar(camScale)
  camera.updateMatrixWorld(true)

  const camBox1 = new THREE.Box3().setFromObject(camera)
  const camCenter1 = camBox1.getCenter(new THREE.Vector3())
  camera.position.x += photoCenter.x - camCenter1.x
  camera.position.z += photoCenter.z - camCenter1.z
  camera.position.y += photoTopY - camBox1.min.y
  camera.updateMatrixWorld(true)

  const camBaseY = camera.position.y
  const restCamRotY = camera.rotation.y

  const group = new THREE.Group()
  group.name = '__table-set'
  group.add(photo)
  group.add(camera)
  scene.add(group)

  let target = 0
  let p = 0
  const tiltQuaternion = new THREE.Quaternion()
  const tiltAxisLocal = new THREE.Vector3(1, 0, 0)

  return {
    object: group,
    toggle () {
      target = target === 1 ? 0 : 1
    },
    update (delta) {
      const diff = target - p
      const step = SPEED * delta
      p = Math.abs(diff) <= step ? target : p + Math.sign(diff) * step
      p = Math.min(1, Math.max(0, p))
      const e = p * p * (3 - 2 * p) // smoothstep

      camera.position.y = camBaseY + LIFT_CAM * e
      camera.rotation.y = restCamRotY + SPIN_CAM * e

      photo.position.y = photoBaseY + LIFT_PHOTO * e
      // inclinarse para mostrarse: rotación adicional sobre el propio eje X
      // local de la foto (ya acostada), compuesta después del reposo.
      tiltQuaternion.setFromAxisAngle(tiltAxisLocal, SHOW_TILT * e)
      photo.quaternion.copy(restQuaternion).multiply(tiltQuaternion)
    },
    dispose () {
      disposeObject(group)
    }
  }
}
