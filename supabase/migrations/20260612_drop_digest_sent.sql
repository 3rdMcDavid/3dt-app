-- digest_sent is dead: the weekly digest (scout v2) selects the current top 15
-- qualified leads instead of tracking sent state. No code reads or writes it.
-- Safe to run any time, independent of app deploys.

alter table leads drop column if exists digest_sent;
