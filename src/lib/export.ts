/**
 * Utility functions for exporting data to CSV and Excel format with full RTL and Persian font support.
 */

/**
 * Escapes fields for CSV compliance
 */
function escapeCSVField(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  // Wrap in quotes if there are commas, newlines, or quotes
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}

/**
 * Exports data to a CSV file.
 * 
 * @param data Array of arrays, representing rows of data
 * @param headers Column headers
 * @param filename File name without extension
 */
export function exportToCSV(data: any[][], headers: string[], filename: string) {
  try {
    const csvRows: string[] = [];

    // Add UTF-8 Byte Order Mark (BOM) to support Persian/Arabic characters in Excel
    csvRows.push('\uFEFF');

    // Add headers
    csvRows.push(headers.map(h => escapeCSVField(h)).join(','));

    // Add rows
    for (const row of data) {
      csvRows.push(row.map(val => escapeCSVField(val)).join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[ERROR] [ExportToCSV]: Failed to export CSV', error);
  }
}

/**
 * Exports data to an Excel-compatible HTML format (with .xls extension).
 * This maintains columns, gridlines, bold headers, and RTL direction.
 * 
 * @param data Array of arrays, representing rows of data
 * @param headers Column headers
 * @param filename File name without extension
 */
export function exportToExcel(data: any[][], headers: string[], filename: string) {
  try {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8"/><style>table { border-collapse: collapse; direction: rtl; margin: 20px auto; width: 100%; } table, td, th { border: 1px solid #cbd5e1; text-align: right; font-family: Tahoma, Arial, sans-serif; } th { background-color: #f1f5f9; font-weight: bold; padding: 8px 12px; } td { padding: 6px 10px; }</style></head>`;
    html += `<body dir="rtl"><h2>${filename.replace(/_/g, ' ')}</h2><table>`;
    
    // Headers
    html += `<tr>`;
    for (const header of headers) {
      html += `<th>${header}</th>`;
    }
    html += `</tr>`;
    
    // Data rows
    for (const row of data) {
      html += `<tr>`;
      for (const val of row) {
        const displayVal = val === null || val === undefined ? '' : String(val);
        html += `<td>${displayVal}</td>`;
      }
      html += `</tr>`;
    }
    
    html += `</table></body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[ERROR] [ExportToExcel]: Failed to export Excel', error);
  }
}
