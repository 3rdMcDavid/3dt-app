-- Inquiry follow-up sequence (dogfooding step 3).
-- auto_follow_up: per-lead kill switch; follow_up_touches_sent: 0..2;
-- last_follow_up_at: when the most recent touch went out.
alter table leads
  add column auto_follow_up          boolean     not null default true,
  add column follow_up_touches_sent  int         not null default 0,
  add column last_follow_up_at       timestamptz;
