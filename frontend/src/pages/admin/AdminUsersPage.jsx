import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { ListPagination, ListSearch, useListSearch } from '../../components/ListSearch'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { employeeService } from '../../lib/api/services/employeeService'
import { userService } from '../../lib/api/services/userService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Modal, Select, Field, Input, PageHeader, LoadingState, ErrorState, Badge } from '../../components/ui'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser, hasPermission } = useAuth()
  const [account, setAccount] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingUser, setEditingUser] = useState(null)
  const [roleDraft, setRoleDraft] = useState([])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users({ page }), queryFn: () => userService.list({ page, limit: 50 }),
  })
  const { data: roles = [] } = useQuery({ queryKey: queryKeys.roles, queryFn: userService.roles })
  const [employeeSearch, setEmployeeSearch] = useState('')
  const { data: employeePage } = useQuery({ queryKey: ['users', 'link-employees', employeeSearch],
    queryFn: () => employeeService.list({ search: employeeSearch, limit: 100 }), enabled: !!account && !account.id })
  const users = data?.items || []
  const { search, setSearch, filtered } = useListSearch(users, ['full_name', 'email'])
  const visibleUsers = filtered.filter(user => !roleFilter || user.roles.includes(roleFilter))
  const saveAccount = useMutation({
    mutationFn: () => account.id
      ? userService.update(account.id, { full_name: account.full_name, is_active: account.is_active })
      : userService.create({ full_name: account.full_name, email: account.email, password: account.password, role_names: account.role_names, ...(account.employee_id ? { employee_id: Number(account.employee_id) } : {}) }),
    onSuccess: () => { invalidateAfter(queryClient, 'user:mutated'); toast.success(account.id ? 'User updated' : 'User created'); setAccount(null) },
    onError: error => toast.error(getErrorMessage(error)),
  })

  const updateRolesMutation = useMutation({
    mutationFn: () => userService.updateRoles(editingUser.id, roleDraft),
    onSuccess: () => {
      invalidateAfter(queryClient, 'user:mutated')
      toast.success('Roles updated')
      setEditingUser(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openEdit = (user) => { setEditingUser(user); setRoleDraft(user.roles) }
  const toggleRole = (roleName) => {
    setRoleDraft((prev) => (prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]))
  }

  return (
    <div>
      <PageHeader title="User &amp; Role Management" description="Manage user accounts and assigned roles." actions={<Button onClick={() => setAccount({ full_name: '', email: '', password: '', role_names: [], is_active: true })}>New User</Button>} />
      <ListSearch value={search} onChange={setSearch} label="Search users" paginated />
      <Select aria-label="Filter by role" className="mb-4 max-w-xs" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="">All roles</option>{roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}</Select>
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load users." />}
      {!isLoading && !isError && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Name</th><th>Employee</th><th>Email</th><th>Roles</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-foreground">{u.full_name}</td>
                  <td>{u.employee_id ? <Link className="text-primary hover:underline" to={`/employees/${u.employee_id}`}>Employee #{u.employee_id}</Link> : 'Not linked'}</td>
                  <td>{u.email}</td>
                  <td className="flex flex-wrap gap-1 py-2">{u.roles.map((r) => <Badge key={r} tone="info">{r}</Badge>)}</td>
                  <td><Badge tone={u.is_active ? 'success' : 'default'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><div className="flex gap-3"><button className="text-xs text-primary hover:underline" onClick={() => setAccount({ ...u })}>Edit user</button>{u.id !== currentUser?.id && hasPermission(PERMISSIONS.ROLE_MANAGE) && <button className="text-xs text-primary hover:underline" onClick={() => openEdit(u)}>Edit roles</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && <ListPagination pagination={data?.pagination} page={page} onChange={setPage} />}
      <Modal open={!!account} onClose={() => setAccount(null)} title={account?.id ? 'Edit User' : 'New User'}>
        {account && <form className="space-y-4" onSubmit={event => { event.preventDefault(); saveAccount.mutate() }}>
          <Field label="Full name" required><Input value={account.full_name} required onChange={event => setAccount({ ...account, full_name: event.target.value })} /></Field>
          <Field label="Work email" required><Input type="email" value={account.email} required disabled={!!account.id} onChange={event => setAccount({ ...account, email: event.target.value })} /></Field>
          {!account.id && <Field label="Link employee"><Input aria-label="Find employee to link" placeholder="Search employee name or email" value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} /><Select aria-label="Link employee" value={account.employee_id || ''} onChange={event => setAccount({ ...account, employee_id: event.target.value })}><option value="">No employee linked</option>{(employeePage?.items || []).filter(employee => !employee.user_id).map(employee => <option key={employee.id} value={employee.id}>{employee.name} - {employee.employee_code}</option>)}</Select><p className="text-xs text-muted mt-1">Select the employee this account belongs to. Existing linked employees are excluded.</p></Field>}
          {!account.id && <><Field label="Initial password" required><Input type="password" autoComplete="new-password" minLength={6} value={account.password} required onChange={event => setAccount({ ...account, password: event.target.value })} /></Field><fieldset><legend className="o_label">Roles</legend>{roles.map(role => <label key={role.id} className="mb-2 flex items-center gap-2"><input type="checkbox" checked={account.role_names.includes(role.name)} onChange={event => setAccount({ ...account, role_names: event.target.checked ? [...account.role_names, role.name] : account.role_names.filter(name => name !== role.name) })} />{role.name}</label>)}</fieldset></>}
          {account.id && <label className="flex items-center gap-2"><input type="checkbox" checked={account.is_active} onChange={event => setAccount({ ...account, is_active: event.target.checked })} />Active account</label>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAccount(null)}>Cancel</Button><Button type="submit" disabled={saveAccount.isPending}>{saveAccount.isPending ? 'Saving...' : account.id ? 'Save User' : 'Create User'}</Button></div>
        </form>}
      </Modal>

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit roles — ${editingUser?.full_name || ''}`}>
        <div className="space-y-2">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center justify-between rounded border border-border bg-white px-3 py-2 text-sm">
              {r.name}
              <input type="checkbox" checked={roleDraft.includes(r.name)} onChange={() => toggleRole(r.name)} />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button onClick={() => updateRolesMutation.mutate()} disabled={updateRolesMutation.isPending}>
            {updateRolesMutation.isPending ? 'Saving…' : 'Save Roles'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
