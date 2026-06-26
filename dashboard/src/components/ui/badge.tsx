import { cn } from '@/lib/utils'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
        variant === 'success' && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        variant === 'warning' && 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
        variant === 'danger' && 'bg-red-500/20 text-red-700 dark:text-red-300',
        variant === 'muted' && 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400',
        className,
      )}
      {...props}
    />
  )
}
