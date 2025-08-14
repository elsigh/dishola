"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, Database } from "lucide-react"

export default function AdminNav() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/admin/tastes",
      label: "Taste Dictionary",
      icon: BarChart3,
      description: "Manage taste dictionary entries"
    },
    {
      href: "/admin/cache",
      label: "Cache Management",
      icon: Database,
      description: "Clear application caches"
    }
  ]

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-brand-text mb-2">Admin Dashboard</h1>
      <p className="text-brand-text-muted mb-6">Manage application settings and data</p>

      <div className="flex gap-4 flex-wrap">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? "default" : "outline"}
              className="h-auto p-4 flex-col items-start gap-2 min-w-[200px]"
            >
              <Link href={item.href}>
                <div className="flex items-center gap-2 w-full">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <p className="text-xs text-left opacity-70">{item.description}</p>
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
