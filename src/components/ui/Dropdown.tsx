import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatedPopoverContent, PopoverPrimitive, useExclusivePopover } from './AnimatedPopover';
import { cn } from '@/lib/cn';

export interface DropdownOption {
  type?: 'option';
  id?: string;
  value?: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}

export type DropdownItem = DropdownOption | { type: 'divider' } | { type: 'group'; label: string };

export interface DropdownTriggerState {
  value: string | undefined;
  option: DropdownOption | undefined;
  open: boolean;
  placeholder: string;
  triggerProps: {
    type: 'button';
    'aria-haspopup': 'listbox';
    'aria-expanded': boolean;
    disabled: boolean;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  };
}

export interface DropdownProps {
  options: readonly DropdownItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  renderOption?: (option: DropdownOption, selected: boolean, active: boolean) => ReactNode;
  renderTrigger?: (state: DropdownTriggerState) => ReactElement;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

function optionValue(option: DropdownOption): string | undefined {
  return option.value ?? option.id;
}

function isOption(item: DropdownItem): item is DropdownOption {
  return item.type !== 'divider' && item.type !== 'group';
}

export function Dropdown({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  renderOption,
  renderTrigger,
  className,
  disabled,
  'aria-label': ariaLabel,
}: DropdownProps) {
  const id = useRef(`dropdown-${Math.random().toString(36).slice(2)}`).current;
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [activeValue, setActiveValue] = useState<string | undefined>(value ?? defaultValue);
  const listRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const selectedValue = controlled ? value : internalValue;
  useExclusivePopover(id, open, setOpen);

  const flatOptions = useMemo(() => options.filter(isOption), [options]);
  const selectedOption = flatOptions.find((option) => optionValue(option) === selectedValue);
  const enabledOptions = useMemo(
    () => flatOptions.filter((option) => !option.disabled && optionValue(option) !== undefined),
    [flatOptions],
  );

  useEffect(() => {
    if (!open) return;
    const active = activeValue && enabledOptions.some((option) => optionValue(option) === activeValue)
      ? activeValue
      : optionValue(selectedOption ?? enabledOptions[0]!);
    setActiveValue(active);
    requestAnimationFrame(() => {
      const target = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      target?.focus({ preventScroll: true });
    });
  }, [open, enabledOptions, activeValue, selectedOption]);

  const choose = useCallback((option: DropdownOption) => {
    if (option.disabled) return;
    const nextValue = optionValue(option);
    if (nextValue === undefined) return;
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    option.onSelect?.();
    setOpen(false);
  }, [controlled, onChange]);

  function moveActive(current: string | undefined, delta: number) {
    if (enabledOptions.length === 0) return;
    const currentIndex = enabledOptions.findIndex((option) => optionValue(option) === current);
    const nextIndex = (currentIndex + delta + enabledOptions.length) % enabledOptions.length;
    const next = optionValue(enabledOptions[nextIndex]!);
    setActiveValue(next);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next ?? '')}"]`)?.focus());
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(activeValue, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(activeValue, -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const option = event.key === 'Home' ? enabledOptions[0] : enabledOptions.at(-1);
      const next = option && optionValue(option);
      setActiveValue(next);
      requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next ?? '')}"]`)?.focus());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = enabledOptions.find((item) => optionValue(item) === activeValue);
      if (option) choose(option);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  const triggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };
  const triggerProps: DropdownTriggerState['triggerProps'] = {
    type: 'button',
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    disabled: Boolean(disabled),
    onClick: () => setOpen((current) => !current),
    onKeyDown: triggerKeyDown,
  };
  const triggerState = { value: selectedValue, option: selectedOption, open, placeholder, triggerProps };
  const trigger = renderTrigger ? renderTrigger(triggerState) : (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={triggerKeyDown}
      className={cn('flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[rgb(var(--input-overlay-border))] bg-[rgb(var(--input-overlay-trigger))] px-3 text-[13px] font-medium text-[rgb(var(--input-overlay-text))] shadow-[0_0_0_2px_rgb(var(--input-overlay-border)/0.18)] transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50', className)}
    >
      {selectedOption?.icon}
      <span className={cn('max-w-full truncate', !selectedOption && 'text-fg-dim')}>{selectedOption?.label ?? placeholder}</span>
      <ChevronDown className={cn('h-4 w-4 shrink-0 text-fg-dim transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
    </button>
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>{trigger}</PopoverPrimitive.Anchor>
      <AnimatedPopoverContent
        align="start"
        side="bottom"
        panelClassName="p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
          aria-activedescendant={activeValue ? `${id}-${activeValue}` : undefined}
          onKeyDown={onListKeyDown}
          data-lenis-prevent
          className="max-h-[min(320px,60vh)] overflow-y-auto outline-none"
        >
          {options.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={`divider-${index}`} role="separator" className="my-1.5 h-px bg-[rgb(var(--input-overlay-border)/0.7)]" />;
            }
            if (item.type === 'group') {
              return <div key={`group-${index}`} role="presentation" className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--input-overlay-muted))]">{item.label}</div>;
            }

            const itemValue = optionValue(item);
            const selected = itemValue === selectedValue;
            const active = itemValue === activeValue;
            const optionIndex = flatOptions.indexOf(item);
            return (
              <button
                key={itemValue ?? `option-${index}`}
                id={itemValue ? `${id}-${itemValue}` : undefined}
                data-value={itemValue}
                data-active={active || undefined}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled || itemValue === undefined}
                tabIndex={active ? 0 : -1}
                onFocus={() => setActiveValue(itemValue)}
                onPointerMove={() => !item.disabled && setActiveValue(itemValue)}
                onClick={() => choose(item)}
                style={{ animationDelay: `${Math.min(optionIndex * 48, 300)}ms` }}
                className={cn('ui-dropdown-row-enter flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] text-[rgb(var(--input-overlay-muted))] outline-none transition-colors duration-150 hover:bg-[rgb(var(--input-overlay-hover))] hover:text-[rgb(var(--input-overlay-text))] focus-visible:bg-[rgb(var(--input-overlay-hover))] focus-visible:text-[rgb(var(--input-overlay-text))]', selected && 'bg-[rgb(var(--input-overlay-hover))] text-[rgb(var(--input-overlay-text))]', item.disabled && 'cursor-not-allowed opacity-40')}
              >
                {renderOption ? renderOption(item, selected, active) : (
                  <>
                    {item.icon ? <span className="grid h-4 w-4 shrink-0 place-items-center">{item.icon}</span> : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> : null}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </AnimatedPopoverContent>
    </PopoverPrimitive.Root>
  );
}
