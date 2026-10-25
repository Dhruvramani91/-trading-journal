import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import { TemplateFieldEditorList } from './TemplateFieldEditorList';
import type { TemplateField } from '@/domain/models/trade';

const makeField = (key: string, label: string): TemplateField => ({ key, label, group: 'Context', type: 'enum', options: ['London', 'New York'], inTable: false, inStats: false });

function Harness({ initial = [makeField('a', 'Session'), makeField('b', 'Bias')] }: { initial?: TemplateField[] }) {
  const [fields, setFields] = useState(initial);
  const [focusFieldKey, setFocusFieldKey] = useState<string>();
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);
  const [focusRequestId, setFocusRequestId] = useState(0);
  return <>
    <button onClick={() => { setExpandedFieldKey('a'); setFocusFieldKey('a'); setFocusRequestId((id) => id + 1); }}>Focus Session</button>
    <TemplateFieldEditorList fields={fields} onChange={setFields} issues={[]} expandedFieldKey={expandedFieldKey} onExpandedChange={setExpandedFieldKey} focusFieldKey={focusFieldKey} focusRequestId={focusRequestId} onRemove={(_field, index) => setFields((current) => current.filter((_, i) => i !== index))} />
    <output>{fields.map((field) => field.label).join('|')}</output>
  </>;
}

describe('TemplateFieldEditorList', () => {
  it('reorders a focused row with Alt+ArrowDown', () => {
    render(<Harness />);
    const firstRow = screen.getAllByRole('article')[0]!;
    firstRow.focus();
    fireEvent.keyDown(firstRow, { key: 'ArrowDown', altKey: true });
    expect(screen.getByText('Bias|Session')).toBeInTheDocument();
  });

  it('reorders a row with the drag handle and row drop target', () => {
    render(<Harness />);
    const articles = screen.getAllByRole('article');
    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: vi.fn(() => '0') };
    fireEvent.dragStart(articles[0]!.querySelector('[draggable="true"]')!, { dataTransfer });
    fireEvent.drop(articles[1]!, { dataTransfer });
    expect(screen.getByText('Bias|Session')).toBeInTheDocument();
  });

  it('adds a choice with Enter, pasted options, removes it, and reorders with Alt+ArrowRight', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Session' }));
    const addChoice = screen.getByRole('textbox', { name: 'Add a choice to Session' });
    fireEvent.change(addChoice, { target: { value: 'Asia' } });
    fireEvent.keyDown(addChoice, { key: 'Enter' });
    expect(screen.getByText('Asia')).toBeInTheDocument();
    fireEvent.paste(addChoice, { clipboardData: { getData: () => 'New York, Frankfurt' } });
    expect(screen.getByText('Frankfurt')).toBeInTheDocument();
    const choices = screen.getByRole('list', { name: '4 choices' });
    const asia = within(choices).getByText('Asia');
    asia.focus();
    fireEvent.keyDown(asia, { key: 'ArrowRight', altKey: true });
    expect(Array.from(choices.children).map((chip) => chip.querySelector('span')?.textContent)).toEqual(['London', 'New York', 'Frankfurt', 'Asia']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove choice Asia' }));
    expect(screen.queryByText('Asia')).not.toBeInTheDocument();
  });

  it('keeps long field labels and large lists available in the editor', () => {
    const fields = Array.from({ length: 18 }, (_, index) => makeField(`field-${index}`, `Strategy field ${index + 1} with a long explanatory label`));
    render(<Harness initial={fields} />);
    expect(screen.getByText('18 fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fields[17]!.label })).toBeInTheDocument();
  });

  it('duplicates a field with its options and exposes the new editable row', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(await screen.findByRole('textbox', { name: 'Label for Copy of Session' })).toHaveValue('Copy of Session');
    expect(screen.getByRole('list', { name: '2 choices' })).toBeInTheDocument();
  });

  it('focuses a field label when requested by the live preview', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Focus Session' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Label for Session' })).toHaveFocus());
  });
});
