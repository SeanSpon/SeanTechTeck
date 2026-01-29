import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/themeContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SEE STUDIO ZEE Launcher",
  description: "Steam-Deck-style tablet launcher for Raspberry Pi",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-seezee-dark`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
