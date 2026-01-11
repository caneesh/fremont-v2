import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-dark-app flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-strong text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>
      </div>
    </main>
  )
}
