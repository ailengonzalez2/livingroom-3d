import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { realBounds } from './measure.js'

const PHOTO_WIDTH = 0.10
const CAM_HEIGHT = 0.11
const SPEED = 1.6
const LIFT_CAM = 0.14
const CAM_SPIN = 0.5
const CAM_REST_Y = 0.3
const LIFT_PHOTO = 0.10
const SHOW_TILT_ANGLE = 1.05
// El frente de la cámara apunta a +Z local (verificado midiendo qué meshes
// sobresalen). En reposo queda apenas girada; al mostrarse gira hacia el
// observador de la vista home (~+X/+Z).
const SHOW_AXIS = [0.6, 0, -0.8]

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

  const box1 = realBounds(THREE, photo) // acostada, escala 1
  const size1 = box1.getSize(new THREE.Vector3())
  const photoScale = PHOTO_WIDTH / Math.max(size1.x, size1.z)
  photo.scale.setScalar(photoScale)
  photo.updateMatrixWorld(true)

  const box2 = realBounds(THREE, photo) // acostada + escalada
  const center2 = box2.getCenter(new THREE.Vector3())
  photo.position.x += position.x - center2.x
  photo.position.z += position.z - center2.z
  photo.position.y += position.y + 0.0005 - box2.min.y
  photo.updateMatrixWorld(true)

  const photoBox = realBounds(THREE, photo)
  const photoBaseY = photo.position.y
  const photoTopY = photoBox.max.y

  // --- Cámara: apenas girada en reposo (frente a +Z local), escalar a
  // CAM_HEIGHT de alto, apoyar sobre el tope real de la foto, centrada en xz
  // sobre `position` ---
  camera.rotation.y = CAM_REST_Y
  camera.updateMatrixWorld(true)

  const camBox0 = realBounds(THREE, camera)
  const camSize0 = camBox0.getSize(new THREE.Vector3())
  const camScale = CAM_HEIGHT / camSize0.y
  camera.scale.setScalar(camScale)
  camera.updateMatrixWorld(true)

  const camBox1 = realBounds(THREE, camera)
  const camCenter1 = camBox1.getCenter(new THREE.Vector3())
  camera.position.x += position.x - camCenter1.x
  camera.position.z += position.z - camCenter1.z
  camera.position.y += photoTopY + 0.0005 - camBox1.min.y
  camera.updateMatrixWorld(true)

  const camBaseY = camera.position.y
  const restCamRotY = CAM_REST_Y

  const group = new THREE.Group()
  group.name = '__table-set'
  group.add(photo)
  group.add(camera)
  scene.add(group)

  let target = 0
  let p = 0

  // Quaternion "mostrada": se levanta hacia el observador de la vista home,
  // compuesto en espacio MUNDO (premultiplicado) sobre el quaternion de
  // reposo — no por Euler, que pelea con la orientación compuesta de reposo.
  const qRest = photo.quaternion.clone()
  const qDelta = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(...SHOW_AXIS).normalize(),
    SHOW_TILT_ANGLE
  )
  const qShown = qDelta.clone().multiply(qRest)

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
      camera.rotation.y = restCamRotY + CAM_SPIN * e

      photo.position.y = photoBaseY + LIFT_PHOTO * e
      photo.quaternion.slerpQuaternions(qRest, qShown, e)
    },
    dispose () {
      disposeObject(group)
    }
  }
}
