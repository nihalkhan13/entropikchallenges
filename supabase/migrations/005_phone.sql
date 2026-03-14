-- =============================================================
-- Migration 005: Add phone number column to profiles
-- Stores an E.164 phone number for SMS notifications via Telnyx.
-- Null means the user has not opted in to SMS.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;

-- No new RLS policy needed: the existing profiles_update_own policy
-- already allows users to update any column on their own row.
