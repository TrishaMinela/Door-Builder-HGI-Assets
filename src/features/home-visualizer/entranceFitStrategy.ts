import type { DoorConfiguration } from '../../types'
import { sidelitePlacement } from '../../data/sideliteConfigurations'
import { isDoubleDoorConfiguration } from '../../data/doorConfigurationRules'

export type DetectedDoorStructure = 'single' | 'double' | 'unknown'
export type DetectedSidelites = 'none' | 'left' | 'right' | 'both' | 'unknown'
export type EntranceWidthClass = 'narrow' | 'standard' | 'wide' | 'unknown'
export type ExistingEntranceStructure = 'single' | 'single-left-sidelite' | 'single-right-sidelite' | 'single-both-sidelites' | 'single-both-sidelites-transom' | 'double' | 'double-sidelites' | 'double-transom' | 'double-sidelites-transom' | 'unknown'
export type EntranceFitStrategy = 'use-selected-product' | 'preserve-sidelites' | 'preserve-sidelites-and-transom' | 'single-with-matching-sidelites' | 'matching-double-doors' | 'convert-opening-to-double' | 'rebuild-opening'
export type VisualizerOpeningFamily = 'A' | 'B' | 'C' | 'D' | 'E'
export type CompatibilityStatus = 'good-fit' | 'incompatible'
export type EntranceRegion = { x: number; y: number; width: number; height: number }
export type SideliteEvidence = { present: boolean; confidence: number; evidence: string; region: EntranceRegion | null }

export type EntranceDetection = { doorStructure: DetectedDoorStructure; leftSidelitePresent: boolean; rightSidelitePresent: boolean; leftSidelite: SideliteEvidence; rightSidelite: SideliteEvidence; sidelites: DetectedSidelites; sideliteConfidenceLow?: boolean; transom: boolean | null; mainDoorRegion: EntranceRegion | null; transomRegion: EntranceRegion | null; widthClass: EntranceWidthClass; approximateWidthRatio: number | null; structurallyWide: boolean; confidence: number; summary: string }
export type EntranceCompatibility = { status: CompatibilityStatus; label: string; detectedSummary: string; selectedSummary: string; notes: string[]; detectedFamily: VisualizerOpeningFamily; selectedFamily: VisualizerOpeningFamily }

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
  const leftSidelitePresent = sidelites === 'left' || sidelites === 'both'
  const rightSidelitePresent = sidelites === 'right' || sidelites === 'both'
  return { doorStructure: isDouble ? 'double' : 'single', leftSidelitePresent, rightSidelitePresent, leftSidelite: { present: leftSidelitePresent, confidence: 1, evidence: 'Manually identified.', region: null }, rightSidelite: { present: rightSidelitePresent, confidence: 1, evidence: 'Manually identified.', region: null }, sidelites, transom, mainDoorRegion: null, transomRegion: null, widthClass: isDouble || sidelites !== 'none' ? 'wide' : 'standard', approximateWidthRatio: null, structurallyWide: isDouble || sidelites !== 'none', confidence: 1, summary: `Manually identified as ${structure}.` }
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
  const door = isDoubleDoorConfiguration(configuration.doorConfigurationType) ? 'double doors' : 'a single door'
  return `You selected ${door} with ${sidelitePhrase(sidelitePlacement(configuration.sidelites))}.`
}

function openingFamily(door: DetectedDoorStructure, sidelites: DetectedSidelites): VisualizerOpeningFamily | null {
  if (door === 'unknown' || sidelites === 'unknown') return null
  if (door === 'single') {
    if (sidelites === 'none') return 'A'
    if (sidelites === 'left' || sidelites === 'right') return 'B'
    return 'C'
  }
  if (sidelites === 'none') return 'C'
  if (sidelites === 'left' || sidelites === 'right') return 'D'
  return 'E'
}

export function getDetectedVisualizerOpeningFamily(detection: EntranceDetection): VisualizerOpeningFamily | null {
  if (detection.confidence < .65 || detection.sideliteConfidenceLow) return null
  return openingFamily(detection.doorStructure, detection.sidelites)
}

export function getSelectedVisualizerOpeningFamily(configuration: DoorConfiguration): VisualizerOpeningFamily {
  const door: DetectedDoorStructure = isDoubleDoorConfiguration(configuration.doorConfigurationType) ? 'double' : 'single'
  return openingFamily(door, sidelitePlacement(configuration.sidelites))!
}

export function isVisualizerOpeningCompatible(detectedFamily: VisualizerOpeningFamily, selectedFamily: VisualizerOpeningFamily) {
  return detectedFamily === selectedFamily
}

export function evaluateEntranceCompatibility(detection: EntranceDetection, configuration: DoorConfiguration): EntranceCompatibility | null {
  const detectedFamily = getDetectedVisualizerOpeningFamily(detection)
  if (!detectedFamily) return null
  const selectedFamily = getSelectedVisualizerOpeningFamily(configuration)
  const compatible = isVisualizerOpeningCompatible(detectedFamily, selectedFamily)
  return {
    status: compatible ? 'good-fit' : 'incompatible',
    label: compatible ? 'Compatible opening' : 'Incompatible opening',
    detectedSummary: detectionSummary(detection),
    selectedSummary: selectedConfigurationSummary(configuration),
    notes: compatible ? [] : ['The detected opening and selected configuration belong to different visualizer opening families.'],
    detectedFamily,
    selectedFamily,
  }
}
