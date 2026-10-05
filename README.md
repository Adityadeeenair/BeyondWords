# BeyondWords

A gamified web app for learning Indian Sign Language (ISL) through story-driven levels.

This README is written so you (or any AI assistant helping you) can set up and run this project from scratch. Follow the steps in order.

---

## What's built so far (Skeleton stage)

- A React app with page routing: Login → Sections → Levels → Challenge screen.
- Login/signup wired to Supabase (a free backend service — handles user accounts).
- Placeholder content everywhere. No stories, no quiz questions, no webcam/ML yet — this stage is just the frame the rest of the app plugs into.

## What's NOT built yet

- Quiz challenge logic (4-card pick-the-sign)
- Webcam sign recognition (MediaPipe + trained model)
- Any real story content
- Progress saving to the database (tables aren't created yet)

---

## 1. Prerequisites

You need **Node.js** installed on your computer (version 18 or higher).
Check if you already have it by opening a terminal and running:

```
node -v
```

If that shows a version number, you're set. If not, download it from https://nodejs.org (choose the LTS version) and install it.

---

## 2. Set up Supabase (one-time setup)

Supabase is what handles user login and will later store progress. It's free for a project this size.

1. Go to https://supabase.com and click **Start your project**. Sign up (you can use GitHub or email).
2. Click **New project**.
   - Give it a name, e.g. `beyondwords`.
   - Set a database password (save it somewhere).
   - Choose the region closest to you.
   - Click **Create new project**. It takes a minute or two to set up.
3. Once it's ready, go to **Project Settings** (gear icon, bottom left) → **API**.
4. You'll see two values you need:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

Keep this tab open — you'll paste these into the project in the next step.

5. Turn on email login: in the Supabase dashboard, go to **Authentication** → **Providers**, and make sure **Email** is enabled (it usually is by default).

---

## 3. Configure the project with your Supabase keys

1. In the project folder, find the file called `.env.example`.
2. Make a copy of it in the same folder, and rename the copy to exactly `.env` (no `.example`).
3. Open `.env` in any text editor. It looks like this:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

4. Replace the values with the **Project URL** and **anon public** key you copied from Supabase in step 2.
5. Save the file.

**Important:** never share this `.env` file publicly or upload it to GitHub. It's already excluded via `.gitignore`, so a normal `git push` won't include it — but don't paste its contents into chat or public docs either.

---

## 4. Install and run

1. Open a terminal, navigate into the project folder, then run:

```
npm install
```

This downloads all the packages the project needs. Only needed once (or whenever new packages get added later).

Then start the app:

```
npm run dev
```

Terminal will show a local address, usually `http://localhost:5173`. Open that in your browser.

You should see a login screen. Try creating an account (any email + password 6+ characters). After signing up, you should land on a "Choose a section" screen with Letters, Numbers, and Word Forming cards.

**Note:** `npm install` may report one moderate vulnerability (in `esbuild`, a dev-dependency). It only affects the local dev server while it's running, not your built app, and fixing it would require moving to an unstable/experimental version of Vite that caused real problems before — safe to ignore for now.

---

## 5. Project structure (for reference)

```
src/
  pages/       -> Full screens (Login, Sections, Levels, Challenge)
  components/  -> Reusable pieces (currently just the login guard)
  context/     -> App-wide state (AuthContext tracks who's logged in)
  lib/         -> Setup code (Supabase client connection)
  styles.css   -> All styling
```

---

## 6. Testing hand tracking (new)

There's now a standalone test page for hand detection, separate from the actual game — reachable via a "Hand tracking test" link on the Sections page once logged in, or by going directly to `/ml-test`.

What it does: turns on your webcam and draws a live skeleton overlay on your hand using MediaPipe. This is purely to confirm hand detection works before anything gets built on top of it — no sign classification yet, just "can it see and track a hand."

**When you open it:**
- Your browser will ask for camera permission — allow it.
- Hold a hand up in frame. You should see a green skeleton with gold dots overlaid on your hand within a second or two.
- The text below the video tells you how many hands are currently detected.

**If it doesn't work:**
- No camera permission prompt at all → check your browser's site settings and make sure camera access isn't blocked for localhost.
- Permission granted but nothing draws → try a different browser (Chrome/Edge tend to be most reliable for this), and make sure no other app (Zoom, Teams, etc.) is currently using your camera.
- Stuck on "Loading hand-tracking model..." → check your internet connection; this page loads the model files from a CDN, so it won't work fully offline.

**Note on stability:** if the hand count flickers (e.g. briefly reads "2 hands" when only 1 is up, especially at a distance or odd angle), that's been reduced — the displayed count now only updates once a reading holds steady for a few frames. The skeleton overlay itself still updates every frame, only the text below it is smoothed.

**Known limitation, not a bug:** when hands heavily overlap or cross in front of each other, detection can become unreliable or drop one hand — this is a real limitation of the underlying hand-tracking model, not something fixable with settings. Worth keeping in mind for any two-handed signs that involve overlap.

## 7. Letter classifier (new)

The hand-tracking test page (`/ml-test`) now also predicts which ISL letter your hand is signing, using a model trained on the landmarks dataset.

**How it works:** MediaPipe detects your hand's 21 landmark points (as before), those get fed into a small trained model that runs entirely in your browser, and the predicted letter + confidence shows up below the video.

**Important caveat, read before trusting the letter shown:** the model's 26 output classes are numbered 0-25 in the original dataset, not labeled A-Z directly. We're currently assuming they map alphabetically (0=A, 1=B, ... 25=Z) based on how these datasets are typically built, but this has **not been independently confirmed**. So right now, this page proves the *pipeline* works end-to-end (hand → landmarks → model → prediction) — it does not yet prove the *letter labels* are correct. Don't be alarmed if a sign shows the "wrong" letter; that could be a labeling mislabel, not a broken model. Validating the actual label mapping is a follow-up step, not done yet.

**Test accuracy note:** the model scored 99.65% on held-out data from the same dataset it trained on. That's a good sign the model can learn the patterns, but it does NOT guarantee it'll work well on someone else's hand/lighting/camera it's never seen before — that's what real-world testing (you, using this page) actually tells us.

**Real bug found during live testing and fixed:** early testing showed wrong predictions for several single-hand letters (e.g. C and O were being read as Q). Turned out the mapping was fine — the classifier was reacting to single flickered frames (a phantom second hand appearing briefly), and since the model treats one-hand-vs-two-hand as a very strong signal, one bad frame could flip a correct answer into a wrong one. Fixed by only running predictions once the hand-count reading is stable, not on every raw frame. If you still see odd results, hold the sign steady for a beat rather than flashing it quickly.

**Known limitation:** the model always picks *some* letter, even for input it's never seen — it has no "I don't know" option. An open palm or a random gesture will still get classified confidently, just wrongly. Don't read high confidence on an unrecognized shape as the model being right.

## 9. Quiz challenge (Levels 1 & 3)

Levels 1 and 3 in the Letters section run an actual quiz challenge - go to Sections → Letters → Level 1 or Level 3.

**What it does:** shows a question ("Which sign is X?") with 4 image options (doodle + real photo paired). Pick one and hit Submit. Get it right, move to the next question. Get it wrong, that question goes to the back of the queue and comes back later - every question must be answered correctly at least once to finish.

## 10. Webcam challenges (Level 2 & Level 4)

Levels 2 and 4 in the Letters section run real webcam challenges - go to Sections → Letters → Level 2 or Level 4.

- Level 2: K, L, M, N, O
- Level 4: P, Q, R, S, T (deliberately includes R, already known to sometimes get confused with M/N, for the same "measure it for real before fixing" reasoning)

**What it does:** shows the target letter, your live camera feed with skeleton overlay, and a doodle reference for quick visual guidance while attempting. Click "Check my sign" - this starts a 3-second countdown (not an instant check), so you have time to get both hands into position for two-handed signs before it evaluates automatically. Get it right, move on. Get it wrong or hit "Skip / show me," and the real ISLRTC photo is revealed for precision (doodle is for quick glance, real photo is for "show me exactly how" once you've gotten it wrong or asked to skip) - either way it requeues to the end, same rule as the quiz, no free pass via skipping.

**Camera trouble handling:** if no hand is detected for about 15 seconds straight, a banner appears offering "Retry" or "Skip for now, revisit later" - this does NOT count as a wrong answer, it's meant for genuine camera/lighting problems, separate from actually getting a sign wrong.

**Known gap right now:** K, L, M, N, O don't have doodle reference images yet (only the real photos were added) - the passive "Reference" panel during an attempt will show a broken image until doodles for these 5 letters are created, same process as before (generate, verify against real ISLRTC photos, crop/clean, wire in). The wrong/skip reveal (which uses real photos) works fine already since those were added.

**Known model behavior to expect:** M, N, and R have been observed to occasionally get confused with each other during testing - not a bug, likely a genuine visual-similarity issue between those letters' handshapes. O has also shown some difficulty. This level deliberately keeps the full K-O set rather than avoiding problem letters, to gather real data on how often this causes problems in the real challenge flow before deciding whether the model needs targeted retraining. Separately, if a letter shows "no hand detected" rather than a wrong guess, that's a different issue (hand-tracking couldn't find a hand shape at all, possibly due to occlusion in a two-handed sign) - worth testing at a different angle/distance before assuming it's a classifier problem.

## 11. What's next

The next build steps (not started yet):
1. Get MediaPipe Hands running in-browser to detect a hand and its landmark points, tested on its own before it's wired into any challenge.
2. Train a small classifier on the ISL letters dataset so it can recognize signs from those landmarks.
3. Build the actual quiz challenge (4-card pick-the-sign).
4. Build the actual webcam challenge, using the working ML pipeline from steps 1-2.
5. Wire a real story into one full level, end to end.

If you're picking this project back up after a break, or handing it to another AI assistant, share this README plus the project's checkpoint notes doc for full context.
