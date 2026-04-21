# Orion

A private, verified professional network for the UVA Darden MBA community — alumni and current students only. Think LinkedIn × Fishbowl, gated to your school.

---

## What it does

- Students find alumni for coffee chats and mentorship
- Alumni post jobs, internships, and co-founder searches
- Members toggle real-time availability status (open to chats, hiring, mentorship, etc.)
- Community directory with live availability badges and role labels

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database + Auth | Supabase (PostgreSQL + Email OTP) |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| Language | TypeScript |

---

## Authentication

- **@virginia.edu emails only** — enforced on the frontend and via a database CHECK constraint
- **Email OTP** — no passwords, no OAuth
- First-time users are routed to `/onboarding`; returning users go straight to `/directory`

---

## Role System

There is **no stored role column**. Role is derived at runtime from `graduation_year`:

```typescript
function getRole(graduation_year: number): 'student' | 'alumni' {
  const now = new Date();
  const graduationDate = new Date(`${graduation_year}-05-01`); // Darden graduates in May
  return now < graduationDate ? 'student' : 'alumni';
}
```

This means role automatically transitions from student → alumni on May 1st of their graduation year, with no manual intervention.

---

## Pages

| Route | Description |
|---|---|
| `/` | Login — email OTP entry with @virginia.edu validation |
| `/onboarding` | 3-step profile setup for new users |
| `/directory` | Member directory with availability badges and role labels |
| `/directory/[id]` | Individual profile with chat request modal |
| `/profile` | Current user's profile and real-time availability toggles |
| `/opportunities` | Job, internship, and co-founder postings with filter tabs |
| `/opportunities/new` | Post an opportunity (alumni-gated for jobs/internships) |
| `/feed` | Community feed *(planned)* |
| `/messages` | Direct messaging *(planned)* |
| `/admin` | School admin dashboard *(planned)* |

---

## Database Schema

### `profiles`
Core user profile. No `role` column — derived from `graduation_year`.

| Column | Type | Notes |
|---|---|---|
| id | uuid | FK → auth.users |
| email | text | must end in @virginia.edu |
| full_name | text | required |
| graduation_year | integer | required — drives role derivation |
| program | text | MBA, EMBA, etc. |
| current_role | text | alumni only |
| current_company | text | alumni only |
| industry | text | alumni only |
| location | text | |
| linkedin_url | text | optional |
| bio | text | optional, 200 char max |
| is_verified | boolean | default true |

### `availability_status`
Toggleable statuses — separate from profile, can change any time.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK → profiles |
| type | text | `coffee_chats`, `cofounder`, `hiring`, `mentorship` |
| is_active | boolean | |
| expires_at | timestamptz | optional auto-deactivate |
| note | text | optional e.g. "Available Tues/Thurs" |

One row per (user, type). Active if `is_active = true AND (expires_at IS NULL OR expires_at > now())`.

`hiring` is alumni-only.

### `opportunities`

| Column | Type | Notes |
|---|---|---|
| posted_by | uuid | FK → profiles |
| type | text | `job`, `internship`, `contract`, `cofounder` |
| title | text | |
| company | text | |
| description | text | |
| is_active | boolean | default true |

Students can only post `cofounder`. Alumni can post all types.

### `chat_requests`

| Column | Type | Notes |
|---|---|---|
| from_user_id | uuid | |
| to_user_id | uuid | |
| message | text | |
| status | text | `pending`, `accepted`, `declined` |

### `opportunity_applications`
Unique constraint on `(opportunity_id, applicant_id)` — duplicate applications are handled gracefully (PostgreSQL error 23505 treated as idempotent success).

---

## Onboarding Flow

1. **Step 1** — Full name, program, graduation year (required for everyone)
2. **Step 2** — Current role, company, industry, location (alumni only — students skip this)
3. **Step 3** — LinkedIn URL and bio (optional for everyone)

No availability options during onboarding — those are set via real-time toggles on `/profile`.

---

## Local Setup

**Prerequisites:** Node.js 18+, a Supabase project

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and fill in your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_DEV_MODE=false   # set true to bypass @virginia.edu check locally
   ```

3. Run migrations in the Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_availability_status.sql`

4. Start the dev server:
   ```bash
   npm run dev
   ```

---

## Build Status

- [x] Auth — email OTP, @virginia.edu enforcement
- [x] Onboarding — 3-step, role derived from graduation year
- [x] Directory — live availability badges, Student/Alumni labels
- [x] Profile — real-time availability toggles with expiry + notes
- [x] Profile detail — chat request modal
- [x] Opportunities board — filter tabs, inline expand, express interest
- [x] Post opportunity — alumni gate for jobs/internships
- [ ] Coffee chat request flow
- [ ] Community feed
- [ ] Direct messaging
- [ ] Admin dashboard

---

## Project Context

Orion is a v1 pilot for UVA Darden only. It is a B2B SaaS product sold to the school as a community tool. Scope is intentionally tight — no public profiles, no resume upload, no video calls, no native mobile app.
