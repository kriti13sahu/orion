# Orion — Full Feature Specification
**Version 2.0 · Based on CLAUDE.md + product decisions to date**
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
- Feed (redesign: make default landing page after login)
- Directory (redesign: list view + filter sidebar, not cards)
- Community feed (new)
- My postings + close opportunity (new)
- Chat request notifications (new)
- Direct messaging (new)
- Admin dashboard (new)
- Polish pass — empty states, skeletons, edit profile, mobile (new)

---

## Navigation & Default Page

### Current behavior
After login → redirects to `/directory`

### New behavior
After login → redirects to `/feed`

### Nav bar order (left to right)
**Feed · Directory · Opportunities · Messages**

Feed comes first because it signals the app is alive. An empty directory on first load is discouraging; a feed with posts feels like a community from day one.

---

## Page 1 — Feed (default landing page)

### Purpose
The heartbeat of the community. A place for posts, advice, opportunities, and candid professional discussion. Feels like LinkedIn's feed but private, high-trust, and MBA-only.

### Layout
- Full-width centered column (max-width ~680px), same as LinkedIn feed
- Compose box pinned at top
- Posts in reverse chronological order below

### Compose box
- Shows current user's avatar + "What's on your mind, [first name]?"
- Clicking expands to a textarea (max 500 characters)
- Live character counter (e.g. "423 / 500")
- Post button — disabled until at least 1 character
- On submit: inserts into `posts` table, new post appears at top immediately (optimistic update)
- Collapse back to single line after posting

### Post card
Each post card shows:
- Author avatar (initials circle)
- Author name (clickable → goes to /directory/[id])
- Student / Alumni pill derived from graduation_year
- Current role + company (alumni only, shown as "PM at Google")
- Relative timestamp ("2 hours ago", "3 days ago")
- Post content (full text, no truncation)
- No likes, no comments in v1 — keep it simple

### Empty state
If no posts yet:
> *"Be the first to post. Share an update, ask for advice, or let the community know what you're working on."*
With a prompt that opens the compose box.

### Feed filtering (future v2 — do NOT build in v1)
No algorithm, no filtering — pure chronological. Keeps it simple and trustworthy.

---

## Page 2 — Directory (redesigned: search-first + discovery sections)

### Philosophy
The directory has two modes that coexist on the same page:
1. **Search mode** — for when you know what you're looking for ("a Darden alum at a VC firm in NYC")
2. **Discovery mode** — for when you're browsing and open to serendipity

The page defaults to discovery. The moment you type in the search bar or click a filter chip, it transitions to search results. Back to empty search = back to discovery.

---

### Default state (no search query, no filters active)

**Header — minimal, centered**

- Page title: "Find someone in your network" — large, light weight, centered
- Search bar: large, centered, full width up to ~600px, prominent placeholder: "Search by name, role, company, industry..."
- Below the search bar: a single row of quick-filter chips (horizontal scroll on mobile)
  - First 4 chips: availability types (Coffee chats · Co-founder · Mentorship · Hiring)
  - Next chips: class years of current students (MBA 2027 · MBA 2026...)
  - Then: top 3–4 industries dynamically pulled from DB
  - Last chip: "More filters ↓" which expands a full filter panel below
- Clicking any chip immediately activates that filter and jumps to search results mode

---

### Discovery sections (below the chip row, default state only)

Three contextual sections stacked vertically. Each has: a heading, a muted subtitle, a "See all →" link, and a horizontal scrollable row of small profile cards.

**Section 1 — "Open to coffee chats"**
Subtitle: "These members are available to connect right now"
Shows: up to 8 profile cards where coffee_chats is currently active
"See all →" activates the Coffee chats chip filter

**Section 2 — "Looking for co-founders"**
Subtitle: "Building something new and open to collaborators"
Shows: up to 8 profile cards where cofounder is currently active
"See all →" activates the Co-founder chip filter

**Section 3 — "Your class"**
Subtitle: "Fellow MBA [grad year] members"
Shows: up to 8 profile cards matching the logged-in user's own graduation_year
"See all →" activates that graduation year chip filter

If a section has 0 results, hide it entirely — never show an empty section.

---

### Profile card design (discovery sections)

Small, minimal, square card (~160px wide × ~190px tall):
- 48px avatar circle (initials) — centered, top area
- Name — bold, 14px, centered
- Program · Grad year — muted, 12px, centered (e.g. "MBA · 2027")
- Student / Alumni pill — small, centered
- Active availability badges — up to 2, small pills, centered (e.g. "☕ Coffee chats")
- No role, no company shown — keeps it minimal and non-hierarchical
- Hover: subtle lift shadow
- Click: goes to /directory/[id]
- Cards laid out in a horizontal scrollable row (not a grid)

---

### Search / filter active state

Once the user types anything OR activates any chip:
- Discovery sections slide away / disappear
- Results appear as a clean compact list below the chips
- Each result row: 40px avatar · name (bold) · role + company (alumni only, muted) · program · grad year · location · active availability badges · Student/Alumni pill
- Results count: "Showing 23 members"
- Clicking X on a chip or clearing the search bar returns to discovery mode

### Filter panel ("More filters ↓")
Expands inline below the chip row. Contains:
- Graduation year — multiselect, grouped as "Current students" then individual alumni years
- Industry — multiselect, values from DB with member counts (e.g. "Technology (34)")
- Company — multiselect, values from DB
- Location — multiselect, values from DB
- Program — MBA / EMBA / Other

Active filters shown as dismissible pills in the chip row. "Clear all" resets everything and returns to discovery mode.

### Empty search state
"No one matches your search. Try a broader term or remove some filters."

### Mobile
- Search bar and chips: full width, chips horizontally scrollable
- Discovery sections: cards in horizontal scroll rows
- Filter panel: opens as a bottom sheet
- Search results: full width compact rows

## Page 3 — Directory Detail (/directory/[id])

### Already built — minor additions needed
- Fix: hide `industry` field for student profiles (bug from session 4)
- Show "Send message" button in addition to "Request a chat" — clicking goes to /messages and starts a new conversation with this person
- Back button → returns to directory (preserve filter state if possible)

---

## Page 4 — Opportunities

### Already built — additions needed

**My postings section (new)**
Below the main board, add a "Your postings" section visible only to the post author:
- Shows current user's active posts
- Each shows: title, type, date posted, "X people interested" count (from opportunity_applications)
- "Close posting" button → sets is_active = false, removes from board
- "View interested" → shows list of people who expressed interest (name + profile link)
- Empty state: "You haven't posted anything yet. Share a role or co-founder search with the community."

---

## Page 5 — Community Feed Posts table

### SQL to run before building
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

---

## Page 6 — Messages

### SQL to run before building
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

### /messages — inbox view
Layout: two-panel on desktop (conversation list left, thread right). Single panel on mobile.

**Conversation list (left panel)**
- Each conversation row: avatar, name, last message preview (truncated ~60 chars), relative timestamp
- Unread conversations: bold name + blue dot indicator
- Conversations sorted by most recent message
- Clicking a row loads the thread in the right panel

**Thread view (right panel)**
- Scrollable message thread
- Sent messages: right-aligned, teal/dark background
- Received messages: left-aligned, light gray background
- Show sender name + timestamp above first message in a sequence
- Text input at bottom with Send button (or Enter to send)
- New messages appear in real time via Supabase real-time subscription

**Starting a new conversation**
- "New message" button at top of conversation list
- Opens a recipient search (searches profiles by name)
- Selecting a person starts a new conversation thread

**Connection to chat requests**
- When a chat request is accepted (from notifications page), automatically:
  1. Creates a new conversation_id (gen_random_uuid())
  2. Inserts the original request message as the first message
  3. Redirects the accepting user to /messages/[conversationId]

### Empty state
"No messages yet. Request a coffee chat from someone's profile to start a conversation."

---

## Page 7 — Notifications

### SQL to run before building
No new tables needed — uses existing chat_requests table.

### Nav indicator
- Bell icon in nav bar
- Red badge with count of pending chat_requests where to_user_id = current user
- Updates in real time via Supabase real-time subscription
- Badge disappears when count = 0

### /notifications page
Lists all pending chat requests received by the current user.

**Each notification card shows:**
- Sender avatar + name (clickable → /directory/[id])
- Student / Alumni pill
- Role + company (alumni only)
- Message they sent (full text in an indented quote block)
- Time sent (relative)
- Accept button (teal) + Decline button (ghost/muted)

**On Accept:**
1. Update chat_request status → 'accepted'
2. Create a new conversation in messages table with the original message as first message
3. Show a brief success state: "Connected! Go to your messages →"
4. Remove from notifications list

**On Decline:**
1. Update chat_request status → 'declined'
2. Remove from notifications list silently (no confirmation needed)

**Empty state:**
"No pending requests. When someone requests a coffee chat with you, it'll appear here."

---

## Page 8 — Admin Dashboard

### SQL to run before building
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
```

### Access control
- Server-side check: if current user's profile has is_admin = false → redirect to /feed
- To make yourself admin, run in Supabase SQL Editor:
  `UPDATE public.profiles SET is_admin = true WHERE email = 'your@virginia.edu';`

### Layout
Standard page with nav. Four metric cards at top, then members table below.

### Metric cards (top row, 4 cards)
1. **Total members** — count of all profiles
2. **Active this month** — profiles with any availability_status.updated_at in last 30 days
3. **Opportunities posted** — count of all opportunities (active + closed)
4. **Chat requests sent** — count of all chat_requests

### Members table
Columns: Avatar · Name · Email · Role (Student/Alumni, derived) · Program · Grad Year · Joined · Admin toggle

- Searchable by name or email (client-side filter)
- Admin toggle updates is_admin in real time
- Sortable by: Name (default) · Grad year · Join date
- Pagination: 25 rows per page

---

## Page 9 — Profile (edit mode addition)

### Currently built: read-only profile card + availability toggles

### Addition needed: Edit profile
Add an "Edit profile" button on /profile that switches the profile card into edit mode (inline, not a separate page).

**Editable fields for everyone:**
- Full name
- Location
- LinkedIn URL
- Bio (max 200 chars)

**Editable fields for alumni only:**
- Current role
- Current company
- Industry

**Not editable:**
- Email (set by auth)
- Graduation year (set during onboarding — changing this would change their role, too risky)
- Program (set during onboarding)

**Save behavior:** Single "Save changes" button at the bottom. On save: upsert to profiles table, show "Saved" confirmation inline for 2 seconds.

---

## Polish Pass (final session)

### Empty states — every page needs one
| Page | Empty state message |
|---|---|
| Feed | "Be the first to post. Share an update or ask for advice." |
| Directory | "No members match your filters. Try adjusting your search." |
| Opportunities | "No opportunities posted yet. Be the first to share a role or co-founder search." |
| Messages | "No messages yet. Start a conversation from someone's profile." |
| Notifications | "No pending requests." |
| My postings | "You haven't posted anything yet." |

### Loading skeletons
Add skeleton loaders (animated gray placeholder blocks) on: Feed, Directory, Opportunities. Prevents layout shift and feels faster.

### 404 handling
If /directory/[id] doesn't exist → show friendly not-found page with "This profile doesn't exist or may have been removed" and a back to directory button.

### Mobile responsiveness audit
- Directory: filter sidebar becomes bottom sheet on mobile
- Messages: single panel, back button to return to conversation list
- Feed: full width, compose box works on mobile keyboard
- Nav: hamburger menu on mobile with all 4 links + profile

---

## Revised Claude Code Session Plan

### Session 6 — Feed as default + feed page
**SQL to run first:** posts table (see above)

Prompt:
> "Read CLAUDE.md. Do two things: 1) Change the post-login redirect from /directory to /feed. Update the nav bar order to: Feed · Directory · Opportunities · Messages. 2) Build the /feed page. Fetch posts in reverse chronological order joined with author profile. Show each post with: avatar, name, Student/Alumni pill, role+company (alumni only), relative timestamp, and content. At the top show a compose box: collapsed single line, expands on click to a 500-char textarea with character counter and Post button. New posts appear immediately via optimistic update. Empty state if no posts."

---

### Session 7 — Directory redesign (search-first + discovery sections)

Prompt:
> "Read CLAUDE.md. Redesign /directory with two modes on one page: discovery (default) and search (active when typing or chip selected).
>
> Default state: centered page title 'Find someone in your network', large centered search bar (max 600px wide, placeholder: 'Search by name, role, company, industry...'), then a horizontal chip row below it: Coffee chats · Co-founder · Mentorship · Hiring · MBA 2027 · MBA 2026 · [top industries from DB] · More filters ↓. Clicking any chip activates that filter and switches to search results mode.
>
> Below the chips in default state, show 3 discovery sections stacked vertically. Each section has a heading, muted subtitle, 'See all →' link, and a horizontal scrollable row of small profile cards (~160px wide): avatar (48px, initials), name (bold, centered), program·grad year (muted, centered), Student/Alumni pill, and up to 2 active availability badges. No role or company on cards. Section 1: 'Open to coffee chats' — profiles with active coffee_chats status. Section 2: 'Looking for co-founders' — profiles with active cofounder status. Section 3: 'Your class' — profiles matching the logged-in user's graduation_year. Hide any section with 0 results.
>
> Search/filter active state: discovery sections disappear, results show as compact list rows (40px avatar, name, role+company alumni only, program·grad year, location, active badges, Student/Alumni pill). Show results count. 'More filters ↓' expands a panel with: graduation year multiselect (grouped: current students / alumni years), industry multiselect (with counts from DB), company multiselect, location multiselect, program multiselect. Active filters shown as dismissible pills in the chip row with a Clear all option.
>
> Mobile: chips horizontally scrollable, discovery cards in horizontal scroll rows, filter panel as bottom sheet, search results full width."

---

### Session 8 — My postings + opportunities additions

Prompt:
> "Read CLAUDE.md. Add a 'Your postings' section to /opportunities, visible only to the logged-in user below the main board. Show the user's active posts with: title, type badge, date posted, count of expressions of interest, a 'Close posting' button (sets is_active=false), and a 'View interested' button that shows a modal listing people who expressed interest with their name and a link to their profile. Empty state if no postings."

---

### Session 9 — Direct messaging

**SQL to run first:** messages table (see above)

Prompt:
> "Read CLAUDE.md. Build /messages (two-panel: conversation list left, thread right — single panel on mobile). Conversation list: grouped by conversation_id, shows other participant's avatar, name, last message preview, relative timestamp, unread indicator (bold + blue dot) for messages where read_at IS NULL and recipient = current user. Thread view: scrollable messages with sent right-aligned (teal bg) and received left-aligned (gray bg), text input at bottom, Enter or Send button to send. New messages appear in real time via Supabase real-time on the messages table. Mark messages as read (set read_at = now()) when the conversation is opened. Add a 'New message' button that searches profiles by name and starts a new conversation. When navigating from a chat request acceptance, pre-populate the conversation with the original request message."

---

### Session 10 — Notifications + chat request acceptance

Prompt:
> "Read CLAUDE.md. Add a bell icon to the Nav component with a red badge showing count of pending chat_requests where to_user_id = current user. Use Supabase real-time to keep the count live. Build /notifications page: list pending chat requests showing sender avatar, name, Student/Alumni pill, role+company, message in a quote block, relative timestamp, Accept button and Decline button. On Accept: update status to 'accepted', create a new conversation_id, insert the original message into the messages table as the first message, show 'Connected! Go to messages →' inline, remove from list. On Decline: update status to 'declined', remove from list silently. Empty state if no pending requests."

---

### Session 11 — Admin dashboard

**SQL to run first:** Add is_admin column (see above)

Prompt:
> "Read CLAUDE.md. Build /admin. Server-side gate: redirect to /feed if current user's is_admin = false. Show 4 metric cards: total members (count profiles), active this month (availability_status updated_at in last 30 days), total opportunities, total chat requests. Below: a members table with columns avatar, name, email, Student/Alumni (derived), program, grad year, joined date, admin toggle. Client-side search by name or email. Admin toggle updates is_admin in real time. Sort by name by default. Paginate at 25 rows."

---

### Session 12 — Edit profile

Prompt:
> "Read CLAUDE.md. Add an 'Edit profile' button to /profile that switches the profile card into inline edit mode (not a new page). Editable for everyone: full_name, location, linkedin_url, bio (200 char max with counter). Editable for alumni only: current_role, current_company, industry. Not editable: email, graduation_year, program. Single 'Save changes' button — on save upsert to profiles, show 'Saved ✓' inline for 2 seconds then return to read mode. Cancel button returns to read mode without saving."

---

### Session 13 — Polish pass

Prompt:
> "Read CLAUDE.md. Final polish pass: 1) Empty states — add friendly empty states with icons and prompts on every page: feed, directory, opportunities, messages, notifications, my postings section. 2) Loading skeletons — animated skeleton placeholders on feed, directory, and opportunities while data loads. 3) 404 page — if /directory/[id] profile doesn't exist, show a friendly not-found page with a back to directory button. 4) Mobile audit — test all pages at 375px width. Directory: filters behind a bottom sheet. Messages: single panel with back navigation. Nav: hamburger on mobile. Fix any overflow or layout issues. 5) Add 'Send message' button on /directory/[id] profile pages alongside the existing 'Request a chat' button — clicking goes to /messages and starts a new conversation."

---

## Open Questions (resolve before or during build)

1. **Real-time on feed** — should new posts from other users appear automatically while you're reading the feed, or only on refresh? (Supabase real-time can do this but adds complexity.)

2. **Post deletion** — should users be able to delete their own posts on the feed? (SQL already has the delete policy in this spec, but the UI needs a decision.)

3. **Message rate limiting** — should there be any limit on how many direct messages a user can send to prevent spam? (e.g. can't message the same person twice unless they reply first)

4. **Notification email** — when someone receives a chat request, should they get an email notification to their virginia.edu address? (Supabase can send this but needs a template.)

5. **Feed post types** — in v1 all posts are plain text. Should opportunities auto-post to the feed when someone posts them, or is the feed strictly manual posts?

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
