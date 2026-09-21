import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function getOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === 'option') {
      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      };

      options.push({
        value: String(props.value ?? ''),
        label: String(props.children ?? ''),
        disabled: props.disabled,
      });
      return;
    }

    if (child.type === 'optgroup') {
      const props = child.props as {
        children?: ReactNode;
      };

      Children.forEach(props.children, (groupChild) => {
        if (!isValidElement(groupChild) || groupChild.type !== 'option') return;

        const optionProps = groupChild.props as {
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        };

        options.push({
          value: String(optionProps.value ?? ''),
          label: String(optionProps.children ?? ''),
          disabled: optionProps.disabled,
        });
      });
    }
  });

  return options;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      invalid,
      children,
      value,
      defaultValue,
      onChange,
      disabled,
      name,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [open, setOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(() => {
      if (value !== undefined) return String(value);

      if (defaultValue !== undefined) {
        if (Array.isArray(defaultValue)) {
          return String(defaultValue[0] ?? '');
        }

        return String(defaultValue);
      }

      const options = getOptions(children);
      return options.find((option) => !option.disabled)?.value ?? '';
    });

    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const options = getOptions(children);

    const currentValue =
      value !== undefined ? String(value) : selectedValue;

    const selectedOption =
      options.find((option) => option.value === currentValue) ?? options[0];

    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(String(value));
      }
    }, [value]);

    useEffect(() => {
      const selectedIndex = options.findIndex(
        (option) => option.value === currentValue,
      );

      if (selectedIndex >= 0) {
        setHighlightedIndex(selectedIndex);
      }
    }, [currentValue, options]);

    useEffect(() => {
      if (!open) return;

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;

        if (
          !menuRef.current?.contains(target) &&
          !triggerRef.current?.contains(target)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);

      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;

      const selectedIndex = options.findIndex(
        (option) => option.value === currentValue,
      );

      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [open]);

    const setSelectRef = (element: HTMLSelectElement | null) => {
      selectRef.current = element;

      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    const chooseOption = (option: SelectOption) => {
      if (option.disabled || disabled) return;

      setSelectedValue(option.value);
      setOpen(false);

      const select = selectRef.current;

      if (select) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value',
        )?.set;

        nativeSetter?.call(select, option.value);

        select.dispatchEvent(
          new Event('change', {
            bubbles: true,
          }),
        );
      }

      triggerRef.current?.focus();
    };

    const getNextEnabledIndex = (
      startIndex: number,
      direction: 1 | -1,
    ) => {
      let index = startIndex;

      for (let i = 0; i < options.length; i += 1) {
        index += direction;

        if (index < 0) index = options.length - 1;
        if (index >= options.length) index = 0;

        if (!options[index]?.disabled) {
          return index;
        }
      }

      return startIndex;
    };

    const handleKeyDown = (
      event: React.KeyboardEvent<HTMLButtonElement>,
    ) => {
      if (disabled) return;

      if (!open) {
        if (
          event.key === 'ArrowDown' ||
          event.key === 'ArrowUp' ||
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          setOpen(true);
        }

        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();

        setHighlightedIndex((index) =>
          getNextEnabledIndex(index, 1),
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();

        setHighlightedIndex((index) =>
          getNextEnabledIndex(index, -1),
        );
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();

        const firstEnabled = options.findIndex(
          (option) => !option.disabled,
        );

        if (firstEnabled >= 0) {
          setHighlightedIndex(firstEnabled);
        }

        return;
      }

      if (event.key === 'End') {
        event.preventDefault();

        for (let i = options.length - 1; i >= 0; i -= 1) {
          if (!options[i]?.disabled) {
            setHighlightedIndex(i);
            break;
          }
        }

        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();

        const option = options[highlightedIndex];

        if (option) {
          chooseOption(option);
        }
      }
    };

    return (
      <div className="relative w-full">
        {/* Native select remains in the DOM so existing form behavior,
            values, names, validation and onChange handlers continue working. */}
        <select
          ref={setSelectRef}
          name={name}
          id={id}
          required={required}
          disabled={disabled}
          value={currentValue}
          onChange={(event) => {
            setSelectedValue(event.target.value);
            onChange?.(event);
          }}
          className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {Children.map(children, (child) => {
            if (!isValidElement(child)) return child;

            if (child.type === 'option') {
              return cloneElement(child);
            }

            return child;
          })}
        </select>

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-labelledby={id ? `${id}-label` : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleKeyDown}
          className={cn(
            'inline-flex h-9 w-full items-center gap-2',
            'rounded-[14px] border border-line',
            'bg-bg-2 px-3',
            'text-left text-sm text-fg',
            'shadow-input',
            'transition-all duration-150 ease-in-out',
            'hover:border-accent/40',
            'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            invalid
              ? 'border-loss/60 bg-loss/5'
              : 'border-line',
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {selectedOption?.label ?? ''}
          </span>

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-fg-dim',
              'transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div
            ref={menuRef}
            className={cn(
              'absolute left-0 top-full z-20 mt-2',
              'w-[min(266px,calc(100vw-32px))]',
              'max-h-80 overflow-y-auto',
              'rounded-[22px]',
              'border border-line',
              'bg-bg-2',
              'px-2 pt-2 pb-2',
              'text-fg',
              'shadow-[0_30px_80px_rgba(8,12,24,.18),0_2px_8px_rgba(8,12,24,.08)]',
              'animate-in fade-in-0 zoom-in-95',
              'origin-top',
            )}
            role="listbox"
            aria-activedescendant={
              options[highlightedIndex]
                ? `${id ?? 'select'}-option-${highlightedIndex}`
                : undefined
            }
          >
            {options.map((option, index) => {
              const isSelected = option.value === currentValue;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={`${option.value}-${index}`}
                  id={`${id ?? 'select'}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  onMouseEnter={() => {
                    if (!option.disabled) {
                      setHighlightedIndex(index);
                    }
                  }}
                  onClick={() => chooseOption(option)}
                  className={cn(
                    'flex w-full items-center gap-3',
                    'rounded-xl px-3.5 py-2.5',
                    'text-left text-[16.5px]',
                    'transition-colors duration-100',
                    'outline-none',
                    option.disabled
                      ? 'cursor-not-allowed text-fg-dim'
                      : 'cursor-pointer text-fg',
                    !option.disabled &&
                      !isSelected &&
                      'hover:bg-bg-3',
                    isHighlighted &&
                      !option.disabled &&
                      !isSelected &&
                      'bg-bg-3',
                    isSelected &&
                      'bg-accent/10',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>

                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{
    value: T;
    label: string;
    tone?: 'default' | 'win' | 'loss' | 'neutral';
  }>;
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  fullWidth,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-line bg-bg-3 p-0.5',
        size === 'sm' ? 'h-7' : 'h-9',
        fullWidth && 'w-full',
        className,
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeTone =
          opt.tone === 'win'
            ? 'bg-win/15 text-win font-semibold'
            : opt.tone === 'loss'
              ? 'bg-loss/15 text-loss font-semibold'
              : 'bg-bg-2 text-fg shadow-sm font-semibold';

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1 rounded-md text-xs transition-all',
              size === 'sm' ? 'h-6 px-2' : 'h-8 px-3',
              isActive ? activeTone : 'text-fg-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FormField({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold text-fg">
        {label}
        {required ? <span className="text-loss"> *</span> : null}
      </span>

      {children}

      {hint ? (
        <span className="text-2xs text-fg-dim">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-sm font-bold text-fg tracking-tight">
          {title}
        </h3>

        {description ? (
          <p className="mt-0.5 text-xs text-fg-muted">
            {description}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </section>
  );
}