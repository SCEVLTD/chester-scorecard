import { useState } from 'react'
import { useLocation } from 'wouter'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Home, Mail, Trash2, Shield } from 'lucide-react'

interface Admin {
  id: string
  email: string
  role: 'super_admin' | 'consultant' | null
  created_at: string
}

export function AdminsPage() {
  const [, navigate] = useLocation()
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'super_admin' | 'consultant'>('consultant')
  const queryClient = useQueryClient()
  const { userRole, user } = useAuth()
  const currentUserEmail = user?.email?.toLowerCase()

  // Page protection: super_admin only
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only super admins can manage admin users.</p>
      </div>
    )
  }

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: async (): Promise<Admin[]> => {
      const { data, error } = await supabase
        .from('admins' as never)
        .select('*')
        .order('created_at')
      if (error) throw error
      return data as Admin[]
    },
  })

  const sendInvite = useMutation({
    mutationFn: async (email: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-admin-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: email.toLowerCase().trim(), role: newRole }),
        }
      )

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invite')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      toast.success('Invitation sent! They will receive an email to set up their account.')
      setNewEmail('')
      setNewRole('consultant')
    },
    onError: (error: Error) => {
      if (error.message.includes('already an admin')) {
        toast.error('This email is already an admin')
      } else {
        toast.error(error.message || 'Failed to send invite')
      }
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from('admins' as never)
        .update({ role } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      toast.success('Role updated')
    },
    onError: () => {
      toast.error('Failed to update role')
    },
  })

  const removeAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admins' as never)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      toast.success('Admin removed')
    },
    onError: () => {
      toast.error('Failed to remove admin')
    },
  })

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    if (!newEmail.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    sendInvite.mutate(newEmail)
  }

  const handleRemoveAdmin = (admin: Admin) => {
    if (admins && admins.length <= 1) {
      toast.error('Cannot remove the last admin')
      return
    }
    if (!confirm(`Remove ${admin.email} as admin?`)) return
    removeAdmin.mutate(admin.id)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Go to home"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Users
            </CardTitle>
            <CardDescription>
              Manage who has admin access to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as 'super_admin' | 'consultant')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={sendInvite.isPending} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                {sendInvite.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}

            {admins && admins.length > 0 && (
              <div className="space-y-2">
                {admins.map((admin) => {
                  const isCurrentUser = admin.email.toLowerCase() === currentUserEmail
                  const displayRole = admin.role || 'super_admin' // Handle null roles
                  return (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium">
                          {admin.email}
                          {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                        </span>
                        <Select
                          value={displayRole}
                          onValueChange={(role) => updateRole.mutate({ id: admin.id, role })}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultant">Consultant</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveAdmin(admin)}
                        disabled={removeAdmin.isPending || isCurrentUser}
                        title={isCurrentUser ? "You cannot remove yourself" : "Remove admin"}
                      >
                        <Trash2 className={`h-4 w-4 ${isCurrentUser ? 'text-muted-foreground' : 'text-red-500'}`} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
