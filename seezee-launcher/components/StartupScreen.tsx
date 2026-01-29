"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import SeeZeeWordmark from "@/components/SeeZeeWordmark"

interface StartupScreenProps {
  onComplete?: () => void
  duration?: number
}

export default function StartupScreen({
  onComplete,
  duration = 3500,
}: StartupScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [phase, setPhase] = useState<"intro" | "fade">("intro")

  useEffect(() => {
    // Phase 1: Intro animation for most of the duration
    const introTimer = setTimeout(() => {
      setPhase("fade")
    }, duration - 800)

    // Phase 2: Fade out and complete
    const completeTimer = setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, duration)

    return () => {
      clearTimeout(introTimer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 bg-seezee-dark flex flex-col items-center justify-center z-50 overflow-hidden ${
        phase === "fade" ? "animate-startup-fadeout" : ""
      }`}
    >
      {/* Background animated particles effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-seezee-red rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-seezee-red-bright rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" style={{animationDelay: "1s"}}></div>
      </div>

      {/* Main content container */}
      <div className="relative z-10 text-center flex flex-col items-center gap-6 max-[1280px]:gap-4">
        {/* Logo with dissolve animation */}
        <div
          className={`relative w-32 h-32 max-[1280px]:w-24 max-[1280px]:h-24 animate-startup-dissolve ${
            phase === "fade" ? "opacity-0 transition-opacity duration-800" : ""
          }`}
          style={{
            filter: "drop-shadow(0 0 20px rgba(230, 57, 70, 0.4))",
          }}
        >
          <Image
            src="/seezee-logo.png"
            alt="SeeZee Studios"
            width={128}
            height={128}
            priority
            className="w-full h-full object-contain"
          />
        </div>

        {/* Main title with character dissolve */}
        <div className="relative overflow-hidden">
          <div
            className={`animate-startup-text-dissolve ${
              phase === "fade" ? "opacity-0 transition-opacity duration-800" : ""
            }`}
            style={{
              filter: "drop-shadow(0 0 20px rgba(230, 57, 70, 0.35))",
            }}
          >
            <SeeZeeWordmark size="lg" />
          </div>
        </div>

        {/* Loading indicator */}
        <div
          className={`mt-8 max-[1280px]:mt-6 flex gap-2 animate-startup-loading-indicator ${
            phase === "fade"
              ? "opacity-0 transition-opacity duration-800"
              : ""
          }`}
        >
          <div
            className="w-2 h-2 rounded-full bg-seezee-red"
            style={{
              animation: "startup-dot 1.4s infinite",
            }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-seezee-red-bright"
            style={{
              animation: "startup-dot 1.4s infinite 0.2s",
            }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-seezee-red"
            style={{
              animation: "startup-dot 1.4s infinite 0.4s",
            }}
          ></div>
        </div>

        {/* Tagline */}
        <p
          className={`mt-6 max-[1280px]:mt-4 text-sm max-[1280px]:text-xs text-white/50 font-light animate-startup-tagline ${
            phase === "fade"
              ? "opacity-0 transition-opacity duration-800"
              : ""
          }`}
        >
          Loading your game library...
        </p>
      </div>

      {/* Dissolving pixel effect overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          phase === "fade" ? "animate-startup-pixel-dissolve" : ""
        }`}
        style={{
          backgroundImage: `radial-gradient(circle, transparent 20%, rgba(0, 0, 0, 0.8) 100%)`,
        }}
      ></div>
    </div>
  )
}
