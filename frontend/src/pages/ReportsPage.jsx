import { Link } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, ArrowUpRight, ChartNoAxesCombined } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'

const REPORT_LINKS = [
  { to: '/payroll/dashboard', title: 'Payroll Dashboard', description: 'KPIs, salary trends, attendance and time off overview.', icon: LayoutDashboard },
  { to: '/payroll/payslips', title: 'All Payslips', description: 'Browse every payslip generated across payruns.', icon: FileText },
  { to: '/employees', title: 'Employee Directory', description: 'Headcount, departments, and org structure.', icon: Users },
]

export default function ReportsPage() {
  return (
    <div className="pp-reports">
      <PageHeader title="Reports" description="Jump into the live operational reports below." />
      <div className="pp-reports-banner"><div><span>INSIGHTS THAT MOVE YOU FORWARD</span><h2>See the story behind your work.</h2><p>Explore payroll, people and daily operations through connected reports.</p></div><ChartNoAxesCombined size={64} aria-hidden="true" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_LINKS.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="pp-report-card p-5 transition-colors hover:border-primary/50">
              <r.icon size={20} className="text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">{r.title}</p>
              <p className="mt-1 text-xs text-muted">{r.description}</p>
              <span className="pp-report-open">Explore report <ArrowUpRight size={15} /></span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
