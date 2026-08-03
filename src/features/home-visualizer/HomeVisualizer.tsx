import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, Check, ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react'

const MAX_PHOTO_SIZE = 15 * 1024 * 1024
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type SelectedPhoto = {
  file: File
  objectUrl: string
}

type Props = {
  onBack: () => void
}

function fileError(file: File) {
  if (!SUPPORTED_PHOTO_TYPES.has(file.type)) return 'Please choose a JPG, PNG, or WebP image.'
  if (file.size > MAX_PHOTO_SIZE) return 'That photo is larger than 15 MB. Please choose a smaller image.'
  return ''
}

export function HomeVisualizer({ onBack }: Props) {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const choosePhoto = (file?: File) => {
    if (!file) return
    const nextError = fileError(file)
    if (nextError) {
      setError(nextError)
      return
    }

    setError('')
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setPhoto({ file, objectUrl })
  }

  const openPicker = () => {
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => choosePhoto(event.target.files?.[0])

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    choosePhoto(event.dataTransfer.files?.[0])
  }

  const removePhoto = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setError('')
    setPhoto(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main className="visualizer-page">
      <div className="visualizer-shell">
        <div className="visualizer-heading">
          <span>View on Your Home</span>
          <h1>See your entry in context</h1>
          <p>Add a photo of your entrance to prepare the workspace for your configured door.</p>
        </div>

        <section className="visualizer-card" aria-labelledby="visualizer-photo-title">
          <div className="visualizer-card-heading">
            <div>
              <span>Step 1</span>
              <h2 id="visualizer-photo-title">Add your house photo</h2>
            </div>
            {photo && <span className="visualizer-photo-ready"><Check size={15} /> Photo ready</span>}
          </div>

          {!photo ? <>
            <div className="photo-guidance">
              <p>For the best result, stand near the center of the entrance and include the complete door, frame, threshold, sidelights, and transom. Slightly angled photos are supported, but avoid extreme side angles, wide-angle distortion, heavy shadows, and objects blocking the entrance.</p>
              <ul>
                <li><Check size={15} /> Include the entire entrance</li>
                <li><Check size={15} /> Keep the camera near the center</li>
                <li><Check size={15} /> Avoid objects blocking the door</li>
                <li><Check size={15} /> Use a clear, well-lit photo</li>
              </ul>
            </div>

            <div
              className="photo-drop-zone"
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openPicker()
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <span className="photo-drop-icon"><ImagePlus size={30} /></span>
              <strong>Upload a photo of your entrance</strong>
              <span>Drag and drop or choose a file</span>
              <small>JPG, PNG, or WebP · Maximum 15 MB</small>
              <span className="photo-picker-button"><Upload size={17} /> Choose Photo</span>
            </div>
          </> : <div className="visualizer-editor" aria-label="House photo editor area">
            <img src={photo.objectUrl} alt={`Uploaded entrance photo: ${photo.file.name}`} />
          </div>}

          <input ref={inputRef} className="visualizer-file-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onInputChange} />
          {error && <p className="visualizer-error" role="alert">{error}</p>}

          {photo && <div className="visualizer-photo-actions">
            <button type="button" className="visualizer-secondary-button" onClick={openPicker}><RefreshCw size={17} /> Replace Photo</button>
            <button type="button" className="visualizer-remove-button" onClick={removePhoto}><Trash2 size={17} /> Remove Photo</button>
            <button type="button" className="visualizer-back-button visualizer-back-button-inline" onClick={onBack}><ArrowLeft size={17} /> Back to Door Builder</button>
          </div>}
        </section>

        {!photo && <button type="button" className="visualizer-back-button" onClick={onBack}><ArrowLeft size={17} /> Back to Door Builder</button>}
      </div>
    </main>
  )
}
