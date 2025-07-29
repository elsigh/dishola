export default function SiteFooter() {
  // Use hardcoded year to avoid Next.js static generation issues
  // Update this manually when needed (copyright years don't change frequently)
  const currentYear = 2025

  return (
    <footer className="py-8 mt-16 border-t border-brand-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-brand-text-muted">
        <div className="mt-2 text-xs flex flex-col items-center">
          <ul className="mt-1 text-left mx-auto max-w-xs">
            <li>[dish-ola]</li>
            <li className="mb-1">
              <span className="font-bold">v.</span> To share the love of food – dish by dish.
            </li>
            <li>
              <span className="font-bold">n.</span> The ultimate source to find real meals at real places that rule.
            </li>
          </ul>
        </div>
        <div className="mt-4 flex justify-center gap-4 text-xs">
          <a href="/cities" className="underline text-blue-700 hover:text-blue-900">
            Cities
          </a>
          <a href="/about" className="underline text-blue-700 hover:text-blue-900">
            About
          </a>
          <a href="/privacy" className="underline text-blue-700 hover:text-blue-900">
            Privacy Policy
          </a>
          <span>&copy; {currentYear} dishola. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
