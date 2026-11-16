import * as Menu from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuGroup = Menu.Group
export const DropdownMenuRadioGroup = Menu.RadioGroup

export function DropdownMenuContent({ className, sideOffset = 6, align = 'end', ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn('z-50 min-w-44 rounded-lg border bg-surface p-1 shadow-lg animate-overlay-in', className)}
        {...props}
      />
    </Menu.Portal>
  )
}

const itemClass =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none ' +
  'data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted'

export function DropdownMenuItem({
  className,
  tone,
  ...props
}: ComponentProps<typeof Menu.Item> & { tone?: 'danger' }) {
  return (
    <Menu.Item
      className={cn(itemClass, tone === 'danger' && 'text-danger [&_svg]:text-danger', className)}
      {...props}
    />
  )
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemClass, 'pl-7', className)} {...props}>
      <Menu.ItemIndicator className="absolute left-2 inline-flex">
        <span className="size-1.5 rounded-full bg-primary" />
      </Menu.ItemIndicator>
      {children}
    </Menu.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2 py-1.5 text-xs font-medium text-muted', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
