"use client"

import { useEffect } from "react"

export default function GoogleCSEPage() {
  useEffect(() => {
    // Load the Google CSE script
    const script = document.createElement("script")
    script.src = "https://cse.google.com/cse.js?cx=f71323d43c6a54f0c"
    script.async = true
    document.head.appendChild(script)

    return () => {
      // Clean up on unmount
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Google Custom Search Engine</h1>
      <p className="mb-6">Use this search to test and refine your Google CSE results.</p>

      {/* The Google CSE will render in this div */}
      <div className="gcse-search" data-gname="standard" data-resultsurl="" data-queryparametername="q"></div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Usage Tips</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Search for dish names to see what images are returned</li>
          <li>Try adding restaurant names to your queries</li>
          <li>Results here should match what your API returns</li>
        </ul>
      </div>
    </div>
  )
}
