export default function SiteFooter() {
  return (
    <footer className="py-8 mt-16 border-t border-brand-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-brand-text-muted">
        <p>&copy; {new Date().getFullYear()} Dishola. All rights reserved.</p>
        <p className="mt-2 text-sm">
          What is Dishola? v. To share the love of food - dish by dish.
          <br />
          n. The ultimate source to find real meals at real places that rule.
        </p>
      </div>
    </footer>
  )
}
