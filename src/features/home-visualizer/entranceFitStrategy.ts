import type { DoorConfiguration } from '../../types'
import { sidelitePlacement } from '../../data/sideliteConfigurations'

export type DetectedDoorStructure = 'single' | 'double' | 'unknown'
export type DetectedSidelites = 'none' | 'left' | 'right' | 'both' | 'unknown'
export type EntranceWidthClass = 'narrow' | 'standard' | 'wide' | 'unknown'
export type ExistingEntranceStructure = 'single' | 'single-left-sidelite' | 'single-right-sidelite' | 'single-both-sidelites' | 'single-both-sidelites-transom' | 'double' | 'double-sidelites' | 'double-transom' | 'double-sidelites-transom' | 'unknown'
export type EntranceFitStrategy = 'use-selected-product' | 'preserve-sidelites' | 'preserve-sidelites-and-transom' | 'single-with-matching-sidelites' | 'matching-double-doors' | 'convert-opening-to-double' | 'rebuild-opening'
export type CompatibilityStatus = 'good-fit' | 'caution' | 'not-recommended' | 'unsupported'

export type EntranceDetection = { doorStructure: DetectedDoorStructure; sidelites: DetectedSidelites; transom: boolean | null; widthClass: EntranceWidthClass; approximateWidthRatio: number | null; structurallyWide: boolean; confidence: number; summary: string }
export type EntranceCompatibility = { status: CompatibilityStatus; label: string; detectedSummary: string; selectedSummary: string; notes: string[] }

export const MANUAL_ENTRANCE_OPTIONS: Array<{ value: Exclude<ExistingEntranceStructure, 'unknown'>; label: string }> = [
  ['single', 'Single door'], ['single-left-sidelite', 'Single door + left sidelite'], ['single-right-sidelite', 'Single door + right sidelite'], ['single-both-sidelites', 'Single door + both sidelites'], ['single-both-sidelites-transom', 'Single door + both sidelites + transom'], ['double', 'Double doors'], ['double-sidelites', 'Double doors + sidelites'], ['double-transom', 'Double doors + transom'], ['double-sidelites-transom', 'Double doors + sidelites + transom'],
].map(([value, label]) => ({ value: value as Exclude<ExistingEntranceStructure, 'unknown'>, label }))

export function detectedEntranceStructure(detection: EntranceDetection): ExistingEntranceStructure {
  if (detection.confidence < .65 || detection.doorStructure === 'unknown' || detection.sidelites === 'unknown') return 'unknown'
  const hasSidelites = detection.sidelites !== 'none'
  if (detection.doorStructure === 'double') {
    if (hasSidelites && detection.transom) return 'double-sidelites-transom'
    if (hasSidelites) return 'double-sidelites'
    if (detection.transom) return 'double-transom'
    return 'double'
  }
  if (detection.sidelites === 'both' && detection.transom) return 'single-both-sidelites-transom'
  if (detection.sidelites === 'both') return 'single-both-sidelites'
  if (detection.sidelites === 'left') return 'single-left-sidelite'
  if (detection.sidelites === 'right') return 'single-right-sidelite'
  return 'single'
}

export function detectionForManualStructure(structure: Exclude<ExistingEntranceStructure, 'unknown'>): EntranceDetection {
  const isDouble = structure.startsWith('double')
  const sidelites: DetectedSidelites = structure.includes('both-sidelites') ? 'both' : structure.includes('left-sidelite') ? 'left' : structure.includes('right-sidelite') ? 'right' : structure.includes('sidelites') ? 'both' : 'none'
  const transom = structure.includes('transom')
  return { doorStructure: isDouble ? 'double' : 'single', sidelites, transom, widthClass: isDouble || sidelites !== 'none' ? 'wide' : 'standard', approximateWidthRatio: null, structurallyWide: isDouble || sidelites !== 'none', confidence: 1, summary: `Manually identified as ${structure}.` }
}

function sidelitePhrase(sidelites: DetectedSidelites | ReturnType<typeof sidelitePlacement>) {
  if (sidelites === 'left') return 'a left sidelite'
  if (sidelites === 'right') return 'a right sidelite'
  if (sidelites === 'both') return 'two sidelites'
  return 'no sidelites'
}

export function detectionSummary(detection: EntranceDetection) {
  const door = detection.doorStructure === 'double' ? 'double doors' : detection.doorStructure === 'single' ? 'a single door' : 'an entrance'
  const sides = detection.sidelites === 'unknown' ? '' : ` with ${sidelitePhrase(detection.sidelites)}`
  return `We detected ${door}${sides}${detection.transom ? ' and a transom' : ''}.`
}

export function selectedConfigurationSummary(configuration: DoorConfiguration) {
  const door = configuration.doorConfigurationType === 'single' ? 'a single door' : 'double doors'
  return `You selected ${door} with ${sidelitePhrase(sidelitePlacement(configuration.sidelites))}.`
}

export function evaluateEntranceCompatibility(detection: EntranceDetection, configuration: DoorConfiguration): EntranceCompatibility | null {
  if (detectedEntranceStructure(detection) === 'unknown') return null
  const selectedDoor = configuration.doorConfigurationType === 'single' ? 'single' : 'double'
  const selectedSidelites = sidelitePlacement(configuration.sidelites)
  const doorMismatch = detection.doorStructure !== selectedDoor
  const sideliteMismatch = detection.sidelites !== selectedSidelites
  const notes: string[] = []

  if (doorMismatch) notes.push(detection.doorStructure === 'single'
    ? 'Your uploaded entrance appears to be a single-door opening, but your selected configuration is a double door. The AI may widen or alter the opening to make it fit.'
    : 'Your uploaded entrance appears to be a double-door opening, but your selected configuration is a single door. The AI may narrow or reconstruct the opening to make it fit.')
  if (sideliteMismatch) {
    if (detection.sidelites !== 'none' && selectedSidelites === 'none') notes.push('Your uploaded entrance includes sidelites. Since your configuration does not, the AI may remove or reconstruct those areas.')
    else if (detection.sidelites === 'none') notes.push('Your selected configuration includes sidelites that are not present in the uploaded entrance. The AI may widen and reconstruct the opening to add them.')
    else notes.push('The detected and selected sidelite layouts differ. The AI may reconstruct the sides of the entrance to match your configuration.')
  }
  if (detection.transom) notes.push('A transom was detected above the entrance and will usually be preserved unless major structural changes are needed.')

  const status: CompatibilityStatus = doorMismatch && sideliteMismatch ? 'not-recommended' : doorMismatch || sideliteMismatch ? 'caution' : 'good-fit'
  const labels: Record<CompatibilityStatus, string> = { 'good-fit': 'Good fit', caution: 'Caution — structural change needed', 'not-recommended': 'Not recommended — major structural change', unsupported: 'Unsupported' }
  if (!notes.length) notes.push('The selected configuration is broadly compatible with the detected entrance opening.')
  return { status, label: labels[status], detectedSummary: detectionSummary(detection), selectedSummary: selectedConfigurationSummary(configuration), notes }
}
