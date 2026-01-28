"use client"

import Link from "next/link"

interface EmptyGameLibraryProps {
  onOpenSettings?: () => void
}

export default function EmptyGameLibrary({ onOpenSettings }: EmptyGameLibraryProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-20">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-seezee-red/10 flex items-center justify-center border-2 border-seezee-red/30">
          <svg
            className="w-16 h-16 text-seezee-red/70"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        {/* Animated pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-seezee-red/50 animate-ping"></div>
      </div>

      {/* Message */}
      <h2 className="text-3xl font-bold text-white mb-3">No Games Found</h2>
      <p className="text-white/60 text-center max-w-md mb-8">
        Connect to your PC to sync your Steam library and start playing your games on SeeZee.
      </p>

      {/* Steps */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-lg mb-8">
        <h3 className="text-seezee-red font-semibold mb-4">Quick Setup:</h3>
        <ol className="space-y-3 text-white/70 text-sm">
          <li className="flex gap-3">
            <span className="text-seezee-red font-bold">1.</span>
            <span>Run seezee_server.py on your gaming PC</span>
          </li>
          <li className="flex gap-3">
            <span className="text-seezee-red font-bold">2.</span>
            <span>Make sure your Pi and PC are on the same network</span>
          </li>
          <li className="flex gap-3">
            <span className="text-seezee-red font-bold">3.</span>
            <span>Go to Settings and enter your PC's IP address</span>
          </li>
          <li className="flex gap-3">
            <span className="text-seezee-red font-bold">4.</span>
            <span>Add game library folders on your PC</span>
          </li>
        </ol>
      </div>

      {/* Action button */}
      {onOpenSettings ? (
        <button
          onClick={onOpenSettings}
          className="px-8 py-4 bg-seezee-red text-white rounded-xl font-bold text-lg hover:shadow-glow transition-all transform hover:scale-105"
        >
          Open Settings
        </button>
      ) : (
        <Link
          href="/settings"
          className="px-8 py-4 bg-seezee-red text-white rounded-xl font-bold text-lg hover:shadow-glow transition-all transform hover:scale-105 inline-block"
        >
          Open Settings
        </Link>
      )}

      {/* Additional help */}
      <p className="text-white/40 text-sm mt-6">
        Need help? Check the <span className="text-seezee-red">SETUP_GUIDE.md</span>
      </p>
    </div>
  )
}
