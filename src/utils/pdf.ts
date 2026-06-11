import jsPDF from 'jspdf'
import type { ContactForm, DoorStyle, Finish, GlassOption, HardwareOption } from '../types'

export function downloadSummary(contact: ContactForm, style: DoorStyle, finish: Finish, glass: GlassOption, hardware: HardwareOption) {
  const pdf = new jsPDF()
  pdf.setFillColor(23, 60, 46)
  pdf.rect(0, 0, 210, 38, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(23)
  pdf.text('HOME GUARD', 18, 19)
  pdf.setFontSize(10)
  pdf.text('INDUSTRIES  |  DOOR CONFIGURATION', 18, 28)

  pdf.setTextColor(30, 41, 35)
  pdf.setFontSize(18)
  pdf.text('Your door summary', 18, 55)
  pdf.setFontSize(9)
  pdf.setTextColor(100, 110, 104)
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, 18, 62)
  pdf.setFillColor(finish.color)
  pdf.roundedRect(145, 50, 38, 74, 2, 2, 'F')
  pdf.setDrawColor(finish.accent)
  pdf.rect(151, 58, 26, 22)
  pdf.rect(151, 88, 11, 25)
  pdf.rect(166, 88, 11, 25)
  pdf.setFillColor(hardware.color)
  pdf.circle(173, 86, 1.5, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  const rows = [
    ['Door style', style.name],
    ['Finish', finish.name],
    ['Glass', glass.name],
    ['Hardware', hardware.name],
  ]
  rows.forEach(([label, value], i) => {
    const y = 72 + i * 15
    pdf.setTextColor(100, 110, 104)
    pdf.text(label.toUpperCase(), 18, y)
    pdf.setTextColor(30, 41, 35)
    pdf.setFont('helvetica', 'bold')
    pdf.text(value, 70, y)
    pdf.setFont('helvetica', 'normal')
  })
  if (contact.firstName) {
    pdf.setDrawColor(220, 223, 218)
    pdf.line(18, 137, 192, 137)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.text('Contact details', 18, 152)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`${contact.firstName} ${contact.lastName}`, 18, 164)
    pdf.text(`${contact.email}  |  ${contact.phone}`, 18, 173)
    pdf.text(`${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}`, 18, 182)
    if (contact.notes) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Project notes', 18, 198)
      pdf.setFont('helvetica', 'normal')
      pdf.text(pdf.splitTextToSize(contact.notes, 165), 18, 207)
    }
  }
  pdf.setFontSize(9)
  pdf.setTextColor(105, 112, 108)
  pdf.text('This configuration is a quote request and is not an order or final price.', 18, 276)
  pdf.save(`home-guard-${style.id}-door-summary.pdf`)
}
