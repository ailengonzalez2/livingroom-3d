import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// Carga un prop decorativo estático, lo escala a targetHeight y lo apoya
// con su base sobre `position`.
export async function placeDecor ({ THREE, scene, url, position, targetHeight, rotationY = 0 }) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync(url)
  draco.dispose()

  const object = gltf.scene
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = targetHeight / size.y
  object.scale.setScalar(scale)
  object.rotation.y = rotationY
  object.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(object)
  const center = box2.getCenter(new THREE.Vector3())
  object.position.x += position.x - center.x
  object.position.z += position.z - center.z
  object.position.y += position.y - box2.min.y
  scene.add(object)
  return object
}
