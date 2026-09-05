import { z } from 'zod'

export const contractSchema = z.object({
  employee_id: z.union([z.string(), z.number()]).refine((v) => v !== '' && v !== undefined, 'Employee is required'),
  reference: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().or(z.literal('')),
  wage: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'Wage must be greater than 0'),
  department_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  job_position_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  salary_structure_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  working_schedule_id: z.union([z.string(), z.number()]).optional().or(z.literal('')),
  status: z.string().min(1),
})
