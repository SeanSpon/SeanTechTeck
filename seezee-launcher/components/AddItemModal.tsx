"use client"

import { useState } from "react"

type AddItemType = 'folder' | 'application' | 'directory'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAddFolder: (label: string, path: string, type: 'games' | 'tools') => Promise<void>
  onBrowse: () => void
  currentPath?: string | null
  isLoading?: boolean
}

export default function AddItemModal({
  isOpen,
  onClose,
  onAddFolder,
  onBrowse,
  currentPath,
  isLoading
}: AddItemModalProps) {
  const [itemType, setItemType] = useState<AddItemType>('folder')
  const [folderLabel, setFolderLabel] = useState('')
  const [folderPath, setFolderPath] = useState('')
  const [folderTypeTag, setFolderTypeTag] = useState<'games' | 'tools'>('games')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    setError('')

    if (itemType === 'folder') {
      if (!folderLabel.trim()) {
        setError('Folder name is required')
        return
      }
      if (!folderPath.trim()) {
        setError('Folder path is required')
        return
      }

      setIsSubmitting(true)
      try {
        await onAddFolder(folderLabel.trim(), folderPath.trim(), folderTypeTag)
        setFolderLabel('')
        setFolderPath('')
        setFolderTypeTag('games')
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add folder')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-seezee-dark border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3 className="text-white font-bold text-lg">Add Item</h3>
            <p className="text-white/40 text-xs">To your custom folders</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white/40 hover:text-white/70 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Item Type Selector */}
          <div className="space-y-2">
            <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              What would you like to add?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setItemType('folder')
                  setError('')
                }}
                disabled={isSubmitting}
                className={`px-3 py-3 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${
                  itemType === 'folder'
                    ? 'bg-seezee-red/20 border border-seezee-red text-seezee-red'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">📁</span>
                <span>Folder</span>
              </button>
              <button
                onClick={() => {
                  setItemType('application')
                  setError('')
                }}
                disabled={isSubmitting}
                className={`px-3 py-3 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${
                  itemType === 'application'
                    ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">🎮</span>
                <span>App</span>
              </button>
              <button
                onClick={() => {
                  setItemType('directory')
                  setError('')
                }}
                disabled={isSubmitting}
                className={`px-3 py-3 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${
                  itemType === 'directory'
                    ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">💾</span>
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Folder Form */}
          {(itemType === 'folder' || itemType === 'directory') && (
            <>
              {/* Folder Type Tag */}
              <div className="space-y-2">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Folder Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFolderTypeTag('games')}
                    disabled={isSubmitting}
                    className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      folderTypeTag === 'games'
                        ? 'bg-seezee-red/20 border border-seezee-red text-seezee-red'
                        : 'bg-white/5 border border-white/10 text-white/60'
                    }`}
                  >
                    🎮 Games
                  </button>
                  <button
                    onClick={() => setFolderTypeTag('tools')}
                    disabled={isSubmitting}
                    className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      folderTypeTag === 'tools'
                        ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
                        : 'bg-white/5 border border-white/10 text-white/60'
                    }`}
                  >
                    🔧 Tools
                  </button>
                </div>
              </div>

              {/* Folder Label */}
              <div className="space-y-2">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={folderLabel}
                  onChange={(e) => setFolderLabel(e.target.value)}
                  placeholder={itemType === 'directory' ? 'e.g., Epic Games Library' : 'e.g., My Games'}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Folder Path */}
              <div className="space-y-2">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Folder Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="Full path (e.g., C:\\Games)"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-seezee-red focus:outline-none font-mono disabled:opacity-50"
                  />
                  <button
                    onClick={onBrowse}
                    disabled={isSubmitting}
                    className="px-3 py-2.5 rounded-lg bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    Browse
                  </button>
                </div>
                {currentPath && (
                  <p className="text-white/40 text-xs font-mono truncate">
                    Current: {currentPath}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Application Form */}
          {itemType === 'application' && (
            <>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs">
                  ℹ️ Application support coming soon. For now, create a Games folder and add your app executables.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!folderLabel.trim() && (itemType === 'folder' || itemType === 'directory'))}
              className="flex-1 px-4 py-2.5 rounded-lg bg-seezee-red text-white text-sm font-semibold hover:bg-seezee-red-dark transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : itemType === 'folder' ? 'Create Folder' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
