import Link from 'next/link'

/** Payload admin 404 — link back to the operator dashboard, not /admin. */
export function AdminNotFound() {
  return (
    <div className="not-found">
      <div className="not-found__wrap">
        <h1>Nothing found</h1>
        <p>The page you requested does not exist.</p>
        <Link href="/" className="btn btn--style-primary btn--size-medium">
          Back to Operator Dashboard
        </Link>
      </div>
    </div>
  )
}
