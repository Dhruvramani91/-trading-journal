import { createContext, useContext } from 'react';

export interface FormFieldA11y {
  labelId: string;
  hintId?: string;
  errorId?: string;
  required?: boolean;
  invalid?: boolean;
}

export const FormFieldContext = createContext<FormFieldA11y | null>(null);

export function useFormFieldContext() {
  return useContext(FormFieldContext);
}

export function describedByIds(
  existing: string | undefined,
  ...ids: Array<string | undefined>
) {
  const values = [existing, ...ids].filter((value): value is string => Boolean(value));
  return values.length ? [...new Set(values)].join(' ') : undefined;
}
