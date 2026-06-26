import { redirect } from 'next/navigation'

/** Payload admin home — send all roles to the operator UI. */
export function AdminDashboardRedirect() {
  redirect('/')
}
