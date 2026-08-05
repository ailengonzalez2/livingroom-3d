import { describe, it, expect } from 'vitest'
import { pois, validatePois } from '../app/data/pois.js'

describe('validatePois', () => {
  it('acepta una lista válida', () => {
    expect(validatePois([
      { id: 'sofa', meshNames: ['Cube.001_Material.008_0'], title: 'Sofá', meta: 'Cuero', description: 'Un sofá.' }
    ])).toEqual([])
  })

  it('detecta ids duplicados', () => {
    const list = [
      { id: 'a', meshNames: ['m1'], title: 't', meta: 'm', description: 'd' },
      { id: 'a', meshNames: ['m2'], title: 't', meta: 'm', description: 'd' }
    ]
    expect(validatePois(list)).toContain('id duplicado: a')
  })

  it('detecta meshNames vacío y campos faltantes', () => {
    const errors = validatePois([{ id: 'x', meshNames: [] }])
    expect(errors).toContain('x: meshNames vacío')
    expect(errors).toContain('x: falta title')
    expect(errors).toContain('x: falta description')
    expect(errors).toContain('x: falta meta')
  })

  it('los POIs reales del proyecto son válidos', () => {
    expect(validatePois(pois)).toEqual([])
  })
})
