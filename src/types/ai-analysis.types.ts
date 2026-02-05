export interface Action30Day {
  action: string
  priority: 'high' | 'medium' | 'low'
}

export interface AIAnalysis {
  execSummary: string
  topQuestions: string[]
  actions30Day: Action30Day[]
  inconsistencies: string[]
  trendBreaks: string[]
  generatedAt: string  // ISO timestamp
  modelUsed: string    // e.g., 'claude-sonnet-4-5'
  isConsultantView?: boolean  // true if generated for consultant role (no specific financial figures)
}
