/**
 * Today's Focus Component
 *
 * Exports the main TodaysFocus component and sub-components.
 */

export { default as TodaysFocus } from './TodaysFocus'
export { default as PrimaryAction } from './PrimaryAction'
export { default as SecondaryActions } from './SecondaryActions'
export { default as ActionRationale } from './ActionRationale'

// Re-export types
export type {
  TodaysFocusData,
  PrimaryAction as PrimaryActionType,
  SecondaryAction,
} from '@/types/todaysFocus'
