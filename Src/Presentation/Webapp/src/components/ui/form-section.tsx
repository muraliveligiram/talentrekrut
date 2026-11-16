import type { ReactNode } from 'react'

/** A labelled group of form fields: description on the left, inputs on the right on wide screens. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-b px-5 py-6 last:border-b-0 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}
