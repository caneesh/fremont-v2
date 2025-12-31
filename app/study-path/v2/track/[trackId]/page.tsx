export default function PatternTrackPage({
  params,
}: {
  params: Promise<{ trackId: string }>
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <h1 className="text-2xl font-bold">Pattern Track Detail</h1>
      <p>Loading track...</p>
    </div>
  )
}
