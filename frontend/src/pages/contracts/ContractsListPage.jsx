import { FilterField } from '../../components/FilterToolbar'
import { ListSearch, ListPagination } from '../../components/ListSearch'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, FileSignature, FileCheck2, FileClock, ArrowUpRight, RotateCcw } from 'lucide-react'
import '../../styles/contracts.css'
import { contractService } from '../../lib/api/services/contractService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { StatusBadge, Button, Card, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function ContractsListPage() {
  const [search, setSearchValue] = useState('')
  const setSearch = value => { setSearchValue(value); setPage(1) }
  const { hasPermission } = useAuth()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const params = { search: search || undefined, status: status || undefined, page, limit }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.contracts(params),
    queryFn: () => contractService.list(params),
  })
  const contracts = data?.items || []
  const pagination = data?.pagination


  const filtered = contracts

  return (
    <div className="pp-contracts">
      <PageHeader
        title="Contracts"
        description="Clear agreements. Confident beginnings."
        actions={
          hasPermission(PERMISSIONS.CONTRACT_CREATE) && (
            <Button as={Link} to="/contracts/new"><Plus size={15} /> New Contract</Button>
          )
        }
      />

      <div className="pp-contracts-overview">
        <div className="pp-contracts-intro"><span className="pp-contracts-intro-icon"><FileSignature size={25} /></span><div><span className="pp-contracts-eyebrow">THE FOUNDATION OF GREAT WORK</span><h2>Every agreement. All together.</h2><p>Keep employment terms, pay and important dates in one connected view.</p></div></div>
        <div className="pp-contracts-count"><FileCheck2 size={19} /><strong>{isLoading || isError ? '—' : pagination?.total ?? contracts.length}</strong><span>{status ? `${status} contracts` : 'Total contracts'}</span></div>
      </div>
      <section className="pp-contracts-directory" aria-label="Contract directory">
      <div className="pp-contracts-heading"><div><h2>Contract directory</h2><p>From first draft to the next chapter.</p></div><span className="pp-contracts-page-tag"><FileClock size={13} /> Page {page}</span></div>


      <ListSearch value={search} onChange={setSearch} label="Search contracts" paginated={false}>
        <FilterField label="Status"><Select aria-label="Filter by status" className="max-w-[200px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
        </Select></FilterField>
        
      </ListSearch>
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load contracts." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No contracts found" description="Try another status or clear your search to find an agreement." />}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead>
              <tr><th>Employee</th><th>Reference</th><th>Start</th><th>End</th><th>Wage</th><th>Structure</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-foreground">
                    <Link className="pp-contracts-person" to={`/contracts/${c.id}`}><span className={`pp-contracts-avatar pp-contracts-avatar-${c.id % 4}`}>{(c.employee_name || 'Employee').split(' ').map(n => n[0]).slice(0, 2).join('')}</span><span><strong>{c.employee_name}</strong><small>View agreement <ArrowUpRight size={10} /></small></span></Link>
                  </td>
                  <td><Link className="pp-contracts-reference" to={`/contracts/${c.id}`}>{c.reference}</Link></td>
                  <td>{c.start_date}</td>
                  <td><span className={!c.end_date ? 'pp-contracts-ongoing' : ''}>{c.end_date || 'Ongoing'}</span></td>
                  <td className="pp-contracts-wage">₹{Number(c.wage).toLocaleString('en-IN')}</td>
                  <td>{c.salary_structure_name || '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !isError && <p className="pp-contracts-result" role="status">{filtered.length} {filtered.length === 1 ? 'agreement' : 'agreements'} shown on this page{search ? ' · search applied' : ''}</p>}

      {!isLoading && !isError && <ListPagination pagination={pagination} page={page} onChange={setPage} />}
      </section>
    </div>
  )
}
