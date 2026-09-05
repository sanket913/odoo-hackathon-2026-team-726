/**
 * Central invalidation map: which query key prefixes must be refreshed after
 * a given mutation succeeds. Keeps invalidation logic out of individual
 * page components.
 */
export function invalidateAfter(queryClient, event, meta = {}) {
  const inv = (prefix) => queryClient.invalidateQueries({ queryKey: [prefix] })

  switch (event) {
    case 'employee:mutated':
      inv('employees')
      if (meta.employeeId) queryClient.invalidateQueries({ queryKey: ['employees', meta.employeeId] })
      // warnings and live burn depend on employee data.
      inv('dashboard')
      inv('payruns')
      inv('audit-logs')
      break
    case 'contract:mutated':
      inv('contracts')
      inv('employees')
      inv('payruns')
      inv('dashboard')
      break
    case 'schedule:mutated':
      inv('schedules')
      inv('employees')
      break
    case 'attendance:mutated':
      inv('attendance')
      inv('employees')
      inv('dashboard')
      break
    case 'timeoff:mutated':
      inv('requests')
      inv('allocations')
      inv('time-off-types')
      inv('employees')
      inv('dashboard')
      break
    case 'salary:mutated':
      inv('salary-rules')
      inv('salary-structures')
      inv('payruns')
      break
    case 'payrun:mutated':
      // payment notifications and warning queries refresh together.
      inv('notifications')
      if (meta.payrunId) queryClient.invalidateQueries({ queryKey: ['payruns', meta.payrunId] })
      inv('payruns')
      inv('payslips')
      inv('dashboard')
      break
    case 'user:mutated':
      inv('users')
      break
    case 'notification:mutated':
      inv('notifications')
      break
    default:
      break
  }
}
