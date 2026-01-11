'use client'

import { useParams, useRouter } from 'next/navigation'
import PatternTrackDetail from '@/components/PatternTrackDetail'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'

export default function PatternTrackPage() {
  const params = useParams()
  const router = useRouter()
  const trackId = params.trackId as string

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader />
        <PatternTrackDetail
          trackId={trackId}
          onBack={() => router.push('/study-path')}
        />
      </div>
    </div>
  )
}
