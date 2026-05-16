'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  token: string;
  submissionType: 'initial' | 'revision_1' | 'revision_2' | 'post_final';
  isApproval?: boolean;
};

const PAGE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'about', label: 'About' },
  { value: 'services', label: 'Services' },
  { value: 'portfolio', label: 'Portfolio / Gallery' },
  { value: 'contact', label: 'Contact' },
  { value: 'other', label: 'Other' },
];

export default function IntakeForm({ token, submissionType, isApproval }: Props) {
  const [pagesType, setPagesType] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function togglePage(val: string) {
    setSelectedPages(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
  }

  async function handleSubmit(approved: boolean) {
    if (!formRef.current) return;
    setLoading(true);
    setError('');

    const fd = new FormData(formRef.current);
    fd.set('token', token);
    fd.set('submission_type', submissionType);
    fd.set('approved', String(approved));

    // pages_list handled from state
    fd.delete('pages_list');
    if (pagesType === 'multi') {
      selectedPages.forEach(p => fd.append('pages_list', p));
    }

    const res = await fetch('/api/portal/intake', { method: 'POST', body: fd });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Submission failed. Please try again.');
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  if (isApproval) {
    return (
      <div className="intake-approval">
        <p style={{ color: 'var(--p-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          If everything looks good and you have no further changes, click below.
          Otherwise, fill in the form to describe what you'd like adjusted.
        </p>
        <form ref={formRef}>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="portal-label">Changes requested (optional)</label>
            <textarea name="additional_notes" placeholder="Describe any changes you'd like…" style={{ minHeight: 100 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-portal-primary"
              onClick={() => handleSubmit(true)}
              disabled={loading}
            >
              {loading ? 'Submitting…' : submissionType === 'post_final' ? 'Approve Final ✓' : 'Looks Good →'}
            </button>
            <button
              type="button"
              className="btn-portal-ghost"
              onClick={() => handleSubmit(false)}
              disabled={loading}
            >
              {loading ? 'Submitting…' : 'Submit Changes'}
            </button>
          </div>
          {error && <p style={{ color: 'var(--p-gold)', marginTop: 12, fontSize: 13 }}>{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <form ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Pages */}
      <div className="portal-card">
        <h3 className="intake-section-title">Website Structure</h3>
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
            <label className="portal-label">Tagline (optional)</label>
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
        </div>
      </div>

      {/* Style */}
      <div className="portal-card">
        <h3 className="intake-section-title">Style & Vibe</h3>
        <div>
          <label className="portal-label">Colors, mood, websites you like</label>
          <textarea name="style_notes" placeholder="e.g. Clean and modern, dark theme. Love the look of example.com…" style={{ minHeight: 80 }} />
        </div>
      </div>

      {/* Bio */}
      <div className="portal-card">
        <h3 className="intake-section-title">About You (optional)</h3>
        <div>
          <label className="portal-label">Bio / About section text</label>
          <textarea name="bio" placeholder="Paste or write your bio here…" style={{ minHeight: 80 }} />
        </div>
      </div>

      {/* Social Links */}
      <div className="portal-card">
        <h3 className="intake-section-title">Social Links (optional)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="url" name="social_facebook" placeholder="Facebook URL" />
          <input type="url" name="social_instagram" placeholder="Instagram URL" />
          <input type="url" name="social_linkedin" placeholder="LinkedIn URL" />
          <input type="text" name="social_other" placeholder="Other (TikTok, YouTube, etc.)" />
        </div>
      </div>

      {/* Files */}
      <div className="portal-card">
        <h3 className="intake-section-title">Files (optional)</h3>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 10 }}>
          Upload your logo, photos, or any other assets.
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
