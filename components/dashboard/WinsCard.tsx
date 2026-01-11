'use client'

interface WinsCardProps {
  message: string | null
}

/**
 * A simple celebration card for wins/achievements
 */
export default function WinsCard({ message }: WinsCardProps) {
  if (!message) return null

  return (
    <div className="bg-green-500 rounded-xl p-4 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold">{message}</p>
        </div>
      </div>
    </div>
  )
}
