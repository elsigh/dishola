import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata } from "next"
import { Mona_Sans as FontSans, Young_Serif as FontSerif } from "next/font/google"
import { Suspense } from "react"
import SiteFooter from "@/components/site-footer"
import SiteHeader from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider" // Assuming you have this for potential dark mode later
import { cn } from "@/lib/utils"

import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans"
})

const fontSerif = FontSerif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"]
})

export const metadata: Metadata = {
  title: "dishola - Share the Love of Food",
  description:
    "dishola: Share the love of food, dish by dish. Find real meals at real places, reviewed by editors, pros, and food lovers.",
  generator: "v0.dev",
  icons: {
    icon: "/img/favicon.png",
    shortcut: "/favicon.ico"
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-brand-bg font-sans antialiased flex flex-col",
          fontSans.variable,
          fontSerif.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Suspense
              fallback={
                <div className="py-4">
                  <div className="container mx-auto px-4">
                    <div className="h-12"></div>
                  </div>
                </div>
              }
            >
              <SiteHeader />
            </Suspense>
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-2">
              {children}
            </main>
            <SiteFooter />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
