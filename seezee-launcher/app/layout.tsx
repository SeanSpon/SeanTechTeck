import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/themeContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SEE STUDIO ZEE Launcher",
  description: "Steam-Deck-style tablet game launcher for Raspberry Pi",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-seezee-dark h-screen w-screen overflow-hidden touch-pan-y`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
