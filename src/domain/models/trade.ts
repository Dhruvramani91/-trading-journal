/**
 * Canonical trade model — template-agnostic.
 *
 * The shape of `templateData` is described by a `TemplateDefinition`.
 * For the default template it carries the strategy fields
 * (Daily Candle, Daily Profile, H4 Candle, H4 Profile, M90/H1/M30,
 * Entry, Alignment, Module, Confluence, Quarter Open, Driver, Mistakes).
 *
 * Phase 2 establishes this contract; later phases read these fields through
 * the template API so introducing a new strategy does not require code changes
 * in analytics, tables, or the dashboard.
 */

export type TradeDirection = 'long' | 'short';

export type TradeResult = 'win' | 'loss' | 'be';

export type TemplateFieldType =
  | 'enum'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date';

/**
 * A single configurable field on a trade template.
 * `enum` fields additionally carry an `options` list of allowed values.
 */
export interface TemplateField {
  /** Stable key, used as the property name on `Trade.templateData`. */
  key: string;

  /** Human label, used in tables / forms / breakdowns. */
  label: string;

  /** Group name — used to cluster fields in the trade form and statistics page. */
  group: string;

  type: TemplateFieldType;

  /** Allowed values for `enum` fields. */
  options?: readonly string[];

  /** Show in the default trade table columns. */
  inTable?: boolean;

  /** Show on the statistics page as a breakdown. */
  inStats?: boolean;

  /** Optional icon hint (Lucide icon name). */
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

  /** Template id, e.g. "default-ict-2026". */
  templateId: string;

  /** Trade number — sequential within a journal. */
  number?: number;

  /** Trade open timestamp, ISO 8601. */
  openedAt: string;

  /** Trade close timestamp, ISO 8601. */
  closedAt?: string;

  /** Instrument / pair — e.g. "ES", "NQ", "YM", "RB", "CL". */
  instrument: string;

  direction: TradeDirection;

  result: TradeResult;

  /**
   * Actual entry price entered manually by the user.
   *
   * This value is stored for record keeping.
   * It is NOT used to calculate P&L.
   */
  entry?: number;

  /**
   * Actual exit price entered manually by the user.
   *
   * This value is stored for record keeping.
   * It is NOT used to calculate P&L.
   */
  exit?: number;

  /**
   * Actual monetary P&L entered manually by the user.
   *
   * P&L is NOT calculated from entry, exit, position size,
   * instrument, direction, or any other trade field.
   */
  pnl?: number;

  /**
   * Realized R multiple.
   *
   * This remains part of the existing trade model for now.
   */
  r: number;

  /**
   * Planned R:R at entry (optional, used for "Avg R:R").
   *
   * Only trades carrying a finite value contribute to avgRR —
   * missing / invalid values are skipped, never treated as 0.
   */
  plannedRR?: number;

  /** Trade duration in minutes. */
  durationMin: number;

  /**
   * Strategy-specific data.
   *
   * The default template's fields are defined in
   * `domain/templates/default.ts`.
   */
  templateData: Record<
    string,
    string | number | boolean | null | undefined
  >;

  /** Free-form notes / lessons. */
  notes?: string;

  /** Trade screenshots — one per timeframe. */
  photos?: {
    htf?: string;
    itf?: string;
    ltf?: string;
  };

  /** Audit timestamps. */
  createdAt: string;

  updatedAt: string;
}

/**
 * Keys that are always present on a trade regardless of template.
 */
export type TradeCoreKey =
  | 'openedAt'
  | 'closedAt'
  | 'instrument'
  | 'direction'
  | 'result'
  | 'entry'
  | 'exit'
  | 'pnl'
  | 'r'
  | 'plannedRR'
  | 'durationMin'
  | 'notes';