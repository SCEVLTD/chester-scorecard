/**
 * PDF Styles for Chester Business Scorecard
 *
 * Uses @react-pdf/renderer StyleSheet.create() for PDF-specific styling.
 * These styles are NOT CSS - they use a subset of CSS properties that
 * the PDF renderer supports.
 */
import { StyleSheet } from '@react-pdf/renderer'

export const styles = StyleSheet.create({
  // Page layout
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a2e',
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    lineHeight: 1.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#666',
    lineHeight: 1.3,
    marginTop: 4,
  },

  // Score box styles
  scoreContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    minWidth: 80,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  // RAG badge
  ragBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginTop: 4,
  },
  ragText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Section styles
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 6,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionScore: {
    fontSize: 10,
    color: '#fff',
  },

  // Table row styles
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  metricLabel: {
    flex: 2,
  },
  metricValue: {
    flex: 1,
    textAlign: 'right',
  },
  metricScore: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
  },

  // Two-column layout for qualitative sections
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },

  // Commentary styles
  commentarySection: {
    marginTop: 12,
  },
  commentaryBlock: {
    marginBottom: 8,
  },
  commentaryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  commentaryText: {
    fontSize: 9,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    padding: 6,
    borderRadius: 2,
  },

  // AI Analysis section
  aiSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  aiHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  aiSummary: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 1.5,
  },
  aiActionsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  aiAction: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  aiActionBullet: {
    width: 12,
    fontSize: 9,
  },
  aiActionText: {
    flex: 1,
    fontSize: 9,
  },
  aiPriorityHigh: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  aiPriorityMedium: {
    color: '#d97706',
  },
  aiPriorityLow: {
    color: '#059669',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
})

/**
 * RAG status colors for badges and indicators
 */
export const ragColors = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
}
