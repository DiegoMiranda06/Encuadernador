import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'bg-primary text-white hover:bg-primary-hover',
        ghost: 'border border-transparent text-text hover:bg-surface-2',
        outline: 'border border-border text-text hover:border-border-strong',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2',
      },
    },
    defaultVariants: { variant: 'solid', size: 'default' },
  },
)
