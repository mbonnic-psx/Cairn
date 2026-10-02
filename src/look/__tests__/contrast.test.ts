import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../contrast'

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('is 1 for identical colours', () => {
    expect(contrastRatio('#7a6a55', '#7a6a55')).toBeCloseTo(1, 5)
  })

  it('matches the published WCAG value for #767676 on white (4.54:1)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })

  it('does not depend on the order of the pair', () => {
    expect(contrastRatio('#ffffff', '#767676')).toBe(contrastRatio('#767676', '#ffffff'))
  })

  it('accepts upper case and shorthand hex', () => {
    expect(contrastRatio('#FFF', '#000')).toBeCloseTo(21, 5)
  })
})
