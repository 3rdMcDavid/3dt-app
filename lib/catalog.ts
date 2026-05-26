// Single source of truth for the scope-of-work catalog.
// Used by ScopeSelector (new-client onboarding) and AddScopeItems (post-creation add-ons).
// Update prices here — both UIs pick them up automatically.

export const SCOPE_CATALOG = [
  { label: 'Website', items: [
    { name: 'Website Development', price: 1500 },
  ]},
  { label: 'Lead & Sales', items: [
    { name: 'Instant Lead Follow-Up', price: 750 },
    { name: 'Quote Generator', price: 900 },
    { name: 'Referral Tracker', price: 900 },
  ]},
  { label: 'Client & Projects', items: [
    { name: 'Client Onboarding Portal', price: 1350 },
    { name: 'Appointment Booking System', price: 900 },
    { name: 'Project Status Page', price: 750 },
    { name: 'Retainer Dashboard', price: 900 },
    { name: 'Feedback & Testimonial Collector', price: 675 },
  ]},
  { label: 'Operations', items: [
    { name: 'Job / Order Tracker', price: 1350 },
    { name: 'Document Generator', price: 1125 },
    { name: 'Expense Logger', price: 750 },
    { name: 'Inventory Tracker', price: 900 },
  ]},
  { label: 'Local Business', items: [
    { name: 'Review Request Automation', price: 675 },
    { name: 'Loyalty Points Tracker', price: 1000 },
    { name: 'Event Registration System', price: 900 },
    { name: 'Service Catalog Manager', price: 750 },
    { name: 'Before / After Showcase', price: 750 },
  ]},
] as const;

export const CARE_PLAN_MONTHLY = 150;
