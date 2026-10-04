import { useMemo } from 'react';
import { DatePicker } from './DatePicker';

export interface DateTimePickerProps {
  /** Local datetime value in the native `YYYY-MM-DDTHH:mm` form. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  'aria-label'?: string;
}

function getDateKey(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  return match?.[1] ?? null;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  clearable = false,
  'aria-label': ariaLabel = 'Choose date and time',
}: DateTimePickerProps) {
  const dateKey = getDateKey(value);
  const selectedDate = useMemo(
    () => dateKey ? new Date(`${dateKey}T00:00:00`) : null,
    [dateKey],
  );
  const timeValue = value.slice(value.indexOf('T') + 1) || '00:00';
  const [hourText = '00', minuteText = '00'] = timeValue.split(':');
  const hour24 = Number(hourText);
  const timeLabel = `${String(hour24 % 12 || 12).padStart(2, '0')}:${minuteText} ${hour24 >= 12 ? 'PM' : 'AM'}`;

  return (
    <DatePicker
      value={selectedDate}
      onChange={(date) => {
        if (!date) {
          onChange('');
          return;
        }
        const nextDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        onChange(`${nextDateKey}T${timeValue}`);
      }}
      timeValue={timeValue}
      format={(date, locale) => `${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)} · ${timeLabel}`}
      onTimeChange={(time) => {
        if (dateKey) onChange(`${dateKey}T${time}`);
      }}
      keepOpenOnSelect
      clearable={clearable}
      readOnly
      placeholder={placeholder ?? 'Select date and time'}
      disabled={disabled}
      aria-label={ariaLabel}
      className={invalid ? 'border-loss focus-visible:ring-loss/40' : undefined}
    />
  );
}
