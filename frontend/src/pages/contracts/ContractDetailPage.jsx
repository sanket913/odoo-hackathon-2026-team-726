import { masterDataService } from '../../lib/api/services/masterDataService'
import '../../styles/contracts.css'
import { scheduleService } from '../../lib/api/services/scheduleService'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { contractService } from '../../lib/api/services/contractService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { StatusBadge, Button, Card, CardBody, PageHeader, LoadingState, ErrorState, Badge, StatusBar } from '../../components/ui'

export default function ContractDetailPage() {
  const { contractId } = useParams()
  const { hasPermission } = useAuth()
  const { data: contract, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.contract(contractId), queryFn: () => contractService.get(contractId),
  })

  const { data: departments = [] } = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })
  const { data: positions = [] } = useQuery({ queryKey: queryKeys.jobPositions, queryFn: masterDataService.jobPositions })
  const { data: schedule } = useQuery({ queryKey: queryKeys.schedule(contract?.working_schedule_id), queryFn: () => scheduleService.get(contract.working_schedule_id), enabled: !!contract?.working_schedule_id && hasPermission(PERMISSIONS.SCHEDULE_READ) })

  if (isLoading) return <LoadingState />
  if (isError || !contract) return <ErrorState onRetry={refetch} message="Could not load contract." />

  return (
    <div className="pp-contract-detail o_form_view mx-auto max-w-2xl">
      <PageHeader
        title={contract.reference}
        description={`Contract for ${contract.employee_name}`}
        actions={
          hasPermission(PERMISSIONS.CONTRACT_UPDATE) && (
            <Button as={Link} to={`/contracts/${contractId}/edit`} variant="outline"><Pencil size={14} /> Edit</Button>
          )
        }
      />
      <StatusBar value={contract.status} steps={['Draft', 'Active', 'Expired']} />
      <div className="pp-contract-detail-banner"><div><span>EMPLOYMENT AGREEMENT</span><h2>{contract.employee_name}</h2><p>{contract.start_date} <span aria-hidden="true">→</span> {contract.end_date || 'Ongoing'}</p></div><div className="pp-contract-detail-pay"><span>CONTRACT WAGE</span><strong>₹{Number(contract.wage).toLocaleString('en-IN')}</strong></div></div>
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Item label="Employee" value={<Link className="text-primary hover:underline" to={`/employees/${contract.employee_id}`}>{contract.employee_name}</Link>} />
          <Item label="Status" value={<StatusBadge status={contract.status} />} />
          <Item label="Department" value={departments.find(d => d.id === contract.department_id)?.name || '\u2014'} />
          <Item label="Job position" value={positions.find(p => p.id === contract.job_position_id)?.name || '\u2014'} />
          <Item label="Working schedule" value={schedule ? <Link className="text-primary hover:underline" to={`/schedules/${schedule.id}`}>{schedule.name}</Link> : contract.working_schedule_id ? `Schedule #${contract.working_schedule_id}` : '\u2014'} />
          <Item label="Start date" value={contract.start_date} />
          <Item label="End date" value={contract.end_date || 'Ongoing'} />
          <Item label="Wage" value={`₹${Number(contract.wage).toLocaleString()}`} />
          <Item label="Salary structure" value={contract.salary_structure_name || '—'} />
        </CardBody>
      </Card>
    </div>
  )
}

function Item({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
