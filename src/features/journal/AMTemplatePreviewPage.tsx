import { useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField, FormSection, Segmented, Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import type { TradeGrade } from '@/domain/models/trade';

type DraftKey =
  | 'instrument'
  | 'openedAt'
  | 'closedAt'
  | 'direction'
  | 'entry'
  | 'exit'
  | 'pnl'
  | 'duration'
  | 'relevantSwing'
  | 'swingReaction'
  | 'dailyBias'
  | 'invalidation'
  | 'dailyProfile'
  | 'profileDirection'
  | 'profileAlignment'
  | 'fractalPair'
  | 'entrySignature'
  | 'management'
  | 'pyramid'
  | 'followedModel'
  | 'grade'
  | 'result'
  | 'realizedR'
  | 'notes';

const OPTIONS: Record<DraftKey, string[]> = {
  instrument: ['NQ', 'ES', 'YM', 'RTY', 'Other'],
  openedAt: [],
  closedAt: [],
  direction: ['Long', 'Short'],
  entry: [],
  exit: [],
  pnl: [],
  duration: [],
  relevantSwing: ['Relevant daily high', 'Relevant daily low'],
  swingReaction: ['Reversal', 'Continuation', 'No clear reaction'],
  dailyBias: ['Bullish', 'Bearish', 'Neutral'],
  invalidation: [],
  dailyProfile: [
    'Asia reversal (18:00)',
    'London reversal (01:00)',
    'New York reversal (08:00)',
    'Continuation day',
    'Range / stand aside',
    'Other',
  ],
  profileDirection: ['Bullish', 'Bearish', 'Neutral'],
  profileAlignment: ['Aligned', 'Not aligned', 'Unclear'],
  fractalPair: ['7-hour → 15-minute', '1-hour → 5-minute', '30-minute → 3-minute', 'Other'],
  entrySignature: ['Fractal model entry', 'IC-CISD', 'Protected swing continuation', 'Other'],
  management: ['Fixed target', 'Dynamic management', 'Scale out'],
  pyramid: ['Yes', 'No'],
  followedModel: ['Yes', 'Partially', 'No'],
  grade: ['A+', 'A', 'B', 'C'],
  result: ['Win', 'Break even', 'Loss'],
  realizedR: [],
  notes: [],
};

const labelize = (value: string) => value;

function DraftSelect({
  field,
  label,
  value,
  onChange,
  hint,
}: {
  field: DraftKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <FormField label={label} hint={hint}>
      <Select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="">Select…</option>
        {OPTIONS[field].map((option) => (
          <option key={option} value={option}>{labelize(option)}</option>
        ))}
      </Select>
    </FormField>
  );
}

export function AMTemplatePreviewPage() {
  const [values, setValues] = useState<Record<DraftKey, string>>({
    instrument: '', openedAt: '', closedAt: '', direction: '', entry: '', exit: '', pnl: '', duration: '', relevantSwing: '', swingReaction: '',
    dailyBias: '', invalidation: '', dailyProfile: '', profileDirection: '',
    profileAlignment: '', fractalPair: '', entrySignature: '', management: '',
    pyramid: '', followedModel: '', grade: '', result: '', realizedR: '', notes: '',
  });

  const update = (key: DraftKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="AM Trades template"
        description="A source-based draft for review. This preview does not save a trade."
        actions={
          <Button asChild variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            <Link to="/journal">Back to journal</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-fg-muted">
        <Eye className="h-4 w-4 text-accent" />
        <Badge tone="accent">Preview only</Badge>
        <span>Try the fields below. Nothing is saved, and your current journal template is unchanged.</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default trade details</CardTitle>
        </CardHeader>
        <CardBody className="space-y-6">
          <FormSection title="Basics">
            <FormField label="Opened at">
              <Input type="datetime-local" value={values.openedAt} onChange={(event) => update('openedAt', event.target.value)} />
            </FormField>
            <FormField label="Closed at" hint="Leave blank for an open trade.">
              <Input type="datetime-local" value={values.closedAt} onChange={(event) => update('closedAt', event.target.value)} />
            </FormField>
            <DraftSelect field="instrument" label="Instrument" value={values.instrument} onChange={(value) => update('instrument', value)} />
            <FormField label="Direction">
              <Segmented<string> value={values.direction} onChange={(value) => update('direction', value)} options={OPTIONS.direction.map((value) => ({ value, label: value }))} fullWidth />
            </FormField>
          </FormSection>
          <FormSection title="Result">
            <FormField label="Trade grade" hint="Optional execution-quality rating.">
              <Segmented<TradeGrade | ''> value={values.grade as TradeGrade | ''} onChange={(value) => update('grade', value)} options={[
                { value: 'A+', label: 'A+', tone: 'grade-a-plus' },
                { value: 'A', label: 'A', tone: 'grade-a' },
                { value: 'B', label: 'B', tone: 'grade-b' },
                { value: 'C', label: 'C', tone: 'grade-c' },
              ]} fullWidth />
            </FormField>
            <FormField label="Outcome" required>
              <Segmented<string> value={values.result} onChange={(value) => update('result', value)} options={OPTIONS.result.map((value) => ({ value, label: value === 'Break even' ? 'BE' : value }))} fullWidth />
            </FormField>
            <FormField label="Realized R" required hint="Enter the actual realized R.">
              <Input inputMode="decimal" value={values.realizedR} onChange={(event) => update('realizedR', event.target.value)} placeholder="e.g. 2.5" />
            </FormField>
            <FormField label="Entry" required hint="Actual price at which the trade was opened.">
              <Input inputMode="decimal" value={values.entry} onChange={(event) => update('entry', event.target.value)} placeholder="e.g. 1.2345" />
            </FormField>
            <FormField label="Exit" required hint="Actual price at which the trade was closed.">
              <Input inputMode="decimal" value={values.exit} onChange={(event) => update('exit', event.target.value)} placeholder="e.g. 1.2345" />
            </FormField>
            <FormField label="P&L" required hint="Profit or loss from the trade.">
              <Input inputMode="decimal" value={values.pnl} onChange={(event) => update('pnl', event.target.value)} placeholder="e.g. 50" />
            </FormField>
            <FormField label="Duration (min)" hint="Auto-calculated from opened and closed time.">
              <Input value={values.duration} disabled placeholder="Auto-calculated" />
            </FormField>
          </FormSection>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strategy details · AM Trades</CardTitle>
        </CardHeader>
        <CardBody className="space-y-6">
          <FormSection title="1 · Daily framework" description="Record the daily context that frames the trade idea.">
            <DraftSelect field="relevantSwing" label="Relevant swing engaged" value={values.relevantSwing} onChange={(value) => update('relevantSwing', value)} />
            <DraftSelect field="swingReaction" label="Reaction at the swing" value={values.swingReaction} onChange={(value) => update('swingReaction', value)} />
            <FormField label="Daily bias">
              <Segmented<string> value={values.dailyBias} onChange={(value) => update('dailyBias', value)} options={OPTIONS.dailyBias.map((value) => ({ value, label: value }))} fullWidth />
            </FormField>
            <FormField label="Planned invalidation level" hint="Price level that would invalidate the trade idea.">
              <Input inputMode="decimal" value={values.invalidation} onChange={(event) => update('invalidation', event.target.value)} placeholder="Enter price" />
            </FormField>
          </FormSection>
          <FormSection title="2 · Daily profile confirmation" description="Choose the profile that confirmed or conflicted with the daily framework.">
            <DraftSelect field="dailyProfile" label="Daily profile" value={values.dailyProfile} onChange={(value) => update('dailyProfile', value)} />
            <DraftSelect field="profileDirection" label="Profile direction" value={values.profileDirection} onChange={(value) => update('profileDirection', value)} />
            <DraftSelect field="profileAlignment" label="Alignment with daily bias" value={values.profileAlignment} onChange={(value) => update('profileAlignment', value)} />
          </FormSection>
          <FormSection title="3 · Entry model" description="Capture the timeframe pairing and entry signature used.">
            <DraftSelect field="fractalPair" label="Fractal timeframe pair" value={values.fractalPair} onChange={(value) => update('fractalPair', value)} />
            <DraftSelect field="entrySignature" label="Entry signature" value={values.entrySignature} onChange={(value) => update('entrySignature', value)} />
          </FormSection>
          <FormSection title="4 · Management & review">
            <DraftSelect field="management" label="Management approach" value={values.management} onChange={(value) => update('management', value)} />
            <DraftSelect field="pyramid" label="Added a continuation / pyramid entry?" value={values.pyramid} onChange={(value) => update('pyramid', value)} />
            <DraftSelect field="followedModel" label="Followed the model?" value={values.followedModel} onChange={(value) => update('followedModel', value)} />
            <FormField label="Review notes" className="sm:col-span-2">
              <textarea
                value={values.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder="What did you execute well, or where did you deviate?"
                className="min-h-24 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-focus/40"
              />
            </FormField>
          </FormSection>
        </CardBody>
      </Card>
    </div>
  );
}
