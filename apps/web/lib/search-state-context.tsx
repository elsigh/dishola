"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface SearchStateContextType {
  showHeaderSearch: boolean
  setShowHeaderSearch: (value: boolean) => void
}

const SearchStateContext = createContext<SearchStateContextType | undefined>(undefined)

export function SearchStateProvider({ children }: { children: ReactNode }) {
  const [showHeaderSearch, setShowHeaderSearch] = useState(false)

  return (
    <SearchStateContext.Provider value={{ showHeaderSearch, setShowHeaderSearch }}>
      {children}
    </SearchStateContext.Provider>
  )
}

export function useSearchState() {
  const context = useContext(SearchStateContext)
  if (context === undefined) {
    throw new Error("useSearchState must be used within a SearchStateProvider")
  }
  return context
}
