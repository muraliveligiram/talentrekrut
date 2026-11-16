import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close

interface DialogContentProps {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

export function DialogContent({ title, description, children, className }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'animate-content-in fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-surface shadow-xl focus:outline-none',
          className,
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-1">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="-mt-1 -mr-2 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-y-auto px-6 pt-3 pb-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}>{children}</div>
}
