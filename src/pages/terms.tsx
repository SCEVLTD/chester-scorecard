import { Link } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/login">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Service Description</h2>
              <p className="text-muted-foreground">
                Chester Business Scorecard ("the Service") is a business performance monitoring
                platform operated by SCEV Ltd trading as BrandedAI ("the Company"), registered
                in England & Wales. The Service is provided under the Velocity Benchmarking brand.
              </p>
              <p className="text-muted-foreground mt-2">
                The Service enables consulting firms and their clients to track business health
                through monthly scorecards, financial performance data, qualitative assessments,
                and AI-powered analysis. By accessing or using the Service, you agree to be bound
                by these terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Acceptable Use</h2>
              <p className="text-muted-foreground">You agree to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Use the Service only for lawful business purposes</li>
                <li>Provide accurate and truthful data in your submissions</li>
                <li>Not attempt to access data belonging to other organisations</li>
                <li>Not reverse-engineer, decompile, or attempt to extract the source code of the Service</li>
                <li>Not use automated tools to scrape or extract data from the Service</li>
                <li>Not upload malicious content or attempt to compromise the security of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Account Responsibilities</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activities that occur under your account. You must notify us immediately
                of any unauthorised use of your account.
              </p>
              <p className="text-muted-foreground mt-2">
                Account administrators are responsible for managing user access within their
                organisation and ensuring that only authorised personnel have access to
                sensitive business data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Data Ownership</h2>
              <p className="text-muted-foreground">
                You retain full ownership of all business data you submit to the Service. This
                includes financial performance figures, qualitative assessments, and any other
                information provided by your organisation.
              </p>
              <p className="text-muted-foreground mt-2">
                You grant the Company a limited licence to process your data solely for the purpose
                of providing the Service, including generating AI analyses and aggregated benchmarking
                reports. Aggregated, anonymised data may be used in city-level benchmarking where
                individual businesses cannot be identified.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. AI-Generated Content</h2>
              <p className="text-muted-foreground">
                The Service includes AI-powered analyses, recommendations, and summaries generated
                using third-party AI technology. This content is provided "as is" for informational
                purposes only.
              </p>
              <p className="text-muted-foreground mt-2">
                AI-generated analyses should not be used as the sole basis for business decisions.
                The Company does not guarantee the accuracy, completeness, or suitability of
                AI-generated content. You should always exercise independent professional judgement
                and seek appropriate advice before making significant business decisions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service, including its design, functionality, scoring methodology, and underlying
                technology, is the intellectual property of the Company. Nothing in these terms
                grants you any rights to the Company's intellectual property beyond the right to
                use the Service as intended.
              </p>
              <p className="text-muted-foreground mt-2">
                The Velocity Benchmarking and BrandedAI names, logos, and branding are trademarks
                of SCEV Ltd and may not be used without prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Service Availability</h2>
              <p className="text-muted-foreground">
                We endeavour to maintain the Service at a high level of availability but do not
                guarantee uninterrupted access. The Service may be temporarily unavailable due to
                maintenance, updates, or circumstances beyond our reasonable control.
              </p>
              <p className="text-muted-foreground mt-2">
                We will use reasonable efforts to provide advance notice of planned maintenance
                where possible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, the Company shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages arising from
                your use of the Service.
              </p>
              <p className="text-muted-foreground mt-2">
                The Company's total liability for any claims arising from or related to the Service
                shall not exceed the amount paid by you to the Company in the twelve (12) months
                preceding the claim.
              </p>
              <p className="text-muted-foreground mt-2">
                Nothing in these terms excludes or limits liability for death or personal injury
                caused by negligence, fraud, or any other liability that cannot be excluded under
                applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Termination</h2>
              <p className="text-muted-foreground">
                Either party may terminate access to the Service at any time. Upon termination:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Your access to the Service will be revoked</li>
                <li>You may request an export of your data within 30 days</li>
                <li>Your data will be deleted within 30 days of the termination date, unless retention is required by law</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We reserve the right to suspend or terminate accounts that violate these terms
                without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms are governed by and construed in accordance with the laws of England
                & Wales. Any disputes arising from or related to these terms or the Service shall
                be subject to the exclusive jurisdiction of the courts of England & Wales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Changes to These Terms</h2>
              <p className="text-muted-foreground">
                We may update these terms from time to time. Material changes will be communicated
                via the Service or by email with at least 30 days' notice. Continued use of the
                Service after the effective date of changes constitutes acceptance of the updated
                terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">12. Contact</h2>
              <p className="text-muted-foreground">
                For any questions about these terms, please contact:
              </p>
              <div className="text-muted-foreground mt-2">
                <p>SCEV Ltd trading as BrandedAI</p>
                <p>
                  Email:{' '}
                  <a href="mailto:info@brandedai.co.uk" className="text-primary hover:underline">
                    info@brandedai.co.uk
                  </a>
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
