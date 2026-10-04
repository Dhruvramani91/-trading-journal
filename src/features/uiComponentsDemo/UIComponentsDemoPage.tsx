import { useState } from 'react';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';

// Demo-only options. Remove this page and its route to remove all sample data.
const demoOptions: readonly DropdownItem[] = [
  { type: 'group', label: 'Demo choices' },
  { id: 'first', label: 'First sample option' },
  { id: 'second', label: 'Second sample option' },
  { type: 'divider' },
  { id: 'unavailable', label: 'Disabled sample option', disabled: true },
];

export function UIComponentsDemoPage() {
  const [choice, setChoice] = useState('first');
  const [date, setDate] = useState<Date | null>(new Date(2026, 9, 4));
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-bg-0 px-4 py-8 text-fg sm:px-6">
    <div className="mx-auto w-full max-w-3xl space-y-6 py-2">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-dim">Temporary component preview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Dropdown &amp; DatePicker</h1>
          <p className="mt-1 text-sm text-fg-muted">Sample options below are demo data only.</p>
        </div>
        <div className="flex gap-2" aria-label="Preview theme">
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} size="sm" onClick={() => setTheme('light')}>Light</Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} size="sm" onClick={() => setTheme('dark')}>Dark</Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="block">
            <CardTitle>Dropdown</CardTitle>
            <CardDescription className="mt-1">Data is passed in through the options prop.</CardDescription>
          </CardHeader>
          <CardBody>
            <Dropdown options={demoOptions} value={choice} onChange={setChoice} placeholder="Choose a demo option" aria-label="Demo dropdown" />
            <p className="mt-3 text-xs text-fg-muted">Selected demo value: <span className="font-mono text-fg">{choice}</span></p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="block">
            <CardTitle>DatePicker</CardTitle>
            <CardDescription className="mt-1">Type a date or choose one from the calendar.</CardDescription>
          </CardHeader>
          <CardBody>
            <DatePicker value={date} onChange={setDate} markedDates={[new Date(2026, 9, 8), new Date(2026, 9, 17)]} aria-label="Demo date picker" />
            <p className="mt-3 text-xs text-fg-muted">Selected demo date: <span className="font-mono text-fg">{date ? date.toLocaleDateString() : 'None'}</span></p>
          </CardBody>
        </Card>
      </div>
    </div>
    </div>
  );
}
