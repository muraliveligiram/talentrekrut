/** Reads the file name from a Content-Disposition header, preferring the RFC 5987 `filename*` form. */
export function fileNameFromDisposition(header: string | undefined | null, fallback: string) {
  if (!header) return fallback
  const encoded = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // Fall through to the plain filename.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : fallback
}

/** Saves a Blob through a temporary link, which works in every modern browser. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
