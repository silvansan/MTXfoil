import { cn } from '@/lib/utils'

/** Theme-aware form input — mirrors globals.css `.input-field` */
export const inputClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600'

export const inputMonoClass = cn(inputClass, 'font-mono')

export const labelClass = 'text-sm font-medium text-zinc-700 dark:text-zinc-300'

export const checkboxLabelClass =
  'flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300'

export const codeRowClass =
  'flex items-center justify-between gap-2 rounded-md bg-code p-2 font-mono text-xs'

export const urlRowClass =
  'flex flex-col gap-2 rounded-md bg-code p-3 sm:flex-row sm:items-center sm:justify-between'

export const urlRowPrimaryClass =
  'flex flex-col gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-500/10'

export const urlRowValueClass = 'font-mono text-sm break-all text-zinc-900 dark:text-zinc-100'

export const panelClass =
  'rounded-md border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900'

export const statBoxClass = 'rounded-md bg-code p-3'

export const statValueClass = 'mt-1 font-mono text-base text-zinc-900 dark:text-zinc-100'

export const chipClass =
  'rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'

export const protocolToggleActive =
  'rounded-md border border-emerald-500 bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-700 transition-colors dark:text-emerald-200'

export const protocolToggleInactive =
  'rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'

export const errorBannerClass =
  'rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'

export const formSectionBorderClass =
  'space-y-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-700'

export const inlineCodeClass = 'text-zinc-700 dark:text-zinc-300'

export const sectionDividerClass = 'border-t border-zinc-200 pt-4 dark:border-zinc-800'

export const listItemCodeClass = 'rounded bg-code p-2 font-mono text-xs'
