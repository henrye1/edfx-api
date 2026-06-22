import { describe, it, expect } from 'vitest'
import { RISK_COLORS, riskColor, deltaDirection, RISK_LEVELS } from '../colors'

describe('tokens/colors', () => {
  it('maps each risk level to its fixed hex', () => {
    expect(riskColor('Low')).toBe('#5BA847')
    expect(riskColor('Medium')).toBe('#F2C94C')
    expect(riskColor('High')).toBe('#F2994A')
    expect(riskColor('Severe')).toBe('#D64545')
    expect(riskColor('Need Additional Data')).toBe('#C4C9D1')
  })
  it('exposes the five levels in order', () => {
    expect(RISK_LEVELS).toEqual(['Low', 'Medium', 'High', 'Severe', 'Need Additional Data'])
  })
  it('classifies delta direction (down/green = improvement)', () => {
    expect(deltaDirection(-9)).toBe('down')
    expect(deltaDirection(14)).toBe('up')
    expect(deltaDirection(0)).toBe('flat')
  })
  it('RISK_COLORS keys match RISK_LEVELS', () => {
    expect(Object.keys(RISK_COLORS)).toEqual([...RISK_LEVELS])
  })
})
