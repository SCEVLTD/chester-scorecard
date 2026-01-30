import { Route, Switch } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { ErrorBoundary } from '@/components/error-boundary'
import { HomePage } from '@/pages/home'
import { ScorecardPage } from '@/pages/scorecard'
import { HistoryPage } from '@/pages/history'
import { ChartsPage } from '@/pages/charts'
import { PortfolioPage } from '@/pages/portfolio'
import { ComparePage } from '@/pages/compare'
import CompanySubmitPage from '@/pages/company-submit'
import SubmissionSuccessPage from '@/pages/submission-success'

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/portfolio" component={PortfolioPage} />
          <Route path="/compare" component={ComparePage} />
          <Route path="/business/:businessId" component={HistoryPage} />
          <Route path="/business/:businessId/charts" component={ChartsPage} />
          <Route path="/business/:businessId/scorecard" component={ScorecardPage} />
          <Route path="/business/:businessId/scorecard/:scorecardId" component={ScorecardPage} />
          {/* Legacy route - can be removed after migration */}
          <Route path="/scorecard/:businessId" component={ScorecardPage} />
          {/* Public routes for company data submission */}
          <Route path="/submit/:token" component={CompanySubmitPage} />
          <Route path="/submit/:token/success" component={SubmissionSuccessPage} />
          <Route>
            <div className="p-8">
              <h1 className="text-2xl font-bold">404 - Not Found</h1>
            </div>
          </Route>
        </Switch>
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
