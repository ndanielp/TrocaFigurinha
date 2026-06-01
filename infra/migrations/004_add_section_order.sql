-- Migration 004: Add section_order column to stickers
-- Feature: 006-album-order-match-cost
-- Allows deterministic album ordering matching the official 2026 planilha
-- (grupo A→L, times na ordem oficial, FWC first, Coca-Cola last)

ALTER TABLE stickers ADD COLUMN IF NOT EXISTS section_order INTEGER NOT NULL DEFAULT 0;
