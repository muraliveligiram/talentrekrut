import { describe, expect, it } from 'vitest'
import { fileNameFromDisposition } from './download'

describe('fileNameFromDisposition', () => {
  it('prefers the encoded filename* value', () => {
    expect(
      fileNameFromDisposition(
        "attachment; filename=JOB-2026-0005-candidates-2026-11-16.xlsx; filename*=UTF-8''JOB-2026-0005-candidates-2026-11-16.xlsx",
        'fallback.xlsx',
      ),
    ).toBe('JOB-2026-0005-candidates-2026-11-16.xlsx')
  })

  it('falls back to the plain filename, then to the default', () => {
    expect(fileNameFromDisposition('attachment; filename="report.xlsx"', 'fallback.xlsx')).toBe('report.xlsx')
    expect(fileNameFromDisposition(undefined, 'fallback.xlsx')).toBe('fallback.xlsx')
  })
})
