// Single source of truth for the scope-of-work catalog.
// Used by ScopeSelector (new-client onboarding) and AddScopeItems (post-creation add-ons).
// Update prices here — both UIs pick them up automatically.

export const SCOPE_CATALOG = [
  { label: 'Website', items: [
    { name: 'Website Development', price: 750 },
  ]},
  { label: 'Lead & Sales', items: [
    { name: 'Instant Lead Follow-Up', price: 450 },
    { name: 'Quote Generator', price: 600 },
    { name: 'Referral Tracker', price: 675 },
  ]},
  { label: 'Client & Projects', items: [
    { name: 'Client Onboarding Portal', price: 900 },
    { name: 'Appointment Booking System', price: 600 },
    { name: 'Project Status Page', price: 525 },
    { name: 'Retainer Dashboard', price: 600 },
    { name: 'Feedback & Testimonial Collector', price: 450 },
  ]},
  { label: 'Operations', items: [
    { name: 'Job / Order Tracker', price: 900 },
    { name: 'Document Generator', price: 750 },
    { name: 'Expense Logger', price: 525 },
    { name: 'Inventory Tracker', price: 600 },
  ]},
  { label: 'Local Business', items: [
    { name: 'Review Request Automation', price: 450 },
    { name: 'Loyalty Points Tracker', price: 675 },
    { name: 'Event Registration System', price: 600 },
    { name: 'Service Catalog Manager', price: 525 },
    { name: 'Before / After Showcase', price: 525 },
  ]},
] as const;

export const CARE_PLAN_MONTHLY = 115;
