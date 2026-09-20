/**
 * Canonical trade model — template-agnostic.
 *
 * The shape of `templateData` is described by a `TemplateDefinition`.
 * For the default template it carries the strategy fields
 * (Daily Candle, Daily Profile, H4 Candle, H4 Profile, M90/H1/M30,
 *  Entry, Alignment, Module, Confluence, Quarter Open, Driver, Mistakes).
 *
 * Phase 2 establishes this contract; later phases read these fields through
 * the template API so introducing a new strategy does not require code changes
 * in analytics, tables, or the dashboard.
 */

export type TradeDirection = 'long' | 'short';

export type TradeResult = 'win' | 'loss' | 'be';

export type TemplateFieldType = 'enum' | 'text' | 'number' | 'boolean' | 'date';

/**
 * A single configurable field on a trade template.
 * `enum` fields additionally carry an `options` list of allowed values.
 */
export interface TemplateField {
  /** stable key, used as the property name on `Trade.templateData` */
  key: string;
  /** human label, used in tables / forms / breakdowns */
  label: string;
  /** group name — used to cluster fields in the trade form and on the statistics page */
  group: string;
  type: TemplateFieldType;
  /** allowed values for `enum` fields */
  options?: readonly string[];
  /** show in the default trade table columns */
  inTable?: boolean;
  /** show on the statistics page as a breakdown */
  inStats?: boolean;
  /** optional icon hint (lucide icon name, looked up at render time) */
  icon?: string;
}

/** A complete strategy template — defines every configurable field on a trade. */
export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  fields: readonly TemplateField[];
}

/** A single trade as stored in the repository. */
export interface Trade {
  id: string;
  /** template id, e.g. "default-ict-2026" */
  templateId: string;

  /** Trade number — sequential within a journal. Optional; auto-assigned if omitted. */
  number?: number;

  /** Trade open timestamp, ISO 8601 (local TZ, normalized to UTC ISO). */
  openedAt: string;
  /** Trade close timestamp, ISO 8601. Optional — open trades are allowed. */
  closedAt?: string;

  /** Instrument / pair — e.g. "ES", "NQ", "YM", "RB", "CL" */
  instrument: string;
  direction: TradeDirection;
  result: TradeResult;

  /** Realized R multiple. 1R = 1 unit of risk. Wins are positive, losses negative, BE = 0. */
  r: number;
  /** Planned R:R at entry (optional, used for "Avg R:R"). */
  plannedRR?: number;
  /** Trade duration in minutes. */
  durationMin: number;

  /**
   * Strategy-specific bag. The default template's keys are listed in
   * `domain/templates/default.ts`. Analytics reads these through helpers in
   * `domain/templates/resolve.ts`, never by hard-coded field names.
   */
  templateData: Record<string, string | number | boolean | null | undefined>;

  /** Free-form notes / lessons. */
  notes?: string;

  /** Trade screenshots — base64 data URLs, one per timeframe. */
  photos?: {
    htf?: string;
    itf?: string;
    ltf?: string;
  };

  /** Audit timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Convenience: keys that are always present on a trade regardless of template. */
export type TradeCoreKey =
  | 'openedAt'
  | 'closedAt'
  | 'instrument'
  | 'direction'
  | 'result'
  | 'r'
  | 'plannedRR'
  | 'durationMin'
  | 'notes';
