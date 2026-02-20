import { useState, useCallback, useRef, type DragEvent, type KeyboardEvent } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadResume } from '../../lib/api'
import type { Resume } from '../../types'

interface Props {
  onUploaded: (resume: Resume) => void
}

export default function ResumeUpload({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are accepted')
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File must be under 10MB')
        return
      }

      setError(null)
      setUploading(true)

      try {
        const resume = await uploadResume(file)
        setSuccess(true)
        onUploaded(resume)
        setTimeout(() => setSuccess(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [onUploaded],
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const triggerFileSelect = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        triggerFileSelect()
      }
    },
    [triggerFileSelect],
  )

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // Reset so the same file can be re-selected
          e.target.value = ''
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={triggerFileSelect}
        onKeyDown={handleKeyDown}
        className={`card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors ${
          dragging
            ? 'border-brand-500 bg-brand-500/5'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">Parsing resume...</p>
          </>
        ) : success ? (
          <>
            <CheckCircle className="mb-3 h-10 w-10 text-green-400" />
            <p className="text-sm text-green-400">Resume uploaded successfully!</p>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800">
              {error ? (
                <AlertCircle className="h-7 w-7 text-red-400" />
              ) : (
                <Upload className="h-7 w-7 text-gray-400" />
              )}
            </div>
            <p className="mb-1 text-sm font-medium">
              {error || 'Drop your resume PDF here'}
            </p>
            <p className="text-xs text-gray-500">
              or click to browse — PDF up to 10MB
            </p>
          </>
        )}
      </div>
    </>
  )
}
