# Orion — Full Feature Specification
**Version 3.0 · Updated with profile photos + all decisions to date**
*For review before final build handoff to Claude Code*

---

## Build Status Summary

### Already built and working ✅
- Project setup (Next.js 14 + Supabase + Tailwind + Vercel)
- Auth — email OTP, @virginia.edu restriction, dev mode bypass
- Onboarding — 3-step flow, graduation_year-based role derivation, no open_to
- Profile page — read-only card + real-time availability toggles with expiry + notes
- Directory — basic version (to be redesigned per this spec)
- Directory detail page (/directory/[id]) — full profile + chat request modal
- Opportunities board — filter tabs, inline expand, express interest, deduplication
- Post opportunity — alumni gate for job/internship/contract

### To be built or redesigned 🔧
- Profile photos — Supabase Storage, upload flow, everywhere avatars appear (new)
- Feed — default landing page, LinkedIn-style with likes + comments (new)
- Directory — redesign: search-first + discovery sections (redesign)
- My postings + close opportunity (new)
- Chat request notifications (new)
- Direct messaging (new)
- Admin dashboard — lightweight v1 (new)
- Polish pass — empty states, skeletons, edit profile, mobile (new)

---

## Navigation & Default Page

### Current behavior
After login → redirects to `/directory`

### New behavior
After login → redirects to `/feed`

### Nav bar order (left to right)
**Feed · Directory · Opportunities · Messages**

Bell icon (notifications) on the right side of nav, next to user avatar/photo.

---

## Profile Photos — New Infrastructure

### Philosophy
Real photos make the network feel human and trustworthy — especially for coffee chat requests where you're agreeing to meet someone. If no photo is uploaded, fall back to an initials circle. Every place in the app that currently shows an initials avatar must follow this rule: **photo first, initials fallback**.

### Supabase Storage setup
- Bucket name: `avatars`
- Public read (so photo URLs work without auth)
- Authenticated write (only logged-in users can upload)
- File path pattern: `avatars/[user_id].jpg` (always overwrite same path when user updates photo)

### Database change
Add one column to profiles table:
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;
```

### Upload flow
1. User clicks their avatar circle (on profile page, or nav bar)
2. File picker opens — accepts JPG, PNG, WebP, max 5MB
3. Selected image previewed in a simple crop-to-square UI
4. On confirm: upload to Supabase Storage → get public URL → update `avatar_url` on profiles
5. Photo appears everywhere immediately (no page refresh needed)

### Where photos appear (all must use photo-first, initials-fallback)
- Nav bar (top right — small circle, ~32px)
- Feed compose box (left of "What's on your mind...")
- Feed post cards (author photo)
- Directory discovery cards
- Directory search result rows
- Directory detail page (/directory/[id])
- Profile page (/profile)
- Messages — conversation list + thread
- Notifications — chat request cards
- Opportunities — "View interested" modal

### Initials fallback component
A shared `<Avatar>` component used everywhere:
- Props: `avatar_url`, `full_name`, `size` (sm/md/lg)
- If `avatar_url` is set: renders `<img>` with circular crop
- If `avatar_url` is null/empty: renders initials circle (first + last initial, colored background)
- Never show a broken image icon

### Photo upload on profile page
On /profile, the user's photo (or initials circle) shows a small camera icon overlay on hover.
Clicking it opens the file picker → crop → upload flow.
Below the avatar: "Update photo" text link as an alternative click target.

### Photo upload in onboarding
Add an optional photo upload step at the end of onboarding (Step 3 — extras):
- Heading: "Add a profile photo (optional)"
- Shows their current initials circle with a "Upload photo" button below
- Same crop → upload flow as profile page
- Clearly marked optional — "You can always add this later from your profile"
- Skip button to proceed without uploading

---

## Page 1 — Feed (default landing page)

### Purpose
The heartbeat of the community. A place for posts, advice, opportunities, and candid professional discussion. LinkedIn-style feed — private, high-trust, MBA-only.

### Layout
- Full-width centered column (max-width ~680px)
- Compose box pinned at top
- Posts in reverse chronological order below

### Compose box
- Shows current user's photo (or initials fallback) + "What's on your mind, [first name]?"
- Clicking expands to a textarea (max 500 characters)
- Live character counter (e.g. "423 / 500")
- Post button — disabled until at least 1 character
- On submit: inserts into `posts` table, new post appears at top immediately (optimistic update)
- Collapses back to single line after posting

### Post card
Each post card shows:
- Author photo (or initials fallback) — circular, ~40px
- Author name (clickable → goes to /directory/[id])
- Student / Alumni pill derived from graduation_year
- Current role + company (alumni only, shown as "PM at Google")
- Relative timestamp ("2 hours ago", "3 days ago")
- Post content (full text, no truncation)
- **Like button** — heart or thumbs up icon + count. Toggling likes/unlikes. Optimistic update.
- **Comment button** — speech bubble icon + count. Clicking expands comment section below the post.
- **Comment section** (expanded on click): shows existing comments (author photo, name, text, timestamp), text input at bottom to add a new comment, submit on Enter or button click.

### Posts SQL
```sql
CREATE TABLE IF NOT EXISTS public.posts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: authenticated read"
  ON public.posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "posts: owner insert"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "posts: owner delete"
  ON public.posts FOR DELETE TO authenticated
  USING (author_id = auth.uid());
```

### Likes SQL
```sql
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes: authenticated read"
  ON public.post_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "likes: owner insert"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes: owner delete"
  ON public.post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

### Comments SQL
```sql
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: authenticated read"
  ON public.post_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "comments: owner insert"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments: owner delete"
  ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());
```

### Empty state
"Be the first to post. Share an update, ask for advice, or let the community know what you're working on." — with a prompt that opens the compose box.

### Feed: no algorithm, no filtering in v1
Pure chronological. Simple and trustworthy.

---

## Page 2 — Directory (redesigned: search-first + discovery sections)

### Philosophy
The directory has two modes on one page:
1. **Discovery mode** (default) — for browsing when you're open to serendipity
2. **Search mode** (active) — for when you know what you're looking for

Defaults to discovery. The moment you type or click a chip → switches to search results. Clear everything → back to discovery.

---

### Default state (no search, no filters active)

**Header — minimal, centered**
- Page title: "Find someone in your network" — large, light weight, centered
- Search bar: large, centered, full width up to ~600px. Placeholder: "Search by name, role, company, industry..."
- Below search bar: horizontal chip row (scrollable on mobile):
  - Availability chips: Coffee chats · Co-founder · Mentorship · Hiring
  - Class year chips: MBA 2027 · MBA 2026 · (current student years)
  - Top industries from DB (dynamic, top 3–4)
  - Last chip: "More filters ↓" → expands full filter panel
- Clicking any chip activates that filter and switches to search results mode

---

### Discovery sections (below chip row, default state only)

Three sections stacked vertically. Each has: heading, muted subtitle, "See all →" link, horizontal scrollable row of profile cards.

**Section 1 — "Open to coffee chats"**
Subtitle: "These members are available to connect right now"
Cards: up to 8 profiles with active coffee_chats status
"See all →" activates the Coffee chats chip

**Section 2 — "Looking for co-founders"**
Subtitle: "Building something new and open to collaborators"
Cards: up to 8 profiles with active cofounder status
"See all →" activates the Co-founder chip

**Section 3 — "Your class"**
Subtitle: "Fellow MBA [year] members"
Cards: up to 8 profiles matching the logged-in user's graduation_year
"See all →" activates that graduation year chip

Hide any section with 0 results entirely.

---

### Profile card design (discovery sections)

Small, minimal, square card (~160px wide × ~200px tall):
- Profile photo OR initials circle (48px) — centered, top area
- Name — bold, 14px, centered
- Program · Grad year — muted, 12px, centered (e.g. "MBA · 2027")
- Student / Alumni pill — small, centered
- Active availability badges — up to 2, small pills, centered
- No role or company — keeps it minimal and non-hierarchical
- Hover: subtle lift shadow
- Click: goes to /directory/[id]
- Cards in a horizontal scrollable row (not a grid)

---

### Search / filter active state

Once user types or activates a chip:
- Discovery sections disappear
- Compact list results appear below the chips
- Each row: photo or initials (40px) · name (bold) · role + company (alumni only, muted) · program · grad year · location · active badges · Student/Alumni pill
- Results count: "Showing 23 members"
- Clearing search and all chips → returns to discovery mode

### Filter panel ("More filters ↓")
Expands inline below the chip row. Contains:
- Graduation year (multiselect, grouped: current students / alumni by year)
- Industry (multiselect, dynamic from DB with counts e.g. "Technology (34)")
- Company (multiselect, dynamic from DB)
- Location (multiselect, dynamic from DB)
- Program (MBA / EMBA / Other)

Active filters shown as dismissible pills in chip row. "Clear all" resets everything.

### Empty search state
"No one matches your search. Try a broader term or remove some filters."

### Mobile
- Chips: horizontal scroll
- Discovery cards: horizontal scroll rows
- Filter panel: bottom sheet
- Search results: full width rows

---

## Page 3 — Directory Detail (/directory/[id])

### Already built — additions needed
- Fix: hide `industry` field for student profiles
- Show profile photo (or initials fallback) — large, ~80px
- Show "Send message" button alongside "Request a chat" — goes to /messages and starts new conversation
- Back button → returns to directory

---

## Page 4 — Opportunities

### Already built — additions needed

**My postings section**
Below the main board, visible only to the current user:
- Shows user's active posts: title, type badge, date posted, "X people interested" count
- "Close posting" button → sets is_active = false
- "View interested" button → modal listing people who expressed interest (photo + name + profile link)
- Empty state: "You haven't posted anything yet."

---

## Page 5 — Messages

### Messages SQL
```sql
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL,
  sender_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text        NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: parties read"
  ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "messages: sender insert"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
```

### /messages layout
Two-panel on desktop (conversation list left, thread right). Single panel on mobile with back navigation.

**Conversation list (left)**
- Each row: photo or initials (40px), name, last message preview (~60 chars), relative timestamp
- Unread: bold name + blue dot
- Sorted by most recent message

**Thread view (right)**
- Scrollable message thread
- Sent: right-aligned, teal/dark background
- Received: left-aligned, gray background
- Text input at bottom, Enter or Send button
- Real-time via Supabase real-time subscription on messages table
- Mark as read (read_at = now()) when conversation opened

**New message**
- "New message" button at top of list
- Searches profiles by name → select person → starts new conversation

**Connection to chat requests**
When a chat request is accepted:
1. Generate new conversation_id
2. Insert original request message as first message in thread
3. Redirect to /messages/[conversationId]

### Empty state
"No messages yet. Start a conversation by requesting a coffee chat from someone's profile."

---

## Page 6 — Notifications

### Nav indicator
- Bell icon in nav bar (right side, next to user photo)
- Red badge with count of pending chat_requests where to_user_id = current user
- Real-time via Supabase subscription
- Disappears when count = 0

### /notifications page
**Each pending request shows:**
- Sender photo or initials (40px)
- Sender name (clickable → /directory/[id])
- Student / Alumni pill
- Role + company (alumni only)
- Message in an indented quote block
- Relative timestamp
- Accept button (teal) + Decline button (muted)

**On Accept:**
1. Update chat_request status → 'accepted'
2. Create conversation, insert original message as first message
3. Show: "Connected! Go to your messages →" inline
4. Remove from list

**On Decline:**
1. Update status → 'declined'
2. Remove from list silently

**Empty state:** "No pending requests. When someone requests a coffee chat, it'll appear here."

---

## Page 7 — Admin Dashboard (lightweight v1)

### Purpose
For the school's alumni relations VP to show ROI on the Orion contract. Metrics only — no complex member management in v1.

### SQL
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
```

To make yourself admin:
```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'your@virginia.edu';
```

### Access
Server-side gate: if is_admin = false → redirect to /feed.

### Layout
4 metric cards only (no member management table in v1):
1. **Total members** — count of all profiles
2. **Active this month** — profiles with any availability_status.updated_at in last 30 days
3. **Opportunities posted** — count of all opportunities
4. **Coffee chats requested** — count of all chat_requests

Below the cards: a simple read-only members list (name, email, role, grad year, join date). No editing, no admin toggle in v1 — do that directly in Supabase if needed.

---

## Page 8 — Profile (additions needed)

### Currently built
- Read-only profile card
- Real-time availability toggles

### Additions needed

**Profile photo**
- Show photo (or initials fallback) at top of profile card — large (~80px)
- Camera icon overlay on hover → opens file picker → crop → upload to Supabase Storage → updates avatar_url
- "Update photo" text link below avatar as alternative

**Edit profile (inline)**
Add "Edit profile" button that switches profile card to edit mode.

Editable for everyone:
- Full name
- Location
- LinkedIn URL
- Bio (max 200 chars with counter)

Editable for alumni only:
- Current role
- Current company
- Industry

Not editable: email, graduation_year, program

Save behavior: "Save changes" button → upsert to profiles → show "Saved ✓" for 2 seconds → back to read mode. "Cancel" returns to read mode without saving.

---

## Polish Pass (final session)

### Empty states
| Page | Message |
|---|---|
| Feed | "Be the first to post. Share an update or ask for advice." |
| Directory | "No members match your search. Try removing some filters." |
| Opportunities | "No opportunities yet. Be the first to post a role or co-founder search." |
| Messages | "No messages yet. Start a conversation from someone's profile." |
| Notifications | "No pending requests." |
| My postings | "You haven't posted anything yet." |

### Loading skeletons
Animated placeholder blocks on: Feed, Directory, Opportunities.

### 404 handling
/directory/[id] not found → friendly page with "This profile doesn't exist or may have been removed" + back to directory button.

### Mobile audit
- Directory: filter panel as bottom sheet
- Messages: single panel, back button to conversation list
- Feed: full width, compose box works with mobile keyboard
- Nav: hamburger on mobile, all links + profile + bell

---

## Revised Claude Code Session Plan

### Session 6 — Profile photos (infrastructure first)

**SQL to run first:**
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
```

**In Supabase dashboard:** Storage → New bucket → name: `avatars` → Public bucket: ON

Prompt:
> "Read CLAUDE.md. Add profile photo support across the entire app. 1) Create a shared Avatar component (src/components/avatar.tsx) that takes avatar_url, full_name, and size (sm=32px, md=40px, lg=80px). If avatar_url is set, render a circular img tag. If null, render an initials circle using the first letter of first and last name with a consistent background color derived from the name. 2) Replace every initials circle in the app with this Avatar component — nav bar, feed compose box, feed post cards, directory cards, directory list rows, directory detail page, profile page, messages, notifications. 3) On /profile, add a camera icon overlay on the avatar on hover. Clicking opens a file input (accepts image/*). On file select: upload to Supabase Storage bucket 'avatars' at path [user_id]/avatar (overwrite), get the public URL, update avatar_url on the profiles table, update UI immediately. 4) Add the same optional photo upload to onboarding Step 3 with a clearly marked skip option."

---

### Session 7 — Feed as default + feed page with likes + comments

**SQL to run first:** posts, post_likes, post_comments tables (see above)

Prompt:
> "Read CLAUDE.md. Do two things: 1) Change the post-login redirect from /directory to /feed. Update nav bar order to: Feed · Directory · Opportunities · Messages. Bell icon on right side of nav. 2) Build the /feed page. Fetch posts in reverse chronological order joined with author profile and like/comment counts. Show each post card with: Avatar component (md size), author name (clickable → /directory/[id]), Student/Alumni pill, role+company (alumni only), relative timestamp, post content, like button with count (toggling inserts/deletes from post_likes, optimistic update, highlight when liked by current user), comment button with count (clicking expands comment section below). Comment section: show existing comments (Avatar sm, name, text, timestamp), text input to add new comment (max 300 chars), submit on Enter or button. At the top: compose box with Avatar (md), 'What's on your mind [first name]?' that expands to 500-char textarea with counter and Post button, optimistic post insert. Empty state if no posts."

---

### Session 8 — Directory redesign

Prompt:
> "Read CLAUDE.md. Redesign /directory with two modes: discovery (default) and search (active when typing or chip selected).
>
> Default state: centered title 'Find someone in your network', large centered search bar (max 600px, placeholder: 'Search by name, role, company, industry...'), then a horizontal chip row: Coffee chats · Co-founder · Mentorship · Hiring · MBA 2027 · MBA 2026 · [top industries from DB] · More filters ↓. Clicking any chip activates filter and switches to search mode.
>
> Below chips in default state: 3 discovery sections stacked vertically. Each has a heading, muted subtitle, 'See all →' link, and a horizontal scrollable row of small profile cards (~160px wide): Avatar component (lg=48px), name (bold, centered), program·grad year (muted, centered), Student/Alumni pill, up to 2 active availability badge pills. No role or company on cards. Sections: 1) 'Open to coffee chats' — active coffee_chats status. 2) 'Looking for co-founders' — active cofounder status. 3) 'Your class' — matching logged-in user's graduation_year. Hide sections with 0 results.
>
> Search/filter active state: discovery sections disappear, compact list rows appear (Avatar md, name bold, role+company alumni only, program·grad year, location, active badges, Student/Alumni pill). Results count shown. 'More filters ↓' expands inline panel: graduation year multiselect (grouped students/alumni), industry multiselect with counts from DB, company multiselect, location multiselect, program multiselect. Active filters as dismissible pills with Clear all.
>
> Mobile: chips scroll horizontally, discovery cards scroll horizontally, filter panel as bottom sheet."

---

### Session 9 — My postings + opportunities additions

Prompt:
> "Read CLAUDE.md. Add a 'Your postings' section to /opportunities below the main board, visible only to the current user. Show active posts with: title, type badge, date posted, count of expressions of interest (from opportunity_applications), 'Close posting' button (sets is_active=false, removes from board), 'View interested' button (modal listing people who expressed interest — Avatar md, name, link to their profile). Empty state if no postings."

---

### Session 10 — Direct messaging

**SQL to run first:** messages table (see above)

Prompt:
> "Read CLAUDE.md. Build /messages. Two-panel layout on desktop (conversation list left ~300px, thread right). Single panel on mobile with back navigation. Conversation list: grouped by conversation_id, each row shows Avatar (md) of the other participant, their name, last message preview (~60 chars truncated), relative timestamp, blue dot + bold for unread (read_at IS NULL and recipient = current user). Thread view: scrollable messages, sent right-aligned with teal background, received left-aligned with gray background, Avatar (sm) next to received messages. Text input at bottom, send on Enter or button. Mark messages read (set read_at = now()) when conversation opened. New messages appear in real time via Supabase real-time subscription. 'New message' button searches profiles by name and starts a new conversation. When arriving from a chat request acceptance, pre-populate the thread with the original message."

---

### Session 11 — Notifications + chat request acceptance

Prompt:
> "Read CLAUDE.md. Add a bell icon to Nav (right side, next to user avatar). Red badge shows count of pending chat_requests where to_user_id = current user — live via Supabase real-time. Build /notifications: list pending requests showing Avatar (md), sender name (clickable), Student/Alumni pill, role+company, original message in a quote block, relative timestamp, Accept (teal) and Decline (muted) buttons. On Accept: update status to 'accepted', generate new conversation_id, insert original message into messages table as first message, show 'Connected! Go to messages →' inline, remove from list. On Decline: update status to 'declined', remove silently. Empty state if no pending requests."

---

### Session 12 — Admin dashboard

**SQL to run first:** is_admin column (see above)

Prompt:
> "Read CLAUDE.md. Build /admin. Server-side: redirect to /feed if current user's is_admin = false. Show 4 metric cards: total members (count profiles), active this month (availability_status.updated_at in last 30 days), total opportunities posted, total chat requests sent. Below: a read-only members list showing Avatar (sm), name, email, Student/Alumni (derived from graduation_year), program, grad year, join date. Client-side search by name or email. Sort by name by default. No editing or admin toggles needed in v1."

---

### Session 13 — Edit profile

Prompt:
> "Read CLAUDE.md. Add an 'Edit profile' button to /profile that switches the profile card into inline edit mode. Editable for everyone: full_name, location, linkedin_url, bio (200 char max with counter). Editable for alumni only: current_role, current_company, industry. Not editable: email, graduation_year, program. Single 'Save changes' button — upsert to profiles, show 'Saved ✓' inline for 2 seconds, return to read mode. Cancel returns to read mode without saving."

---

### Session 14 — Polish pass

Prompt:
> "Read CLAUDE.md. Final polish pass: 1) Empty states — every page (feed, directory, opportunities, messages, notifications, my postings) gets a friendly empty state with an icon and helpful prompt. 2) Loading skeletons — animated skeleton placeholders on feed, directory, and opportunities while data loads. 3) 404 — /directory/[id] not found shows a friendly page with a back to directory button. 4) Mobile audit at 375px: directory filter panel as bottom sheet, messages as single panel with back nav, nav as hamburger menu with all links + bell icon. Fix any overflow issues. 5) Add 'Send message' button on /directory/[id] alongside 'Request a chat' — goes to /messages and opens a new conversation with that person."

---

## Open Questions (resolve before or during build)

1. **Real-time feed** — should new posts from other users appear live while reading, or on refresh only? (Real-time adds complexity but feels more alive.)

2. **Post deletion** — can users delete their own feed posts? (SQL policy already supports it — needs a UI decision. Suggested: yes, with a confirm dialog.)

3. **Comment deletion** — can users delete their own comments? (Same as above.)

4. **Message rate limiting** — any limit on DMs to prevent spam? Suggested: no limit in v1, revisit if needed.

5. **Notification emails** — when someone receives a chat request, should they get an email to their virginia.edu address? (Supabase can send this but needs an email template.)

6. **Opportunities auto-post to feed** — when someone posts a job or co-founder search, should it automatically appear in the feed? Suggested: yes, as a system post with a "New opportunity" label — makes the feed feel more active.

---

## What This Document Does NOT Include (v2 scope)

- AI-powered matching / natural language search
- Cross-school recruiter access
- Events module
- Alumni giving integration
- Premium alumni tier
- Native mobile apps
- Public profiles
- Resume upload
- Feed algorithm / personalization
