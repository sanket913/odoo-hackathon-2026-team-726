export const queryKeys = {
  me: ['auth', 'me'],
  employees: (params) => ['employees', params],
  employee: (id) => ['employees', id],
  employeeContracts: (id) => ['employees', id, 'contracts'],
  employeeAttendance: (id) => ['employees', id, 'attendance'],
  employeeTimeOff: (id) => ['employees', id, 'time-off'],
  employeeAllocations: (id) => ['employees', id, 'allocations'],

  contracts: (params) => ['contracts', params],
  contract: (id) => ['contracts', id],

  schedules: (params) => ['schedules', params],
  schedule: (id) => ['schedules', id],

  attendance: (params) => ['attendance', params],
  attendanceRecord: (id) => ['attendance', id],

  timeOffTypes: (params) => ['time-off-types', params],
  allocations: (params) => ['allocations', params],
  requests: (params) => ['requests', params],
  request: (id) => ['requests', id],

  salaryStructures: (params) => ['salary-structures', params],
  salaryStructure: (id) => ['salary-structures', id],
  salaryRules: (params) => ['salary-rules', params],
  salaryRule: (id) => ['salary-rules', id],

  payruns: (params) => ['payruns', params],
  payrun: (id) => ['payruns', id],
  payslips: (params) => ['payslips', params],
  payslip: (id) => ['payslips', id],

  dashboard: (params) => ['dashboard', params],

  departments: ['departments'],
  jobPositions: ['job-positions'],
  employeeTypes: ['employee-types'],

  notifications: (params) => ['notifications', params],

  users: (params) => ['users', params],
  roles: ['roles'],
  permissions: ['permissions'],
  auditLogs: (params) => ['audit-logs', params],
}
