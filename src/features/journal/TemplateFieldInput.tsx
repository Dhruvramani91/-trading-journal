import { AnimatedCheckBox } from '@/components/ui/animated-check-box';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { TemplateField } from '@/domain/models/trade';

type TemplateFieldValue = string | number | boolean | null | undefined;

/** Shared strategy-field controls for saved trades and the unsaved template preview. */
export function TemplateFieldInput({
  field,
  value,
  onChange,
  portalZIndex,
}: {
  field: TemplateField;
  value: TemplateFieldValue;
  onChange: (value: string | boolean) => void;
  portalZIndex?: number;
}) {
  if (field.type === 'enum') {
    return <Select className="min-h-10" value={String(value ?? '')} portalZIndex={portalZIndex} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {(field.options ?? []).map((option, index) => <option key={`${option}-${index}`} value={option}>{option}</option>)}
    </Select>;
  }

  if (field.type === 'boolean') {
    return <AnimatedCheckBox aria-label={field.label} checked={value === true || value === 'YES' || value === 'true'} onChange={(event) => onChange(event.target.checked)} />;
  }

  return <Input
    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
    className="min-h-10"
    step={field.type === 'number' ? '0.1' : undefined}
    value={String(value ?? '')}
    onChange={(event) => onChange(event.target.value)}
    placeholder={field.type === 'text' ? 'Enter value' : undefined}
  />;
}
