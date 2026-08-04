import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const TARGET_HEIGHT = 0.5
const WALK_SPEED = 0.9
const TURN_SPEED = 6
const ARC = 0.35
const REST_DELAY = 4

export async function createDog ({ THREE, scene, floorY, waypoints, chairs = [] }) {
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
    jump: mixer.clipAction(clip('Gallop_Jump')),
    rest: mixer.clipAction(clip('Death'))
  }
  actions.jump.setLoop(THREE.LoopOnce)
  actions.rest.setLoop(THREE.LoopOnce)
  actions.rest.clampWhenFinished = true
  actions.idle.play()

  let current = 'idle'
  let airborne = false
  let onChair = false
  let resting = false
  let idleTime = 0
  let currentChair = null
  let wpIndex = 1
  const dir = new THREE.Vector3()

  const leapStart = new THREE.Vector3()
  const leapTarget = new THREE.Vector3()
  let leapT = 0
  let leapDuration = 1
  let leapOnLand = null

  function crossfade (name, dur = 0.3) {
    if (current === name) return
    actions[name].reset().fadeIn(dur).play()
    actions[current].fadeOut(dur)
    current = name
    idleTime = 0
  }

  function leapTo (target, onLand) {
    airborne = true
    idleTime = 0
    leapStart.copy(object.position)
    leapTarget.copy(target)
    leapT = 0
    leapDuration = actions.jump.getClip().duration
    leapOnLand = onLand
    const dx = target.x - object.position.x
    const dz = target.z - object.position.z
    object.rotation.y = Math.atan2(dx, dz)
    actions[current].fadeOut(0.15)
    actions.jump.reset().fadeIn(0.15).play()
  }

  function startRest () {
    resting = true
    actions.rest.reset()
    actions.rest.timeScale = 0.7
    actions.rest.fadeIn(0.25).play()
    actions[current].fadeOut(0.25)
  }

  function wakeUp () {
    if (!resting) return
    actions.rest.paused = false
    actions.rest.timeScale = -1.3
  }

  const onFinished = (e) => {
    if (e.action === actions.jump) {
      actions[current].reset().fadeIn(0.25).play()
      actions.jump.fadeOut(0.25)
      return
    }
    if (e.action === actions.rest) {
      resting = false
      actions.rest.stop()
      actions[current].reset().fadeIn(0.2).play()
      idleTime = 0
    }
  }
  mixer.addEventListener('finished', onFinished)

  return {
    object,
    setWalking (v) {
      if (airborne || onChair) return
      if (resting) {
        if (v) wakeUp()
        return
      }
      crossfade(v ? 'walk' : 'idle')
    },
    jump () {
      if (airborne) return
      if (resting) { wakeUp(); return }
      if (!onChair) {
        if (!chairs.length) return
        let nearest = null
        let nearestDist = Infinity
        for (const chair of chairs) {
          const d = object.position.distanceToSquared(chair.position)
          if (d < nearestDist) { nearestDist = d; nearest = chair }
        }
        if (!nearest) return
        currentChair = nearest
        leapTo(nearest.position, () => { onChair = true })
      } else {
        leapTo(currentChair.dismount, () => { onChair = false })
      }
    },
    update (delta) {
      mixer.update(delta)
      if (current === 'idle' && !airborne && !onChair && !resting) {
        idleTime += delta
        if (idleTime > REST_DELAY) startRest()
      }
      if (airborne) {
        leapT += delta / leapDuration
        const t = Math.min(leapT, 1)
        object.position.lerpVectors(leapStart, leapTarget, t)
        object.position.y += ARC * Math.sin(Math.PI * t)
        if (t >= 1) {
          object.position.copy(leapTarget)
          airborne = false
          const onLand = leapOnLand
          leapOnLand = null
          onLand?.()
        }
      }
      if (current !== 'walk' || airborne || onChair) return
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
