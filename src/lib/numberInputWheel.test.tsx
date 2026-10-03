import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import type { WheelEvent as ReactWheelEvent } from 'react';

import { Input } from '@/components/ui/Input';
import {
  guardNumberInputWheel,
  installNumberInputWheelGuard,
} from '@/lib/numberInputWheel';

const cleanups: Array<() => void> = [];

function track(input: HTMLInputElement): HTMLInputElement {
  cleanups.push(() => input.remove());
  return input;
}

function makeNumberInput(value = '25000'): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = value;
  document.body.appendChild(input);
  return track(input);
}

function makeTextInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  document.body.appendChild(input);
  return track(input);
}

function wheelEventOn(input: HTMLInputElement): ReactWheelEvent<HTMLInputElement> {
  return { currentTarget: input } as unknown as ReactWheelEvent<HTMLInputElement>;
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

describe('guardNumberInputWheel (shared <Input> handler)', () => {
  it('blurs a focused number input so the wheel cannot change its value', () => {
    const input = makeNumberInput('25000');
    input.focus();
    expect(document.activeElement).toBe(input);

    guardNumberInputWheel(wheelEventOn(input));

    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('25000');
  });

  it('leaves non-number inputs alone', () => {
    const input = makeTextInput();
    input.focus();

    guardNumberInputWheel(wheelEventOn(input));

    expect(document.activeElement).toBe(input);
  });

  it('ignores a number input that is not focused', () => {
    const input = makeNumberInput('25000');
    expect(document.activeElement).not.toBe(input);

    guardNumberInputWheel(wheelEventOn(input));

    expect(input.value).toBe('25000');
  });
});

describe('installNumberInputWheelGuard (global catch-all)', () => {
  it('guards raw number inputs anywhere on the page', () => {
    cleanups.push(installNumberInputWheelGuard());

    const input = makeNumberInput('25000');
    input.focus();
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(new Event('wheel', { bubbles: true, cancelable: true }));

    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('25000');
  });

  it('does not touch text inputs', () => {
    cleanups.push(installNumberInputWheelGuard());

    const input = makeTextInput();
    input.focus();

    input.dispatchEvent(new Event('wheel', { bubbles: true }));

    expect(document.activeElement).toBe(input);
  });

  it('never prevents the wheel default, so the page keeps scrolling', () => {
    cleanups.push(installNumberInputWheelGuard());

    const input = makeNumberInput('25000');
    input.focus();

    const event = new Event('wheel', { bubbles: true, cancelable: true });
    const notCanceled = input.dispatchEvent(event);

    // dispatchEvent returns false only when the event was canceled.
    expect(event.defaultPrevented).toBe(false);
    expect(notCanceled).toBe(true);
  });
});

describe('<Input type="number"> integration', () => {
  it('blurs through the shared component handler on wheel', () => {
    render(<Input type="number" defaultValue="25000" aria-label="Account Size" />);
    const input = screen.getByLabelText('Account Size') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.wheel(input, { deltaY: 120 });

    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('25000');
  });
});