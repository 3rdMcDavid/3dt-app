'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectType } from '@/lib/types';

type Props = {
  token: string;
  submissionType: 'initial' | 'revision_1' | 'revision_2' | 'post_final';
  projectType?: ProjectType;
  isApproval?: boolean;
  extraRevision?: boolean;
};

const PAGE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'about', label: 'About' },
  { value: 'services', label: 'Services' },
  { value: 'portfolio', label: 'Portfolio / Gallery' },
  { value: 'contact', label: 'Contact' },
  { value: 'other', label: 'Other' },
];

const SPECIAL_FEATURE_OPTIONS = [
  { value: 'gallery', label: 'Photo gallery' },
  { value: 'faq', label: 'FAQ section' },
  { value: 'booking', label: 'Booking / scheduling link' },
  { value: 'newsletter', label: 'Newsletter signup' },
  { value: 'map', label: 'Map / directions' },
  { value: 'video', label: 'Video embed' },
  { value: 'testimonials_section', label: 'Testimonials / reviews section' },
  { value: 'blog', label: 'Blog / news section' },
];

export default function IntakeForm({ token, submissionType, projectType = 'website', isApproval, extraRevision }: Props) {
  const isTool = projectType === 'tool' || projectType === 'website_tool';

  const [pagesType, setPagesType] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extraRevisionConfirmed, setExtraRevisionConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function togglePage(val: string) {
    setSelectedPages(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
  }

  function toggleFeature(val: string) {
    setSelectedFeatures(f => f.includes(val) ? f.filter(x => x !== val) : [...f, val]);
  }

  async function handleSubmit(approved: boolean) {
    if (!formRef.current) return;
    setLoading(true);
    setError('');

    const fd = new FormData(formRef.current);
    fd.set('token', token);
    fd.set('submission_type', submissionType);
    fd.set('approved', String(approved));

    fd.delete('pages_list');
    if (pagesType === 'multi') {
      selectedPages.forEach(p => fd.append('pages_list', p));
    }

    fd.delete('special_features');
    selectedFeatures.forEach(f => fd.append('special_features', f));

    const res = await fetch('/api/portal/intake', { method: 'POST', body: fd });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Submission failed. Please try again.');
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  // ── Approval / revision form (shared by both types) ─────────────────────────
  if (isApproval) {
    const isEarlyApproval = submissionType === 'revision_1' || submissionType === 'revision_2';
    const revisionLabel = isTool ? 'build' : 'site';
    return (
      <div className="intake-approval">
        <p style={{ color: 'var(--p-muted)', marginBottom: isEarlyApproval ? 8 : 20, lineHeight: 1.6 }}>
          If everything looks good and you have no further changes, click below.
          Otherwise, describe what you'd like adjusted.
        </p>
        {isEarlyApproval && (
          <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 20, lineHeight: 1.6, background: 'var(--p-card)', border: '1px solid var(--p-border)', borderRadius: 8, padding: '10px 14px' }}>
            Approving will skip your remaining revision round and send your final invoice.
          </p>
        )}

        {extraRevision && !extraRevisionConfirmed && (
          <div style={{
            background: '#451a03',
            border: '1px solid #92400e',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 20,
          }}>
            <p style={{ fontWeight: 600, marginBottom: 6, color: '#fbbf24' }}>
              ⚠️ You've used your included revision rounds
            </p>
            <p style={{ fontSize: 13, color: '#fde68a', lineHeight: 1.6, marginBottom: 14 }}>
              Your contract includes 2 revision rounds, which have been used. Any additional
              changes beyond this point may be subject to an extra fee. Please reach out to
              David before submitting to confirm any additional charges.
            </p>
            <button
              type="button"
              onClick={() => setExtraRevisionConfirmed(true)}
              style={{
                background: '#92400e',
                color: '#fde68a',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              I understand — proceed anyway
            </button>
          </div>
        )}

        <form ref={formRef}>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="portal-label">
              {isTool ? 'What needs to change?' : 'Changes requested'}{' '}
              <span style={{ fontWeight: 400, color: 'var(--p-muted)' }}>(optional)</span>
            </label>
            <textarea
              name="additional_notes"
              placeholder={
                isTool
                  ? `Describe what's not working as expected, or any new requirements…`
                  : `Describe any changes you'd like…`
              }
              style={{ minHeight: 100 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-portal-primary"
              onClick={() => handleSubmit(true)}
              disabled={loading}
            >
              {loading ? 'Submitting…' : submissionType === 'post_final' ? 'Approve Final ✓' : isEarlyApproval ? `Approve & Skip Remaining Revisions ✓` : 'Looks Good →'}
            </button>
            {(!extraRevision || extraRevisionConfirmed) && (
              <button
                type="button"
                className="btn-portal-ghost"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                {loading ? 'Submitting…' : `Submit Changes`}
              </button>
            )}
          </div>
          {error && <p style={{ color: 'var(--p-gold)', marginTop: 12, fontSize: 13 }}>{error}</p>}
        </form>
      </div>
    );
  }

  // ── Tool intake form ────────────────────────────────────────────────────────
  if (isTool) {
    return (
      <form ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6, padding: '12px 16px', background: 'var(--p-card)', border: '1px solid var(--p-border)', borderRadius: 10 }}>
          The more detail you share about your situation, the better David can build something that
          actually solves your problem — not just a generic tool. Nothing here is a one-size-fits-all.
        </p>

        {/* Pain point / problem */}
        <div className="portal-card">
          <h3 className="intake-section-title">The Problem *</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="portal-label">What problem is this tool solving for you?</label>
              <textarea
                name="tool_problem"
                required
                placeholder="e.g. I spend 2 hours every Monday manually pulling job orders from email into a spreadsheet, then texting each crew lead their assignments. It's error-prone and I always miss someone."
                style={{ minHeight: 110 }}
              />
            </div>
            <div>
              <label className="portal-label">What does your current process look like?</label>
              <textarea
                name="tool_current_workflow"
                placeholder="Walk me through how you handle this today, step by step — even if it's messy. What apps, spreadsheets, or manual steps are involved?"
                style={{ minHeight: 90 }}
              />
            </div>
          </div>
        </div>

        {/* What it should do */}
        <div className="portal-card">
          <h3 className="intake-section-title">What the Tool Should Do</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="portal-label">Describe the ideal outcome</label>
              <textarea
                name="tool_desired_output"
                placeholder="e.g. Every Monday morning at 8am, the tool should pull the week's jobs from my Google Sheet, group them by crew, and automatically text each crew lead their schedule for the week."
                style={{ minHeight: 100 }}
              />
            </div>
            <div>
              <label className="portal-label">How will you know it's working?</label>
              <textarea
                name="tool_success_criteria"
                placeholder="e.g. Crew leads are getting their schedules without me doing anything. No missed assignments. I can see a log of what was sent."
                style={{ minHeight: 80 }}
              />
            </div>
          </div>
        </div>

        {/* Systems */}
        <div className="portal-card">
          <h3 className="intake-section-title">Apps & Systems to Connect</h3>
          <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            List any apps, platforms, or data sources the tool needs to work with.
            Don't worry if you're not sure — we'll figure it out together.
          </p>
          <textarea
            name="tool_systems"
            placeholder="e.g. Google Sheets (job list lives here), Twilio or just regular SMS, QuickBooks for invoicing, Gmail for sending confirmations…"
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Files */}
        <div className="portal-card">
          <h3 className="intake-section-title">Files</h3>
          <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 10, lineHeight: 1.6 }}>
            Upload any spreadsheets, screenshots, or examples that show your current process.
            A picture of the mess is worth a thousand words.
          </p>
          <input type="file" name="files" multiple accept="image/*,.pdf,.doc,.docx,.zip,.xlsx,.csv" />
        </div>

        {/* Anything else */}
        <div className="portal-card">
          <h3 className="intake-section-title">Anything else?</h3>
          <textarea
            name="additional_notes"
            placeholder="Other context, questions, things David should know, timeline constraints…"
            style={{ minHeight: 70 }}
          />
        </div>

        {error && <p style={{ color: 'var(--p-gold)', fontSize: 13 }}>{error}</p>}

        <button
          type="button"
          className="btn-portal-primary"
          onClick={() => handleSubmit(false)}
          disabled={loading}
        >
          {loading ? 'Submitting…' : 'Submit Intake →'}
        </button>
      </form>
    );
  }

  // ── Website intake form ─────────────────────────────────────────────────────
  return (
    <form ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6, padding: '12px 16px', background: 'var(--p-card)', border: '1px solid var(--p-border)', borderRadius: 10 }}>
        Fill in what you can — the more detail you share, the better we can tailor your site.
        Nothing is required except the page structure at the top.
      </p>

      {/* Website Structure */}
      <div className="portal-card">
        <h3 className="intake-section-title">Website Structure *</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { value: 'single', label: '1-Page site with tabs / sections' },
            { value: 'multi', label: 'Multi-page site' },
          ].map(opt => (
            <label key={opt.value} className="intake-radio-label">
              <input
                type="radio"
                name="pages_type"
                value={opt.value}
                checked={pagesType === opt.value}
                onChange={() => setPagesType(opt.value)}
              />
              {opt.label}
            </label>
          ))}
          {pagesType === 'multi' && (
            <div className="intake-checkbox-group">
              {PAGE_OPTIONS.map(opt => (
                <label key={opt.value} className="intake-check-label">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(opt.value)}
                    onChange={() => togglePage(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Business Info */}
      <div className="portal-card">
        <h3 className="intake-section-title">Your Business</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="portal-label">Business Name</label>
            <input type="text" name="business_name" placeholder="e.g. Sunrise Studio" />
          </div>
          <div>
            <label className="portal-label">Tagline</label>
            <input type="text" name="tagline" placeholder="A short phrase that sums you up" />
          </div>
          <div>
            <label className="portal-label">Business Description</label>
            <textarea name="description" placeholder="What do you do? Who do you serve?" style={{ minHeight: 80 }} />
          </div>
          <div>
            <label className="portal-label">Target Audience</label>
            <input type="text" name="target_audience" placeholder="Who are your ideal customers?" />
          </div>
          <div>
            <label className="portal-label">Services / Offerings</label>
            <textarea name="services_offered" placeholder="List the services or products you want featured on the site…" style={{ minHeight: 80 }} />
          </div>
          <div>
            <label className="portal-label">Main Goal of the Site</label>
            <input type="text" name="primary_cta" placeholder="e.g. Get people to call me, book a consultation, buy online…" />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="portal-card">
        <h3 className="intake-section-title">Contact Info to Display</h3>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          What contact info should appear on your site? Leave blank anything you'd rather not show.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="portal-label">Phone Number</label>
            <input type="tel" name="phone" placeholder="(555) 000-0000" />
          </div>
          <div>
            <label className="portal-label">Business Email</label>
            <input type="email" name="business_email" placeholder="hello@yourbusiness.com" />
          </div>
          <div>
            <label className="portal-label">Business Address</label>
            <input type="text" name="business_address" placeholder="123 Main St, City, State (or 'Remote / Online only')" />
          </div>
        </div>
      </div>

      {/* Domain & Existing Site */}
      <div className="portal-card">
        <h3 className="intake-section-title">Domain & Existing Website</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="portal-label">Do you have a domain name?</label>
            <input type="text" name="existing_domain" placeholder="e.g. yourbusiness.com — or leave blank if you need one" />
          </div>
          <div>
            <label className="portal-label">Existing Website URL</label>
            <input type="url" name="existing_website" placeholder="https://your-current-site.com (if you have one)" />
          </div>
        </div>
      </div>

      {/* Style */}
      <div className="portal-card">
        <h3 className="intake-section-title">Style & Vibe</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="portal-label">Colors, mood, sites you like</label>
            <textarea name="style_notes" placeholder="e.g. Clean and modern, dark theme. Love the look of example.com…" style={{ minHeight: 80 }} />
          </div>
          <div>
            <label className="portal-label">Brand Colors</label>
            <input type="text" name="brand_colors" placeholder="e.g. Navy blue (#1B2E4B) and gold — or 'no preference'" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="portal-card">
        <h3 className="intake-section-title">Content & Assets</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="portal-label">Content Readiness</label>
            <select name="content_ready" defaultValue="">
              <option value="" disabled>Select one…</option>
              <option value="yes">Yes — I have photos and written copy ready</option>
              <option value="partial">Partial — I have some but not everything</option>
              <option value="no">No — I need help with placeholders / content direction</option>
            </select>
          </div>
          <div>
            <label className="portal-label">Bio / About Section</label>
            <textarea name="bio" placeholder="Paste or write your bio here — or describe yourself and we'll help write it…" style={{ minHeight: 80 }} />
          </div>
          <div>
            <label className="portal-label">Testimonials / Reviews</label>
            <textarea name="testimonials" placeholder="Paste any client quotes or reviews you'd like featured…" style={{ minHeight: 80 }} />
          </div>
        </div>
      </div>

      {/* Special Features */}
      <div className="portal-card">
        <h3 className="intake-section-title">Special Features</h3>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 14 }}>
          Check anything you'd like included. These may affect scope — David will confirm before building.
        </p>
        <div className="intake-checkbox-group">
          {SPECIAL_FEATURE_OPTIONS.map(opt => (
            <label key={opt.value} className="intake-check-label">
              <input
                type="checkbox"
                checked={selectedFeatures.includes(opt.value)}
                onChange={() => toggleFeature(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="portal-card">
        <h3 className="intake-section-title">Social Links</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="url" name="social_facebook" placeholder="Facebook URL" />
          <input type="url" name="social_instagram" placeholder="Instagram URL" />
          <input type="url" name="social_linkedin" placeholder="LinkedIn URL" />
          <input type="text" name="social_other" placeholder="Other (TikTok, YouTube, etc.)" />
        </div>
      </div>

      {/* Files */}
      <div className="portal-card">
        <h3 className="intake-section-title">Files</h3>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 10, lineHeight: 1.6 }}>
          Upload your logo, photos, brand assets, or any inspiration images. You can also send these via email later.
        </p>
        <input type="file" name="files" multiple accept="image/*,.pdf,.doc,.docx,.zip" />
      </div>

      {/* Notes */}
      <div className="portal-card">
        <h3 className="intake-section-title">Anything else?</h3>
        <textarea name="additional_notes" placeholder="Any other details, questions, or requests…" style={{ minHeight: 70 }} />
      </div>

      {error && <p style={{ color: 'var(--p-gold)', fontSize: 13 }}>{error}</p>}

      <button
        type="button"
        className="btn-portal-primary"
        onClick={() => handleSubmit(false)}
        disabled={loading || !pagesType}
      >
        {loading ? 'Submitting…' : 'Submit Intake →'}
      </button>
    </form>
  );
}
