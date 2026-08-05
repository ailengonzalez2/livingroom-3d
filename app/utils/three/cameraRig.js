import CameraControls from 'camera-controls'

let installed = false

export function createCameraRig ({ THREE, camera, domElement, model, bounds = null }) {
  if (!installed) { CameraControls.install({ THREE }); installed = true }

  const controls = new CameraControls(camera, domElement)
  controls.smoothTime = 0.35
  controls.draggingSmoothTime = 0.12

  // Límites derivados del interior del loft (o del modelo entero si no se pasan bounds).
  const box = bounds ?? new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const radius = Math.max(size.x, size.z) / 2

  controls.minDistance = radius * 0.15
  controls.maxDistance = radius * 2.2
  controls.maxPolarAngle = Math.PI / 2.05          // nunca por debajo del piso
  controls.minPolarAngle = Math.PI / 6
  controls.setBoundary(box)                        // el target no sale del loft

  // Encuadre inicial (y el de "Vista general"). Bajar HOME_DISTANCE acerca la
  // cámara y deja menos fondo vacío alrededor del loft; subirlo lo aleja.
  const HOME_DISTANCE = 1.25
  // Ángulo de órbita en el plano horizontal. 45° es la diagonal pura entre los
  // dos ejes; moverlo gira la vista hacia una cara más frontal del loft.
  const HOME_AZIMUTH = Math.PI / 6

  // El √2 conserva la distancia que daba la diagonal original, para que cambiar
  // solo el ángulo no cambie además cuánto se acerca la cámara.
  const homeDist = radius * HOME_DISTANCE * Math.SQRT2

  const home = {
    pos: [
      center.x + homeDist * Math.sin(HOME_AZIMUTH),
      center.y + size.y * 0.25,
      center.z + homeDist * Math.cos(HOME_AZIMUTH)
    ],
    target: [center.x - radius * 0.15, center.y - size.y * 0.3, center.z]
  }
  controls.setLookAt(...home.pos, ...home.target, false)

  let fittedDistance = null

  // Ángulo vertical del encuadre de foco. Apenas por encima de la horizontal:
  // más chico mira el objeto desde arriba y llena el cuadro de piso, más grande
  // deja la cámara al ras y los objetos apoyados los tapa la mesa o el pedestal.
  const FOCUS_POLAR = Math.PI * 0.42
  // Tope de acercamiento: por más grande que sea el POI, la cámara no se va
  // tan atrás como para atravesar la pared de enfrente.
  const MAX_FOCUS_DISTANCE = radius * 1.6

  const _box = new THREE.Box3()
  const _size = new THREE.Vector3()
  const _at = new THREE.Vector3()
  const _dir = new THREE.Vector3()

  return {
    update: delta => controls.update(delta),
    async focusObject (object3d, padding = 0.35) {
      _box.setFromObject(object3d)
      _box.getSize(_size)
      _box.getCenter(_at)

      // Misma distancia que daba fitToBox: el bulto real más el padding.
      const dist = THREE.MathUtils.clamp(
        controls.getDistanceToFitBox(_size.x + padding * 2, _size.y + padding * 2, _size.z + padding * 2),
        controls.minDistance,
        Math.min(controls.maxDistance, MAX_FOCUS_DISTANCE)
      )

      // "De frente" = desde el lado por el que el objeto mira al ambiente.
      // Casi todos los POIs están contra una pared, así que el vector que va del
      // objeto al centro del loft es su frente, y sale distinto para cada uno:
      // antes `fitToBox` conservaba la orientación que traía la cámara y todos
      // se miraban desde el mismo costado. Si el objeto cae sobre el centro el
      // vector degenera y no hay frente que deducir: se usa el azimut del
      // encuadre general.
      _dir.set(center.x - _at.x, 0, center.z - _at.z)
      const azimuth = _dir.lengthSq() < 1e-4 ? HOME_AZIMUTH : Math.atan2(_dir.x, _dir.z)
      const horizontal = dist * Math.sin(FOCUS_POLAR)

      await controls.setLookAt(
        _at.x + horizontal * Math.sin(azimuth),
        _at.y + dist * Math.cos(FOCUS_POLAR),
        _at.z + horizontal * Math.cos(azimuth),
        _at.x, _at.y, _at.z,
        true
      )
      fittedDistance = controls.distance
    },
    isZoomedOut (factor = 1.7) {
      return fittedDistance !== null && controls.distance > fittedDistance * factor
    },
    clearFocusDistance () { fittedDistance = null },
    reset () {
      fittedDistance = null
      return controls.setLookAt(...home.pos, ...home.target, true)
    },
    setEnabled (v) { controls.enabled = v },
    dispose: () => controls.dispose()
  }
}
