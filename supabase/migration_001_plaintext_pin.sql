-- Switches PIN storage from a hash to a plain, readable column.
-- Run once in the Supabase SQL editor.

alter table players add column if not exists pin text;
alter table teachers add column if not exists pin text;

alter table players drop column if exists pin_hash;
alter table teachers drop column if exists pin_hash;
