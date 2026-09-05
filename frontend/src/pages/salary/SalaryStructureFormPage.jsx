import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { salaryService } from '../../lib/api/services/salaryService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Textarea, PageHeader, LoadingState } from '../../components/ui'

export default function SalaryStructureFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: structure, isLoading } = useQuery({
    queryKey: queryKeys.salaryStructure(id), queryFn: () => salaryService.getStructure(id), enabled: isEdit,
  })

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (structure) { setName(structure.name); setCode(structure.code); setDescription(structure.description || '') }
  }, [structure])

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? salaryService.updateStructure(id, { name, description })
      : salaryService.createStructure({ name, code, description }),
    onSuccess: (result) => {
      invalidateAfter(queryClient, 'salary:mutated')
      toast.success(isEdit ? 'Structure updated' : 'Structure created')
      navigate(`/payroll/salary-structures/${result.id}`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title={isEdit ? 'Edit Salary Structure' : 'New Salary Structure'} />
      <Card className="o_form_sheet">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={isEdit} required />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/payroll/salary-structures" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save Structure'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
