export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DataRequestStatus = 'pending' | 'submitted' | 'used'

export interface Database {
  public: {
    Tables: {
      data_requests: {
        Row: {
          id: string
          business_id: string
          month: string
          token: string
          status: DataRequestStatus
          expires_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          month: string
          token: string
          status?: DataRequestStatus
          expires_at: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          month?: string
          token?: string
          status?: DataRequestStatus
          expires_at?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'data_requests_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      company_submissions: {
        Row: {
          id: string
          data_request_id: string
          revenue_actual: number
          revenue_target: number
          gross_profit_actual: number
          gross_profit_target: number
          overheads_actual: number
          overheads_budget: number
          net_profit_actual: number
          net_profit_target: number
          net_profit_override: boolean
          total_wages: number
          productivity_benchmark: number
          // Qualitative inputs from company
          company_biggest_opportunity: string | null
          company_biggest_risk: string | null
          company_challenges: string | null
          company_wins: string | null
          // Metadata
          submitted_at: string
          submitted_by_name: string | null
          submitted_by_email: string | null
        }
        Insert: {
          id?: string
          data_request_id: string
          revenue_actual: number
          revenue_target: number
          gross_profit_actual: number
          gross_profit_target: number
          overheads_actual: number
          overheads_budget: number
          net_profit_actual: number
          net_profit_target: number
          net_profit_override?: boolean
          total_wages: number
          productivity_benchmark: number
          company_biggest_opportunity?: string | null
          company_biggest_risk?: string | null
          company_challenges?: string | null
          company_wins?: string | null
          submitted_at?: string
          submitted_by_name?: string | null
          submitted_by_email?: string | null
        }
        Update: {
          id?: string
          data_request_id?: string
          revenue_actual?: number
          revenue_target?: number
          gross_profit_actual?: number
          gross_profit_target?: number
          overheads_actual?: number
          overheads_budget?: number
          net_profit_actual?: number
          net_profit_target?: number
          net_profit_override?: boolean
          total_wages?: number
          productivity_benchmark?: number
          company_biggest_opportunity?: string | null
          company_biggest_risk?: string | null
          company_challenges?: string | null
          company_wins?: string | null
          submitted_at?: string
          submitted_by_name?: string | null
          submitted_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_submissions_data_request_id_fkey'
            columns: ['data_request_id']
            isOneToOne: true
            referencedRelation: 'data_requests'
            referencedColumns: ['id']
          }
        ]
      }
      businesses: {
        Row: {
          id: string
          name: string
          sector_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sector_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sector_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'businesses_sector_id_fkey'
            columns: ['sector_id']
            isOneToOne: false
            referencedRelation: 'sectors'
            referencedColumns: ['id']
          }
        ]
      }
      sectors: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      scorecards: {
        Row: {
          id: string
          business_id: string
          month: string
          consultant_name: string
          // Financial variances (nullable)
          revenue_variance: number | null
          gross_profit_variance: number | null
          overheads_variance: number | null
          net_profit_variance: number | null
          // People/HR (nullable)
          productivity_benchmark: number | null
          productivity_actual: number | null
          leadership: string | null
          // Market (nullable)
          market_demand: string | null
          marketing: string | null
          // Product (nullable)
          product_strength: string | null
          // Suppliers (nullable)
          supplier_strength: string | null
          // Sales (nullable)
          sales_execution: string | null
          // Commentary (mandatory - NOT NULL in database)
          biggest_opportunity: string
          biggest_risk: string
          management_avoiding: string
          leadership_confidence: string
          consultant_gut_feel: string
          // Computed at insert time
          total_score: number
          rag_status: string
          // AI Analysis
          ai_analysis: Json | null
          ai_analysis_generated_at: string | null
          // Company submission link
          company_submission_id: string | null
          // Timestamps
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          month: string
          consultant_name: string
          // Financial variances (optional)
          revenue_variance?: number | null
          gross_profit_variance?: number | null
          overheads_variance?: number | null
          net_profit_variance?: number | null
          // People/HR (optional)
          productivity_benchmark?: number | null
          productivity_actual?: number | null
          leadership?: string | null
          // Market (optional)
          market_demand?: string | null
          marketing?: string | null
          // Product (optional)
          product_strength?: string | null
          // Suppliers (optional)
          supplier_strength?: string | null
          // Sales (optional)
          sales_execution?: string | null
          // Commentary (mandatory)
          biggest_opportunity: string
          biggest_risk: string
          management_avoiding: string
          leadership_confidence: string
          consultant_gut_feel: string
          // Computed at insert time (mandatory)
          total_score: number
          rag_status: string
          // AI Analysis
          ai_analysis?: Json | null
          ai_analysis_generated_at?: string | null
          // Company submission link
          company_submission_id?: string | null
          // Timestamps (auto-generated)
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          month?: string
          consultant_name?: string
          revenue_variance?: number | null
          gross_profit_variance?: number | null
          overheads_variance?: number | null
          net_profit_variance?: number | null
          productivity_benchmark?: number | null
          productivity_actual?: number | null
          leadership?: string | null
          market_demand?: string | null
          marketing?: string | null
          product_strength?: string | null
          supplier_strength?: string | null
          sales_execution?: string | null
          biggest_opportunity?: string
          biggest_risk?: string
          management_avoiding?: string
          leadership_confidence?: string
          consultant_gut_feel?: string
          total_score?: number
          rag_status?: string
          ai_analysis?: Json | null
          ai_analysis_generated_at?: string | null
          company_submission_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scorecards_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Business = Database['public']['Tables']['businesses']['Row']
export type BusinessInsert = Database['public']['Tables']['businesses']['Insert']

export type Scorecard = Database['public']['Tables']['scorecards']['Row']
export type ScorecardInsert = Database['public']['Tables']['scorecards']['Insert']

export type DataRequest = Database['public']['Tables']['data_requests']['Row']
export type DataRequestInsert = Database['public']['Tables']['data_requests']['Insert']

export type CompanySubmission = Database['public']['Tables']['company_submissions']['Row']
export type CompanySubmissionInsert = Database['public']['Tables']['company_submissions']['Insert']

export type Sector = Database['public']['Tables']['sectors']['Row']
export type SectorInsert = Database['public']['Tables']['sectors']['Insert']
