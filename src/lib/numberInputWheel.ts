import type { WheelEvent as ReactWheelEvent } from 'react';

/**
 * True for a numeric entry field whose value the mouse wheel must never change.
 * Disabled/read-only inputs are skipped because the wheel cannot modify them
 * anyway.
 */
function isNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === 'number' &&
    !target.disabled &&
    !target.readOnly
  );
}

/**
 * Blurs a numeric input when the mouse wheel is used over it.
 *
 * Browsers only spin an `<input type="number">` value while it is focused, so
 * blurring it during the wheel event neutralises the increment/decrement. We
 * deliberately do NOT call `preventDefault()`: the wheel event keeps bubbling,
 * so the page continues to scroll normally.
 */
function guardNumberInput(input: HTMLInputElement): void {
  if (document.activeElement === input) {
    input.blur();
  }
}

/**
 * React `onWheel` handler for the shared {@link Input} component. Prevents the
 * mouse wheel from changing the value of a numeric field while leaving normal
 * page scrolling untouched.
 */
export function guardNumberInputWheel(
  event: ReactWheelEvent<HTMLInputElement>,
): void {
  if (!isNumberInput(event.currentTarget)) return;
  guardNumberInput(event.currentTarget);
}

/**
 * Installs a single document-level, capture-phase `wheel` listener that applies
 * the same guard to EVERY `<input type="number">` on the page — including raw
 * inputs and portal/dialog inputs that do not render through the shared
 * {@link Input} component.
 *
 * The listener never calls `preventDefault()`, so the page still scrolls
 * normally. Returns a disposer (primarily useful for tests).
 */
export function installNumberInputWheelGuard(): () => void {
  const onWheel = (event: WheelEvent): void => {
    const target = event.target;

    if (!isNumberInput(target)) return;
    guardNumberInput(target);
  };

  document.addEventListener('wheel', onWheel, {
    capture: true,
    passive: true,
  });

  return () => {
    document.removeEventListener('wheel', onWheel, { capture: true });
  };
}