import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import type { CropRect } from '@/cover/render'

interface CoverCropperProps {
  imageUrl: string
  /** Dimensiones reales de la candidata — `croppedAreaPixels` viene en esa misma escala. */
  candidateWidth: number
  candidateHeight: number
  onCropChange: (crop: CropRect) => void
}

/** Ratio 1:1.6 del blueprint — el mismo que el tamaño final de portada (1600×2560). */
const ASPECT = 1 / 1.6

export function CoverCropper({ imageUrl, candidateWidth, candidateHeight, onCropChange }: CoverCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  function handleCropComplete(_area: Area, areaPixels: Area) {
    onCropChange({
      x: areaPixels.x / candidateWidth,
      y: areaPixels.y / candidateHeight,
      width: areaPixels.width / candidateWidth,
      height: areaPixels.height / candidateHeight,
    })
  }

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-md bg-black">
      <Cropper
        image={imageUrl}
        crop={crop}
        zoom={zoom}
        aspect={ASPECT}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
