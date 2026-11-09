# Allow members to close their own opportunities

## Story
As a hiring alum, I want to close an opportunity I posted so that members stop expressing interest after the role is filled.

## Scenarios
1. Given my open opportunity, when I close it and confirm, then it disappears from the active board and remains closed after refresh.
2. Given another member's opportunity, when I view it, then I cannot close it, including through a direct database update.
3. Given saving fails, when I try to close my opportunity, then I see an error, the post remains visible, and I can retry.
4. Given an opportunity closed after I loaded the page, when I express interest, then submission is rejected with a clear message.

## What changed
Owners can close their posts from the expanded opportunity card after confirmation. Successful closure removes the card and updates tab counts; failures keep the card with a retry message. A database trigger prevents new applications to closed posts, including from stale pages, while retaining existing applications.

The locked Supabase JS version was incompatible with the existing SSR package. Pinning JS to the originally specified 2.49.4 and completing database type metadata allows the project to typecheck. No schema changes are introduced by the type definitions.

## What the AI got wrong and how it was caught
The first implementation used Set spread syntax in the new close handler, following the existing apply handler. TypeScript rejected it because the project does not set an ES2015-or-newer compilation target. Validation caught this; both handlers now use Array.from before adding an ID. This is an AI validation finding; the author should add their own observations after manual testing.

## Scenario results
Manual testing against the actual app is PENDING for all four scenarios. This checkout has no Supabase environment configuration or test accounts. Automated checks below are supporting evidence, not a substitute for the assignment's manual run.

| Scenario | Automated evidence | Manual result |
| --- | --- | --- |
| Owner closes | UI removes card and announces success; PostgreSQL accepts owner update and hides closed post from another member | Pending, including refresh |
| Non-owner | UI has no close button; PostgreSQL RLS update affects zero rows | Pending |
| Save fails | Simulated failed save retains card and shows error; retry succeeds | Pending |
| Stale page | PostgreSQL trigger rejects insert with P0001; UI displays closed-opportunity message | Pending |

Additional automated checks: cancelling confirmation makes no save request; open posts accept applications; existing applications survive closure. PostgreSQL tests used PGlite with equivalent ownership policies and the actual migration. UI tests used React and JSDOM with mocked Supabase responses. TypeScript and targeted ESLint pass. Production build compiles and completes type checking, then fails prerendering the existing login and onboarding pages because the Supabase URL and key are absent.

## How to check it
1. Install dependencies with npm ci. Configure .env.local using .env.local.example and your team's Supabase project.
2. Apply migrations 001, 002, and 003 in order on a fresh test database. On an existing database with 001 and 002 applied, apply only 003_close_opportunities.sql.
3. Run npm run dev. Use two member accounts, A and B. A should be an alum able to create a job. Create disposable test opportunities.
4. Scenario 1: as A, expand A's post, select Close opportunity, and confirm. Expect a success message, removal of the card, and updated counts. Refresh; expect the card to remain absent. Record what actually happened.
5. Scenario 2: as B, expand A's other open post. Expect Express interest and no Close opportunity. To check server enforcement in B's authenticated client, attempt an update of A's post to is_active=false; expect zero updated rows and the post unchanged. Never use a service-role client for this check.
6. Scenario 3: as A, load and expand an open post. Switch the browser's Network tools to Offline, close and confirm, and wait for the error. Expect the post to remain and the close control to be enabled again. Restore networking and retry; expect successful removal.
7. Scenario 4: load A's open post as B in a separate browser session. Close it as A. Without refreshing B's page, express interest as B. Expect the closed-opportunity error and no new application. Refresh B's page; expect the post to be absent.
8. For each scenario, record the action, expected result, observed result, and pass/fail; attach screenshots if useful. If anything fails, document whether code or scenario changed, then rerun.

## Review and rollout
Reviewer: Kriti (GitHub username: kriti13sahu, inferred from repository owner; confirm before requesting review).
Apply migration 003 before testing or releasing the UI. It serializes application inserts with closure through a row lock. An application that obtains the lock first completes before closure; an application after closure is rejected. Existing owner-only update RLS enforces closure permissions.

Do not merge until live manual scenarios are recorded and Kriti has reviewed the PR. Part B still requires reviewing Kriti's PR separately.
