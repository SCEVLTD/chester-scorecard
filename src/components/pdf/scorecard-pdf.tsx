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

// Base64 encoded logo for reliable PDF rendering (object format for @react-pdf/renderer)
const ubtLogoBase64 = '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'
const ubtLogo = { data: ubtLogoBase64, format: 'png' }

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
          <Image style={styles.headerLogo} src={ubtLogo} />
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Chester Business Scorecard</Text>
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
            label="Net Profit vs Target"
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
