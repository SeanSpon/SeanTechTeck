"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import StartupScreen from "@/components/StartupScreen"

export default function Home() {
  const [showStartup, setShowStartup] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!showStartup) {
      router.push('/dashboard')
    }
  }, [showStartup, router])

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-seezee-dark">
      <StartupScreen onComplete={() => setShowStartup(false)} duration={3500} />
    </div>
  )
}
