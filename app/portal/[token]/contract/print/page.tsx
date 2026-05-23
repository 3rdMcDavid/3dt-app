import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';

export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) notFound();

  const [{ data: project }, { data: contract }] = await Promise.all([
    supabase.from('projects').select('title, clients(name)').eq('id', session.project_id).single(),
    supabase.from('contracts').select('*').eq('project_id', session.project_id).single(),
  ]);

  if (!project || !contract) notFound();
  if (!contract.signed_at) notFound();

  const clientName = (project as any).clients?.name ?? '';
  const signedDate = contract.signed_at
    ? new Date(contract.signed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Chicago',
      })
    : null;

  return (
    <>
      <style>{`
        body { background: #fff !important; color: #111 !important; }
        .print-page {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 13px;
          line-height: 1.8;
          color: #111;
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 60px;
        }
        .print-header {
          text-align: center;
          margin-bottom: 36px;
          padding-bottom: 20px;
          border-bottom: 2px solid #111;
        }
        .print-brand { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .print-doc-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .print-doc-meta { font-size: 12px; color: #555; }
        .print-body p { margin-bottom: 10px; }
        .sig-block {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #ccc;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .sig-line { border-bottom: 1px solid #111; min-height: 30px; font-style: italic; font-size: 15px; padding-bottom: 4px; margin-bottom: 6px; }
        .sig-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1B4D2E;
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: -apple-system, sans-serif;
          z-index: 100;
        }
        @media print {
          .print-btn { display: none !important; }
          .print-page { padding: 0; }
        }
      `}</style>

      <button className="print-btn" id="print-btn">Download / Print PDF</button>

      <div className="print-page">
        <div className="print-header">
          <div className="print-brand">3rd David's Technology</div>
          <div className="print-doc-title">Service Agreement</div>
          <div className="print-doc-meta">
            {(project as any).title} &nbsp;·&nbsp; {clientName}
          </div>
        </div>

        <div className="print-body">
          {(contract.content ?? '').split('\n').map((line: string, i: number) =>
            line.trim() ? <p key={i}>{line}</p> : <br key={i} />
          )}
        </div>

        <div className="sig-block">
          <div>
            <div className="sig-line">{contract.signature_name ?? ''}</div>
            <div className="sig-label">Client Signature</div>
          </div>
          <div>
            <div className="sig-line">{signedDate ?? 'Not yet signed'}</div>
            <div className="sig-label">Date Signed</div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click',()=>window.print());` }} />
    </>
  );
}
