import { ListPagination } from '../../components/ListSearch'
import { FilterToolbar, FilterField } from '../../components/FilterToolbar'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LayoutGrid, List as ListIcon, Search, Plus, Users, Building2, ArrowUpRight, Mail, Clock3, X } from 'lucide-react'
import '../../styles/employees.css'
import { employeeService } from '../../lib/api/services/employeeService'
import { masterDataService } from '../../lib/api/services/masterDataService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, Select, Input, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function EmployeesListPage() {
  const { hasPermission } = useAuth()
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [employeeType, setEmployeeType] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const limit = 12

  const params = { employee_type_id: employeeType || undefined, active: active === '' ? undefined : active === 'true', search: search || undefined, department_id: departmentId || undefined, page, limit }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.employees(params),
    queryFn: () => employeeService.list(params),
  })
  const { data: departments = [] } = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })

  const { data: employeeTypes = [] } = useQuery({ queryKey: ['employee-types'], queryFn: masterDataService.employeeTypes })
  const employees = data?.items || []
  const pagination = data?.pagination
  const initials = (name) => name.split(' ').map(n => n[0]).slice(0, 2).join('')
  const avatarTone = (name) => [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4
  const resetFilters = () => { setSearch(''); setDepartmentId(''); setEmployeeType(''); setActive(''); setPage(1) }

  return (
    <div className="pp-directory">
      <div className="pp-directory-eyebrow">PEOPLE & CULTURE <span /> YOUR TEAM, CONNECTED</div>
      <PageHeader
        title="Employees"
        description="The people behind your everyday progress."
        actions={
          hasPermission(PERMISSIONS.EMPLOYEE_CREATE) && (
            <Button as={Link} to="/employees/new">
              <Plus size={15} /> New Employee
            </Button>
          )
        }
      />

      <div className="pp-directory-overview">
        <div className="pp-directory-welcome"><span className="pp-directory-icon"><Users size={24} /></span><div><h2>A place for every person.</h2><p>Find your people, explore teams, and keep the everyday details connected.</p></div><div className="pp-directory-orbit" aria-hidden="true"><Users size={48} /></div></div>
        <div className="pp-directory-stat"><Users size={19} /><strong>{isLoading || isError ? '—' : pagination?.total ?? employees.length}</strong><span>{search || departmentId || employeeType || active ? 'Matching employees' : 'Employees'}</span></div>
        <div className="pp-directory-stat"><Building2 size={19} /><strong>{departments.length}</strong><span>Departments</span></div>
      </div>
      <section className="pp-directory-surface" aria-label="Employee directory">
      <div className="pp-directory-section-heading"><div><h2>People directory</h2><p>All the right details. One easy view.</p></div><span className="pp-directory-page-label">{view === 'list' ? 'List view' : 'Card view'}</span></div>
      <FilterToolbar label="Employee search and filters" className="pp-employee-toolbar">
        <div className="pp-filter-field pp-filter-search"><label className="o_label" htmlFor="employee-search">Search employees</label><div className="pp-filter-search-input"><Search size={16} aria-hidden="true" /><Input id="employee-search" aria-label="Search employees" placeholder="Name, email or employee code" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div></div>
        <FilterField label="Department"><Select aria-label="Filter by department" className="sm:max-w-[200px]" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1) }}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select></FilterField>
        <FilterField label="Employee type"><Select aria-label="Filter by employee type" value={employeeType} onChange={e => { setEmployeeType(e.target.value); setPage(1) }}><option value="">All employee types</option>{employeeTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</Select></FilterField>
        <FilterField label="Status"><Select aria-label="Employee status" value={active} onChange={e => { setActive(e.target.value); setPage(1) }}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></Select></FilterField>
        <div className="pp-filter-actions"><span className="o_label">View</span><div className="pp-filter-view" role="group" aria-label="Employee view">          <button aria-label="Kanban view" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={`rounded p-1.5 ${view === 'kanban' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-primary'}`}>
            <LayoutGrid size={16} />
          </button>
          <button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`rounded p-1.5 ${view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-primary'}`}>
            <ListIcon size={16} />
          </button>
</div></div>
      </FilterToolbar>
      {(search || departmentId || employeeType || active) && <div className="pp-directory-filter-summary"><span>Filtered directory</span><button onClick={resetFilters}><X size={13} /> Clear filters</button></div>}

      {isLoading && <LoadingState label="Loading employees…" />}
      {isError && <ErrorState message="Could not load employees." onRetry={refetch} />}
      {!isLoading && !isError && employees.length === 0 && (
        <EmptyState title="No employees found" description="Try adjusting your search or filters." />
      )}

      {!isLoading && !isError && employees.length > 0 && view === 'kanban' && (
        <div className="o_kanban_view grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((emp) => (
            <Link to={`/employees/${emp.id}`} key={emp.id}>
              <Card className="pp-person-card p-4 transition-colors hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className={`pp-person-avatar pp-person-avatar-${avatarTone(emp.name)}`}>
                    {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="truncate text-xs text-muted">{emp.job_position_name || emp.employee_code}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <Badge tone="muted">{emp.department_name || 'No dept.'}</Badge>
                  <Badge tone={emp.active ? 'success' : 'default'}>{emp.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="pp-person-card-detail"><Mail size={13} /><span>{emp.email || 'No email added'}</span></div>
                <div className="pp-person-card-detail"><Clock3 size={13} /><span>{emp.working_schedule_name || 'No schedule assigned'}</span></div>
                <div className="pp-person-card-footer">View profile <ArrowUpRight size={14} /></div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !isError && employees.length > 0 && view === 'list' && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Job Position</th><th>Department</th><th>Manager</th><th>Schedule</th><th>Active</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-medium text-foreground">
                    <Link to={`/employees/${emp.id}`} className="pp-person-identity"><span className={`pp-person-avatar pp-person-avatar-${avatarTone(emp.name)}`}>{initials(emp.name)}</span><span><strong>{emp.name}</strong><small>{emp.employee_code || 'Employee'}</small></span></Link>
                  </td>
                  <td>{emp.email}</td>
                  <td>{emp.job_position_name || '\u2014'}</td>
                  <td><span className="pp-department-tag">{emp.department_name || '—'}</span></td>
                  <td>{emp.manager_name || '—'}</td>
                  <td>{emp.working_schedule_name || '—'}</td>
                  <td><Badge tone={emp.active ? 'success' : 'default'}>{emp.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !isError && <div className="pp-directory-result-count" role="status">{pagination?.total ? `Showing ${(page - 1) * limit + 1}–${(page - 1) * limit + employees.length} of ${pagination.total} employees` : `${employees.length} employees`}</div>}

      {!isLoading && !isError && <ListPagination pagination={pagination} page={page} onChange={setPage} />}
      </section>
    </div>
  )
}
