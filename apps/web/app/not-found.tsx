import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <h1 className="text-6xl font-bold text-brand-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-brand-text mb-4">Page Not Found</h2>
      <p className="text-lg text-brand-text-muted mb-8 max-w-md">
        Sorry, we couldn't find the page you're looking for. The dish or page you're trying to access might not exist.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/search">Search Dishes</Link>
        </Button>
      </div>
    </div>
  )
}
