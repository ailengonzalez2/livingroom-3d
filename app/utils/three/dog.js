import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const TARGET_HEIGHT = 0.5
const WALK_SPEED = 0.9
const TURN_SPEED = 6

export async function createDog ({ THREE, scene, floorY, waypoints }) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync('/models/shiba.glb')
  draco.dispose()

  const object = gltf.scene
  const box = new THREE.Box3().setFromObject(object)
  const scale = TARGET_HEIGHT / box.getSize(new THREE.Vector3()).y
  object.scale.setScalar(scale)
  object.position.set(waypoints[0][0], floorY, waypoints[0][1])
  scene.add(object)

  const mixer = new THREE.AnimationMixer(object)
  const clip = name => gltf.animations.find(a => a.name === name)
  const actions = {
    idle: mixer.clipAction(clip('Idle')),
    walk: mixer.clipAction(clip('Walk')),
    jump: mixer.clipAction(clip('Gallop_Jump'))
  }
  actions.jump.setLoop(THREE.LoopOnce)
  actions.idle.play()

  let current = 'idle'
  let jumping = false
  let wpIndex = 1
  const dir = new THREE.Vector3()

  function crossfade (name, dur = 0.3) {
    if (current === name) return
    actions[name].reset().fadeIn(dur).play()
    actions[current].fadeOut(dur)
    current = name
  }

  const onFinished = (e) => {
    if (e.action !== actions.jump) return
    jumping = false
    actions[current].reset().fadeIn(0.25).play()
    actions.jump.fadeOut(0.25)
  }
  mixer.addEventListener('finished', onFinished)

  return {
    object,
    setWalking (v) {
      if (jumping) return
      crossfade(v ? 'walk' : 'idle')
    },
    jump () {
      if (jumping) return
      jumping = true
      actions[current].fadeOut(0.15)
      actions.jump.reset().fadeIn(0.15).play()
    },
    update (delta) {
      mixer.update(delta)
      if (current !== 'walk' || jumping) return
      const [tx, tz] = waypoints[wpIndex]
      dir.set(tx - object.position.x, 0, tz - object.position.z)
      const dist = dir.length()
      if (dist < 0.15) { wpIndex = (wpIndex + 1) % waypoints.length; return }
      dir.normalize()
      const targetAngle = Math.atan2(dir.x, dir.z)
      let d = targetAngle - object.rotation.y
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      object.rotation.y += THREE.MathUtils.clamp(d, -TURN_SPEED * delta, TURN_SPEED * delta)
      object.position.addScaledVector(dir, WALK_SPEED * delta)
    },
    dispose () {
      mixer.stopAllAction()
      mixer.removeEventListener('finished', onFinished)
      object.traverse((o) => {
        o.geometry?.dispose?.()
        o.skeleton?.dispose()
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
