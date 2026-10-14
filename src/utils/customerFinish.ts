import { paintColors, stainColors } from '../data/finishes'
import type { Finish } from '../types'

// This neutral surface is for preview rendering only, never a product choice.
export const UNSELECTED_FINISH: Finish = {
  id: 'preview-unselected', name: 'Not selected', description: '', image: '',
  color: '#d9d9d9', accent: '#cccccc', category: 'paint', finishType: 'paint', proMatch: false,
}

export function assertCustomerFinish(finish: Finish | null | undefined) {
  const colors = finish?.finishType === 'stain' ? stainColors : paintColors
  if (!finish || !colors.some(color => finish.id === `${finish.finishType}-${color.id}`)) {
    throw new Error('Please select a door finish before continuing.')
  }
}
