import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { realBounds } from './measure.js'
import { createSocialIcon, disposeSocialIcon } from './socialIcons.js'

const TARGET_WIDTH = 0.28
const SPEED = 1.6

const ICON_SIZE = 0.07 // 7 cm de alto
const ICON_RISE = 0.20 // sube 20 cm sobre la mesa
const ICON_BOB = 0.012 // amplitud del cabeceo
const ICON_GAP = 0.095 // separación lateral entre íconos en fila

export async function createLaptop ({ THREE, scene, camera, position, rotationY = 0 }) {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const gltf = await loader.loadAsync('/models/laptop.glb')

  let telegram = null
  try {
    const telegramGltf = await loader.loadAsync('/models/telegram.glb')
    telegram = telegramGltf.scene
  } catch (err) {
    console.warn('createLaptop: no se pudo cargar el ícono de telegram', err)
  }

  const linkedin = createSocialIcon({ THREE, kind: 'linkedin' })
  const xIcon = createSocialIcon({ THREE, kind: 'x' })

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

  // eje perpendicular a la línea de visión de la vista home: los deja en fila
  const ROW_AXIS = new THREE.Vector3(0.6, 0, -0.8).normalize()

  // [objeto, offset lateral, retardo de aparición, corrección de yaw]
  const iconConfigs = [
    // el disco del GLB de telegram tiene su cara en el eje X local, no en Z
    { kind: 'telegram', obj: telegram, side: -1, delay: 0.00, yawOffset: -Math.PI / 2 },
    { kind: 'linkedin', obj: linkedin, side: 0, delay: 0.06, yawOffset: 0 },
    { kind: 'x', obj: xIcon, side: 1, delay: 0.12, yawOffset: 0 }
  ]

  const icons = []
  for (const cfg of iconConfigs) {
    const obj = cfg.obj
    if (!obj) continue

    let iconScale
    if (obj === telegram) {
      const iconBox0 = realBounds(THREE, obj)
      const iconSize0 = iconBox0.getSize(new THREE.Vector3())
      iconScale = ICON_SIZE / Math.max(iconSize0.x, iconSize0.y, iconSize0.z)
    } else {
      // discos de socialIcons.js: diámetro 1, así que la escala es directamente ICON_SIZE
      iconScale = ICON_SIZE
    }

    obj.scale.setScalar(iconScale)
    obj.visible = false
    // NO como hijo de la laptop: no debe heredar su escala/rotación
    scene.add(obj)

    const start = position.clone().add(new THREE.Vector3(0, 0.03, 0))
    const end = position.clone()
      .add(ROW_AXIS.clone().multiplyScalar(cfg.side * ICON_GAP))
      .add(new THREE.Vector3(0, ICON_RISE, 0))
    obj.position.copy(start)

    icons.push({ kind: cfg.kind, obj, scale: iconScale, start, end, delay: cfg.delay, yawOffset: cfg.yawOffset })
  }

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
  let clock = 0

  return {
    object,
    // [{ kind, object }] para que Scene.vue registre los que tengan link.
    iconTargets: icons.map(it => ({ kind: it.kind, object: it.obj })),
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

      if (icons.length) clock += delta
      icons.forEach((it, i) => {
        // el ícono recién emerge cuando la tapa ya está bastante abierta,
        // con un retardo propio para lograr un efecto de cascada
        // el retardo acorta el tramo de animación del ícono; hay que re-normalizarlo
        // o los íconos escalonados nunca completan su escala/posición final
        const span = 0.55 - it.delay
        const q = span > 0 ? Math.min(Math.max((e - 0.45 - it.delay) / span, 0), 1) : 1
        const qe = q * q * (3 - 2 * q)
        it.obj.visible = qe > 0.001
        it.obj.scale.setScalar(it.scale * qe) // crece desde 0 (efecto "sale de adentro")
        it.obj.position.lerpVectors(it.start, it.end, qe)
        if (qe > 0) {
          // billboard horizontal: siempre de frente a la cámara, para que el logo sea legible
          it.obj.rotation.y = Math.atan2(camera.position.x - it.obj.position.x, camera.position.z - it.obj.position.z) + it.yawOffset
          it.obj.position.y += Math.sin(clock * 1.6 + i) * ICON_BOB * qe // cabeceo suave al flotar, desfasado
        }
      })
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

      if (telegram) {
        telegram.traverse((o) => {
          o.geometry?.dispose?.()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) {
            if (!m) continue
            for (const v of Object.values(m)) v?.isTexture && v.dispose()
            m.dispose?.()
          }
          o.skeleton?.dispose()
        })
        telegram.removeFromParent()
      }

      disposeSocialIcon(linkedin)
      disposeSocialIcon(xIcon)
    }
  }
}
