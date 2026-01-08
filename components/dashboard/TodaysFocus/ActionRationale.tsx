'use client'

interface ActionRationaleProps {
  rationale: string
}

/**
 * Displays the rationale for why the primary action was chosen
 * Single line, subtle styling, provides context without overwhelming
 */
export default function ActionRationale({ rationale }: ActionRationaleProps) {
  return (
    <p className="
      mt-3
      text-sm
      text-gray-600 dark:text-dark-text-secondary
      flex items-center gap-2
    ">
      <span className="
        inline-flex items-center justify-center
        w-4 h-4
        text-xs
        text-gray-400 dark:text-dark-text-muted
        bg-gray-100 dark:bg-dark-card-soft
        rounded-full
        flex-shrink-0
      ">
        ?
      </span>
      <span className="italic">
        {rationale}
      </span>
    </p>
  )
}
