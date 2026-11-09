# Allow members to close their own opportunities

## Story
As a hiring alum, I want to close an opportunity I posted so that members stop expressing interest after the role is filled.

## Scenarios
1. Given my open opportunity, when I close it and confirm, then it disappears from the active board and remains closed after refresh.
2. Given another member's opportunity, when I view it, then I do not see a Close opportunity button. Database ownership enforcement is checked separately.
3. Given saving fails, when I try to close my opportunity, then I see an error, the post remains visible, and I can retry.
4. Given an opportunity closed after I loaded the page, when I express interest, then submission is rejected with a clear message.

## What changed
Owners can close their posts from the expanded opportunity card after confirmation. Successful closure removes the card and updates tab counts; failures keep the card with a retry message. A database trigger prevents new applications to closed posts, including from stale pages, while retaining existing applications.

The locked Supabase JS version was incompatible with the existing SSR package. Pinning JS to the originally specified 2.49.4 and completing database type metadata allows the project to typecheck. No schema changes are introduced by the type definitions.

## What the AI got wrong and how it was caught
The first implementation used Set spread syntax in the new close handler, following the existing apply handler. TypeScript rejected it because the project does not set an ES2015-or-newer compilation target. Validation caught this; both handlers now use Array.from before adding an ID. This is an AI validation finding; the author should add their own observations after manual testing.

## Scenario results
All four browser scenarios passed, as reported by the author after following the manual steps. These are author-reported observations; the AI did not operate the signed-in browser. Database ownership enforcement was checked separately in automated PostgreSQL tests.

| Scenario | What was done | Expected result | Observed result |
| --- | --- | --- | --- |
| 1. Owner closes | Created a test opportunity, closed and confirmed it, then refreshed | Post disappears and stays absent | PASS — post remained absent after refresh |
| 2. Non-owner | Viewed an open post using a second member account | No Close opportunity button | PASS — second member could not see the close control |
| 3. Save fails | Tried closing while Chrome Network was Offline, then restored networking and retried | Error with post retained; retry succeeds | PASS — offline error retained the post; online retry closed it |
| 4. Stale page | Kept the post open as a second member, closed it as owner, then expressed interest without refreshing | Submission rejected with a closure message | PASS — closed-opportunity error appeared |

Additional automated checks: cancelling confirmation makes no save request; open posts accept applications; existing applications survive closure. PostgreSQL tests used PGlite with equivalent ownership policies and the actual migration. UI tests used React and JSDOM with mocked Supabase responses. TypeScript and targeted ESLint pass. Production build passes after configuring the new Orion Supabase project. All four migrations were applied successfully; initial migration 001 needed its reserved current_role column name quoted.

## How to check it
1. Install dependencies with npm ci. Configure .env.local using .env.local.example and your team's Supabase project.
2. Apply migrations 001, 002, 003, and 004 in order on a fresh test database. On an existing database with 001 and 002 applied, apply 003_close_opportunities.sql and 004_darden_email_domain.sql.
3. Run npm run dev. Use two member accounts, A and B. Use an alum account to test a job posting, or a student account with a co-founder search to exercise the same ownership flow. Create disposable test opportunities.
4. Scenario 1: as A, expand A's post, select Close opportunity, and confirm. Expect a success message, removal of the card, and updated counts. Refresh; expect the card to remain absent. Record what actually happened.
5. Scenario 2: as B, expand A's other open post. Expect Express interest and no Close opportunity. To check server enforcement in B's authenticated client, attempt an update of A's post to is_active=false; expect zero updated rows and the post unchanged. Never use a service-role client for this check.
6. Scenario 3: as A, load and expand an open post. Switch the browser's Network tools to Offline, close and confirm, and wait for the error. Expect the post to remain and the close control to be enabled again. Restore networking and retry; expect successful removal.
7. Scenario 4: load A's open post as B in a separate browser session. Close it as A. Without refreshing B's page, express interest as B. Expect the closed-opportunity error and no new application. Refresh B's page; expect the post to be absent.
8. For each scenario, record the action, expected result, observed result, and pass/fail; attach screenshots if useful. If anything fails, document whether code or scenario changed, then rerun.

## Review and rollout
Reviewer: Kriti (GitHub username: kriti13sahu, inferred from repository owner; confirm before requesting review).
Apply migrations 003 and 004 before testing or releasing the UI. It serializes application inserts with closure through a row lock. An application that obtains the lock first completes before closure; an application after closure is rejected. Existing owner-only update RLS enforces closure permissions.

Manual scenarios are recorded above. Do not merge until Kriti has reviewed the PR. Part B still requires reviewing Kriti's PR separately.

## Darden sign-in prerequisite
At the author's request, login validation and the profile email constraint now accept both @virginia.edu and @darden.virginia.edu, case-insensitively. Login trims surrounding whitespace. The login copy names both supported domains. Migration 004 was applied successfully to the test project. Ten paired JavaScript/PostgreSQL checks passed for valid domains, uppercase addresses, unrelated domains, lookalikes, and malformed addresses. TypeScript and login ESLint pass.
