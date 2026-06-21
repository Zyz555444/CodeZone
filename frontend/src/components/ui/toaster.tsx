"use client"

import { Toast, ToastProvider, ToastViewport } from '@radix-ui/react-toast'

export { Toast, ToastProvider, ToastViewport }

export function Toaster() {
  return (
    <ToastProvider>
      <Toast />
      <ToastViewport />
    </ToastProvider>
  )
}
