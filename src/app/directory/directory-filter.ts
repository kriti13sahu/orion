import type { Role } from "@/lib/role";
import type { AvailabilityType } from "@/types/database";

export type AvailabilityRow = {
  type: AvailabilityType;
  is_active: boolean;
  expires_at: string | null;
};

export type DirectoryProfile = {
  id: string;
  full_name: string;
  current_role: string | null;
  current_company: string | null;
  industry: string | null;
  location: string | null;
  graduation_year: number | null;
  program: string | null;
  availability_status: AvailabilityRow[] | null;
};

export type RoleFilter = "all" | Role;

export type DirectoryMember = {
  profile: DirectoryProfile;
  role: Role | null;
  activeStatuses: AvailabilityRow[];
};

export function getActiveStatuses(rows: AvailabilityRow[] | null, now = new Date()): AvailabilityRow[] {
  return (rows ?? []).filter(
    (row) => row.is_active && (!row.expires_at || new Date(row.expires_at) > now)
  );
}

export function filterDirectoryMembers(
  members: DirectoryMember[],
  query: string,
  roleFilter: RoleFilter,
  openTo: AvailabilityType | "any"
): DirectoryMember[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return members.filter(({ profile, role, activeStatuses }) => {
    if (roleFilter !== "all" && role !== roleFilter) return false;
    if (openTo !== "any" && !activeStatuses.some((status) => status.type === openTo)) return false;
    if (terms.length === 0) return true;

    // Professional fields are alumni-only; stale student fields must not match.
    const searchable = [
      profile.full_name,
      profile.location,
      ...(role === "alumni" ? [profile.current_role, profile.current_company, profile.industry] : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}
