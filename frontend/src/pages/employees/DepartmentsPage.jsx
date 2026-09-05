import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { masterDataService } from '../../lib/api/services/masterDataService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { getErrorMessage } from '../../lib/api/normalizers'
import { ListSearch, useListSearch } from '../../components/ListSearch'
import { PageHeader, Button, Modal, Field, Input, Badge, LoadingState, ErrorState, EmptyState } from '../../components/ui'

export default function DepartmentsPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const query = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })
  const { search, setSearch, filtered } = useListSearch(query.data || [], ['name'])
  const create = useMutation({ mutationFn: () => masterDataService.createDepartment(name), onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.departments }); setOpen(false); setName(''); toast.success('Department created') }, onError: error => toast.error(getErrorMessage(error)) })
  return <div>
    <PageHeader title="Departments" actions={hasPermission('master_data.manage') && <Button onClick={() => setOpen(true)}>New Department</Button>} />
    <ListSearch label="Search departments" value={search} onChange={setSearch} />
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={query.refetch} /> : !filtered.length ? <EmptyState title="No departments found" /> : <div className="o_list_view"><table className="o_list_table"><thead><tr><th>Department</th><th>Status</th></tr></thead><tbody>{filtered.map(department => <tr key={department.id}><td>{department.name}</td><td><Badge tone={department.active ? 'success' : 'muted'}>{department.active ? 'Active' : 'Inactive'}</Badge></td></tr>)}</tbody></table></div>}
    <Modal open={open} onClose={() => setOpen(false)} title="New Department"><form className="space-y-4" onSubmit={event => { event.preventDefault(); create.mutate() }}><Field label="Department name" required><Input value={name} onChange={event => setName(event.target.value)} required /></Field><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={create.isPending} type="submit">{create.isPending ? 'Saving…' : 'Save Department'}</Button></div></form></Modal>
  </div>
}
