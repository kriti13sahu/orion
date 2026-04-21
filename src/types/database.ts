export type AvailabilityType = "coffee_chats" | "cofounder" | "hiring" | "mentorship";

export type OpportunityType = "job" | "cofounder" | "internship" | "contract";

export type ChatRequestStatus = "pending" | "accepted" | "declined";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  graduation_year: number | null;
  program: string | null;
  current_role: string | null;
  current_company: string | null;
  industry: string | null;
  location: string | null;
  linkedin_url: string | null;
  bio: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityStatus {
  id: string;
  user_id: string;
  type: AvailabilityType;
  is_active: boolean;
  expires_at: string | null;
  note: string | null;
  updated_at: string;
}

export interface ChatRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  status: ChatRequestStatus;
  created_at: string;
}

export interface Opportunity {
  id: string;
  posted_by: string;
  type: OpportunityType;
  title: string;
  company: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  note: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      availability_status: {
        Row: AvailabilityStatus;
        Insert: Omit<AvailabilityStatus, "id" | "updated_at">;
        Update: Partial<Pick<AvailabilityStatus, "is_active" | "expires_at" | "note">>;
      };
      chat_requests: {
        Row: ChatRequest;
        Insert: Omit<ChatRequest, "id" | "created_at">;
        Update: Partial<Pick<ChatRequest, "status">>;
      };
      opportunities: {
        Row: Opportunity;
        Insert: Omit<Opportunity, "id" | "created_at">;
        Update: Partial<Omit<Opportunity, "id" | "created_at">>;
      };
      opportunity_applications: {
        Row: OpportunityApplication;
        Insert: Omit<OpportunityApplication, "id" | "created_at">;
        Update: never;
      };
    };
  };
};
