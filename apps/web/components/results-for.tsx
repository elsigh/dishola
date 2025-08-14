import Link from "next/link"
import type { FC } from "react"
import LocationDot from "@/components/ui/location-dot"
import { useAuth } from "@/lib/auth-context"

interface ResultsForProps {
  neighborhood: string | undefined
  city: string | undefined
}

const ResultsFor: FC<ResultsForProps> = ({ neighborhood, city }) => {
  const { user } = useAuth()

  return (
    <div className="flex gap-2 items-center">
      <h2 className="text-brand-primary">
        <LocationDot /> Results for <strong>{neighborhood}</strong>
        {city && <strong>, {city}</strong>}
      </h2>
      {user && (
        <>
          <span>∙</span>
          <Link href="/profile" className="text-sm text-brand-text-muted hover:text-brand-primary">
            Manage my Tastes
          </Link>
        </>
      )}
    </div>
  )
}

export default ResultsFor
