import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import ExcelJS from "exceljs"

export type ReportColumn = { header: string; key: string }
export type ReportRow = Record<string, string | number>

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportPdf(
  title: string,
  subtitle: string,
  columns: ReportColumn[],
  rows: ReportRow[]
) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text("Barbearia Rocha", 14, 18)
  doc.setFontSize(12)
  doc.text(title, 14, 27)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(subtitle, 14, 33)

  autoTable(doc, {
    startY: 38,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    headStyles: { fillColor: [201, 162, 74], textColor: [10, 10, 10] },
    styles: { fontSize: 9 },
  })

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}

export async function exportXlsx(
  title: string,
  columns: ReportColumn[],
  rows: ReportRow[]
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(title.slice(0, 31))
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 22 }))
  ws.getRow(1).font = { bold: true }
  rows.forEach((r) => ws.addRow(r))

  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${title.toLowerCase().replace(/\s+/g, "-")}.xlsx`
  )
}
