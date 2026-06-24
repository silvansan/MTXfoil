import { cn } from '@/lib/utils'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-zinc-800 text-zinc-200',
        variant === 'success' && 'bg-emerald-500/20 text-emerald-300',
        variant === 'warning' && 'bg-amber-500/20 text-amber-300',
        variant === 'danger' && 'bg-red-500/20 text-red-300',
        variant === 'muted' && 'bg-zinc-800/50 text-zinc-400',
        className,
      )}
      {...props}
    />
  )
}
