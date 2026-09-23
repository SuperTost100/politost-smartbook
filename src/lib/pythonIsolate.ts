/** One fresh globals object per Python run. */
export function freshGlobals<T>(create: () => T): T {
  return create();
}
