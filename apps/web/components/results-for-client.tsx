"use client"

import { useAuth } from "@/lib/auth-context"
import ResultsFor from "./results-for"

interface ResultsForClientProps {
  neighborhood: string | undefined
  city: string | undefined
}

export default function ResultsForClient({ neighborhood, city }: ResultsForClientProps) {
  const { user } = useAuth()

  return <ResultsFor neighborhood={neighborhood} city={city} showTastesLink={!!user} />
}
