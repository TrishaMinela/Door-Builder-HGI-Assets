import { useEffect, useRef, useState } from 'react'
import { DoorPreview, type DoorPreviewProps } from '../../components/DoorPreview'
import { captureDoorPreview } from '../home-visualizer/captureDoorPreview'

declare global {
  interface Window {
    __captureHeroDoor?: () => Promise<{ base64: string; width: number; height: number }>
    __heroDoorReady?: boolean
  }
}

type Props = {
  previewProps: DoorPreviewProps
  label: string
}

function blobBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('The generated hero image could not be read.'))
    reader.readAsDataURL(blob)
  })
}

export function HeroDoorGenerator({ previewProps, label }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    window.__heroDoorReady = true
    window.__captureHeroDoor = async () => {
      if (!rootRef.current) throw new Error('The hero door render root is unavailable.')
      setError('')
      try {
        const captured = await captureDoorPreview(rootRef.current, { frameMode: 'hidden', mimeType: 'image/webp', quality: 0.92, targetHeight: 1100 })
        return { base64: await blobBase64(captured.blob), width: captured.width, height: captured.height }
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'The hero door could not be generated.'
        setError(message)
        throw new Error(message)
      }
    }
    return () => { delete window.__captureHeroDoor; delete window.__heroDoorReady }
  }, [])

  return <main className="hero-generation-page">
    <p>Generating {label}</p>
    {error && <pre>{error}</pre>}
    <div ref={rootRef} className="home-app hero-generation-root">
      <div className="home-entryway-door-slot hero-door-stack entryway-door-stack hero-door-overlay">
        <DoorPreview {...previewProps} view="Exterior" showViewToggle={false} sidelites="none" compact />
      </div>
    </div>
  </main>
}
