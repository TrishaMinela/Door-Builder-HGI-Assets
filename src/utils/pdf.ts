import jsPDF from 'jspdf'
import type { ContactForm, DoorStyle, Finish, GlassOption, HardwareOption } from '../types'

async function loadLogo() {
  const response = await fetch('/assets/branding/hgi-logo-black.png')
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
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  pdf.addFileToVFS('Montserrat.ttf', btoa(binary))
  pdf.addFont('Montserrat.ttf', 'Montserrat', 'normal')
  pdf.addFont('Montserrat.ttf', 'Montserrat', 'bold')
  pdf.setFont('Montserrat', 'normal')
}

export const configurationPdfName = 'Home Guard Door Configuration.pdf'

export async function generateSummaryPdf(contact: ContactForm, style: DoorStyle, finish: Finish, glass: GlassOption, hardware: HardwareOption) {
  const pdf = new jsPDF()
  let brandFont = 'helvetica'
  try {
    await applyBrandFont(pdf)
    brandFont = 'Montserrat'
  } catch {
    pdf.setFont('helvetica', 'normal')
  }
  pdf.setFillColor(247, 250, 255)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setFillColor(5, 4, 11)
  pdf.rect(0, 0, 210, 42, 'F')
  pdf.setFillColor(248, 211, 14)
  pdf.rect(0, 42, 210, 3, 'F')
  pdf.setFillColor(247, 250, 255)
  pdf.roundedRect(12, 5, 60, 31, 1.5, 1.5, 'F')
  try {
    const logo = await loadLogo()
    pdf.addImage(logo, 'PNG', 15, 7, 54, 27)
  } catch {
    pdf.setTextColor(247, 250, 255)
    pdf.setFont(brandFont, 'bold')
    pdf.setFontSize(18)
    pdf.text('HOME GUARD INDUSTRIES', 15, 24)
  }
  pdf.setTextColor(247, 250, 255)
  pdf.setFont(brandFont, 'bold')
  pdf.setFontSize(9)
  pdf.text('HOME GUARD DOOR BUILDER', 192, 20, { align: 'right' })
  pdf.setFont(brandFont, 'normal')
  pdf.text('BUILD YOUR DOOR. REQUEST A QUOTE.', 192, 27, { align: 'right' })

  pdf.setTextColor(13, 102, 108)
  pdf.setFontSize(18)
  pdf.setFont(brandFont, 'bold')
  pdf.text('Your door summary', 18, 61)
  pdf.setFontSize(9)
  pdf.setFont(brandFont, 'normal')
  pdf.setTextColor(70, 72, 78)
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, 18, 68)
  pdf.setFillColor(finish.color)
  pdf.roundedRect(145, 56, 38, 74, 2, 2, 'F')
  pdf.setDrawColor(finish.accent)
  pdf.rect(151, 64, 26, 22)
  pdf.rect(151, 94, 11, 25)
  pdf.rect(166, 94, 11, 25)
  pdf.setFillColor(hardware.color)
  pdf.circle(173, 92, 1.5, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  const rows = [
    ['Door style', style.name],
    ['Finish', finish.name],
    ['Glass', glass.name],
    ['Hardware', hardware.name],
  ]
  rows.forEach(([label, value], i) => {
    const y = 80 + i * 15
    pdf.setTextColor(13, 102, 108)
    pdf.text(label.toUpperCase(), 18, y)
    pdf.setTextColor(5, 4, 11)
    pdf.setFont(brandFont, 'bold')
    pdf.text(value, 70, y)
    pdf.setFont(brandFont, 'normal')
  })
  if (contact.fullName) {
    pdf.setDrawColor(248, 211, 14)
    pdf.setLineWidth(1.5)
    pdf.line(18, 145, 192, 145)
    pdf.setFont(brandFont, 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(13, 102, 108)
    pdf.text('Contact details', 18, 160)
    pdf.setFont(brandFont, 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(5, 4, 11)
    pdf.text(contact.fullName, 18, 172)
    pdf.text(`${contact.email}  |  ${contact.phone}`, 18, 181)
    pdf.text(`ZIP Code: ${contact.zip}`, 18, 190)
  }
  pdf.setFontSize(9)
  pdf.setTextColor(70, 72, 78)
  pdf.text('This configuration is a quote request and is not an order or final price.', 18, 276)
  return pdf
}

export async function downloadSummary(contact: ContactForm, style: DoorStyle, finish: Finish, glass: GlassOption, hardware: HardwareOption) {
  const pdf = await generateSummaryPdf(contact, style, finish, glass, hardware)
  pdf.save(configurationPdfName)
}

export async function generateSummaryAttachment(contact: ContactForm, style: DoorStyle, finish: Finish, glass: GlassOption, hardware: HardwareOption) {
  const pdf = await generateSummaryPdf(contact, style, finish, glass, hardware)
  const dataUri = pdf.output('datauristring')
  return {
    fileName: configurationPdfName,
    mimeType: 'application/pdf' as const,
    encoding: 'base64' as const,
    data: dataUri.slice(dataUri.indexOf(',') + 1),
  }
}
