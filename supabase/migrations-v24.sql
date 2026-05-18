-- ============================================================
-- Migration v24: T-017b drop legacy `users.has_debt` column
--
-- T-017 (2026-05-18) moved has_debt to INVOICE level. Per CLAUDE.md
-- D14: "Cảnh báo theo PHÒNG, không cảnh báo theo cá nhân". The user-level
-- column became unused after T-017 — only invoices.has_debt is queried.
--
-- T-017b cleanup: drop the legacy column to reduce schema confusion.
--
-- Pre-condition: no code references users.has_debt (audit hôm nay 2026-05-19
-- confirm only invoices.has_debt còn dùng, users.has_debt unused 1 ngày stable).
-- ============================================================

ALTER TABLE users DROP COLUMN IF EXISTS has_debt;
