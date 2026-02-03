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
import { ArrowLeft, Plus, Trash2, Shield } from 'lucide-react'

interface Admin {
  id: string
  email: string
  role: 'super_admin' | 'consultant'
  created_at: string
}

export function AdminsPage() {
  const [, navigate] = useLocation()
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'super_admin' | 'consultant'>('consultant')
  const queryClient = useQueryClient()
  const { userRole } = useAuth()

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

  const addAdmin = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('admins' as never)
        .insert({ email: email.toLowerCase().trim(), role: newRole } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      toast.success('Admin added')
      setNewEmail('')
      setNewRole('consultant')
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('This email is already an admin')
      } else {
        toast.error('Failed to add admin')
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

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    if (!newEmail.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    addAdmin.mutate(newEmail)
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
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

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
            <form onSubmit={handleAddAdmin} className="space-y-4 mb-6">
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
              <Button type="submit" disabled={addAdmin.isPending} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Admin
              </Button>
            </form>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}

            {admins && admins.length > 0 && (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{admin.email}</span>
                      <Select
                        value={admin.role}
                        onValueChange={(role) => updateRole.mutate({ id: admin.id, role })}
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
                      disabled={removeAdmin.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
