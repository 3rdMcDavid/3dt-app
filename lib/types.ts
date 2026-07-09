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
export type InvoiceType = 'deposit' | 'final' | 'addon';
export type InvoiceStatus = 'unpaid' | 'paid';
export type LeadPipelineState = 'new' | 'qualified' | 'approved' | 'contacted' | 'follow_up' | 'interested' | 'won' | 'lost' | 'rejected';
export type LeadSource = 'scout' | 'inquiry' | 'referral' | 'manual';
export type SuggestedChannel = 'phone' | 'facebook_dm' | 'email';

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

// Supabase Database type (mirrors schema) — uses inline types so TypeScript 5.9
// correctly evaluates the extends GenericSchema constraint in supabase-js.
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          phone: string | null
          company: string | null
          status: 'lead' | 'active' | 'completed'
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          phone?: string | null
          company?: string | null
          status?: 'lead' | 'active' | 'completed'
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          status?: 'lead' | 'active' | 'completed'
          notes?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          created_at: string
          client_id: string
          title: string
          project_type: 'website' | 'tool' | 'website_tool'
          stage: 'discovery' | 'proposal' | 'contract' | 'build' | 'review' | 'handoff_pending' | 'launched'
          notes: string | null
          revision_stage: 'awaiting_intake' | 'intake_received' | 'revision_1_open' | 'revision_1_received' | 'revision_2_open' | 'revision_2_received' | 'post_final_open' | 'extra_revision_requested' | 'complete'
          draft_url: string | null
          tool_draft_url: string | null
          revision_components: 'website' | 'tool' | 'both'
          client_vercel_email: string | null
          client_github_username: string | null
          launch_notes: string | null
          launch_submitted_at: string | null
          launch_confirmed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          title: string
          project_type: 'website' | 'tool' | 'website_tool'
          stage?: 'discovery' | 'proposal' | 'contract' | 'build' | 'review' | 'handoff_pending' | 'launched'
          notes?: string | null
          revision_stage?: 'awaiting_intake' | 'intake_received' | 'revision_1_open' | 'revision_1_received' | 'revision_2_open' | 'revision_2_received' | 'post_final_open' | 'extra_revision_requested' | 'complete'
          draft_url?: string | null
          tool_draft_url?: string | null
          revision_components?: 'website' | 'tool' | 'both'
          client_vercel_email?: string | null
          client_github_username?: string | null
          launch_notes?: string | null
          launch_submitted_at?: string | null
          launch_confirmed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          title?: string
          project_type?: 'website' | 'tool' | 'website_tool'
          stage?: 'discovery' | 'proposal' | 'contract' | 'build' | 'review' | 'handoff_pending' | 'launched'
          notes?: string | null
          revision_stage?: 'awaiting_intake' | 'intake_received' | 'revision_1_open' | 'revision_1_received' | 'revision_2_open' | 'revision_2_received' | 'post_final_open' | 'extra_revision_requested' | 'complete'
          draft_url?: string | null
          tool_draft_url?: string | null
          revision_components?: 'website' | 'tool' | 'both'
          client_vercel_email?: string | null
          client_github_username?: string | null
          launch_notes?: string | null
          launch_submitted_at?: string | null
          launch_confirmed_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          created_at: string
          project_id: string
          deliverables: string
          price: number
          status: 'draft' | 'sent' | 'accepted' | 'declined'
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          deliverables: string
          price: number
          status?: 'draft' | 'sent' | 'accepted' | 'declined'
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          deliverables?: string
          price?: number
          status?: 'draft' | 'sent' | 'accepted' | 'declined'
        }
        Relationships: []
      }
      contracts: {
        Row: {
          id: string
          created_at: string
          project_id: string
          content: string
          sign_token: string
          sign_email_sent_at: string | null
          signed_at: string | null
          signature_name: string | null
          signature_ip: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          content: string
          sign_token: string
          sign_email_sent_at?: string | null
          signed_at?: string | null
          signature_name?: string | null
          signature_ip?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          content?: string
          sign_token?: string
          sign_email_sent_at?: string | null
          signed_at?: string | null
          signature_name?: string | null
          signature_ip?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          project_id: string
          amount: number
          type: 'deposit' | 'final' | 'addon'
          stripe_payment_id: string | null
          stripe_payment_url: string | null
          status: 'unpaid' | 'paid'
          due_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          amount: number
          type: 'deposit' | 'final' | 'addon'
          stripe_payment_id?: string | null
          stripe_payment_url?: string | null
          status?: 'unpaid' | 'paid'
          due_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          amount?: number
          type?: 'deposit' | 'final' | 'addon'
          stripe_payment_id?: string | null
          stripe_payment_url?: string | null
          status?: 'unpaid' | 'paid'
          due_date?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          created_at: string
          project_id: string
          file_url: string
          file_name: string
          type: string
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          file_url: string
          file_name: string
          type: string
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          file_url?: string
          file_name?: string
          type?: string
        }
        Relationships: []
      }
      portal_sessions: {
        Row: {
          id: string
          created_at: string
          project_id: string
          token: string
          sent_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          token?: string
          sent_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          token?: string
          sent_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      intake_submissions: {
        Row: {
          id: string
          project_id: string
          created_at: string
          type: string
          approved: boolean
          pages_type: string | null
          pages_list: string[] | null
          business_name: string | null
          tagline: string | null
          description: string | null
          target_audience: string | null
          style_notes: string | null
          bio: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_other: string | null
          tool_problem: string | null
          tool_current_workflow: string | null
          tool_desired_output: string | null
          tool_systems: string | null
          tool_success_criteria: string | null
          additional_notes: string | null
          services_offered: string | null
          primary_cta: string | null
          phone: string | null
          business_email: string | null
          business_address: string | null
          existing_domain: string | null
          existing_website: string | null
          brand_colors: string | null
          content_ready: string | null
          testimonials: string | null
          special_features: string[] | null
        }
        Insert: {
          id?: string
          project_id: string
          created_at?: string
          type: string
          approved?: boolean
          pages_type?: string | null
          pages_list?: string[] | null
          business_name?: string | null
          tagline?: string | null
          description?: string | null
          target_audience?: string | null
          style_notes?: string | null
          bio?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_other?: string | null
          tool_problem?: string | null
          tool_current_workflow?: string | null
          tool_desired_output?: string | null
          tool_systems?: string | null
          tool_success_criteria?: string | null
          additional_notes?: string | null
          services_offered?: string | null
          primary_cta?: string | null
          phone?: string | null
          business_email?: string | null
          business_address?: string | null
          existing_domain?: string | null
          existing_website?: string | null
          brand_colors?: string | null
          content_ready?: string | null
          testimonials?: string | null
          special_features?: string[] | null
        }
        Update: {
          id?: string
          project_id?: string
          created_at?: string
          type?: string
          approved?: boolean
          pages_type?: string | null
          pages_list?: string[] | null
          business_name?: string | null
          tagline?: string | null
          description?: string | null
          target_audience?: string | null
          style_notes?: string | null
          bio?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_other?: string | null
          tool_problem?: string | null
          tool_current_workflow?: string | null
          tool_desired_output?: string | null
          tool_systems?: string | null
          tool_success_criteria?: string | null
          additional_notes?: string | null
          services_offered?: string | null
          primary_cta?: string | null
          phone?: string | null
          business_email?: string | null
          business_address?: string | null
          existing_domain?: string | null
          existing_website?: string | null
          brand_colors?: string | null
          content_ready?: string | null
          testimonials?: string | null
          special_features?: string[] | null
        }
        Relationships: []
      }
      intake_files: {
        Row: {
          id: string
          intake_submission_id: string
          project_id: string
          created_at: string
          file_name: string
          file_url: string
        }
        Insert: {
          id?: string
          intake_submission_id: string
          project_id: string
          created_at?: string
          file_name: string
          file_url: string
        }
        Update: {
          id?: string
          intake_submission_id?: string
          project_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          business_name: string
          business_type: string | null
          city: string | null
          pipeline_state: 'new' | 'qualified' | 'approved' | 'contacted' | 'follow_up' | 'interested' | 'won' | 'lost' | 'rejected'
          source: 'scout' | 'inquiry' | 'referral' | 'manual'
          tier: 'A' | 'B' | null
          fit_score: number | null
          fit_reason: string | null
          score_breakdown: Record<string, number | string> | null
          observation: string | null
          owner_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          website: string | null
          rating: number | null
          review_count: number | null
          google_place_id: string | null
          google_maps_url: string | null
          search_query: string | null
          suggested_channel: 'phone' | 'facebook_dm' | 'email' | null
          inquiry_notes: string | null
          outreach_draft: string | null
          outreach_approved: boolean | null
          outreach_sent_at: string | null
          notes: string | null
          tags: string[] | null
          call_attempted_at: string | null
          call_outcome: string | null
          call_notes: string | null
          follow_up_date: string | null
          interested_at: string | null
          auto_follow_up: boolean
          follow_up_touches_sent: number
          last_follow_up_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          business_name: string
          business_type?: string | null
          city?: string | null
          pipeline_state?: 'new' | 'qualified' | 'approved' | 'contacted' | 'follow_up' | 'interested' | 'won' | 'lost' | 'rejected'
          source?: 'scout' | 'inquiry' | 'referral' | 'manual'
          tier?: 'A' | 'B' | null
          fit_score?: number | null
          fit_reason?: string | null
          score_breakdown?: Record<string, number | string> | null
          observation?: string | null
          owner_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          rating?: number | null
          review_count?: number | null
          google_place_id?: string | null
          google_maps_url?: string | null
          search_query?: string | null
          suggested_channel?: 'phone' | 'facebook_dm' | 'email' | null
          inquiry_notes?: string | null
          outreach_draft?: string | null
          outreach_approved?: boolean | null
          outreach_sent_at?: string | null
          notes?: string | null
          tags?: string[] | null
          call_attempted_at?: string | null
          call_outcome?: string | null
          call_notes?: string | null
          follow_up_date?: string | null
          interested_at?: string | null
          auto_follow_up?: boolean
          follow_up_touches_sent?: number
          last_follow_up_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          business_name?: string
          business_type?: string | null
          city?: string | null
          pipeline_state?: 'new' | 'qualified' | 'approved' | 'contacted' | 'follow_up' | 'interested' | 'won' | 'lost' | 'rejected'
          source?: 'scout' | 'inquiry' | 'referral' | 'manual'
          tier?: 'A' | 'B' | null
          fit_score?: number | null
          fit_reason?: string | null
          score_breakdown?: Record<string, number | string> | null
          observation?: string | null
          owner_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          rating?: number | null
          review_count?: number | null
          google_place_id?: string | null
          google_maps_url?: string | null
          search_query?: string | null
          suggested_channel?: 'phone' | 'facebook_dm' | 'email' | null
          inquiry_notes?: string | null
          outreach_draft?: string | null
          outreach_approved?: boolean | null
          outreach_sent_at?: string | null
          notes?: string | null
          tags?: string[] | null
          call_attempted_at?: string | null
          call_outcome?: string | null
          call_notes?: string | null
          follow_up_date?: string | null
          interested_at?: string | null
          auto_follow_up?: boolean
          follow_up_touches_sent?: number
          last_follow_up_at?: string | null
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          id: string
          started_at: string
          completed_at: string | null
          status: 'requested' | 'running' | 'complete' | 'error'
          requested_count: number | null
          leads_found: number
          leads_qualified: number
          leads_disqualified: number | null
          triggered_by: string
        }
        Insert: {
          id?: string
          started_at?: string
          completed_at?: string | null
          status?: 'requested' | 'running' | 'complete' | 'error'
          requested_count?: number | null
          leads_found?: number
          leads_qualified?: number
          leads_disqualified?: number | null
          triggered_by?: string
        }
        Update: {
          id?: string
          started_at?: string
          completed_at?: string | null
          status?: 'requested' | 'running' | 'complete' | 'error'
          requested_count?: number | null
          leads_found?: number
          leads_qualified?: number
          leads_disqualified?: number | null
          triggered_by?: string
        }
        Relationships: []
      }
    }
    Views:     { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums:     { [_ in never]: never }
  }
}
