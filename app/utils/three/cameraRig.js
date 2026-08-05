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

  return {
    update: delta => controls.update(delta),
    async focusObject (object3d, padding = 0.35) {
      await controls.fitToBox(object3d, true, {
        paddingLeft: padding, paddingRight: padding, paddingTop: padding, paddingBottom: padding
      })
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
