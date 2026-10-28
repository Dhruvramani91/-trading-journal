import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { describedByIds, FormFieldContext, useFormFieldContext } from './FormFieldContext';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  /** Raise the portaled option menu above modal backdrops when needed. */
  portalZIndex?: number;
  /** Optional action displayed beside each option (for example, preview). */
  renderOptionAction?: (option: SelectOption, closeMenu: () => void) => ReactNode;
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
      portalZIndex,
      renderOptionAction,
      children,
      value,
      defaultValue,
      onChange,
      disabled,
      name,
      id,
      required,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-required': ariaRequired,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const field = useFormFieldContext();
    const selectId = id ?? generatedId;
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

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

    const options = useMemo(() => getOptions(children), [children]);

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

      const selectedIndex = options.findIndex((option) => option.value === currentValue);
      const firstEnabledIndex = options.findIndex((option) => !option.disabled);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabledIndex, 0));
    }, [open, options, currentValue]);

    const portalContainer = typeof document === 'undefined'
      ? null
      : triggerRef.current?.closest<HTMLElement>('[data-select-portal]') ?? document.body;

    useLayoutEffect(() => {
      if (!open || !triggerRef.current || !portalContainer) {
        setMenuStyle(null);
        return;
      }

      const updatePosition = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const desiredHeight = Math.min(options.length * 46 + 16, 360);
        const spaceBelow = window.innerHeight - rect.bottom - 20;
        const spaceAbove = rect.top - 20;
        const opensAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
        const availableHeight = Math.max(80, opensAbove ? spaceAbove : spaceBelow);
        const maxHeight = Math.min(360, availableHeight);
        const menuHeight = Math.min(desiredHeight, maxHeight);
        const menuWidth = Math.min(Math.max(rect.width, 266), window.innerWidth - 24);
        const viewportLeft = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
        const viewportTop = opensAbove ? rect.top - menuHeight - 8 : rect.bottom + 8;

        if (portalContainer === document.body) {
          setMenuStyle({ position: 'fixed', left: viewportLeft, top: viewportTop, width: menuWidth, maxHeight });
        } else {
          const hostRect = portalContainer.getBoundingClientRect();
          setMenuStyle({
            position: 'absolute',
            left: viewportLeft - hostRect.left - portalContainer.clientLeft + portalContainer.scrollLeft,
            top: viewportTop - hostRect.top - portalContainer.clientTop + portalContainer.scrollTop,
            width: menuWidth,
            maxHeight,
          });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
      observer?.observe(triggerRef.current);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        observer?.disconnect();
      };
    }, [open, options.length, portalContainer]);

    const effectiveZIndex = portalZIndex ?? (portalContainer !== (typeof document !== 'undefined' ? document.body : null) ? 60 : 150);

    useEffect(() => {
      if (!open) return;
      const selectedIndex = options.findIndex((option) => option.value === currentValue);
      const firstEnabledIndex = options.findIndex((option) => !option.disabled);
      const initialIndex = selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabledIndex, 0);
      setHighlightedIndex(initialIndex);
      requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${selectId}-option-${initialIndex}`)}`)?.focus({ preventScroll: true });
      });
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

    const focusOption = (index: number) => {
      setHighlightedIndex(index);
      requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${selectId}-option-${index}`)}`)?.focus({ preventScroll: true });
      });
    };

    const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusOption(getNextEnabledIndex(index, event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const step = event.key === 'Home' ? 1 : -1;
        let target = event.key === 'Home' ? 0 : options.length - 1;
        while (target >= 0 && target < options.length && options[target]?.disabled) target += step;
        if (target >= 0 && target < options.length) focusOption(target);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      } else if (event.key === 'Tab') {
        if (renderOptionAction && !event.shiftKey) return;
        // The list is portalled, so let Tab continue from the trigger's place in
        // the page instead of walking through the menu items one at a time.
        const trigger = triggerRef.current;
        const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector))
          .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !menuRef.current?.contains(element));
        const triggerIndex = trigger ? focusable.indexOf(trigger) : -1;
        const destination = focusable[triggerIndex + (event.shiftKey ? -1 : 1)];
        setOpen(false);
        if (destination) {
          event.preventDefault();
          requestAnimationFrame(() => destination.focus({ preventScroll: true }));
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
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid ?? (invalid || field?.invalid || undefined)}
          aria-required={ariaRequired ?? (required || field?.required || undefined)}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : ariaLabelledBy ?? field?.labelId ?? (id ? `${id}-label` : undefined)}
          aria-describedby={describedByIds(ariaDescribedBy, field?.hintId, field?.errorId)}
          aria-controls={`${selectId}-listbox`}
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
            'focus:outline-none focus:ring-2 focus:ring-focus/40 focus:border-accent/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            (invalid || field?.invalid)
              ? 'border-line-strong bg-bg-3'
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

        {open && portalContainer ? createPortal(
          <div
            ref={menuRef}
            style={{
              ...menuStyle,
              visibility: menuStyle ? 'visible' : 'hidden',
              zIndex: effectiveZIndex,
            }}
            className={cn(
              'overflow-y-auto',
              'rounded-[22px]',
              'border border-line',
              'bg-bg-2',
              'px-2 pt-2 pb-2',
              'text-fg',
              'shadow-[var(--shadow-pop)]',
              'animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none motion-reduce:transition-none',
              'origin-top',
            )}
            role="listbox"
            id={`${selectId}-listbox`}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : ariaLabelledBy ?? field?.labelId}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === currentValue;
              const isHighlighted = index === highlightedIndex;

              const optionButton = (
                <button
                  key={`${option.value}-${index}`}
                  id={`${selectId}-option-${index}`}
                  type="button"
                  role="option"
                  tabIndex={isHighlighted ? 0 : -1}
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  onMouseEnter={() => {
                    if (!option.disabled) {
                      setHighlightedIndex(index);
                    }
                  }}
                  onClick={() => chooseOption(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={cn(
                    'flex min-w-0 items-center gap-3',
                    renderOptionAction ? 'flex-1' : 'w-full',
                    'rounded-xl px-3.5 py-2.5',
                    'text-left text-[16.5px]',
                    'transition-colors duration-100',
                    'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/60',
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

              return renderOptionAction ? (
                <div key={`${option.value}-${index}`} role="presentation" className="flex items-center gap-1">
                  {optionButton}
                  <span className="shrink-0">{renderOptionAction(option, () => setOpen(false))}</span>
                </div>
              ) : (
                optionButton
              );
            })}
          </div>,
          portalContainer,
        ) : null}
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
    tone?: 'default' | 'win' | 'loss' | 'neutral' | 'grade-a-plus' | 'grade-a' | 'grade-b' | 'grade-c';
    disabled?: boolean;
  }>;
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  fullWidth,
  disabled,
}: SegmentedProps<T>) {
  const field = useFormFieldContext();
  const firstEnabledValue = options.find((option) => !option.disabled)?.value;
  const tabbableValue = options.some((option) => option.value === value) ? value : firstEnabledValue;

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabled = options.map((option, optionIndex) => option.disabled ? -1 : optionIndex).filter((optionIndex) => optionIndex >= 0);
    if (!enabled.length) return;
    let nextIndex: number;
    if (event.key === 'Home') nextIndex = enabled[0]!;
    else if (event.key === 'End') nextIndex = enabled[enabled.length - 1]!;
    else {
      const currentPosition = enabled.indexOf(index);
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      nextIndex = enabled[(currentPosition + direction + enabled.length) % enabled.length]!;
    }
    onChange(options[nextIndex]!.value);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-segment-index="${nextIndex}"]`)?.focus();
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-line bg-bg-3 p-0.5',
        size === 'sm' ? 'h-7' : 'h-9',
        fullWidth && 'w-full',
        disabled && 'opacity-50',
        className,
      )}
      role="radiogroup"
      aria-labelledby={field?.labelId}
      aria-describedby={describedByIds(undefined, field?.hintId, field?.errorId)}
      aria-required={field?.required || undefined}
      aria-invalid={field?.invalid || undefined}
    >
      {options.map((opt, index) => {
        const isActive = opt.value === value;
        const gradeToneClass = opt.tone === 'grade-a-plus'
          ? 'bg-[rgb(var(--grade-a-plus)/0.15)] text-[rgb(var(--grade-a-plus))]'
          : opt.tone === 'grade-a'
            ? 'bg-[rgb(var(--grade-a)/0.15)] text-[rgb(var(--grade-a))]'
            : opt.tone === 'grade-b'
              ? 'bg-[rgb(var(--grade-b)/0.15)] text-[rgb(var(--grade-b))]'
              : opt.tone === 'grade-c'
                ? 'bg-[rgb(var(--grade-c)/0.15)] text-[rgb(var(--grade-c))]'
                : undefined;
        const inactiveGradeTone = opt.tone === 'grade-a-plus'
          ? 'text-[rgb(var(--grade-a-plus))]'
          : opt.tone === 'grade-a'
            ? 'text-[rgb(var(--grade-a))]'
            : opt.tone === 'grade-b'
              ? 'text-[rgb(var(--grade-b))]'
              : opt.tone === 'grade-c'
                ? 'text-[rgb(var(--grade-c))]'
                : undefined;
        const activeTone = opt.tone === 'win'
          ? 'bg-win-fill/15 text-win font-semibold'
          : opt.tone === 'loss'
            ? 'bg-loss-fill/15 text-loss font-semibold'
            : gradeToneClass
              ? `${gradeToneClass} font-semibold`
              : 'bg-bg-2 text-fg shadow-sm font-semibold';

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={opt.value === tabbableValue ? 0 : -1}
            data-segment-index={index}
            disabled={disabled || opt.disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1 rounded-md text-xs transition-all',
              size === 'sm' ? 'h-6 px-2' : 'h-8 px-3',
              isActive ? activeTone : cn('text-fg-muted hover:text-fg', inactiveGradeTone),
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60',
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
  invalid,
  fieldKey,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  invalid?: boolean;
  fieldKey?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const fieldContext = {
    labelId: `${id}-label`,
    hintId: hint ? `${id}-hint` : undefined,
    errorId: invalid ? `${id}-error` : undefined,
    required,
    invalid,
  };
  return (
    <FormFieldContext.Provider value={fieldContext}>
      <div data-field-key={fieldKey} className={cn('flex flex-col gap-1.5', className)}>
        <span id={fieldContext.labelId} className="text-xs font-semibold text-fg">
          {label}
          {required ? <span className="text-loss"> *</span> : null}
        </span>

        {children}

        {hint ? (
          <span id={fieldContext.hintId} className="text-2xs text-fg-dim">{hint}</span>
        ) : null}
      </div>
    </FormFieldContext.Provider>
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
