import { Link } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PrivacyPolicyPage() {
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
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
              <p className="text-muted-foreground">
                Chester Business Scorecard ("the Service") is operated by Velocity Benchmarking,
                a division of SCEV Ltd trading as BrandedAI, registered in England & Wales.
                We are committed to protecting your personal data and complying with the UK General
                Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
              </p>
              <p className="text-muted-foreground mt-2">
                This policy explains how we collect, use, store, and protect the information you
                provide when using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. What We Collect</h2>
              <p className="text-muted-foreground">We collect the following categories of data:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Account information:</strong> Business name, contact name, email address, and role</li>
                <li><strong>Financial performance data:</strong> Revenue, gross profit, overheads, net profit, and EBITDA figures submitted against targets</li>
                <li><strong>Qualitative assessments:</strong> Scores and commentary on people, strategy, market demand, product quality, suppliers, and sales performance</li>
                <li><strong>AI-generated analyses:</strong> Summaries, recommendations, and trend analyses produced by our AI system based on submitted data</li>
                <li><strong>Usage data:</strong> Error logs and basic session information for service reliability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Why We Collect It</h2>
              <p className="text-muted-foreground">We process your data for the following purposes:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>To provide the business scorecard and performance monitoring service</li>
                <li>To generate AI-powered analyses and recommendations</li>
                <li>To enable consultants to track and advise on business health</li>
                <li>To produce portfolio-level and city-level benchmarking reports</li>
                <li>To send transactional communications (invitations, password resets)</li>
                <li>To maintain and improve the reliability of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Lawful Basis for Processing</h2>
              <p className="text-muted-foreground">We rely on the following lawful bases under UK GDPR:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Contract:</strong> Processing necessary for the delivery of our business performance monitoring service</li>
                <li><strong>Legitimate interest:</strong> Business performance analytics, benchmarking, and service improvement where this does not override your rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Who We Share Data With</h2>
              <p className="text-muted-foreground">
                We share data only with the following third-party processors, all of whom are
                bound by appropriate data processing agreements:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Supabase:</strong> Database hosting and authentication (data stored in the EU)</li>
                <li><strong>Anthropic (Claude):</strong> AI analysis generation — submitted data is processed to generate insights but is not used to train AI models</li>
                <li><strong>Resend:</strong> Transactional email delivery (invitations, password resets)</li>
                <li><strong>Vercel:</strong> Frontend application hosting</li>
                <li><strong>Sentry:</strong> Error tracking and application monitoring</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do not sell your data to any third parties. Aggregated, anonymised data may be
                used in city-level benchmarking reports where individual businesses cannot be identified.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Active data:</strong> Retained for as long as your account remains active</li>
                <li><strong>Audit logs:</strong> Retained for 90 days</li>
                <li><strong>Deleted data:</strong> Purged within 30 days of a deletion request</li>
                <li><strong>Backups:</strong> Automatically purged in line with our retention schedule</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
              <p className="text-muted-foreground">
                Under UK GDPR, you have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Right of access:</strong> Request a copy of the data we hold about you</li>
                <li><strong>Right to rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Right to erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Right to data portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data</li>
                <li><strong>Right to object:</strong> Object to processing based on legitimate interest</li>
                <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise any of these rights, please contact us at{' '}
                <a href="mailto:info@brandedai.co.uk" className="text-primary hover:underline">
                  info@brandedai.co.uk
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Cookies</h2>
              <p className="text-muted-foreground">
                We use only essential cookies required for the Service to function:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Supabase authentication session:</strong> Maintains your login state</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do not use any tracking, analytics, or advertising cookies. No third-party
                tracking scripts are loaded.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organisational measures to protect your data,
                including encrypted connections (TLS), role-based access controls, and row-level
                security policies on all database tables.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this policy from time to time. Material changes will be communicated
                via the Service or by email. Continued use of the Service after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Contact</h2>
              <p className="text-muted-foreground">
                For any questions or concerns about this privacy policy or our data practices,
                please contact:
              </p>
              <div className="text-muted-foreground mt-2">
                <p>Velocity Benchmarking (SCEV Ltd trading as BrandedAI)</p>
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
