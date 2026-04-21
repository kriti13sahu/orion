# Orion — Project Context for Claude Code

## What We're Building
Orion is a private, verified professional network exclusively for the UVA MBA community (alumni + current students). Think LinkedIn × Fishbowl — but gated to your school only.

Core use cases:
- Students finding alumni for coffee chats
- Alumni posting jobs or co-founder searches
- Hiring managers finding candidates from their trusted network
- Community feed for professional discussion and opportunities

---

## Tech Stack
- **Frontend + Backend:** Next.js 14 (App Router)
- **Database + Auth + Storage:** Supabase
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Email:** Supabase built-in email (for OTP)

---

## Authentication Rules — CRITICAL
- **Only @virginia.edu email addresses are allowed.** No exceptions.
- Auth method is **email OTP only** (no passwords, no Google OAuth).
- The @virginia.edu check must happen in **two places**:
  1. On the frontend before calling Supabase (show error if not virginia.edu)
  2. As a server-side check / Supabase auth hook
- Error message to show non-UVA emails: *"This platform is only available to the UVA community. Please use your @virginia.edu email."*
- Never send an OTP to a non-virginia.edu email under any circumstance.

### First-time registration flow:
1. User enters @virginia.edu email
2. Frontend validates domain → calls Supabase OTP
3. User enters 6-digit OTP → verified
4. Check if user has a row in `profiles` table
5. If no profile → redirect to `/onboarding`
6. If profile exists → redirect to `/directory`

---

## Role Logic — CRITICAL

### There is NO stored `role` column. Role is always derived from `graduation_year`.

```typescript
function getRole(graduation_year: number): 'student' | 'alumni' {
  const now = new Date();
  const graduationDate = new Date(`${graduation_year}-05-01`); // Darden graduates in May
  return now < graduationDate ? 'student' : 'alumni';
}
```

- If today is **before May 1st of their graduation year** → they are a **student**
- If today is **on or after May 1st of their graduation year** → they are an **alumni**
- This is computed at runtime everywhere — never stored, never manually changed
- Every user provides `graduation_year` during onboarding — it's a required field for both students and alumni

### Role-based field visibility:
| Field | Student | Alumni |
|---|---|---|
| current_role | hidden | shown |
| current_company | hidden | shown |
| industry | hidden | shown |

### Role-based permissions:
| Action | Student | Alumni |
|---|---|---|
| Post job / internship | No | Yes |
| Post co-founder search | Yes | Yes |
| Request coffee chat | Yes | Yes |
| Apply to opportunities | Yes | Yes |
| Hiring availability status | No | Yes |

---

## Database Schema

### profiles
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK to auth.users |
| email | text | must end in @virginia.edu |
| full_name | text | required |
| graduation_year | integer | required — used to derive role at runtime |
| program | text | e.g. "MBA", "EMBA" |
| current_role | text | alumni only — null for students |
| current_company | text | alumni only — null for students |
| industry | text | alumni only — null for students |
| location | text | City, State |
| linkedin_url | text | optional |
| bio | text | optional short bio |
| is_verified | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

No `role` column. No `open_to` column. Both handled separately (see below).

---

### availability_status
"Open to" options are NOT profile properties — they are toggleable statuses that can change over time (like LinkedIn's "Open to Work"). Each user has one row per availability type.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| type | text | one of: coffee_chats, cofounder, hiring, mentorship |
| is_active | boolean | default false |
| expires_at | timestamptz | optional auto-deactivate |
| note | text | optional e.g. "Available Tues/Thurs" |
| updated_at | timestamptz | |

**Unique constraint:** (user_id, type) — one row per type per user.

**Active status rule:** is_active = true AND (expires_at IS NULL OR expires_at > now())

**Type availability by role:**
- coffee_chats — both students and alumni
- cofounder — both students and alumni
- mentorship — both students and alumni
- hiring — alumni only

**UX:** On the profile page, show availability as real-time toggles, not onboarding checkboxes. In the directory, badges only show for currently active statuses.

---

### chat_requests
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| from_user_id | uuid | FK to profiles |
| to_user_id | uuid | FK to profiles |
| message | text | |
| status | text | "pending", "accepted", "declined" |
| created_at | timestamptz | |

---

### opportunities
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| posted_by | uuid | FK to profiles |
| type | text | "job", "cofounder", "internship", "contract" |
| title | text | |
| company | text | |
| description | text | |
| is_active | boolean | default true |
| created_at | timestamptz | |

Only alumni can post type = "job" or "internship". Enforce on frontend AND server-side.

---

### opportunity_applications
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| opportunity_id | uuid | FK to opportunities |
| applicant_id | uuid | FK to profiles |
| note | text | optional message |
| created_at | timestamptz | |

Unique constraint: (opportunity_id, applicant_id)

---

## Onboarding Flow

Single flow for everyone — no upfront role selection (role is derived from graduation year automatically).

**Step 1 — Basic info:**
- Full name (required)
- Graduation year (required — label: "Your Darden graduation year")
- Program (required: MBA / EMBA / other)

**Step 2 — Professional info (conditional on derived role):**
- If alumni (graduation_year May 1 has passed): show current_role, current_company, industry, location
- If student: skip these fields entirely

**Step 3 — Profile extras:**
- LinkedIn URL (optional)
- Bio (optional, max 200 chars)
- Do NOT ask about availability here — that is set via profile toggles after onboarding

---

## Availability Toggles (Profile Page)

On /profile, show a dedicated "Availability" section with toggles:
- Open to coffee chats [toggle] [optional expiry] [optional note]
- Open to co-founder search [toggle] [optional expiry] [optional note]
- Open to mentorship [toggle] [optional expiry] [optional note]
- Open to hiring [toggle] [optional expiry] [optional note] — alumni only

Toggling updates is_active in availability_status immediately (no submit button).
Changes save in real time.

---

## Pages & Routes

| Route | Description |
|---|---|
| / | Landing / login page with email OTP input |
| /onboarding | Profile setup for first-time users (3 steps) |
| /directory | Alumni + student directory with filters |
| /directory/[id] | Individual profile page |
| /opportunities | Jobs, co-founder, and project postings |
| /opportunities/new | Post a new opportunity (alumni only for jobs) |
| /feed | Community feed (posts, discussion) |
| /messages | Direct messages inbox |
| /messages/[id] | Individual conversation |
| /profile | Current user's own profile + availability toggles |
| /admin | School admin dashboard (role-gated) |

---

## Key UI Rules
- Clean, professional design — not playful. This is a professional network.
- Mobile-responsive for all pages.
- Every page behind auth except / (login page).
- Show user's own profile avatar + name in the top nav when logged in.
- Availability badges in the directory only show for currently active statuses.
- Never show the "Post a job" button to students. Show "Post co-founder search" to everyone.
- When displaying a profile, derive and show "Student" or "Alumni" label from graduation_year at render time.

---

## Current Build Status
> Update this section as features are completed.

- [x] Project setup (Next.js + Supabase + Tailwind)
- [x] Auth (email OTP, virginia.edu restriction)
- [x] Onboarding — 3-step flow, graduation_year-based role, no open_to
- [x] Availability status migration (002_availability_status.sql — run in Supabase SQL Editor)
- [x] Directory badges reflect live availability_status only
- [x] Directory shows Student/Alumni label derived from graduation_year
- [x] Availability status profile toggles (on /profile page)
- [x] Profile detail page (/directory/[id]) with chat request modal
- [ ] Coffee chat request flow
- [x] Opportunities board (/opportunities) with filter tabs + inline expand
- [x] Post an opportunity (/opportunities/new, alumni gate for job/internship/contract)
- [x] Express interest / apply (deduplication via unique constraint + 23505 handling)
- [ ] Community feed
- [ ] Direct messaging
- [ ] Admin dashboard

---

## Schema Migration Needed
Run this SQL in the Supabase SQL Editor before the next build session:

```sql
-- 1. Remove open_to from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS open_to;

-- 2. Remove role from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 3. Create availability_status table
CREATE TABLE IF NOT EXISTS public.availability_status (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('coffee_chats', 'cofounder', 'hiring', 'mentorship')),
  is_active   boolean     NOT NULL DEFAULT false,
  expires_at  timestamptz,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

-- 4. Auto-update updated_at
CREATE TRIGGER availability_status_updated_at
  BEFORE UPDATE ON public.availability_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS policies
ALTER TABLE public.availability_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability: authenticated read"
  ON public.availability_status FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "availability: owner insert"
  ON public.availability_status FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "availability: owner update"
  ON public.availability_status FOR UPDATE
  TO authenticated USING (user_id = auth.uid());
```

---

## Business Context (for decision-making)
- v1 is a pilot with UVA Darden only. Keep scope tight.
- Primary goal: get to 60% alumni activation rate.
- School pays $30-60K/year SaaS license — this is B2B, school is the buyer.
- Do not build: public profiles, resume upload, video calls, native mobile apps.
- Ship fast and iterate. Prefer simple working solutions over clever complex ones.
- When in doubt, ask before building — don't assume scope.
