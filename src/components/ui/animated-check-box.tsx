import { useState, type ChangeEvent, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface AnimatedCheckBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

/** Animated, theme-aware checkbox adapted from the provided component. */
export function AnimatedCheckBox({
  label,
  className,
  checked: controlledChecked,
  defaultChecked,
  onChange,
  disabled,
  ...props
}: AnimatedCheckBoxProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setInternalChecked(event.target.checked);
    onChange?.(event);
  }

  return (
    <label className={cn('animated-checkbox', className, disabled && 'is-disabled')}>
      <input
        {...props}
        type="checkbox"
        className="animated-checkbox__input"
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
      />
      <span className={cn('animated-checkbox__frame', isChecked && 'is-checked')} aria-hidden="true">
        <span className="animated-checkbox__box">
          <svg viewBox="0 0 24 24" className="animated-checkbox__check" focusable="false">
            <path d="M3 12.5 10 19.5 21 5" />
          </svg>
          <span className="animated-checkbox__glow" />
          <span className="animated-checkbox__borders">
            <i className="animated-checkbox__border animated-checkbox__border--top" />
            <i className="animated-checkbox__border animated-checkbox__border--right" />
            <i className="animated-checkbox__border animated-checkbox__border--bottom" />
            <i className="animated-checkbox__border animated-checkbox__border--left" />
          </span>
        </span>
        <span className="animated-checkbox__effects">
          {Array.from({ length: 12 }, (_, index) => {
            const positions = [
              ['25px', '-25px'], ['-25px', '-25px'], ['25px', '25px'], ['-25px', '25px'],
              ['35px', '0px'], ['-35px', '0px'], ['0px', '35px'], ['0px', '-35px'],
              ['20px', '-30px'], ['-20px', '30px'], ['30px', '20px'], ['-30px', '-20px'],
            ];
            return <i key={index} className="animated-checkbox__particle" style={{ '--x': positions[index]?.[0], '--y': positions[index]?.[1] } as CSSProperties} />;
          })}
          {[0, 1, 2].map((index) => <i key={index} className="animated-checkbox__ring" style={{ animationDelay: `${index * 100}ms` }} />)}
          {[0, 1, 2, 3].map((index) => <i key={index} className="animated-checkbox__spark" style={{ '--rotation': `${index * 90}deg` } as CSSProperties} />)}
        </span>
      </span>
      {label ? <span className="ml-2 text-sm text-fg">{label}</span> : null}
    </label>
  );
}
