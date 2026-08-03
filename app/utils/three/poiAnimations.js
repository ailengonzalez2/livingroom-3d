// Cada animación recibe { THREE, scene, meshes } y debe ser reversible en onBlur.
export const poiAnimations = {
  lamp: {
    onFocus ({ THREE, scene, meshes }) {
      const target = meshes[0]
      if (!target) return
      const center = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3())
      const light = new THREE.PointLight(0xffd9a0, 6, 4, 1.6)
      light.position.copy(center)
      light.name = '__lamp-light'
      scene.add(light)
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.emissive) continue
          m.userData.animSaved = { hex: m.emissive.getHex(), i: m.emissiveIntensity }
          m.emissive.setHex(0xffd9a0)
          m.emissiveIntensity = 0.9
        }
      }
    },
    onBlur ({ scene, meshes }) {
      scene.getObjectByName('__lamp-light')?.removeFromParent()
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.userData.animSaved) continue
          m.emissive.setHex(m.userData.animSaved.hex)
          m.emissiveIntensity = m.userData.animSaved.i
          delete m.userData.animSaved
        }
      }
    }
  },

  tv: {
    onFocus ({ meshes }) {
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.emissive) continue
          m.userData.animSaved = { hex: m.emissive.getHex(), i: m.emissiveIntensity }
          m.emissive.setHex(0x9ecbff)
          m.emissiveIntensity = 1.4
        }
      }
    },
    onBlur ({ meshes }) {
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          if (!m.userData.animSaved) continue
          m.emissive.setHex(m.userData.animSaved.hex)
          m.emissiveIntensity = m.userData.animSaved.i
          delete m.userData.animSaved
        }
      }
    }
  }
}
