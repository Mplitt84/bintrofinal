/**
 * Page scroll lock shared by every pop-up. Counts open pop-ups so stacked ones
 * (a picker over a sheet) can close in any order and the page always scrolls
 * again once the last one closes. Saving/restoring body.style.overflow per
 * pop-up got this wrong and could leave the page stuck.
 */
let locks = 0

export function lockScroll() {
  locks += 1
  if (locks === 1) document.body.style.overflow = 'hidden'
  let released = false
  return () => {
    if (released) return
    released = true
    locks = Math.max(0, locks - 1)
    if (locks === 0) document.body.style.overflow = ''
  }
}
