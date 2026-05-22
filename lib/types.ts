export type ClientStatus = 'lead' | 'active' | 'completed';
export type ProjectType = 'website' | 'tool' | 'website_tool';
export type ProjectStage = 'discovery' | 'proposal' | 'contract' | 'build' | 'review' | 'handoff_pending' | 'launched';
export type RevisionStage =
  | 'awaiting_intake'
  | 'intake_received'
  | 'revision_1_open'
  | 'revision_1_received'
  | 'revision_2_open'
  | 'revision_2_received'
  | 'post_final_open'
  | 'extra_revision_requested'
  | 'complete';
export type IntakeSubmissionType = 'initial' | 'revision_1' | 'revision_2' | 'post_final';
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type InvoiceType = 'deposit' | 'final';
export type InvoiceStatus = 'unpaid' | 'paid';

export interface Client {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: ClientStatus;
  notes: string | null;
}

export interface Project {
  id: string;
  created_at: string;
  client_id: string;
  title: string;
  project_type: ProjectType;
  stage: ProjectStage;
  notes: string | null;
  revision_stage: RevisionStage;
  draft_url: string | null;
  tool_draft_url: string | null;
  revision_components: 'website' | 'tool' | 'both';
  client_vercel_email: string | null;
  client_github_username: string | null;
  launch_notes: string | null;
  launch_submitted_at: string | null;
  launch_confirmed_at: string | null;
}

export interface IntakeSubmission {
  id: string;
  project_id: string;
  created_at: string;
  type: IntakeSubmissionType;
  approved: boolean;
  // website fields
  pages_type: string | null;
  pages_list: string[] | null;
  business_name: string | null;
  tagline: string | null;
  description: string | null;
  target_audience: string | null;
  style_notes: string | null;
  bio: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_other: string | null;
  // tool fields
  tool_problem: string | null;
  tool_current_workflow: string | null;
  tool_desired_output: string | null;
  tool_systems: string | null;
  tool_success_criteria: string | null;
  additional_notes: string | null;
}

export interface IntakeFile {
  id: string;
  intake_submission_id: string;
  project_id: string;
  created_at: string;
  file_name: string;
  file_url: string;
}

export interface Proposal {
  id: string;
  created_at: string;
  project_id: string;
  deliverables: string;
  price: number;
  status: ProposalStatus;
}

export interface Contract {
  id: string;
  created_at: string;
  project_id: string;
  content: string;
  sign_token: string;
  sign_email_sent_at: string | null;
  signed_at: string | null;
  signature_name: string | null;
  signature_ip: string | null;
}

export interface ContractTemplate {
  id: string;
  content: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  created_at: string;
  project_id: string;
  amount: number;
  type: InvoiceType;
  stripe_payment_id: string | null;
  stripe_payment_url: string | null;
  status: InvoiceStatus;
  due_date: string | null;
}

export interface Document {
  id: string;
  created_at: string;
  project_id: string;
  file_url: string;
  file_name: string;
  type: string;
}

export interface PortalSession {
  id: string;
  created_at: string;
  project_id: string;
  token: string;
  sent_at: string | null;
  expires_at: string;
}

// Joined types for convenience
export interface ProjectWithClient extends Project {
  clients: Client;
}

export interface PortalSessionWithProject extends PortalSession {
  projects: ProjectWithClient;
}

// Supabase Database type (mirrors schema)
export type Database = {
  public: {
    Tables: {
      clients:         { Row: Client;        Insert: Omit<Client,        'id' | 'created_at'>;           Update: Partial<Omit<Client,        'id' | 'created_at'>>; Relationships: [] };
      projects:        { Row: Project;       Insert: Omit<Project,       'id' | 'created_at'>;           Update: Partial<Omit<Project,       'id' | 'created_at'>>; Relationships: [] };
      proposals:       { Row: Proposal;      Insert: Omit<Proposal,      'id' | 'created_at'>;           Update: Partial<Omit<Proposal,      'id' | 'created_at'>>; Relationships: [] };
      contracts:       { Row: Contract;      Insert: Omit<Contract,      'id' | 'created_at'>;           Update: Partial<Omit<Contract,      'id' | 'created_at'>>; Relationships: [] };
      invoices:        { Row: Invoice;       Insert: Omit<Invoice,       'id' | 'created_at'>;           Update: Partial<Omit<Invoice,       'id' | 'created_at'>>; Relationships: [] };
      documents:       { Row: Document;      Insert: Omit<Document,      'id' | 'created_at'>;           Update: Partial<Omit<Document,      'id' | 'created_at'>>; Relationships: [] };
      portal_sessions: { Row: PortalSession; Insert: Omit<PortalSession, 'id' | 'created_at' | 'token'>; Update: Partial<Omit<PortalSession, 'id' | 'created_at'>>; Relationships: [] };
    };
    Views:     { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums:     { [_ in never]: never };
  };
};
