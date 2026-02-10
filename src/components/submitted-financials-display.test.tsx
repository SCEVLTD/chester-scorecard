import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubmittedFinancialsDisplay } from '@/components/submitted-financials-display'
import type { CompanySubmission } from '@/types/database.types'

// Mock the auth context - mockUseAuth returns different role configs per test
const mockUseAuth = vi.fn()
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock lucide-react icons to avoid SVG rendering complexity in jsdom
vi.mock('lucide-react', () => ({
  FileCheck: () => <span data-testid="icon-file-check" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Phone: () => <span data-testid="icon-phone" />,
  ShoppingCart: () => <span data-testid="icon-shopping-cart" />,
}))

/**
 * Build a minimal CompanySubmission with sensible defaults.
 * Override any field via the partial parameter.
 */
function createMockSubmission(overrides: Partial<CompanySubmission> = {}): CompanySubmission {
  return {
    id: 'sub-001',
    data_request_id: 'dr-001',
    revenue_na: false,
    gross_profit_na: false,
    overheads_na: false,
    wages_na: false,
    revenue_actual: 120000,
    revenue_target: 100000,
    gross_profit_actual: 60000,
    gross_profit_target: 50000,
    overheads_actual: 30000,
    overheads_budget: 35000,
    net_profit_actual: 30000,
    net_profit_target: 25000,
    net_profit_override: false,
    total_wages: 40000,
    productivity_benchmark: 1.5,
    outbound_calls: 150,
    first_orders: 12,
    leadership: 'aligned',
    market_demand: 'strong',
    marketing: 'clear',
    product_strength: 'differentiated',
    supplier_strength: 'strong',
    sales_execution: 'beating',
    company_biggest_opportunity: null,
    company_biggest_risk: null,
    company_challenges: null,
    company_wins: null,
    submitted_at: '2026-01-15T10:00:00Z',
    submitted_by_name: 'John Smith',
    submitted_by_email: 'john@example.com',
    ...overrides,
  }
}

/** Helper to return a minimal auth context shape for a given role */
function mockAuthForRole(role: 'super_admin' | 'consultant' | 'business_user' | null) {
  return {
    session: role ? { access_token: 'mock' } : null,
    user: role ? { id: 'u-1', email: 'test@example.com' } : null,
    userRole: role,
    businessId: role === 'business_user' ? 'biz-001' : null,
    isLoading: false,
    isSessionExpiring: false,
    signIn: vi.fn(),
    signInWithMagicLink: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    extendSession: vi.fn(),
  }
}

describe('SubmittedFinancialsDisplay - Consultant view restrictions (AUTH-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders financial data for super_admin role', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))

    const submission = createMockSubmission()
    render(<SubmittedFinancialsDisplay submission={submission} />)

    // The component should render financial content
    expect(screen.getByText('Financial Performance')).toBeInTheDocument()
    expect(screen.getByText('Company Submitted')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('EBITDA')).toBeInTheDocument()
  })

  it('returns null (renders nothing) for consultant role', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('consultant'))

    const submission = createMockSubmission()
    const { container } = render(<SubmittedFinancialsDisplay submission={submission} />)

    // The component should render absolutely nothing
    expect(container.innerHTML).toBe('')
    expect(screen.queryByText('Financial Performance')).not.toBeInTheDocument()
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument()
    expect(screen.queryByText('EBITDA')).not.toBeInTheDocument()
  })

  it('renders financial data for business_user role', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('business_user'))

    const submission = createMockSubmission()
    render(<SubmittedFinancialsDisplay submission={submission} />)

    // Business users can see their own financial data
    expect(screen.getByText('Financial Performance')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('EBITDA')).toBeInTheDocument()
  })

  it('displays submitter name and email when provided', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))

    const submission = createMockSubmission({
      submitted_by_name: 'Jane Doe',
      submitted_by_email: 'jane@example.com',
    })
    render(<SubmittedFinancialsDisplay submission={submission} />)

    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument()
  })

  it('renders Lead KPIs section when data is present', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))

    const submission = createMockSubmission({
      outbound_calls: 200,
      first_orders: 15,
    })
    render(<SubmittedFinancialsDisplay submission={submission} />)

    expect(screen.getByText('Lead KPIs')).toBeInTheDocument()
    expect(screen.getByText('Outbound Calls')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('First Orders')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('hides Lead KPIs section when no KPI data exists', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))

    const submission = createMockSubmission({
      outbound_calls: null,
      first_orders: null,
    })
    render(<SubmittedFinancialsDisplay submission={submission} />)

    expect(screen.queryByText('Lead KPIs')).not.toBeInTheDocument()
  })

  it('does not render EBITDA row when net_profit_target is zero', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))

    const submission = createMockSubmission({
      net_profit_target: 0,
    })
    render(<SubmittedFinancialsDisplay submission={submission} />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.queryByText('EBITDA')).not.toBeInTheDocument()
  })

  it('calls onEdit callback when edit button is clicked', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))
    const onEdit = vi.fn()

    const submission = createMockSubmission()
    render(<SubmittedFinancialsDisplay submission={submission} onEdit={onEdit} />)

    const editButton = screen.getByText('Edit')
    editButton.click()

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('does not render edit button when onEdit is not provided', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('super_admin'))

    const submission = createMockSubmission()
    render(<SubmittedFinancialsDisplay submission={submission} />)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('consultant sees nothing even when Lead KPIs are present', () => {
    mockUseAuth.mockReturnValue(mockAuthForRole('consultant'))

    const submission = createMockSubmission({
      outbound_calls: 300,
      first_orders: 20,
    })
    const { container } = render(<SubmittedFinancialsDisplay submission={submission} />)

    // Entire component should be null for consultants
    expect(container.innerHTML).toBe('')
    expect(screen.queryByText('Lead KPIs')).not.toBeInTheDocument()
    expect(screen.queryByText('Outbound Calls')).not.toBeInTheDocument()
  })
})
