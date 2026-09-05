import { AlertTriangle } from 'lucide-react'

// Payslip Pre-generation Validator
export function WarningBox({ employees = [] }) {
  const warnings = employees.flatMap(employee => employee.warnings.map((warning, index) => ({
    ...warning, key: `${employee.employee_id}-${index}`, name: employee.employee_name,
  })))
  if (!warnings.length) return null
  return <div role="alert" className="o_warning_box mb-4 rounded border border-warning/40 bg-warning/10 p-3 text-sm">
    <p className="mb-2 flex items-center gap-2 font-medium"><AlertTriangle size={16} />Payroll checks</p>
    <ul className="list-disc space-y-1 pl-5">{warnings.map(warning => <li key={warning.key}>
      <strong>{warning.name}:</strong> {warning.message || warning.msg}{warning.severity === 'blocking' && ' (blocks computation)'}
    </li>)}</ul>
  </div>
}
