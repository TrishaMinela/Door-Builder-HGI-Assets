/** Customer picker visibility only. Keep legacy catalog entries and assets
 * available to render previously saved configurations. */
export function isCustomerSelectableGlass(option: { id: string; name: string }) {
  return option.id !== 'linen' && !/\blinen\b/i.test(option.name)
}
