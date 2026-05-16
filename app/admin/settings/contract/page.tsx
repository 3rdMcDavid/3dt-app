export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { saveContractTemplateAction } from './actions';

export default async function ContractTemplatePage() {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from('contract_templates')
    .select('content')
    .single();

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Contract Template</span>
      </div>
      <div className="admin-content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Default Contract</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              This contract is automatically sent to every new client for signing before their deposit invoice is issued.
              Use these variables anywhere in the text — they'll be replaced automatically:
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {['{{client_name}}', '{{project_title}}', '{{date}}'].map(v => (
                <code key={v} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', fontSize: 12 }}>
                  {v}
                </code>
              ))}
            </div>
            <form action={saveContractTemplateAction}>
              <div className="form-group">
                <textarea
                  name="content"
                  defaultValue={template?.content ?? ''}
                  required
                  placeholder="Paste your contract here…"
                  style={{ minHeight: 480, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
