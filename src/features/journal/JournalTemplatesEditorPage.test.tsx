import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JournalTemplatesEditorPage } from './JournalTemplatesEditorPage';
import type { TemplateDefinition } from '@/domain/models/trade';
import { archiveCustomTemplate, getDefaultTemplateId, listJournalTemplates, saveCustomTemplate, saveDefaultTemplateId } from '@/data/journalTemplateRepository';

vi.mock('@/data/journalTemplateRepository', () => ({
  getDefaultTemplateId: vi.fn(),
  listJournalTemplates: vi.fn(),
  archiveCustomTemplate: vi.fn(),
  saveCustomTemplate: vi.fn(),
  saveDefaultTemplateId: vi.fn(),
}));

const builtin: TemplateDefinition = { id: 'default-ict-2026', name: 'Default ICT Journal', description: 'A sample setup.', photoCount: 3, fields: [{ key: 'session', label: 'Session', group: 'Context', type: 'enum', options: ['London', 'New York'], inTable: true, inStats: true }] };
const saved: TemplateDefinition = { ...builtin, id: 'custom:custom-id', name: 'My custom strategy' };

function renderPage() { return render(<MemoryRouter><JournalTemplatesEditorPage /></MemoryRouter>); }

async function startScratch() {
  fireEvent.click(await screen.findByRole('button', { name: 'Create from scratch' }));
  await screen.findByText('Ready to save');
}

describe('JournalTemplatesEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listJournalTemplates).mockResolvedValue([builtin]);
    vi.mocked(getDefaultTemplateId).mockResolvedValue(builtin.id);
    vi.mocked(saveDefaultTemplateId).mockResolvedValue(undefined);
    vi.mocked(saveCustomTemplate).mockImplementation(async (template) => ({ ...template, id: template.id || saved.id }));
    vi.mocked(archiveCustomTemplate).mockResolvedValue(undefined);
  });

  it('Save persists the template without changing the default selection', async () => {
    renderPage();
    await startScratch();
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await screen.findByText('Template saved. Your default template was not changed.');
    expect(saveCustomTemplate).toHaveBeenCalledTimes(1);
    expect(saveDefaultTemplateId).not.toHaveBeenCalled();
  });

  it('Save & use persists the template then selects it for future trades', async () => {
    renderPage();
    await startScratch();
    fireEvent.click(screen.getByRole('button', { name: 'Save & use for new trades' }));
    await screen.findByText('Saved and selected. New trades will use this form; saved trades are unchanged.');
    expect(saveCustomTemplate).toHaveBeenCalledTimes(1);
    expect(saveDefaultTemplateId).toHaveBeenCalledWith(saved.id);
  });

  it('removes a field immediately and restores it at its original position with Undo', async () => {
    renderPage();
    await startScratch();
    fireEvent.click(screen.getByRole('button', { name: 'Text' }));
    await screen.findByRole('textbox', { name: 'Label for Text field' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove field' }));
    expect(await screen.findByText('Field removed. Saved trades keep their answers.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.getByText('1 field')).toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Label for Text field' })).toBeInTheDocument();
  });

  it('does not save until validation issues are fixed', async () => {
    renderPage();
    await startScratch();
    fireEvent.change(screen.getByDisplayValue('My custom strategy'), { target: { value: ' ' } });
    expect(screen.getByText('1 thing to fix')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled();
    expect(saveCustomTemplate).not.toHaveBeenCalled();
  });

  it('keeps the editor draft visible and reports a specific error when saving fails', async () => {
    vi.mocked(saveCustomTemplate).mockRejectedValueOnce(new Error('Network unavailable.'));
    renderPage();
    await startScratch();
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable.');
    expect(screen.getByDisplayValue('My custom strategy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled();
  });

  it('shows the template name at the top of the live preview', async () => {
    renderPage();
    await startScratch();
    expect(screen.getAllByRole('heading', { name: 'My custom strategy' })).toHaveLength(2);
    expect(screen.getByText('Live preview · Strategy fields follow this order in the trade form.')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a saved template', async () => {
    vi.mocked(listJournalTemplates).mockResolvedValue([builtin, saved]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete My custom strategy' }));
    expect(await screen.findByRole('heading', { name: 'Delete My custom strategy?' })).toBeInTheDocument();
    expect(screen.getByText(/Existing trades keep their saved template and answers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete template' }));
    await waitFor(() => expect(archiveCustomTemplate).toHaveBeenCalledWith(saved.id));
  });
});
