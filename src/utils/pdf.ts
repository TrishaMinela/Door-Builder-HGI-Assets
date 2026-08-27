import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { ContactForm, DoorConfigurationType, DoorStyle, DoorSwing, DoubleDoorLockPrepCode, Finish, GlassOption, GridConfiguration, HardwareOption, ResolvedDoorProduct, SideliteConfiguration, SideliteGlassConfiguration } from '../types'
import { hardwareDisplayName } from '../data/hardware'
import { configurationPdfName } from './pdfConfig'
import { sideliteProductLabel } from '../data/sideliteConfigurations'
import { doorConfigurationLabel, doubleDoorLockPrepOption, requiredDoorConfigurationProductOption } from '../data/doorConfigurationRules'

const COLORS = {
  dark: [5, 4, 11] as const,
  teal: [6, 74, 80] as const,
  gold: [248, 211, 14] as const,
  body: [31, 34, 39] as const,
  muted: [52, 56, 62] as const,
  pale: [241, 244, 243] as const,
  warm: [249, 247, 241] as const,
  divider: [218, 222, 224] as const,
}

function isLightColor(color: string) {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return false
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150
}

const COMPANY = {
  website: 'homeguardindustries.com',
  email: 'getintouch@homeguardindustries.com',
  phone: '1-800-525-1885',
}

type FinishSummary = { jambType: 'timber' | 'clad'; jambFinishType: 'paint' | 'stain' | 'clad'; jambFinishColor: string; jambFinishOverridden: boolean; glassFrameFinishColor?: string }

function cropTransparentCanvas(source: HTMLCanvasElement) {
  const context = source.getContext('2d', { willReadFrequently: true })
  if (!context) return source
  const pixels = context.getImageData(0, 0, source.width, source.height).data
  let left = source.width
  let top = source.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (pixels[(y * source.width + x) * 4 + 3] <= 4) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) return source
  const cropped = document.createElement('canvas')
  cropped.width = right - left + 1
  cropped.height = bottom - top + 1
  cropped.getContext('2d')?.drawImage(source, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
  return cropped
}

const PREVIEW_READY_TIMEOUT_MS = 12000
const PREVIEW_STABLE_WINDOW_MS = 180

function nextAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function waitForComposedDoorPreview(assembly: HTMLElement) {
  const scene = assembly.closest<HTMLElement>('.preview-scene') ?? assembly
  const startedAt = performance.now()
  let lastMutationAt = performance.now()
  const observer = new MutationObserver(() => { lastMutationAt = performance.now() })
  observer.observe(scene, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'style', 'class', 'aria-busy'],
  })

  try {
    if ('fonts' in document) await document.fonts.ready

    // DoorPreview can add glass, grid, hardware, and sidelite layers over
    // several React commits. Wait until its own readiness flag is clear, all
    // rendered images are decoded, and the scene has remained stable briefly.
    while (performance.now() - startedAt < PREVIEW_READY_TIMEOUT_MS) {
      const images = Array.from(scene.querySelectorAll<HTMLImageElement>('img'))
      await Promise.all(images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => {
              window.clearTimeout(timeout)
              image.removeEventListener('load', finish)
              image.removeEventListener('error', finish)
              resolve()
            }
            const timeout = window.setTimeout(finish, 250)
            image.addEventListener('load', finish, { once: true })
            image.addEventListener('error', finish, { once: true })
          })
        }
        if (image.complete && image.naturalWidth > 0) {
          try { await image.decode() } catch { /* The decoded pixels may already be available. */ }
        }
      }))

      await nextAnimationFrame()
      await nextAnimationFrame()

      const hasPendingImage = Array.from(scene.querySelectorAll<HTMLImageElement>('img'))
        .some((image) => !image.complete)
      const isBusy = scene.getAttribute('aria-busy') === 'true'
      const isStable = performance.now() - lastMutationAt >= PREVIEW_STABLE_WINDOW_MS
      if (!hasPendingImage && !isBusy && isStable) return

      await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
    }

    throw new Error('The configured door preview did not finish loading in time.')
  } finally {
    observer.disconnect()
  }
}

async function loadImage(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Unable to load image: ${path}`)
  const blob = await response.blob()
  return await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

async function applyBrandFont(pdf: jsPDF) {
  const response = await fetch('/assets/branding/Montserrat-Variable.ttf')
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  pdf.addFileToVFS('Montserrat.ttf', btoa(binary))
  pdf.addFont('Montserrat.ttf', 'Montserrat', 'normal')
  pdf.addFont('Montserrat.ttf', 'Montserrat', 'bold')
  pdf.setFont('Montserrat', 'normal')
}

type PdfPreviewDebug = {
  doorConfigurationType?: DoorConfigurationType
  sidelites?: SideliteConfiguration
}

function countVisiblePixels(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || canvas.width <= 0 || canvas.height <= 0) return 0
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let visible = 0
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 8) visible += 1
  }
  return visible
}

export async function captureCanonicalDoorPreview(debug: PdfPreviewDebug = {}, previewRoot: HTMLElement | null = null) {
  if (typeof document === 'undefined') return null
  // Capture the complete procedural assembly rather than only the center slab.
  // DoorFrame contains the jambs, sidelites, mullions, and threshold.
  const candidates = previewRoot
    ? Array.from(previewRoot.querySelectorAll<HTMLElement>('.door-frame[data-frame="visible"]'))
    : Array.from(document.querySelectorAll<HTMLElement>('.pdf-door-capture-host .door-frame[data-frame="visible"]'))
  const assembly = candidates.find((candidate) => candidate.offsetWidth > 0 && candidate.offsetHeight > 0)
  if (!assembly) {
    if (import.meta.env.DEV) console.error('PDF_PREVIEW_DEBUG', { ...debug, previewSourceType: 'canonical-exterior-dom', previewReady: false, reason: 'No mounted canonical Exterior preview was found.' })
    return null
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await waitForComposedDoorPreview(assembly)
      // Keep the PDF source crisp and viewport-independent. A narrow mobile
      // Review preview receives a larger backing scale than the desktop view.
      const captureScale = Math.max(3, Math.min(6, 1400 / Math.max(assembly.offsetWidth, assembly.offsetHeight)))
      const canvas = await html2canvas(assembly, {
        backgroundColor: null,
        logging: false,
        scale: captureScale,
        useCORS: true,
      })
      const cropped = cropTransparentCanvas(canvas)
      const visiblePixels = countVisiblePixels(cropped)
      if (cropped.width <= 0 || cropped.height <= 0 || visiblePixels === 0) throw new Error('Captured preview canvas is empty.')
      const dataUrl = cropped.toDataURL('image/png')
      if (import.meta.env.DEV) console.info('PDF_PREVIEW_DEBUG', {
        ...debug,
        previewSourceType: 'canonical-exterior-dom/html2canvas',
        previewWidth: assembly.offsetWidth,
        previewHeight: assembly.offsetHeight,
        canvasWidth: cropped.width,
        canvasHeight: cropped.height,
        captureScale,
        dataUrlLength: dataUrl.length,
        nonTransparentPixelCount: visiblePixels,
        previewReady: true,
        imageDecodeState: 'complete',
        attempt,
      })
      return dataUrl
    } catch (error) {
      console.warn('[pdf:composed-preview-capture-failed]', { attempt, error })
      if (attempt < 3) await new Promise<void>((resolve) => window.setTimeout(resolve, 180 * attempt))
    }
  }
  return null
}

function addImageContained(pdf: jsPDF, dataUrl: string, x: number, y: number, width: number, height: number) {
  const image = pdf.getImageProperties(dataUrl)
  const scale = Math.min(width / image.width, height / image.height)
  const renderedWidth = image.width * scale
  const renderedHeight = image.height * scale
  pdf.addImage(dataUrl, 'PNG', x + (width - renderedWidth) / 2, y + (height - renderedHeight) / 2, renderedWidth, renderedHeight)
}

function wrapText(pdf: jsPDF, value: string, width: number, maxLines = 3) {
  const lines = pdf.splitTextToSize(value, width) as string[]
  if (lines.length <= maxLines) return lines
  const visible = lines.slice(0, maxLines)
  let finalLine = `${visible[maxLines - 1]}...`
  while (pdf.getTextWidth(finalLine) > width && finalLine.length > 3) finalLine = `${finalLine.slice(0, -4)}...`
  visible[maxLines - 1] = finalLine
  return visible
}

function drawRowIcon(pdf: jsPDF, x: number, y: number, index: number, icon?: string) {
  pdf.setFillColor(...COLORS.pale)
  pdf.circle(x, y, 13, 'F')
  if (icon) {
    addImageContained(pdf, icon, x - 8, y - 8, 16, 16)
    return
  }
  pdf.setDrawColor(...COLORS.teal)
  pdf.setLineWidth(1.4)
  const variant = index % 4
  if (variant === 0) {
    pdf.rect(x - 4, y - 6, 8, 12)
    pdf.line(x - 2, y - 2, x + 2, y - 2)
  } else if (variant === 1) {
    pdf.circle(x, y, 5)
    pdf.line(x - 7, y + 7, x + 7, y + 7)
  } else if (variant === 2) {
    pdf.line(x - 6, y - 5, x + 6, y + 5)
    pdf.line(x + 6, y - 5, x - 6, y + 5)
  } else {
    pdf.rect(x - 6, y - 4, 12, 8)
    pdf.line(x - 6, y - 4, x, y + 1)
    pdf.line(x + 6, y - 4, x, y + 1)
  }
}

type SummaryRow = { label: string; value: string; swatch?: string; icon?: string }

function drawSummaryRow(pdf: jsPDF, font: string, row: SummaryRow, index: number, y: number, rowHeight = 44) {
  const iconX = 52
  const copyX = 76
  const rightX = 345
  const valueX = 188
  const textX = row.swatch ? valueX + 19 : valueX
  const lines = wrapText(pdf, row.value, rightX - textX, 2)
  drawRowIcon(pdf, iconX, y + Math.min(15, rowHeight / 2), index, row.icon)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(8.2)
  pdf.setTextColor(...COLORS.teal)
  pdf.text(row.label, copyX, y + 11)

  if (row.swatch) {
    pdf.setFillColor(row.swatch)
    pdf.circle(valueX + 7, y + 13, 6, 'F')
    pdf.setDrawColor(...COLORS.divider)
    pdf.circle(valueX + 7, y + 13, 6)
  }

  pdf.setFont(font, 'bold')
  pdf.setFontSize(10.2)
  pdf.setTextColor(...COLORS.dark)
  pdf.text(lines, textX, y + 16, { lineHeightFactor: 1.2 })
  pdf.setDrawColor(...COLORS.divider)
  pdf.setLineWidth(0.6)
  pdf.line(copyX, y + rowHeight - 2, rightX, y + rowHeight - 2)
  return y + rowHeight
}

function drawFooterIcon(pdf: jsPDF, x: number, y: number, type: 'website' | 'email' | 'phone') {
  pdf.setDrawColor(...COLORS.teal)
  pdf.setLineWidth(1.2)
  if (type === 'website') {
    pdf.circle(x, y, 8)
    pdf.line(x - 8, y, x + 8, y)
    pdf.ellipse(x, y, 3.5, 8)
  } else if (type === 'email') {
    pdf.rect(x - 9, y - 6, 18, 12)
    pdf.line(x - 9, y - 6, x, y + 1)
    pdf.line(x + 9, y - 6, x, y + 1)
  } else {
    pdf.line(x - 6, y - 7, x + 6, y + 7)
    pdf.circle(x - 7, y - 8, 2)
    pdf.circle(x + 7, y + 8, 2)
  }
}

async function generateLegacySummaryPdf(
  contact: ContactForm,
  product: ResolvedDoorProduct,
  style: DoorStyle,
  grain: string | null,
  finish: Finish,
  glass: GlassOption | null,
  grid: GridConfiguration | null,
  hardware: HardwareOption,
  doorSwing: DoorSwing,
  sidelites: SideliteConfiguration,
  sideliteStyle: string | null,
  sideliteGlass: SideliteGlassConfiguration | null = null,
  jamb?: FinishSummary,
  doorConfigurationType: DoorConfigurationType = 'single',
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  let font = 'helvetica'
  try {
    await applyBrandFont(pdf)
    font = 'Montserrat'
  } catch {
    pdf.setFont('helvetica', 'normal')
  }

  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, 595.28, 841.89, 'F')

  // Header: 0–110 pt
  pdf.setFillColor(...COLORS.dark)
  pdf.rect(0, 0, 595.28, 106, 'F')
  try {
    addImageContained(pdf, await loadImage('/assets/branding/hgi-logo-white.png'), 40, 28, 158, 30)
  } catch {
    pdf.setFont(font, 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(255, 255, 255)
    pdf.text('HOME GUARD INDUSTRIES', 40, 55)
  }
  pdf.setDrawColor(105, 107, 112)
  pdf.setLineWidth(0.8)
  pdf.line(220, 23, 220, 82)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor(...COLORS.gold)
  pdf.text('HOME GUARD DOOR BUILDER', 244, 48)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(235, 236, 239)
  pdf.text('BUILD YOUR DOOR. REQUEST A QUOTE.', 244, 67)
  pdf.setFillColor(...COLORS.gold)
  pdf.rect(0, 106, 595.28, 4, 'F')

  // Main summary and composed door: 135–535 pt
  pdf.setFont(font, 'normal')
  pdf.setFontSize(20)
  pdf.setTextColor(...COLORS.muted)
  pdf.text('Your', 40, 151)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(24)
  pdf.setTextColor(...COLORS.teal)
  pdf.text('door summary', 88, 151)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...COLORS.muted)
  const generatedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
  pdf.text(`Generated ${generatedDate}`, 40, 171)
  pdf.setFontSize(10.5)
  pdf.setTextColor(...COLORS.body)
  pdf.text(['Here is a summary of your selected', 'door configuration.'], 40, 192, { lineHeightFactor: 1.35 })

  const material = product.doorTypes.map((doorType) => grain ? doorType.replace(` - ${grain}`, '') : doorType).join(' / ')
  const iconPaths = ['door-line', 'door-style', 'finish', 'color', 'glass', 'hardware', 'door-swing']
  const summaryIcons = await Promise.all(iconPaths.map(async (name) => {
    try {
      return await loadImage(`/assets/pdf-icons/${name}.png`)
    } catch {
      return undefined
    }
  }))
  const rows: SummaryRow[] = [
    { label: 'DOOR CONFIGURATION', value: doorConfigurationLabel(doorConfigurationType) },
    ...(requiredDoorConfigurationProductOption(doorConfigurationType) ? [{ label: 'SAVANNAH PRODUCT OPTION', value: requiredDoorConfigurationProductOption(doorConfigurationType)!.label }] : []),
    { label: 'DOOR LINE', value: grain ? `${material} - ${grain}` : material, icon: summaryIcons[0] },
    { label: 'DOOR STYLE', value: style.name, icon: summaryIcons[1] },
    { label: 'SIDELITE CONFIGURATION', value: sideliteProductLabel(sidelites) },
    ...(sideliteStyle ? [{ label: 'SIDELITE SLAB', value: sideliteStyle }] : []),
    ...(sideliteGlass ? [
      { label: 'SIDELITE GLASS', value: sideliteGlass.glass },
      ...(sideliteGlass.glassCoating ? [{ label: 'SIDELITE GLASS COATING', value: sideliteGlass.glassCoating }] : []),
      ...(sideliteGlass.gridLocation ? [{ label: 'SIDELITE GRID LOCATION', value: sideliteGlass.gridLocation }] : []),
      ...(sideliteGlass.gridStyle ? [{ label: 'SIDELITE GRID STYLE', value: sideliteGlass.gridStyle }] : []),
      ...(sideliteGlass.gridPattern ? [{ label: 'SIDELITE GRID PATTERN', value: sideliteGlass.gridPattern }] : []),
      ...(sideliteGlass.gridColor ? [{ label: 'SIDELITE GRID COLOR', value: sideliteGlass.gridColor }] : []),
      ...(sideliteGlass.gridWidth ? [{ label: 'SIDELITE GRID WIDTH', value: sideliteGlass.gridWidth }] : []),
    ] : []),
    { label: 'DOOR FINISH TYPE', value: finish.finishType === 'paint' ? 'Paint' : 'Stain', icon: summaryIcons[2] },
    { label: 'DOOR FINISH COLOR', value: finish.name, swatch: finish.color, icon: summaryIcons[3] },
    ...(jamb ? [
      { label: 'JAMB TYPE', value: jamb.jambType === 'clad' ? 'Clad' : 'Timber' },
      { label: 'JAMB FINISH TYPE', value: jamb.jambFinishType === 'clad' ? 'Clad' : jamb.jambFinishType === 'stain' ? 'Stain' : 'Paint' },
      { label: 'JAMB FINISH COLOR', value: jamb.jambFinishColor },
      ...(jamb.glassFrameFinishColor ? [{ label: 'GLASS FRAME COLOR', value: jamb.glassFrameFinishColor }] : []),
    ] : []),
    { label: 'MAIN DOOR GLASS', value: glass?.name ?? 'No glass', icon: summaryIcons[4] },
    ...(grid ? [
      ...(grid.glassCoating !== 'Standard / No Low-E' ? [{ label: 'GLASS COATING', value: grid.glassCoating }] : []),
      ...(grid.gridLocation ? [{ label: 'GRID LOCATION', value: grid.gridLocation }] : []),
      ...(grid.gridStyle ? [{ label: 'GRID STYLE', value: grid.gridStyle }] : []),
      ...(grid.gridPattern ? [{ label: 'GRID PATTERN', value: grid.gridPattern }] : []),
      ...(grid.gridColor ? [{ label: 'GRID COLOR', value: grid.gridColor }] : []),
      ...(grid.gridWidth ? [{ label: 'GRID WIDTH', value: grid.gridWidth }] : []),
    ] : []),
    { label: 'HARDWARE', value: hardwareDisplayName(hardware), icon: summaryIcons[5] },
    { label: 'DOOR SWING', value: doorSwing.name, icon: summaryIcons[6] },
  ]
  let rowY = 221
  const summaryRowHeight = rows.length > 11 ? 26 : rows.length > 8 ? 28 : 44
  rows.forEach((row, index) => { rowY = drawSummaryRow(pdf, font, row, index, rowY, summaryRowHeight) })

  const useDarkPreviewBackground = isLightColor(finish.color)
  pdf.setFillColor(useDarkPreviewBackground ? 5 : 255, useDarkPreviewBackground ? 4 : 255, useDarkPreviewBackground ? 11 : 255)
  pdf.roundedRect(367, 135, 188, 399, 8, 8, 'F')
  pdf.setFillColor(useDarkPreviewBackground ? 20 : 242, useDarkPreviewBackground ? 22 : 244, useDarkPreviewBackground ? 27 : 243)
  pdf.circle(461, 315, 82, 'F')
  const composedPreview = await captureCanonicalDoorPreview({ doorConfigurationType, sidelites })
  if (composedPreview) {
    addImageContained(pdf, composedPreview, 398, 151, 126, 315)
  } else {
    pdf.setFont(font, 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.muted)
    pdf.text('Composed preview unavailable', 461, 315, { align: 'center' })
  }
  // Custom-made callout: 550–650 pt
  pdf.setFillColor(...COLORS.pale)
  pdf.roundedRect(40, 550, 515, 92, 8, 8, 'F')
  pdf.setFillColor(226, 235, 233)
  pdf.circle(80, 596, 25, 'F')
  pdf.setDrawColor(...COLORS.teal)
  pdf.setLineWidth(2)
  pdf.line(70, 605, 90, 585)
  pdf.line(84, 585, 90, 585)
  pdf.line(90, 585, 90, 591)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(...COLORS.teal)
  pdf.text('Custom made for you', 118, 584)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.body)
  pdf.text(['Every detail matters. This door was designed', 'to fit your style and needs.'], 118, 602, { lineHeightFactor: 1.35 })
  pdf.setDrawColor(...COLORS.divider)
  pdf.setLineWidth(0.8)
  pdf.line(350, 565, 350, 627)
  pdf.setFontSize(9)
  pdf.text(['Scan to view or customize', 'this door online.'], 375, 585, { lineHeightFactor: 1.35 })
  // No QR generator or QR asset exists in the project; reserve its reference position.
  pdf.setDrawColor(...COLORS.divider)
  pdf.roundedRect(493, 568, 44, 44, 3, 3)

  // Disclaimer: 660–700 pt
  pdf.setFillColor(...COLORS.pale)
  pdf.circle(51, 673, 10, 'F')
  pdf.setFont(font, 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.teal)
  pdf.text('i', 51, 676, { align: 'center' })
  pdf.setFont(font, 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...COLORS.body)
  pdf.text(['This configuration is a quote request and is not an order or final price.', 'Final pricing will be provided upon submission of your request.'], 70, 670, { lineHeightFactor: 1.35 })

  // Contact footer: 710 pt to page bottom
  const footerY = 710
  pdf.setFillColor(...COLORS.pale)
  pdf.rect(0, footerY, 595.28, 131.89, 'F')
  const footerItems = [
    { label: 'VISIT OUR WEBSITE', value: COMPANY.website, icon: 'website' as const },
    { label: 'EMAIL US', value: COMPANY.email, icon: 'email' as const },
    { label: 'CALL US', value: COMPANY.phone, icon: 'phone' as const },
  ]
  footerItems.forEach((item, index) => {
    const width = 595.28 / 3
    const centerX = width * index + width / 2
    if (index > 0) {
      pdf.setDrawColor(...COLORS.divider)
      pdf.line(width * index, footerY + 25, width * index, footerY + 105)
    }
    drawFooterIcon(pdf, centerX, footerY + 34, item.icon)
    pdf.setFont(font, 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...COLORS.teal)
    pdf.text(item.label, centerX, footerY + 62, { align: 'center' })
    pdf.setFont(font, 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...COLORS.body)
    pdf.text(item.value, centerX, footerY + 82, { align: 'center' })
  })

  if (contact.fullName) {
    pdf.setFont(font, 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...COLORS.muted)
    pdf.text(`Prepared for ${contact.fullName} · ${contact.email} · ${contact.phone}`, 297.64, 827, { align: 'center' })
  }

  return pdf
}

export async function generateSummaryPdf(
  contact: ContactForm,
  product: ResolvedDoorProduct,
  style: DoorStyle,
  grain: string | null,
  finish: Finish,
  glass: GlassOption | null,
  grid: GridConfiguration | null,
  hardware: HardwareOption,
  doorSwing: DoorSwing,
  sidelites: SideliteConfiguration,
  sideliteStyle: string | null,
  sideliteGlass: SideliteGlassConfiguration | null = null,
  jamb?: FinishSummary,
  doorConfigurationType: DoorConfigurationType = 'single',
  previewDataUrl: string | null = null,
  doubleDoorLockPrep: DoubleDoorLockPrepCode | null = null,
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  let font = 'helvetica'
  try {
    await applyBrandFont(pdf)
    font = 'Montserrat'
  } catch {
    pdf.setFont('helvetica', 'normal')
  }

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const template = await loadImage('/assets/pdf/home-guard-door-configuration-template.png')
  pdf.addImage(template, 'PNG', 0, 0, pageWidth, pageHeight)

  // The supplied raster template includes a large gray rounded placeholder in
  // the preview column. Restore that area to the page background so the final
  // configured assembly reads directly on white rather than inside a UI card.
  pdf.setFillColor(255, 255, 255)
  pdf.rect(329, 178, 245, 254, 'F')

  const generatedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
  pdf.setFont(font, 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.teal)
  pdf.text(generatedDate, 114, 135)
  pdf.setFont(font, 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...COLORS.teal)
  pdf.text(`DOOR CONFIGURATION: ${doorConfigurationLabel(doorConfigurationType)}`, 346, 164)
  const requiredProductOption = requiredDoorConfigurationProductOption(doorConfigurationType)
  if (requiredProductOption) {
    pdf.setFontSize(6.5)
    pdf.text(`PRODUCT OPTION: ${requiredProductOption.label}`, 346, 180)
  }

  const material = product.doorTypes.map((doorType) => grain ? doorType.replace(` - ${grain}`, '') : doorType).join(' / ')
  const placement = sideliteProductLabel(sidelites)
  const gridDetails = grid ? [grid.glassCoating !== 'Standard / No Low-E' ? grid.glassCoating : '', grid.gridLocation, grid.gridStyle, grid.gridPattern, grid.gridColor, grid.gridWidth].filter(Boolean).join(' / ') : ''
  const sideliteGridDetails = sideliteGlass ? [sideliteGlass.glassCoating, sideliteGlass.gridLocation, sideliteGlass.gridStyle, sideliteGlass.gridPattern, sideliteGlass.gridColor, sideliteGlass.gridWidth].filter(Boolean).join(' / ') : ''
  const rowValues = [
    grain ? `${material} - ${grain}` : material,
    style.name,
    placement,
    sidelites === 'none' ? 'Not applicable' : sideliteStyle ?? 'Not selected',
    sidelites === 'none' ? 'Not applicable' : [sideliteGlass?.glass ?? 'Not selected', sideliteGridDetails].filter(Boolean).join(' - '),
    finish.finishType === 'paint' ? 'Paint' : 'Stain',
    finish.name,
    jamb?.jambType === 'clad' ? 'Clad' : 'Timber',
    jamb?.jambFinishType === 'clad' ? 'Clad' : jamb?.jambFinishType === 'stain' ? 'Stain' : 'Paint',
    jamb?.jambFinishColor || 'Not selected',
    [glass?.name ?? 'No glass', gridDetails].filter(Boolean).join(' - '),
    [hardwareDisplayName(hardware), doorConfigurationType !== 'single' ? `Lock Setup: ${doubleDoorLockPrepOption(doubleDoorLockPrep)?.name ?? 'Locks on Both Doors'}` : null].filter(Boolean).join(' — '),
    doorSwing.name,
  ]
  const rowBaselines = [214, 259.5, 305, 350.5, 396, 441.5, 487, 532.5, 578, 623.5, 669, 714.5, 760]
  pdf.setFont(font, 'bold')
  pdf.setTextColor(...COLORS.dark)
  rowValues.forEach((value, index) => {
    const availableWidth = 268
    let fontSize = 9
    pdf.setFontSize(fontSize)
    while (pdf.getTextWidth(value) > availableWidth && fontSize > 6.6) {
      fontSize -= .2
      pdf.setFontSize(fontSize)
    }
    const lines = wrapText(pdf, value, availableWidth, 1)
    pdf.text(lines[0], 39, rowBaselines[index])
  })

  const composedPreview = previewDataUrl ?? await captureCanonicalDoorPreview({ doorConfigurationType, sidelites })
  if (composedPreview) addImageContained(pdf, composedPreview, 358, 218, 186, 166)
  if (import.meta.env.DEV) console.info('PDF_PREVIEW_DEBUG', { doorConfigurationType, sidelites, previewSourceType: previewDataUrl ? 'cached-review-png' : 'live-review-dom', dataUrlLength: composedPreview?.length ?? 0, pdfInsertionResult: composedPreview ? 'inserted' : 'missing' })

  if (contact.fullName) {
    pdf.setFont(font, 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(92, 99, 103)
    pdf.text(`Prepared for ${contact.fullName}`, 451, 422, { align: 'center' })
  }

  return pdf
}

export async function downloadSummary(contact: ContactForm, product: ResolvedDoorProduct, style: DoorStyle, grain: string | null, finish: Finish, glass: GlassOption | null, grid: GridConfiguration | null, hardware: HardwareOption, doorSwing: DoorSwing, sidelites: SideliteConfiguration, sideliteStyle: string | null, sideliteGlass: SideliteGlassConfiguration | null = null, jamb?: FinishSummary, doorConfigurationType: DoorConfigurationType = 'single', previewDataUrl: string | null = null, doubleDoorLockPrep: DoubleDoorLockPrepCode | null = null) {
  const pdf = await generateSummaryPdf(contact, product, style, grain, finish, glass, grid, hardware, doorSwing, sidelites, sideliteStyle, sideliteGlass, jamb, doorConfigurationType, previewDataUrl, doubleDoorLockPrep)
  pdf.save(configurationPdfName)
}

export async function generateSummaryAttachment(contact: ContactForm, product: ResolvedDoorProduct, style: DoorStyle, grain: string | null, finish: Finish, glass: GlassOption | null, grid: GridConfiguration | null, hardware: HardwareOption, doorSwing: DoorSwing, sidelites: SideliteConfiguration, sideliteStyle: string | null, sideliteGlass: SideliteGlassConfiguration | null = null, jamb?: FinishSummary, doorConfigurationType: DoorConfigurationType = 'single', previewDataUrl: string | null = null, doubleDoorLockPrep: DoubleDoorLockPrepCode | null = null) {
  const pdf = await generateSummaryPdf(contact, product, style, grain, finish, glass, grid, hardware, doorSwing, sidelites, sideliteStyle, sideliteGlass, jamb, doorConfigurationType, previewDataUrl, doubleDoorLockPrep)
  const dataUri = pdf.output('datauristring')
  return {
    fileName: configurationPdfName,
    mimeType: 'application/pdf' as const,
    encoding: 'base64' as const,
    data: dataUri.slice(dataUri.indexOf(',') + 1),
  }
}
