import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export async function loadModel (onProgress = () => {}) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const gltf = await loader.loadAsync('/models/loft.glb', (e) => {
    if (e.total > 0) onProgress(Math.round((e.loaded / e.total) * 100))
  })
  draco.dispose()
  return gltf.scene
}
