export type ClientStatus = 'lead' | 'active' | 'completed';
export type ProjectStage = 'discovery' | 'proposal' | 'contract' | 'build' | 'review' | 'launched';
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type InvoiceType = 'deposit' | 'final';
export type InvoiceStatus = 'unpaid' | 'paid';

export interface Client {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
}

export interface Project {
  id: string;
  created_at: string;
  client_id: string;
  title: string;
  stage: ProjectStage;
  notes: string | null;
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
  signed_at: string | null;
  signature_name: string | null;
  signature_ip: string | null;
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
      clients: { Row: Client; Insert: Omit<Client, 'id' | 'created_at'>; Update: Partial<Omit<Client, 'id' | 'created_at'>> };
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at'>; Update: Partial<Omit<Project, 'id' | 'created_at'>> };
      proposals: { Row: Proposal; Insert: Omit<Proposal, 'id' | 'created_at'>; Update: Partial<Omit<Proposal, 'id' | 'created_at'>> };
      contracts: { Row: Contract; Insert: Omit<Contract, 'id' | 'created_at'>; Update: Partial<Omit<Contract, 'id' | 'created_at'>> };
      invoices: { Row: Invoice; Insert: Omit<Invoice, 'id' | 'created_at'>; Update: Partial<Omit<Invoice, 'id' | 'created_at'>> };
      documents: { Row: Document; Insert: Omit<Document, 'id' | 'created_at'>; Update: Partial<Omit<Document, 'id' | 'created_at'>> };
      portal_sessions: { Row: PortalSession; Insert: Omit<PortalSession, 'id' | 'created_at' | 'token'>; Update: Partial<Omit<PortalSession, 'id' | 'created_at'>> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
