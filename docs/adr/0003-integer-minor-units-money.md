# ADR 0003: Financial Storage Using Integer Minor Units

## Status

Accepted

## Context

Invoice Studio is designed for Kenyan freelancers and SMEs where invoices, discounts, 16% VAT, and M-Pesa settlements must balance exactly to the cent. Standard JavaScript floating-point numbers (`IEEE 754`) introduce well-known precision errors (such as `0.1 + 0.2 === 0.30000000000000004`), which can cause fractional penny discrepancies in tax reports, balance due reconciliation, and payment matching.

## Decision

All financial figures across the database layer, IPC payload contracts, and business calculation logic are represented strictly as integers in minor currency units (cents). For example:

- KES `1,500.50` is stored and transmitted as integer `150050`.
- Line item subtotals, VAT amounts, and discounts are calculated and rounded deterministically with integer minor units at each step.
- Major unit decimals are only created at the presentation boundary when rendering localized strings (e.g. via `Intl.NumberFormat`).

## Consequences

- **Positive**: Eliminates floating-point accumulation drift across line items and multi-payment receipts.
- **Positive**: Exact integer comparisons in SQLite (`INTEGER` column types) and Zod validation (`z.number().int()`).
- **Positive**: Direct alignment with Safaricom M-Pesa API amounts and payment reconciliation.
- **Negative**: Form inputs must convert string decimals to minor units on change or submit, and format back to decimals for display.
