import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/lib/button-variants'


export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...(!asChild ? { type } : {})} {...props} />
}
