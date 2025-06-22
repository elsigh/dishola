import SearchSection from "@/components/search-section"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
      <h1 className="text-5xl md:text-6xl font-bold text-brand-primary mb-4">dishola</h1>
      <p className="text-lg md:text-xl text-brand-text-muted mb-10 md:mb-16 max-w-2xl">
        Share the love of food, dish by dish. <br />
        The ultimate source to find real meals at real places that rule.
      </p>

      <SearchSection />

      <p className="mt-12 text-md text-brand-text-muted max-w-xl">So, what’s your favorite dish?</p>
    </div>
  )
}
