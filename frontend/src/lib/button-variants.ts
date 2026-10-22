import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        destructive: 'bg-destructive text-primary-foreground hover:opacity-90',
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'border border-border bg-background text-foreground hover:bg-muted',
        ghost: 'hover:bg-muted hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2 md:h-9 md:px-3 md:text-xs',
        sm: 'h-11 px-3 md:h-8 md:px-2.5 md:text-xs',
        lg: 'h-11 px-8',
        icon: 'size-11 md:size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
