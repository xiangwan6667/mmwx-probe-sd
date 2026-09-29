export function hasCustomBackground(desktop: string | undefined, mobile: string | undefined): boolean {
  return Boolean(desktop || mobile);
}
