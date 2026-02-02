/**
 * ScorecardPdf Component
 *
 * Renders a complete scorecard as a PDF document using @react-pdf/renderer.
 * CRITICAL: Uses ONLY @react-pdf primitives (Document, Page, View, Text).
 * NO div, span, or React DOM components allowed.
 */
import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { styles, ragColors } from './pdf-styles'
import { mapScorecardToPdfData, type PdfScorecardData } from '@/lib/pdf-data-mapper'
import type { Scorecard } from '@/types/database.types'
import { velocityLogo } from './velocity-logo'

interface ScorecardPdfProps {
  scorecard: Scorecard
  businessName: string
}

/**
 * RAG Badge component for PDF
 */
function RagBadge({ status }: { status: 'green' | 'amber' | 'red' }) {
  return (
    <View style={[styles.ragBadge, { backgroundColor: ragColors[status] }]}>
      <Text style={styles.ragText}>{status.toUpperCase()}</Text>
    </View>
  )
}

/**
 * Section header with title and score
 */
function SectionHeader({
  title,
  score,
  maxScore,
}: {
  title: string
  score: number
  maxScore: number
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionScore}>
        {score}/{maxScore}
      </Text>
    </View>
  )
}

/**
 * Metric row for financial/quantitative data
 */
function MetricRow({
  label,
  value,
  score,
  maxScore,
  alt = false,
}: {
  label: string
  value: string
  score: number
  maxScore: number
  alt?: boolean
}) {
  return (
    <View style={[styles.tableRow, alt ? styles.tableRowAlt : {}]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricScore}>
        {score}/{maxScore}
      </Text>
    </View>
  )
}

/**
 * Qualitative metric row
 */
function QualitativeRow({
  label,
  choice,
  score,
  maxScore,
  alt = false,
}: {
  label: string
  choice: string | null
  score: number
  maxScore: number
  alt?: boolean
}) {
  return (
    <View style={[styles.tableRow, alt ? styles.tableRowAlt : {}]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{choice || 'Not specified'}</Text>
      <Text style={styles.metricScore}>
        {score}/{maxScore}
      </Text>
    </View>
  )
}

/**
 * Commentary block
 */
function CommentaryBlock({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.commentaryBlock}>
      <Text style={styles.commentaryLabel}>{label}</Text>
      <Text style={styles.commentaryText}>{text || 'No commentary provided'}</Text>
    </View>
  )
}

/**
 * AI Analysis section
 */
function AIAnalysisSection({ data }: { data: PdfScorecardData }) {
  if (!data.aiAnalysis) return null

  const { execSummary, actions30Day } = data.aiAnalysis

  return (
    <View style={styles.aiSection}>
      <Text style={styles.aiHeader}>AI Analysis Summary</Text>
      <Text style={styles.aiSummary}>{execSummary}</Text>

      {actions30Day && actions30Day.length > 0 && (
        <View>
          <Text style={styles.aiActionsTitle}>30-Day Priority Actions:</Text>
          {actions30Day.slice(0, 5).map((action, index) => (
            <View key={index} style={styles.aiAction}>
              <Text style={styles.aiActionBullet}>
                {action.priority === 'high' ? '!' : '-'}
              </Text>
              <Text
                style={[
                  styles.aiActionText,
                  action.priority === 'high'
                    ? styles.aiPriorityHigh
                    : action.priority === 'medium'
                      ? styles.aiPriorityMedium
                      : styles.aiPriorityLow,
                ]}
              >
                {action.action}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

/**
 * Format variance for display
 */
function formatVariance(variance: number | null): string {
  if (variance === null) return 'N/A'
  const sign = variance >= 0 ? '+' : ''
  return `${sign}${variance.toFixed(1)}%`
}

/**
 * Format productivity ratio
 */
function formatProductivity(benchmark: number | null, actual: number | null): string {
  if (benchmark === null || actual === null) return 'N/A'
  return `${actual.toFixed(2)} vs ${benchmark.toFixed(2)}`
}

/**
 * Main PDF Document Component
 *
 * Renders a complete scorecard as a single-page (or multi-page if needed) PDF.
 * Uses flexbox layouts via @react-pdf/renderer primitives.
 */
export function ScorecardPdf({ scorecard, businessName }: ScorecardPdfProps) {
  const data = mapScorecardToPdfData(scorecard, businessName)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo, business name and overall score */}
        <View style={styles.header}>
          <Image style={styles.headerLogo} src={velocityLogo} />
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Chester Business Scorecard</Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2, fontStyle: 'italic' }}>Doing good by doing well</Text>
            <Text style={styles.headerSubtitle}>
              {data.businessName} - {data.month}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>{data.totalScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <RagBadge status={data.ragStatus} />
          </View>
        </View>

        {/* Financial Performance Section */}
        <View style={styles.section}>
          <SectionHeader title="Financial Performance" score={data.financial.subtotal} maxScore={40} />
          <MetricRow
            label="Revenue vs Target"
            value={formatVariance(data.financial.revenue.variance)}
            score={data.financial.revenue.score}
            maxScore={10}
          />
          <MetricRow
            label="Gross Profit vs Target"
            value={formatVariance(data.financial.grossProfit.variance)}
            score={data.financial.grossProfit.score}
            maxScore={10}
            alt
          />
          <MetricRow
            label="Overheads vs Budget"
            value={formatVariance(data.financial.overheads.variance)}
            score={data.financial.overheads.score}
            maxScore={10}
          />
          <MetricRow
            label="EBITDA vs Target"
            value={formatVariance(data.financial.netProfit.variance)}
            score={data.financial.netProfit.score}
            maxScore={10}
            alt
          />
        </View>

        {/* People/HR Section */}
        <View style={styles.section}>
          <SectionHeader title="People / HR" score={data.people.subtotal} maxScore={20} />
          <MetricRow
            label="Productivity (GP/Wages)"
            value={formatProductivity(
              data.people.productivity.benchmark,
              data.people.productivity.actual
            )}
            score={data.people.productivity.score}
            maxScore={10}
          />
          <QualitativeRow
            label="Leadership Alignment"
            choice={data.people.leadership.choice}
            score={data.people.leadership.score}
            maxScore={10}
            alt
          />
        </View>

        {/* Market & Demand Section */}
        <View style={styles.section}>
          <SectionHeader title="Market & Demand" score={data.market.subtotal} maxScore={15} />
          <QualitativeRow
            label="Market Demand"
            choice={data.market.demand.choice}
            score={data.market.demand.score}
            maxScore={7.5}
          />
          <QualitativeRow
            label="Marketing Effectiveness"
            choice={data.market.marketing.choice}
            score={data.market.marketing.score}
            maxScore={7.5}
            alt
          />
        </View>

        {/* Product, Suppliers, Sales in two-column layout */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={styles.section}>
              <SectionHeader title="Product/Service" score={data.product.score} maxScore={10} />
              <QualitativeRow
                label="Strength"
                choice={data.product.choice}
                score={data.product.score}
                maxScore={10}
              />
            </View>
            <View style={styles.section}>
              <SectionHeader title="Suppliers" score={data.suppliers.score} maxScore={5} />
              <QualitativeRow
                label="Strength"
                choice={data.suppliers.choice}
                score={data.suppliers.score}
                maxScore={5}
              />
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.section}>
              <SectionHeader title="Sales Execution" score={data.sales.score} maxScore={10} />
              <QualitativeRow
                label="Performance"
                choice={data.sales.choice}
                score={data.sales.score}
                maxScore={10}
              />
            </View>
          </View>
        </View>

        {/* Commentary Section */}
        <View style={styles.commentarySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Consultant Commentary</Text>
          </View>
          <View style={{ paddingTop: 6 }}>
            <CommentaryBlock
              label="Biggest Opportunity"
              text={data.commentary.biggestOpportunity}
            />
            <CommentaryBlock label="Biggest Risk" text={data.commentary.biggestRisk} />
            <CommentaryBlock
              label="What is Management Avoiding?"
              text={data.commentary.managementAvoiding}
            />
            <CommentaryBlock
              label="Leadership Confidence"
              text={data.commentary.leadershipConfidence}
            />
            <CommentaryBlock label="Consultant Gut Feel" text={data.commentary.gutFeel} />
          </View>
        </View>

        {/* AI Analysis Section (if present) */}
        <AIAnalysisSection data={data} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Consultant: {data.consultantName}</Text>
          <Text>Submitted: {data.submittedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
