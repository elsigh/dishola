"use client"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import SearchSection from "@/components/search-section"
import { useAuth } from "@/lib/auth-context"
import { UserMenu } from "./user-menu"

export default function SiteHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isHome = pathname === "/"
  const isSearchPage = pathname === "/search"
  const { user } = useAuth()
  
  // Get current URL parameters to pass to SearchSection
  const currentQuery = searchParams.get("q") || ""
  const currentLat = searchParams.get("lat")
  const currentLng = searchParams.get("long")
  
  return (
    <header className="py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
        <nav className="hidden md:block py-2">
          <Link href="/" className="text-3xl font-serif font-bold text-brand-primary">
            dishola
          </Link>
        </nav>
        <div className="flex flex-grow">
          {(isHome || isSearchPage) && (
            <SearchSection 
              includeTastesOption={true} 
              isUserLoggedIn={!!user}
              initialQuery={currentQuery}
              initialLat={currentLat ? parseFloat(currentLat) : undefined}
              initialLng={currentLng ? parseFloat(currentLng) : undefined}
            />
          )}
        </div>
        <div className="py-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
