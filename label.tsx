import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none text-foreground/90',
        className,
      )}
      {...props}
    />
  )
}
