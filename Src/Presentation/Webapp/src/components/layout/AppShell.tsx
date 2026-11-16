import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/ui/spinner'
import { Logo, SidebarNav } from './Sidebar'
import { UserMenu } from './UserMenu'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile top bar and drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur lg:hidden">
        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Trigger
            className="-ml-1.5 rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-black/40" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="animate-slide-in-left fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-sidebar shadow-xl"
            >
              <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
              <div className="flex h-14 items-center justify-between px-5">
                <Logo />
                <DialogPrimitive.Close
                  className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
                  aria-label="Close navigation"
                >
                  <X className="size-5" />
                </DialogPrimitive.Close>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="border-t p-3">
                <UserMenu />
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        <Logo />
      </div>

      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
