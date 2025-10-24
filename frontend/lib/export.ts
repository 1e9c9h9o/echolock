/**
 * Export Functionality
 * Export switch data to CSV and PDF formats
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Switch {
  id: string
  title: string
  status: string
  checkInHours: number
  nextCheckInAt: string
  createdAt: string
  recipientCount: number
}

interface CheckIn {
  id: string
  timestamp: string
  ipAddress?: string
}

/**
 * Export switches to CSV format
 */
export function exportSwitchesToCSV(switches: Switch[], filename: string = 'echolock-switches.csv') {
  // CSV headers
  const headers = [
    'Title',
    'Status',
    'Check-In Interval (hours)',
    'Next Check-In',
    'Created',
    'Recipients',
  ]

  // Convert switches to CSV rows
  const rows = switches.map((sw) => [
    sw.title,
    sw.status.toUpperCase(),
    sw.checkInHours,
    new Date(sw.nextCheckInAt).toLocaleString(),
    new Date(sw.createdAt).toLocaleString(),
    sw.recipientCount,
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Export switches to PDF format
 */
export function exportSwitchesToPDF(switches: Switch[], filename: string = 'echolock-switches.pdf') {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('EchoLock Switches Report', 14, 20)

  // Add metadata
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
  doc.text(`Total Switches: ${switches.length}`, 14, 34)

  // Prepare table data
  const tableData = switches.map((sw) => [
    sw.title,
    sw.status.toUpperCase(),
    `${sw.checkInHours}h`,
    new Date(sw.nextCheckInAt).toLocaleDateString(),
    new Date(sw.createdAt).toLocaleDateString(),
    sw.recipientCount,
  ])

  // Add table
  autoTable(doc, {
    head: [['Title', 'Status', 'Interval', 'Next Check-In', 'Created', 'Recipients']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 69, 211], // EchoLock blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20 },
    },
  })

  // Add footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  doc.save(filename)
}

/**
 * Export check-in history to CSV
 */
export function exportCheckInsToCSV(
  checkIns: CheckIn[],
  switchTitle: string,
  filename?: string
) {
  const fname = filename || `echolock-checkins-${switchTitle.replace(/\s+/g, '-').toLowerCase()}.csv`

  const headers = ['Timestamp', 'IP Address']
  const rows = checkIns.map((ci) => [
    new Date(ci.timestamp).toLocaleString(),
    ci.ipAddress || 'N/A',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, fname)
}

/**
 * Export detailed switch report as PDF
 */
export function exportSwitchDetailPDF(
  switchData: Switch & { checkIns?: CheckIn[] },
  filename?: string
) {
  const fname = filename || `echolock-switch-${switchData.id.substring(0, 8)}.pdf`
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Switch Detail Report', 14, 20)

  // Basic info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Basic Information', 14, 35)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let yPos = 42
  const lineHeight = 7

  const details = [
    ['Title:', switchData.title],
    ['Status:', switchData.status.toUpperCase()],
    ['Check-In Interval:', `${switchData.checkInHours} hours`],
    ['Next Check-In:', new Date(switchData.nextCheckInAt).toLocaleString()],
    ['Created:', new Date(switchData.createdAt).toLocaleString()],
    ['Recipients:', switchData.recipientCount.toString()],
  ]

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 60, yPos)
    yPos += lineHeight
  })

  // Check-in history
  if (switchData.checkIns && switchData.checkIns.length > 0) {
    yPos += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Check-In History', 14, yPos)
    yPos += 5

    const checkInData = switchData.checkIns.map((ci) => [
      new Date(ci.timestamp).toLocaleString(),
      ci.ipAddress || 'N/A',
    ])

    autoTable(doc, {
      head: [['Timestamp', 'IP Address']],
      body: checkInData,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 69, 211],
        textColor: [255, 255, 255],
      },
    })
  }

  // Footer
  doc.setFontSize(8)
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    doc.internal.pageSize.getHeight() - 10
  )

  doc.save(fname)
}

/**
 * Helper function to download blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export selected switches
 */
export function exportSelectedSwitches(
  switches: Switch[],
  selectedIds: string[],
  format: 'csv' | 'pdf'
) {
  const selected = switches.filter((sw) => selectedIds.includes(sw.id))

  if (selected.length === 0) {
    throw new Error('No switches selected for export')
  }

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `echolock-switches-${timestamp}`

  if (format === 'csv') {
    exportSwitchesToCSV(selected, `${filename}.csv`)
  } else {
    exportSwitchesToPDF(selected, `${filename}.pdf`)
  }
}
