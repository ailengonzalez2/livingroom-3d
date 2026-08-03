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

  const home = {
    pos: [center.x + radius * 1.35, center.y + size.y * 0.25, center.z + radius * 1.35],
    target: [center.x - radius * 0.15, center.y - size.y * 0.3, center.z]
  }
  controls.setLookAt(...home.pos, ...home.target, false)

  return {
    update: delta => controls.update(delta),
    focusObject (object3d, padding = 0.35) {
      return controls.fitToBox(object3d, true, {
        paddingLeft: padding, paddingRight: padding, paddingTop: padding, paddingBottom: padding
      })
    },
    reset: () => controls.setLookAt(...home.pos, ...home.target, true),
    setEnabled (v) { controls.enabled = v },
    dispose: () => controls.dispose()
  }
}
