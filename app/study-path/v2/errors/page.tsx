'use client'

import { useRouter } from 'next/navigation'
import ErrorWatchlistView from '@/components/ErrorWatchlistView'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'

export default function ErrorWatchlistPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader />
        <ErrorWatchlistView onBack={() => router.push('/study-path')} />
      </div>
    </div>
  )
}
