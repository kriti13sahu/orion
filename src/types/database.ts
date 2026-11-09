export type AvailabilityType = "coffee_chats" | "cofounder" | "hiring" | "mentorship";

export type OpportunityType = "job" | "cofounder" | "internship" | "contract";

export type ChatRequestStatus = "pending" | "accepted" | "declined";

export type Profile = {
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
};

export type AvailabilityStatus = {
  id: string;
  user_id: string;
  type: AvailabilityType;
  is_active: boolean;
  expires_at: string | null;
  note: string | null;
  updated_at: string;
};

export type ChatRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  status: ChatRequestStatus;
  created_at: string;
};

export type Opportunity = {
  id: string;
  posted_by: string;
  type: OpportunityType;
  title: string;
  company: string;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type OpportunityApplication = {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  note: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      profiles: {
        Relationships: [];
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      availability_status: {
        Relationships: [{
          foreignKeyName: "availability_status_user_id_fkey";
          columns: ["user_id"];
          isOneToOne: false;
          referencedRelation: "profiles";
          referencedColumns: ["id"];
        }];
        Row: AvailabilityStatus;
        Insert: Omit<AvailabilityStatus, "id" | "updated_at">;
        Update: Partial<Pick<AvailabilityStatus, "is_active" | "expires_at" | "note">>;
      };
      chat_requests: {
        Relationships: [];
        Row: ChatRequest;
        Insert: Omit<ChatRequest, "id" | "created_at">;
        Update: Partial<Pick<ChatRequest, "status">>;
      };
      opportunities: {
        Relationships: [{
          foreignKeyName: "opportunities_posted_by_fkey";
          columns: ["posted_by"];
          isOneToOne: false;
          referencedRelation: "profiles";
          referencedColumns: ["id"];
        }];
        Row: Opportunity;
        Insert: Omit<Opportunity, "id" | "created_at">;
        Update: Partial<Omit<Opportunity, "id" | "created_at">>;
      };
      opportunity_applications: {
        Relationships: [];
        Row: OpportunityApplication;
        Insert: Omit<OpportunityApplication, "id" | "created_at">;
        Update: never;
      };
    };
  };
};
