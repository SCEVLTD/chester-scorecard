export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DataRequestStatus = 'pending' | 'submitted' | 'used'

export type ActionStatus = 'pending' | 'complete'

export interface Database {
  public: {
    Tables: {
      actions: {
        Row: {
          id: string
          business_id: string
          description: string
          owner: string
          due_date: string
          status: ActionStatus
          created_at: string
          completed_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          business_id: string
          description: string
          owner: string
          due_date: string
          status?: ActionStatus
          created_at?: string
          completed_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          description?: string
          owner?: string
          due_date?: string
          status?: ActionStatus
          created_at?: string
          completed_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'actions_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
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
          // N/A flags - allows sections to be marked as not applicable
          revenue_na: boolean
          gross_profit_na: boolean
          overheads_na: boolean
          wages_na: boolean
          // Financial data (nullable when N/A)
          revenue_actual: number | null
          revenue_target: number | null
          gross_profit_actual: number | null
          gross_profit_target: number | null
          overheads_actual: number | null
          overheads_budget: number | null
          net_profit_actual: number | null
          net_profit_target: number | null
          net_profit_override: boolean
          total_wages: number | null
          productivity_benchmark: number | null
          // Lead KPIs
          outbound_calls: number | null
          first_orders: number | null
          // Qualitative scoring (self-assessment)
          leadership: string | null
          market_demand: string | null
          marketing: string | null
          product_strength: string | null
          supplier_strength: string | null
          sales_execution: string | null
          // Qualitative inputs from company (commentary)
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
          // N/A flags
          revenue_na?: boolean
          gross_profit_na?: boolean
          overheads_na?: boolean
          wages_na?: boolean
          // Financial data (nullable when N/A)
          revenue_actual?: number | null
          revenue_target?: number | null
          gross_profit_actual?: number | null
          gross_profit_target?: number | null
          overheads_actual?: number | null
          overheads_budget?: number | null
          net_profit_actual?: number | null
          net_profit_target?: number | null
          net_profit_override?: boolean
          total_wages?: number | null
          productivity_benchmark?: number | null
          // Lead KPIs (optional)
          outbound_calls?: number | null
          first_orders?: number | null
          // Qualitative scoring (optional)
          leadership?: string | null
          market_demand?: string | null
          marketing?: string | null
          product_strength?: string | null
          supplier_strength?: string | null
          sales_execution?: string | null
          // Commentary (optional)
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
          // N/A flags
          revenue_na?: boolean
          gross_profit_na?: boolean
          overheads_na?: boolean
          wages_na?: boolean
          // Financial data
          revenue_actual?: number | null
          revenue_target?: number | null
          gross_profit_actual?: number | null
          gross_profit_target?: number | null
          overheads_actual?: number | null
          overheads_budget?: number | null
          net_profit_actual?: number | null
          net_profit_target?: number | null
          net_profit_override?: boolean
          total_wages?: number | null
          productivity_benchmark?: number | null
          // Lead KPIs
          outbound_calls?: number | null
          first_orders?: number | null
          // Qualitative scoring
          leadership?: string | null
          market_demand?: string | null
          marketing?: string | null
          product_strength?: string | null
          supplier_strength?: string | null
          sales_execution?: string | null
          // Commentary
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
          contact_email: string | null
          contact_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sector_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sector_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
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
      company_emails: {
        Row: {
          id: string
          business_id: string
          email: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          email: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          email?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'company_emails_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
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

export type Action = Database['public']['Tables']['actions']['Row']
export type ActionInsert = Database['public']['Tables']['actions']['Insert']
export type ActionUpdate = Database['public']['Tables']['actions']['Update']

export type CompanyEmail = Database['public']['Tables']['company_emails']['Row']
export type CompanyEmailInsert = Database['public']['Tables']['company_emails']['Insert']
