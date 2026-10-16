/** Screen insets (notch, rounded corners, home bar) in CSS pixels, read from the browser's safe-area env() values. */
export const SAFE = { top: 0, right: 0, bottom: 0, left: 0 };

/** Re-reads the insets; call on resize and rotation. `?safe=top,right,bottom,left` forces values for testing. */
export function measureSafe(): void {
  const forced = new URLSearchParams(location.search).get('safe');
  if (forced) {
    const [t, r, b, l] = forced.split(',').map((n) => Number(n) || 0);
    Object.assign(SAFE, { top: t, right: r, bottom: b, left: l });
    return;
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  SAFE.top = parseFloat(cs.paddingTop) || 0;
  SAFE.right = parseFloat(cs.paddingRight) || 0;
  SAFE.bottom = parseFloat(cs.paddingBottom) || 0;
  SAFE.left = parseFloat(cs.paddingLeft) || 0;
  probe.remove();
}
