// Bounding box por VÉRTICES reales. Necesario porque Box3.setFromObject()
// transforma el bbox local de cada geometría (sus 8 esquinas) y sobreestima
// mucho cuando el modelo trae la geometría rotada internamente.
export function realBounds (THREE, root) {
  const box = new THREE.Box3()
  const v = new THREE.Vector3()
  root.updateWorldMatrix(true, true)
  root.traverse((o) => {
    if (!o.isMesh) return
    const pos = o.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld))
    }
  })
  return box
}
