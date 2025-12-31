'use client'

import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'

// Dynamically import to avoid SSR issues
const PatternTrackDetail = dynamic(
  () => import('@/components/PatternTrackDetail'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }
)

export default function PatternTrackPage() {
  const params = useParams()
  const router = useRouter()
  const trackId = params.trackId as string

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
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
