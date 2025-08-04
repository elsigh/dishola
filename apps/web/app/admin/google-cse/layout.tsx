import SiteHeader from "@/components/site-header"

export const metadata = {
  title: "Google CSE Admin - Dishola",
  description: "Google Custom Search Engine testing interface for Dishola"
}

export default function GoogleCSELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  )
}
