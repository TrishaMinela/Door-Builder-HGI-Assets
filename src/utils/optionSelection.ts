/** Keep explicit choices; use catalog order only when a fallback is needed. */
export function validOptionId(currentId: string, options: readonly { id: string }[]): string {
  return options.some(option => option.id === currentId) ? currentId : options[0]?.id ?? ''
}
