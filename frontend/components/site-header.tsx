import Link from "next/link"

export default function SiteHeader() {
  return (
    <header className="py-6 border-b border-brand-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className="text-3xl font-serif font-bold text-brand-primary">
          Dishola
        </Link>
        <nav>
          {/* Future navigation links can go here */}
          {/* <Link href="/about" className="text-brand-text-muted hover:text-brand-text">About</Link> */}
        </nav>
      </div>
    </header>
  )
}
