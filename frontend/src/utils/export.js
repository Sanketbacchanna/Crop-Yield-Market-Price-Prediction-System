function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function downloadExcelCsv(filename, headers, rows) {
  const safeFilename = filename.replace(/[^a-z0-9_-]+/gi, "-");
  const content = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
