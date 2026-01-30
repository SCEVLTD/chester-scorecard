import { describe, it, expect } from 'vitest'
import {
  scoreFinancialMetric,
  scoreOverheads,
  calculateFinancialSubtotal,
  calculateProductivityVariance,
  scoreProductivity,
  calculateTotalScore,
  getRagStatus,
  calculateTrend,
  LEADERSHIP_SCORES,
  MARKET_DEMAND_SCORES,
  MARKETING_SCORES,
  PRODUCT_SCORES,
  SUPPLIER_SCORES,
  SALES_SCORES,
} from './scoring'

describe('scoreFinancialMetric', () => {
  it('returns 10 for variance >= +10%', () => {
    expect(scoreFinancialMetric(10)).toBe(10)
    expect(scoreFinancialMetric(15)).toBe(10)
    expect(scoreFinancialMetric(100)).toBe(10)
  })

  it('returns 8 for variance +5% to +9%', () => {
    expect(scoreFinancialMetric(5)).toBe(8)
    expect(scoreFinancialMetric(9)).toBe(8)
    expect(scoreFinancialMetric(9.9)).toBe(8)
  })

  it('returns 6 for variance -4% to +4%', () => {
    expect(scoreFinancialMetric(0)).toBe(6)
    expect(scoreFinancialMetric(4)).toBe(6)
    expect(scoreFinancialMetric(4.9)).toBe(6)
    expect(scoreFinancialMetric(-4)).toBe(6)
  })

  it('returns 3 for variance -9% to -5%', () => {
    expect(scoreFinancialMetric(-5)).toBe(3)
    expect(scoreFinancialMetric(-9)).toBe(3)
    expect(scoreFinancialMetric(-4.1)).toBe(3)
  })

  it('returns 0 for variance <= -10%', () => {
    expect(scoreFinancialMetric(-10)).toBe(0)
    expect(scoreFinancialMetric(-50)).toBe(0)
    expect(scoreFinancialMetric(-100)).toBe(0)
  })

  it('handles NaN by returning 0', () => {
    expect(scoreFinancialMetric(NaN)).toBe(0)
  })
})

describe('scoreOverheads', () => {
  it('returns 10 when 10%+ under budget (variance <= -10%)', () => {
    expect(scoreOverheads(-10)).toBe(10)
    expect(scoreOverheads(-20)).toBe(10)
    expect(scoreOverheads(-100)).toBe(10)
  })

  it('returns 8 when 5-9% under budget (-9% to -5%)', () => {
    expect(scoreOverheads(-9)).toBe(8)
    expect(scoreOverheads(-5)).toBe(8)
    expect(scoreOverheads(-9.9)).toBe(8)
  })

  it('returns 6 when on target (-4% to +4%)', () => {
    expect(scoreOverheads(0)).toBe(6)
    expect(scoreOverheads(4)).toBe(6)
    expect(scoreOverheads(-4)).toBe(6)
    expect(scoreOverheads(-4.9)).toBe(6)
  })

  it('returns 3 when 5-9% over budget (+5% to +9%)', () => {
    expect(scoreOverheads(5)).toBe(3)
    expect(scoreOverheads(9)).toBe(3)
    expect(scoreOverheads(4.1)).toBe(3)
  })

  it('returns 0 when 10%+ over budget (variance >= +10%)', () => {
    expect(scoreOverheads(10)).toBe(0)
    expect(scoreOverheads(50)).toBe(0)
    expect(scoreOverheads(100)).toBe(0)
  })

  it('handles NaN by returning 0', () => {
    expect(scoreOverheads(NaN)).toBe(0)
  })
})

describe('calculateFinancialSubtotal', () => {
  it('sums all four financial scores correctly - all excellent', () => {
    // Revenue +15% (10) + GP +15% (10) + Overheads -15% (10) + Net +15% (10) = 40
    const result = calculateFinancialSubtotal(15, 15, -15, 15)
    expect(result).toBe(40)
  })

  it('calculates mixed performance correctly', () => {
    // Revenue +10% (10) + GP 0% (6) + Overheads +5% (3) + Net -10% (0) = 19
    const result = calculateFinancialSubtotal(10, 0, 5, -10)
    expect(result).toBe(19)
  })

  it('returns 0 for all poor performance', () => {
    // Revenue -15% (0) + GP -15% (0) + Overheads +15% (0) + Net -15% (0) = 0
    const result = calculateFinancialSubtotal(-15, -15, 15, -15)
    expect(result).toBe(0)
  })

  it('returns 24 for all on-target (neutral) performance', () => {
    // All 0% variance: 6+6+6+6 = 24
    const result = calculateFinancialSubtotal(0, 0, 0, 0)
    expect(result).toBe(24)
  })
})

describe('calculateProductivityVariance', () => {
  it('calculates positive variance correctly', () => {
    // Benchmark 2.0, Actual 2.3 = 15% improvement
    expect(calculateProductivityVariance(2.0, 2.3)).toBeCloseTo(15, 5)
  })

  it('calculates negative variance correctly', () => {
    // Benchmark 2.0, Actual 1.8 = -10%
    expect(calculateProductivityVariance(2.0, 1.8)).toBeCloseTo(-10, 5)
  })

  it('returns 0 when benchmark is 0', () => {
    expect(calculateProductivityVariance(0, 2.0)).toBe(0)
  })

  it('handles NaN inputs', () => {
    expect(calculateProductivityVariance(NaN, 2.0)).toBe(0)
    expect(calculateProductivityVariance(2.0, NaN)).toBe(0)
  })

  it('calculates correctly for typical GP/Wages ratios', () => {
    // Benchmark 2.5, Actual 2.75 = 10% improvement
    expect(calculateProductivityVariance(2.5, 2.75)).toBe(10)
  })
})

describe('scoreProductivity', () => {
  it('returns 10 for variance >= +15%', () => {
    expect(scoreProductivity(15)).toBe(10)
    expect(scoreProductivity(30)).toBe(10)
  })

  it('returns 8 for variance +5% to +14%', () => {
    expect(scoreProductivity(5)).toBe(8)
    expect(scoreProductivity(14)).toBe(8)
    expect(scoreProductivity(14.9)).toBe(8)
  })

  it('returns 6 for variance -4% to +4%', () => {
    expect(scoreProductivity(0)).toBe(6)
    expect(scoreProductivity(4)).toBe(6)
    expect(scoreProductivity(-4)).toBe(6)
  })

  it('returns 3 for variance -5% to -14%', () => {
    expect(scoreProductivity(-5)).toBe(3)
    expect(scoreProductivity(-14)).toBe(3)
    expect(scoreProductivity(-4.1)).toBe(3)
  })

  it('returns 0 for variance <= -15%', () => {
    expect(scoreProductivity(-15)).toBe(0)
    expect(scoreProductivity(-30)).toBe(0)
  })

  it('handles NaN by returning 0', () => {
    expect(scoreProductivity(NaN)).toBe(0)
  })
})

describe('getRagStatus', () => {
  it('returns green for score >= 75', () => {
    expect(getRagStatus(75)).toBe('green')
    expect(getRagStatus(100)).toBe('green')
    expect(getRagStatus(99)).toBe('green')
  })

  it('returns amber for score >= 60 and < 75', () => {
    expect(getRagStatus(60)).toBe('amber')
    expect(getRagStatus(74)).toBe('amber')
    expect(getRagStatus(74.9)).toBe('amber')
  })

  it('returns red for score < 60', () => {
    expect(getRagStatus(59)).toBe('red')
    expect(getRagStatus(59.9)).toBe('red')
    expect(getRagStatus(0)).toBe('red')
  })
})

describe('calculateTrend', () => {
  it('returns null when no previous score', () => {
    expect(calculateTrend(75, null)).toBeNull()
  })

  it('returns up when current > previous', () => {
    const result = calculateTrend(80, 70)
    expect(result?.direction).toBe('up')
    expect(result?.change).toBe(10)
  })

  it('returns down when current < previous', () => {
    const result = calculateTrend(60, 70)
    expect(result?.direction).toBe('down')
    expect(result?.change).toBe(-10)
  })

  it('returns same when scores are equal', () => {
    const result = calculateTrend(70, 70)
    expect(result?.direction).toBe('same')
    expect(result?.change).toBe(0)
  })

  it('handles small changes correctly', () => {
    const result = calculateTrend(75.5, 74.5)
    expect(result?.direction).toBe('up')
    expect(result?.change).toBe(1)
  })
})

describe('Qualitative score maps', () => {
  it('LEADERSHIP_SCORES has correct values', () => {
    expect(LEADERSHIP_SCORES.aligned).toBe(10)
    expect(LEADERSHIP_SCORES.minor).toBe(7)
    expect(LEADERSHIP_SCORES.misaligned).toBe(3)
    expect(LEADERSHIP_SCORES.toxic).toBe(0)
  })

  it('MARKET_DEMAND_SCORES has correct max of 7.5', () => {
    expect(MARKET_DEMAND_SCORES.strong).toBe(7.5)
    expect(MARKET_DEMAND_SCORES.flat).toBe(5)
    expect(MARKET_DEMAND_SCORES.softening).toBe(2.5)
    expect(MARKET_DEMAND_SCORES.decline).toBe(0)
  })

  it('MARKETING_SCORES has correct max of 7.5', () => {
    expect(MARKETING_SCORES.clear).toBe(7.5)
    expect(MARKETING_SCORES.activity).toBe(5)
    expect(MARKETING_SCORES.poor).toBe(2.5)
    expect(MARKETING_SCORES.none).toBe(0)
  })

  it('PRODUCT_SCORES has correct max of 10', () => {
    expect(PRODUCT_SCORES.differentiated).toBe(10)
    expect(PRODUCT_SCORES.adequate).toBe(6)
    expect(PRODUCT_SCORES.weak).toBe(3)
    expect(PRODUCT_SCORES.broken).toBe(0)
  })

  it('SUPPLIER_SCORES has correct max of 5', () => {
    expect(SUPPLIER_SCORES.strong).toBe(5)
    expect(SUPPLIER_SCORES.acceptable).toBe(3)
    expect(SUPPLIER_SCORES.weak).toBe(1)
    expect(SUPPLIER_SCORES.damaging).toBe(0)
  })

  it('SALES_SCORES has correct max of 10', () => {
    expect(SALES_SCORES.beating).toBe(10)
    expect(SALES_SCORES.onTarget).toBe(6)
    expect(SALES_SCORES.underperforming).toBe(3)
    expect(SALES_SCORES.none).toBe(0)
  })
})

describe('calculateTotalScore', () => {
  it('calculates full score for all excellent metrics', () => {
    const data = {
      revenueVariance: 15,
      grossProfitVariance: 15,
      overheadsVariance: -15, // Under budget is good
      netProfitVariance: 15,
      productivityBenchmark: 2.0,
      productivityActual: 2.4, // 20% above = 10 points
      leadership: 'aligned', // 10 points
      marketDemand: 'strong', // 7.5 points
      marketing: 'clear', // 7.5 points
      productStrength: 'differentiated', // 10 points
      supplierStrength: 'strong', // 5 points
      salesExecution: 'beating', // 10 points
    }

    // Financial: 10+10+10+10 = 40
    // People: 10+10 = 20
    // Market: 7.5+7.5 = 15
    // Product: 10
    // Suppliers: 5
    // Sales: 10
    // Total = 100
    expect(calculateTotalScore(data)).toBe(100)
  })

  it('handles missing optional fields gracefully', () => {
    const data = {
      revenueVariance: 0,
      grossProfitVariance: 0,
      overheadsVariance: 0,
      netProfitVariance: 0,
    }

    // Financial: 6+6+6+6 = 24
    // Productivity: benchmark 0, actual 0 -> variance 0 -> scoreProductivity(0) = 6
    // Everything else = 0
    // Total = 30
    expect(calculateTotalScore(data)).toBe(30)
  })

  it('returns 0 for all minimum scores', () => {
    const data = {
      revenueVariance: -100,
      grossProfitVariance: -100,
      overheadsVariance: 100, // Over budget
      netProfitVariance: -100,
      productivityBenchmark: 2.0,
      productivityActual: 1.0, // -50% = 0 points
      leadership: 'toxic', // 0 points
      marketDemand: 'decline', // 0 points
      marketing: 'none', // 0 points
      productStrength: 'broken', // 0 points
      supplierStrength: 'damaging', // 0 points
      salesExecution: 'none', // 0 points
    }

    expect(calculateTotalScore(data)).toBe(0)
  })

  it('handles invalid qualitative values by returning 0 for those sections', () => {
    const data = {
      revenueVariance: 0,
      grossProfitVariance: 0,
      overheadsVariance: 0,
      netProfitVariance: 0,
      leadership: 'invalid_value',
      marketDemand: 'invalid_value',
    }

    // Financial: 24, Productivity: 6 (variance 0 = on target), invalid qualitative = 0
    // Total = 30
    expect(calculateTotalScore(data)).toBe(30)
  })

  it('calculates mid-range score correctly', () => {
    const data = {
      revenueVariance: 5, // 8 points
      grossProfitVariance: 0, // 6 points
      overheadsVariance: 0, // 6 points
      netProfitVariance: -5, // 3 points
      productivityBenchmark: 2.0,
      productivityActual: 2.1, // 5% = 8 points
      leadership: 'minor', // 7 points
      marketDemand: 'flat', // 5 points
      marketing: 'activity', // 5 points
      productStrength: 'adequate', // 6 points
      supplierStrength: 'acceptable', // 3 points
      salesExecution: 'onTarget', // 6 points
    }

    // Financial: 8+6+6+3 = 23
    // People: 8+7 = 15
    // Market: 5+5 = 10
    // Product: 6
    // Suppliers: 3
    // Sales: 6
    // Total = 63
    expect(calculateTotalScore(data)).toBe(63)
  })
})
