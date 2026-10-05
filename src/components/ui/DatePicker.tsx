import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { AnimatedPopoverContent, PopoverPrimitive, useExclusivePopover } from './AnimatedPopover';
import { cn } from '@/lib/cn';

export type DatePickerValue = Date | string | null;

export interface DatePickerProps {
  value?: DatePickerValue;
  defaultValue?: DatePickerValue;
  onChange?: (value: Date | null) => void;
  min?: DatePickerValue;
  max?: DatePickerValue;
  disabledDates?: readonly DatePickerValue[];
  markedDates?: readonly DatePickerValue[];
  locale?: string;
  weekStartsOn?: number;
  placeholder?: string;
  format?: string | ((date: Date, locale: string) => string);
  timeValue?: string;
  onTimeChange?: (value: string) => void;
  keepOpenOnSelect?: boolean;
  clearable?: boolean;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

type PickerView = 'calendar' | 'month' | 'year';

function localDate(value: DatePickerValue | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return date.getFullYear() === Number(iso[1]) && date.getMonth() === Number(iso[2]) - 1 && date.getDate() === Number(iso[3]) ? date : null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(date: Date, format: DatePickerProps['format'], locale: string): string {
  if (typeof format === 'function') return format(date, locale);
  if (format) {
    const monthLong = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
    const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
    return format
      .replaceAll('yyyy', String(date.getFullYear()))
      .replaceAll('MMMM', monthLong)
      .replaceAll('MMM', monthShort)
      .replaceAll('MM', String(date.getMonth() + 1).padStart(2, '0'))
      .replaceAll('M', String(date.getMonth() + 1))
      .replaceAll('dd', String(date.getDate()).padStart(2, '0'))
      .replaceAll('d', String(date.getDate()));
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function addMonths(date: Date, amount: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function startOfWeek(date: Date, weekStartsOn: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() - weekStartsOn + 7) % 7));
  return result;
}

export function DatePicker({
  value,
  defaultValue = null,
  onChange,
  min,
  max,
  disabledDates = [],
  markedDates = [],
  locale = 'en-US',
  weekStartsOn = 0,
  placeholder = 'Select a date',
  format,
  timeValue,
  onTimeChange,
  keepOpenOnSelect = false,
  clearable = false,
  className,
  disabled = false,
  readOnly = false,
  id,
  name,
  'aria-label': ariaLabel = 'Choose date',
}: DatePickerProps) {
  const generatedId = useRef(`date-picker-${Math.random().toString(36).slice(2)}`).current;
  const inputId = id ?? generatedId;
  const popoverId = `${generatedId}-popover`;
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const externalDate = localDate(value);
  const [internalDate, setInternalDate] = useState<Date | null>(() => localDate(defaultValue));
  const selectedDate = controlled ? externalDate : internalDate;
  const [draft, setDraft] = useState(() => selectedDate ? formatDate(selectedDate, format, locale) : '');
  const [invalid, setInvalid] = useState(false);
  const today = useMemo(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? today);
  const [focusedDate, setFocusedDate] = useState(() => selectedDate ?? today);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>('calendar');
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const initialTime = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
  const initialHour24 = initialTime ? Number(initialTime[1]) : 0;
  const [hourDraft, setHourDraft] = useState(String(initialHour24 % 12 || 12).padStart(2, '0'));
  const [minuteDraft, setMinuteDraft] = useState(initialTime?.[2] ?? '00');
  useExclusivePopover(popoverId, open, setOpen);

  useEffect(() => {
    setDraft(selectedDate ? formatDate(selectedDate, format, locale) : '');
  }, [selectedDate?.getTime(), format, locale]);

  useEffect(() => {
    const match = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
    const hour24 = match ? Number(match[1]) : 0;
    setHourDraft(String(hour24 % 12 || 12).padStart(2, '0'));
    setMinuteDraft(match?.[2] ?? '00');
  }, [timeValue]);

  useEffect(() => {
    if (open && view === 'calendar') {
      requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${generatedId}-day-${dateKey(focusedDate)}`)}`)?.focus({ preventScroll: true }));
    }
  }, [open, view, focusedDate, generatedId]);

  const minimum = localDate(min);
  const maximum = localDate(max);
  const disabledKeys = useMemo(() => new Set(disabledDates.map((date) => localDate(date)).filter((date): date is Date => Boolean(date)).map(dateKey)), [disabledDates]);
  const markedKeys = useMemo(() => new Set(markedDates.map((date) => localDate(date)).filter((date): date is Date => Boolean(date)).map(dateKey)), [markedDates]);

  const isDisabled = useCallback((date: Date) => {
    const time = date.getTime();
    return (minimum != null && time < minimum.getTime()) || (maximum != null && time > maximum.getTime()) || disabledKeys.has(dateKey(date));
  }, [minimum?.getTime(), maximum?.getTime(), disabledKeys]);

  function selectDate(date: Date) {
    if (isDisabled(date)) return;
    const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (!controlled) setInternalDate(selected);
    setDraft(formatDate(selected, format, locale));
    setInvalid(false);
    setViewDate(selected);
    setFocusedDate(selected);
    onChange?.(selected);
    if (!keepOpenOnSelect) {
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }

  function clearDate() {
    if (!controlled) setInternalDate(null);
    setDraft('');
    setInvalid(false);
    onChange?.(null);
    if (!keepOpenOnSelect) {
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }

  function changeMonth(amount: number) {
    setDirection(amount >= 0 ? 'next' : 'previous');
    setViewDate((current) => addMonths(current, amount));
  }

  function onInputChange(next: string) {
    setDraft(next);
    if (!next.trim()) {
      setInvalid(false);
      if (!controlled) setInternalDate(null);
      onChange?.(null);
      return;
    }
    const parsed = localDate(next);
    if (parsed && !isDisabled(parsed)) {
      setInvalid(false);
      if (!controlled) setInternalDate(parsed);
      setViewDate(parsed);
      setFocusedDate(parsed);
      onChange?.(parsed);
    } else {
      setInvalid(true);
    }
  }

  function focusEnabledDate(candidate: Date) {
    let next = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    for (let attempts = 0; attempts < 366; attempts += 1) {
      if (!isDisabled(next)) break;
      next.setDate(next.getDate() + (candidate >= (focusedDate) ? 1 : -1));
    }
    setFocusedDate(next);
    setViewDate(next);
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 7 : -7;
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
      setDirection(target > viewDate ? 'next' : 'previous');
      focusEnabledDate(target);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const amount = event.key === 'PageUp' ? -1 : 1;
      const target = addMonths(date, event.shiftKey ? amount * 12 : amount);
      setDirection(amount > 0 ? 'next' : 'previous');
      focusEnabledDate(target);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekStart = startOfWeek(date, weekStartsOn);
      const target = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + (event.key === 'End' ? 6 : 0));
      focusEnabledDate(target);
    }
  }

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return day;
  });
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(2024, 0, 7 + ((weekStartsOn + index) % 7));
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day).slice(0, 2);
  });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' }).format(viewDate);
  const year = viewDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, month, 1)));
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 121 }, (_, index) => currentYear - 100 + index);
  const gridMotion = direction === 'next' ? 'ui-month-next' : 'ui-month-previous';

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          const initial = selectedDate ?? today;
          setViewDate(initial);
          setFocusedDate(initial);
          setView('calendar');
        }
      }}
    >
      <div className="relative w-full">
        <PopoverPrimitive.Anchor asChild>
          <div className="relative">
            <input
              ref={inputRef}
              id={inputId}
              name={name}
              type="text"
              value={draft}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              aria-label={ariaLabel}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-invalid={invalid || undefined}
              autoComplete="off"
              onClick={() => {
                const initial = selectedDate ?? today;
                setViewDate(initial);
                setFocusedDate(initial);
                setView('calendar');
                setOpen(true);
              }}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setOpen(true);
                }
                if (event.key === 'Escape' && open) setOpen(false);
              }}
              className={cn('h-11 w-full rounded-xl border border-[rgb(var(--input-overlay-border))] bg-[rgb(var(--input-overlay-trigger))] px-3 pr-11 text-sm text-[rgb(var(--input-overlay-text))] shadow-[0_0_0_2px_rgb(var(--input-overlay-border)/0.18)] placeholder:text-[rgb(var(--input-overlay-muted))] transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50', invalid && 'border-loss focus-visible:ring-loss/40', className)}
            />
            <button
              type="button"
              disabled={disabled}
              aria-label="Open calendar"
              onClick={() => {
                if (!open) {
                  const initial = selectedDate ?? today;
                  setViewDate(initial);
                  setFocusedDate(initial);
                  setView('calendar');
                }
                setOpen((current) => !current);
              }}
              className="absolute inset-y-0 right-1 inline-flex w-9 items-center justify-center rounded-lg text-[rgb(var(--input-overlay-muted))] transition-colors hover:bg-[rgb(var(--input-overlay-hover))] hover:text-[rgb(var(--input-overlay-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </PopoverPrimitive.Anchor>
      </div>

      <AnimatedPopoverContent
        align="start"
        side="bottom"
        avoidCollisions={false}
        className="!w-auto"
        panelClassName="w-[min(292px,calc(100vw-24px))] p-3.5"
        role="dialog"
        aria-label="Choose a date"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))}
      >
        <div className="space-y-3.5">
          {view === 'calendar' ? (
            <>
              <header className="flex items-center justify-between gap-1">
                <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-[rgb(var(--input-overlay-muted))] transition-colors hover:bg-[rgb(var(--input-overlay-hover))] hover:text-[rgb(var(--input-overlay-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label="Choose month" aria-expanded={false} onClick={() => setView('month')} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[rgb(var(--input-overlay-border))] px-2 text-[13px] font-medium transition-colors hover:bg-[rgb(var(--input-overlay-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                    {monthLabel}<ChevronsUpDown className="h-3.5 w-3.5 text-[rgb(var(--input-overlay-muted))]" />
                  </button>
                  <button type="button" aria-label="Choose year" aria-expanded={false} onClick={() => setView('year')} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[rgb(var(--input-overlay-border))] px-2 text-[13px] font-medium transition-colors hover:bg-[rgb(var(--input-overlay-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                    {year}<ChevronsUpDown className="h-3.5 w-3.5 text-[rgb(var(--input-overlay-muted))]" />
                  </button>
                </div>
                <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} className="grid h-8 w-8 place-items-center rounded-lg text-[rgb(var(--input-overlay-muted))] transition-colors hover:bg-[rgb(var(--input-overlay-hover))] hover:text-[rgb(var(--input-overlay-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </header>
              <div className={cn('space-y-1', gridMotion)} key={`${year}-${viewDate.getMonth()}`}>
                <div role="row" className="grid grid-cols-7 gap-1">
                  {weekdays.map((weekday, index) => <div role="columnheader" key={`${weekday}-${index}`} className="grid h-7 place-items-center text-[11px] font-medium text-[rgb(var(--input-overlay-muted))]">{weekday}</div>)}
                </div>
                <div ref={gridRef} role="grid" aria-label={new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate)} className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const key = dateKey(day);
                    const outsideMonth = day.getMonth() !== viewDate.getMonth();
                    const selected = selectedDate != null && dateKey(selectedDate) === key;
                    const isToday = dateKey(today) === key;
                    const marked = markedKeys.has(key);
                    const dayDisabled = isDisabled(day);
                    const focused = dateKey(focusedDate) === key;
                    return (
                      <button
                        id={`${generatedId}-day-${key}`}
                        key={key}
                        type="button"
                        role="gridcell"
                        aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day)}
                        aria-selected={selected}
                        aria-current={isToday ? 'date' : undefined}
                        disabled={dayDisabled}
                        tabIndex={focused ? 0 : -1}
                        onFocus={() => setFocusedDate(day)}
                        onClick={() => {
                          if (outsideMonth) {
                            setDirection(day < viewDate ? 'previous' : 'next');
                            setViewDate(day);
                          }
                          selectDate(day);
                        }}
                        onKeyDown={(event) => onDayKeyDown(event, day)}
                        className={cn('relative grid h-9 w-9 place-items-center rounded-lg text-[13px] font-medium tabular-nums outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/60', outsideMonth && 'text-[rgb(var(--input-overlay-muted))]/55', !outsideMonth && 'text-[rgb(var(--input-overlay-text))]', marked && !selected && 'bg-orange-500/10', !selected && !dayDisabled && 'hover:bg-[rgb(var(--input-overlay-hover))]', selected && 'ui-date-selected bg-fg text-fg-inverse dark:bg-white dark:text-neutral-950', dayDisabled && 'cursor-not-allowed opacity-40')}
                      >
                        <span>{day.getDate()}</span>
                        {isToday && <span aria-hidden="true" className={cn('absolute bottom-1 h-1 w-1 rounded-full', selected ? 'bg-current' : 'bg-accent')} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {onTimeChange ? (
                <div className="flex items-center justify-between gap-2 border-t border-[rgb(var(--input-overlay-border))] pt-3">
                  <span className="text-xs font-medium text-[rgb(var(--input-overlay-muted))]">Time</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={hourDraft}
                      disabled={!selectedDate}
                      aria-label="Hour"
                      onChange={(event) => {
                        const next = event.target.value.replace(/\D/g, '').slice(0, 2);
                        setHourDraft(next);
                        const hour = Number(next);
                        if (next.length === 2 && hour >= 1 && hour <= 12) {
                          const match = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
                          const hour24 = match ? Number(match[1]) : 0;
                          const period = hour24 >= 12 ? 'PM' : 'AM';
                          const minute = match?.[2] ?? '00';
                          const normalizedHour = hour % 12 + (period === 'PM' ? 12 : 0);
                          onTimeChange(`${String(normalizedHour).padStart(2, '0')}:${minute}`);
                        }
                      }}
                      onBlur={() => {
                        const hour = Number(hourDraft);
                        const normalized = hour >= 1 && hour <= 12 ? String(hour).padStart(2, '0') : '12';
                        setHourDraft(normalized);
                        const match = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
                        const hour24 = match ? Number(match[1]) : 0;
                        const period = hour24 >= 12 ? 'PM' : 'AM';
                        const normalizedHour = Number(normalized) % 12 + (period === 'PM' ? 12 : 0);
                        onTimeChange(`${String(normalizedHour).padStart(2, '0')}:${match?.[2] ?? '00'}`);
                      }}
                      className="h-9 w-11 rounded-lg border border-[rgb(var(--input-overlay-border))] bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40"
                    />
                    <span className="text-sm text-[rgb(var(--input-overlay-muted))]">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={minuteDraft}
                      disabled={!selectedDate}
                      aria-label="Minute"
                      onChange={(event) => {
                        const next = event.target.value.replace(/\D/g, '').slice(0, 2);
                        setMinuteDraft(next);
                        const minute = Number(next);
                        if (next.length === 2 && minute >= 0 && minute <= 59) {
                          const match = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
                          const hour24 = match ? Number(match[1]) : 0;
                          onTimeChange(`${String(hour24).padStart(2, '0')}:${next}`);
                        }
                      }}
                      onBlur={() => {
                        const minute = Number(minuteDraft);
                        const normalized = minute >= 0 && minute <= 59 ? String(minute).padStart(2, '0') : '00';
                        setMinuteDraft(normalized);
                        const match = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
                        onTimeChange(`${match?.[1] ?? '00'}:${normalized}`);
                      }}
                      className="h-9 w-11 rounded-lg border border-[rgb(var(--input-overlay-border))] bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={!selectedDate}
                      aria-label="Toggle AM or PM"
                      onClick={() => {
                        const match = /^([0-2]\d):([0-5]\d)$/.exec(timeValue ?? '00:00');
                        const hour24 = match ? Number(match[1]) : 0;
                        onTimeChange(`${String((hour24 + 12) % 24).padStart(2, '0')}:${match?.[2] ?? '00'}`);
                      }}
                      className="h-9 min-w-12 rounded-lg border border-[rgb(var(--input-overlay-border))] px-2 text-xs font-semibold transition-colors hover:bg-[rgb(var(--input-overlay-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40"
                    >
                      {(Number(/^([0-2]\d):/.exec(timeValue ?? '00:00')?.[1] ?? '00') >= 12) ? 'PM' : 'AM'}
                    </button>
                  </div>
                </div>
              ) : null}
              {keepOpenOnSelect ? (
                <div className="flex items-center justify-between gap-2">
                  {clearable ? (
                    <button type="button" onClick={clearDate} className="rounded-lg px-2 py-2 text-xs font-medium text-[rgb(var(--input-overlay-muted))] transition-colors hover:bg-[rgb(var(--input-overlay-hover))] hover:text-[rgb(var(--input-overlay-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                      Clear
                    </button>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
                    }}
                    className="rounded-lg bg-fg px-4 py-2 text-xs font-semibold text-fg-inverse transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    Done
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <header className="flex items-center justify-between">
                <button type="button" onClick={() => setView('calendar')} className="rounded-lg px-2 py-1 text-xs text-[rgb(var(--input-overlay-muted))] hover:bg-[rgb(var(--input-overlay-hover))]">Back</button>
                <span className="text-sm font-semibold">{view === 'month' ? year : 'Choose year'}</span>
                <span className="w-10" />
              </header>
              <div
                role="listbox"
                data-lenis-prevent
                aria-label={view === 'month' ? 'Months' : 'Years'}
                className={cn('max-h-[260px] overflow-y-auto', view === 'month' ? 'grid grid-cols-3 gap-1' : 'grid grid-cols-3 gap-1')}
              >
                {(view === 'month' ? months.map((label, month) => ({ label, value: month })) : years.map((yearValue) => ({ label: String(yearValue), value: yearValue }))).map((item, index) => {
                  const selected = view === 'month' ? item.value === viewDate.getMonth() : item.value === year;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        if (view === 'month') {
                          setViewDate((current) => {
                            const target = new Date(current.getFullYear(), Number(item.value), 1);
                            target.setDate(Math.min(current.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
                            return target;
                          });
                        } else {
                          setViewDate((current) => {
                            const target = new Date(Number(item.value), current.getMonth(), 1);
                            target.setDate(Math.min(current.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
                            return target;
                          });
                        }
                        setView('calendar');
                      }}
                      style={{ animationDelay: `${Math.min(index * 24, 180)}ms` }}
                      className={cn('ui-dropdown-row-enter min-h-9 rounded-lg px-2 text-xs font-medium text-[rgb(var(--input-overlay-muted))] hover:bg-[rgb(var(--input-overlay-hover))] hover:text-[rgb(var(--input-overlay-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50', selected && 'bg-[rgb(var(--input-overlay-hover))] text-[rgb(var(--input-overlay-text))]')}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </AnimatedPopoverContent>
    </PopoverPrimitive.Root>
  );
}
