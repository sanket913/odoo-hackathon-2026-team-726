import { z } from 'zod'

export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional().or(z.literal('')),
  department_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  job_position_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  manager_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  employee_type_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  working_schedule_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  bank_account: z.string().optional().or(z.literal('')),
})
