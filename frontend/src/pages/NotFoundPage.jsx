import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-4xl font-bold text-foreground">404</p>
      <p className="text-sm text-muted">This page does not exist.</p>
      <Button as={Link} to="/employees">Back to Employees</Button>
    </div>
  )
}
