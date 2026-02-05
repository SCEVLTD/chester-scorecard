// Standard analysis action item
export interface Action30Day {
  action: string
  priority: 'high' | 'medium' | 'low'
}

// Consultant strategic recommendation
export interface StrategicRecommendation {
  recommendation: string
  priority: 'high' | 'medium' | 'low'
}

// Standard AI analysis (for company and super_admin)
export interface StandardAIAnalysis {
  execSummary: string
  topQuestions: string[]
  actions30Day: Action30Day[]
  inconsistencies: string[]
  trendBreaks: string[]
  historicalContext?: string
  eProfileConsiderations?: string
}

// Consultant AI analysis (strategic, no specific figures)
export interface ConsultantAIAnalysis {
  execSummary: string
  keyObservations: string[]
  discussionPoints: string[]
  strategicRecommendations: StrategicRecommendation[]
  redFlags: string[]
  relationshipContext: string
}

// Combined storage format - holds both versions
export interface AIAnalysisStorage {
  standard?: StandardAIAnalysis
  consultant?: ConsultantAIAnalysis
  generatedAt: string
  modelUsed: string
}

// Legacy format (for backwards compatibility with existing scorecards)
export interface LegacyAIAnalysis {
  execSummary: string
  topQuestions: string[]
  actions30Day: Action30Day[]
  inconsistencies: string[]
  trendBreaks: string[]
  generatedAt: string
  modelUsed: string
  isConsultantView?: boolean
}

// Union type for what might be stored in the database
export type AIAnalysis = AIAnalysisStorage | LegacyAIAnalysis

// Type guard to check if analysis is new format
export function isNewFormatAnalysis(analysis: AIAnalysis): analysis is AIAnalysisStorage {
  return 'standard' in analysis || 'consultant' in analysis
}

// Type guard to check if analysis is legacy format
export function isLegacyAnalysis(analysis: AIAnalysis): analysis is LegacyAIAnalysis {
  return 'topQuestions' in analysis && !('standard' in analysis)
}
