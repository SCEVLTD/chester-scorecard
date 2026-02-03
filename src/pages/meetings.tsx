import { useState } from 'react'
import { useLocation } from 'wouter'
import { ArrowLeft, Search, Calendar, FileText, Lock, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMeetings, useSearchMeetings } from '@/hooks/use-meetings'
import type { Meeting, MeetingStatus, MeetingType } from '@/types/database.types'

/**
 * Meetings History Page
 *
 * Lists all past meetings with search and filter capabilities.
 * Inspired by best-in-class tools: searchable, filterable, self-explanatory UI.
 */
export function MeetingsPage() {
  const [, navigate] = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MeetingType | 'all'>('all')

  // Use search hook when there's a query, otherwise use filtered meetings
  const { data: searchResults, isLoading: isSearching } = useSearchMeetings(searchQuery)
  const { data: allMeetings, isLoading: isLoadingAll } = useMeetings({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  })

  // Use search results if searching, otherwise use filtered results
  const meetings = searchQuery ? searchResults : allMeetings
  const isLoading = searchQuery ? isSearching : isLoadingAll

  // Format meeting date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get meeting type label
  const getMeetingTypeLabel = (type: MeetingType) => {
    switch (type) {
      case 'friday_group':
        return 'Friday Group'
      case 'quarterly_review':
        return 'Quarterly Review'
      case 'one_on_one':
        return '1:1 Meeting'
      case 'ad_hoc':
        return 'Ad Hoc'
      default:
        return type
    }
  }

  // Get health summary preview (first 150 chars)
  const getHealthPreview = (meeting: Meeting) => {
    const summary = meeting.ai_summary as { healthSummary?: string }
    const healthSummary = summary?.healthSummary || ''
    return healthSummary.length > 150
      ? healthSummary.slice(0, 150) + '...'
      : healthSummary
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/portfolio')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolio
          </Button>
          <img src="/velocity-logo.png" alt="Velocity" className="h-8" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting History
            </CardTitle>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as MeetingStatus | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as MeetingType | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="friday_group">Friday Group</SelectItem>
                  <SelectItem value="quarterly_review">Quarterly Review</SelectItem>
                  <SelectItem value="one_on_one">1:1 Meeting</SelectItem>
                  <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading && (
              <p className="text-muted-foreground text-center py-8">
                Loading meetings...
              </p>
            )}

            {!isLoading && (!meetings || meetings.length === 0) && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No meetings found matching your search.'
                    : 'No meetings yet. Generate a meeting prep from the Portfolio page.'}
                </p>
              </div>
            )}

            {meetings && meetings.length > 0 && (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title and badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium truncate">{meeting.title}</h3>
                          <Badge
                            variant={meeting.status === 'finalized' ? 'secondary' : 'outline'}
                            className={
                              meeting.status === 'finalized'
                                ? 'bg-green-100 text-green-700'
                                : ''
                            }
                          >
                            {meeting.status === 'finalized' && (
                              <Lock className="h-3 w-3 mr-1" />
                            )}
                            {meeting.status}
                          </Badge>
                          <Badge variant="outline">
                            {getMeetingTypeLabel(meeting.meeting_type)}
                          </Badge>
                        </div>

                        {/* Date and stats */}
                        <div className="text-sm text-muted-foreground mb-2">
                          {formatDate(meeting.meeting_date)} • {meeting.businesses_count} businesses • {meeting.month_analyzed}
                        </div>

                        {/* Health summary preview */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {getHealthPreview(meeting)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
