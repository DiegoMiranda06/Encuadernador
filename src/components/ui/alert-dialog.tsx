import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const AlertDialog = DialogPrimitive.Root
export const AlertDialogTitle = DialogPrimitive.Title
export const AlertDialogDescription = DialogPrimitive.Description

export function AlertDialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)]',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
