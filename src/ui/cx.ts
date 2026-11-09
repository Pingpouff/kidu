/** Joins class names, skipping falsy values: cx('a', cond && 'b', undefined) → 'a b'. */
export function cx(...classes: (string | false | null | undefined | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}
