import { Route, Switch } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { ErrorBoundary } from '@/components/error-boundary'
import { AuthProvider } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { HomePage } from '@/pages/home'
import { ScorecardPage } from '@/pages/scorecard'
import { HistoryPage } from '@/pages/history'
import { ChartsPage } from '@/pages/charts'
import { PortfolioPage } from '@/pages/portfolio'
import { ComparePage } from '@/pages/compare'
import { LoginPage } from '@/pages/login'
import { UnauthorizedPage } from '@/pages/unauthorized'
import CompanySubmitPage from '@/pages/company-submit'
import SubmissionSuccessPage from '@/pages/submission-success'
import { UnifiedSubmitPage } from '@/pages/unified-submit'
import { AdminImportPage } from '@/pages/admin/import'
import { ImportBusinessesPage } from '@/pages/admin/import-businesses'
import { AdminsPage } from '@/pages/admin/admins'
import { BusinessPage } from '@/pages/business'
import { CompanyLoginPage } from '@/pages/company/login'
import { CompanyVerifyPage } from '@/pages/company/verify'
import { CompanySetupPage } from '@/pages/company/setup'
import { CompanyDashboardPage } from '@/pages/company/dashboard'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster position="top-center" richColors />
          <div className="min-h-screen bg-background">
            <Switch>
              {/* Public routes */}
              <Route path="/login" component={LoginPage} />
              <Route path="/company/login" component={CompanyLoginPage} />
              <Route path="/company/setup" component={CompanySetupPage} />
              <Route path="/company/verify" component={CompanyVerifyPage} />
              <Route path="/unauthorized" component={UnauthorizedPage} />
              <Route path="/submit/:token" component={CompanySubmitPage} />
              <Route path="/submit/:token/success" component={SubmissionSuccessPage} />

              {/* Company dashboard - requires business_user role */}
              <Route path="/company/dashboard">
                <ProtectedRoute requiredRole="business_user">
                  <CompanyDashboardPage />
                </ProtectedRoute>
              </Route>

              {/* Admin-only routes */}
              <Route path="/">
                <ProtectedRoute requiredRole="admin">
                  <HomePage />
                </ProtectedRoute>
              </Route>
              <Route path="/portfolio">
                <ProtectedRoute requiredRole="admin">
                  <PortfolioPage />
                </ProtectedRoute>
              </Route>
              <Route path="/compare">
                <ProtectedRoute requiredRole="admin">
                  <ComparePage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/import">
                <ProtectedRoute requiredRole="admin">
                  <AdminImportPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/admins">
                <ProtectedRoute requiredRole="admin">
                  <AdminsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin/import-businesses">
                <ProtectedRoute requiredRole="admin">
                  <ImportBusinessesPage />
                </ProtectedRoute>
              </Route>

              {/* Business-scoped routes - admins can access all, business users only their own */}
              <Route path="/business/:businessId">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <HistoryPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/business/:businessId/view/:scorecardId">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <BusinessPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/business/:businessId/charts">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <ChartsPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/business/:businessId/scorecard">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <ScorecardPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/business/:businessId/scorecard/:scorecardId">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <ScorecardPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/company/:businessId/submit">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <UnifiedSubmitPage />
                  </ProtectedRoute>
                )}
              </Route>

              {/* Legacy route - can be removed after migration */}
              <Route path="/scorecard/:businessId">
                {(params) => (
                  <ProtectedRoute allowedBusinessId={params.businessId}>
                    <ScorecardPage />
                  </ProtectedRoute>
                )}
              </Route>

              {/* 404 */}
              <Route>
                <div className="p-8">
                  <h1 className="text-2xl font-bold">404 - Not Found</h1>
                </div>
              </Route>
            </Switch>
          </div>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
