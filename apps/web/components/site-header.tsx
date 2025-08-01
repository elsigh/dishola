"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { UserMenu } from "./user-menu"

export default function SiteHeader() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const { user } = useAuth()
  if (isHome && user) return null
  return (
    <header className="py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <nav>
          <Link href="/" className="text-3xl font-serif font-bold text-brand-primary">
            dishola
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
