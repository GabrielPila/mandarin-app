# Deep Competitor Analysis: Mandarin Learning Applications

**Date of Analysis:** July 9, 2026

This document provides a comprehensive, deep-dive analysis of the most popular
Mandarin learning applications on the market. It combines feature categorization
(Core vs. Extra), detailed User Experience (UX) breakdowns, suspected Technical
Implementations, and Community Feedback gathered from Reddit and App Stores.

---

## 1. DuChinese

**Primary Focus:** Graded reading and listening comprehension through context.

### 🔷 Core Features

- **Graded Reading Passages:**
  - _UX:_ Users select stories based on their exact proficiency level. Users
    read to absorb vocabulary in natural contexts rather than isolation,
    preventing the fatigue of raw memorization.
- **Tap-to-Translate (Instant Dictionary):**
  - _UX:_ Users tap unknown characters to instantly see a popup with English,
    Pinyin, and HSK level. This removes the friction of switching apps, keeping
    the user in a state of "flow."
  - _Technical:_ Uses a text-parsing engine to map characters to dictionary
    entries instantly.
- **Synchronized Audio Highlighting:**
  - _UX:_ As the native speaker audio plays, the specific word being spoken is
    highlighted. Users map spoken sounds to written characters in real-time,
    improving listening parsing speed.
  - _Technical:_ Audio playback is synced to text nodes, likely using word-level
    timestamping in JSON metadata alongside the text.
- **Pinyin Toggle:**
  - _UX:_ Users hide Pinyin to test true character recognition, toggling it back
    on only when stuck.

### ➕ Extra Features

- **Flashcard Integration (SRS):**
  - _UX:_ Users save words from stories to a Spaced Repetition deck to review
    daily.
- **Offline Downloads:**
  - _UX:_ Users can download text/audio packages for commutes.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Incredible for rapidly improving reading speed and listening
  comprehension.
- **Cons & Frustrations:**
  - **Audio/Transcript Disconnect:** Users find manually controlling the audio
    "fiddly." Losing your place in the audio stream is a highly cited annoyance.
  - **Lookup Disruption:** Being kicked out of the transcript page or losing
    context during a word lookup is jarring.
  - **Difficulty Scaling:** Beginners often feel they are missing too much
    vocabulary to enjoy the stories until they surpass HSK 2.
  - **Pricing:** High subscription price. Users wish for better vocabulary
    tracking across difficulty levels and easier export options to Anki.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users highly praise learning through contextual
  stories rather than rote memorization. The synced human-voice audio is
  considered a standout feature. Users love the immediate convenience of the
  tap-to-translate dictionary and the ability to toggle Pinyin on/off.
- **What Users Hate (1-Star):**
  - **Audio/Transcript Disconnect:** Users find manually controlling the audio
    "fiddly," and losing their place is highly annoying.
  - **UI/UX Changes:** Users hate when updates force unwanted goal-tracking
    widgets onto their screen or make it harder to navigate to new lessons.
  - **Lookup Disruption:** Being kicked out of the transcript page during a word
    lookup is jarring.
  - **Pricing & Scope:** Some hate the high subscription cost, while others
    leave 1-star reviews because they expected a full grammar course rather than
    just a reading supplement.

---

## 2. Pleco

**Primary Focus:** The ultimate offline dictionary and reference tool.

### 🔷 Core Features

- **Offline Dictionary Search:**
  - _UX:_ Users type in English, Pinyin, or draw a character. The search is
    instant and fuzzy. This is the absolute baseline tool every learner uses for
    wild, unknown words.
  - _Technical:_ A massive local SQLite database of multiple dictionaries
    queried instantly on device.
- **Comprehensive Entry Details:**
  - _UX:_ Provides definitions from 5+ sources, examples, and radical breakdowns
    so users understand nuance.

### ➕ Extra Features

- **Optical Character Recognition (OCR):**
  - _UX:_ Pointing the camera at physical text draws green boxes and floating
    translations. Used for survival in China or reading physical media.
  - _Technical:_ Uses a local neural network/vision model to detect characters
    through the camera feed in real-time.
- **Document Reader (Clipboard/File parsing):**
  - _UX:_ Users paste a WeChat message into Pleco to turn raw text into a
    tap-to-translate interface.
- **SRS Flashcards (Add-on):**
  - _UX:_ Users bulk-add vocabulary lists and review them using highly
    customizable SM-2 algorithms.
- **Stroke Order Animations:**
  - _UX:_ Users watch an animation to learn correct stroke direction for
    calligraphy.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** The undisputed "must-have" tool. Incredible depth and
  lifetime-purchase model for add-ons.
- **Cons & Frustrations:**
  - **SRS Configuration:** The flashcard system is notoriously complex. Users
    find it very difficult to configure for a productive daily study volume.
  - **Syncing Annoyances:** Manual import/export between devices (e.g., iPhone
    to iPad) is a massive pain point. Users beg for automated cloud syncing.
  - **UI Workflow:** Keeping Pleco open while reading in another app is annoying
    due to screen real estate; users rely heavily on OS "slide-over" features.
  - **Dictionary Content:** Some definitions are perceived as dated or
    culturally biased.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Pleco is almost universally praised as the
  "industry gold standard." Users love the massive offline dictionary, the
  nuanced definitions, and the non-predatory business model (one-time purchases
  instead of subscriptions). The OCR (camera translation) is considered
  indispensable.
- **What Users Hate (1-Star):**
  - **Steep Learning Curve:** New users hate the dense, "dated," and cluttered
    UI. It offers zero hand-holding.
  - **SRS Configuration:** The flashcard system is notoriously complex. Users
    find it very difficult to configure for a productive daily study volume.
  - **Not a "Course":** People expecting a gamified language app (like Duolingo)
    leave 1-star reviews when they realize it's just a reference tool.
  - **Syncing Annoyances:** Manual import/export between devices (e.g., iPhone
    to iPad) is a massive pain point.

---

## 3. Skritter

**Primary Focus:** Muscle memory, character handwriting, and tone retention.

### 🔷 Core Features

- **Canvas Handwriting with Stroke Enforcement:**
  - _UX:_ Users draw the Chinese character using their finger. The app rejects
    wrong strokes. This forces active recall and builds physical muscle memory.
  - _Technical:_ Uses a vector-based canvas combined with a stroke-matching
    algorithm that compares user input vectors against a database of acceptable
    paths (similar to HanziWriter, but with grading logic).
- **Spaced Repetition System (SRS):**
  - _UX:_ The app manages when characters should be reviewed; users clear their
    "Due" queue daily.
- **Tone Practice Mode:**
  - _UX:_ Users swipe the screen in the direction of the tone to isolate tone
    recall from meaning recall.

### ➕ Extra Features

- **Curated Textbook/HSK Decks:**
  - _UX:_ Users download the exact textbook they are using in university to sync
    with their class.
- **Video Lessons:**
  - _UX:_ Short videos explaining character etymology for mnemonic memory hooks.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** The best app for muscle memory and long-term character retention.
  Sleek UI.
- **Cons & Frustrations:**
  - **Stroke Recognition:** A major ergonomic frustration is that the app
    sometimes fails to register small strokes (especially with styluses),
    forcing users to annoyingly rewrite strokes repeatedly.
  - **Review Fatigue:** Users frequently complain about massive "review
    backlogs" if they miss a few days.
  - **Feature Requests:** Users wish they could disable specific card types
    (like writing) for individual decks, or remember custom review settings per
    deck combination.
  - **Learning Approach:** Trying to learn entire vocabulary lists in Skritter
    rather than focusing on radicals/single characters often feels
    counterproductive. Users wish it integrated context-heavy stories like
    DuChinese.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users love that it forces active recall for
  writing characters. It's often called the "gold standard" for mastering stroke
  order. They love the intuitive canvas and how it builds physical muscle
  memory.
- **What Users Hate (1-Star):**
  - **High Costs:** The most common 1-star review cites the exorbitant
    subscription price compared to free alternatives like Anki.
  - **Stroke Recognition Bugs:** A major ergonomic frustration is that the app
    sometimes fails to register small strokes (especially with styluses),
    forcing users to annoyingly rewrite strokes repeatedly.
  - **Review Fatigue:** Users frequently complain about massive "review
    backlogs" if they miss a few days.
  - **Rigid Algorithms:** Users hate that the algorithm sometimes forces them to
    repeat characters they already know, with no easy way to filter or disable
    specific card types.

---

## 4. HelloChinese

**Primary Focus:** Comprehensive beginner curriculum (The "Better Duolingo").

### 🔷 Core Features

- **Path-based Curriculum (Tree):**
  - _UX:_ Users progress through a linear map. This removes decision fatigue.
- **Speech Recognition (Speaking Practice):**
  - _UX:_ Users hold the mic and speak a prompted sentence to build confidence
    before speaking to humans.
  - _Technical:_ Uses device-native speech recognition APIs combined with
    acoustic models tuned for Mandarin tones.
- **Grammar Explanations:**
  - _UX:_ Users read a dedicated "Tips" page explaining grammar rules before
    lessons to prevent trial-and-error frustration.

### ➕ Extra Features

- **Immersive Video Clips:**
  - _UX:_ Users watch short clips of native Chinese people on the street saying
    the target phrase to expose them to real-world accents.
- **Podcast Lessons:**
  - _UX:_ 15-minute audio lessons discussing grammar, used during commutes.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Widely considered the best "all-rounder" for the first 2 years of
  study. Superior to Duolingo.
- **Cons & Frustrations:**
  - **Abandoned Content:** Users "hate" that the app has not finished adding HSK
    4 vocabulary or updated its core content in several years.
  - **Repetitive Curriculum:** Users are annoyed by having to review known
    vocabulary and complain that sentences do not vary enough. They wish for the
    ability to skip around within units.
  - **Removed/Missing Features:** Users highly miss the old "daily review"
    button. Many wish for Duolingo-style gamification (leagues/streaks).
  - **Aesthetics & Audio:** Recent App Store 1-star reviews explicitly cite the
    introduction of "AI slop" imagery as a reason for downgrading the app.
    Furthermore, users wish the app would provide broader regional voice
    variations rather than focusing strictly on Beijing dialects.
  - **Pricing & Paywalls:** A massive source of 1-star App Store reviews is
    users hitting a hard premium paywall unexpectedly after enjoying the initial
    free lessons. Users wish for a lifetime license option instead of confusing
    premium tiers.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Highly praised as a superior alternative to
  Duolingo for Mandarin. Users love the bite-sized lessons, the clear grammar
  explanations, and the inclusion of native speaker video clips.
- **What Users Hate (1-Star):**
  - **The "Bait and Switch" Paywall:** The massive majority of 1-star reviews
    come from users who loved the free beginning levels, only to suddenly hit a
    hard premium paywall without warning.
  - **Abandoned Content:** Users hate that the app has not finished adding HSK 4
    vocabulary or updated its core content in several years, leading to a
    "ceiling" for intermediate learners.
  - **Aesthetics & "AI Slop":** Recent App Store 1-star reviews explicitly cite
    the introduction of "AI slop" imagery as a reason for downgrading the app.
  - **Missing Features:** Users highly miss the old "daily review" button that
    was removed.

---

## 5. SuperChinese

**Primary Focus:** AI-driven speaking assessment and advanced path learning.

### 🔷 Core Features

- **Path-based Curriculum (Up to HSK 5):**
  - _UX:_ Extends deep into advanced territory to bridge the gap between
    beginner and intermediate proficiency.
- **AI Speaking Assessment (Pitch Contour):**
  - _UX:_ Displays a visual pitch contour line of the user's voice overlaid on a
    native speaker's pitch contour. Users use visual feedback to physically
    adjust their vocal pitch.
  - _Technical:_ Leans on cloud-based speech-to-text AI models that score
    phonetic accuracy and tonal pitch contours against native baselines.
- **Dialogue-Based Learning:**
  - _UX:_ Users listen to long, continuous conversations between characters to
    build real-world stamina.

### ➕ Extra Features

- **AI Chat / Roleplay (CHAO):**
  - _UX:_ A chatbot interface for open-ended conversation practice where the AI
    corrects grammar.
- **Collectible Culture Cards:**
  - _UX:_ Users unlock digital cards explaining Chinese culture as daily rewards
    for gamification.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Feels like a real "classroom." Great for progressing past beginner
  levels.
- **Cons & Frustrations:**
  - **AI Feedback Failures:** Users highly complain that the AI is unhelpful—it
    tells them they are wrong or mispronounced a word, but doesn't explain _why_
    or how to fix it.
  - **Missing Features:** Users wish for traditional character support and
    specific calligraphy exercises.
  - **Technical Instability:** Frustrations over server outages, lag, and losing
    daily streaks due to bugs.
  - **Pacing:** Introduces vocabulary very quickly with less repetition than
    competitors. Users wish for more control over their learning path (e.g.,
    ability to skip easily).

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users love the structured, "all-in-one"
  progression (HSK 1–5). The bite-sized 10-minute lessons are highly praised for
  building a daily habit. Users love the instant granular feedback on tones and
  pronunciation.
- **What Users Hate (1-Star):**
  - **AI Feedback Failures:** The "Chao" AI chatbot gets heavy 1-star criticism
    for being vague and unhelpful when users make mistakes.
  - **Technical Bugs:** Hate for audio playback lag, or tests that require
    "perfect" answers during time-limited tasks.
  - **Pacing:** It introduces vocabulary very quickly, which some find
    overwhelming. Users hate the steep subscription cost given the AI bugs.

---

## 6. Duolingo

**Primary Focus:** Habit-building and gamified micro-learning.

### 🔷 Core Features

- **Gamified Path & Streaks:**
  - _UX:_ Users complete 3-minute lessons daily to keep Streaks alive. The
    psychological hooks force daily practice.
  - _Technical:_ Highly optimized client-server architecture designed for
    offline caching and instant A/B testing of UI elements. Audio is largely
    TTS.
- **Translation Matching:**
  - _UX:_ Drag and drop word bubbles to translate sentences. Low cognitive load.

### ➕ Extra Features

- **Leaderboards (Leagues):**
  - _UX:_ Users compete in weekly groups of 30 to get the most XP, creating
    fierce competition.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Excellent for building a daily habit.
- **Cons & Frustrations:**
  - **Rigid Answer Acceptance:** Users find it infuriating when correct but
    slightly varied translations are rejected. It feels like "guessing the
    developer's preferred answer" rather than learning Chinese.
  - **Punitive Gamification:** Users "hate" the lives/hearts system, arguing
    that punishing mistakes is counterproductive to language learning.
  - **Lack of Depth:** Users complain about struggling with basic HSK 3 even
    after long periods of use. It severely lacks grammar explanations.
  - **Audio Issues:** The speech recognition accepts incorrect tones, and
    sentences often sound unnatural.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users love how easy it is to build a daily
  habit. The gamification (streaks, leagues) is incredibly effective at bringing
  users back.
- **What Users Hate (1-Star):**
  - **Punitive Gamification:** The #1 source of hate is the "Hearts/Lives"
    system, which users argue punishes mistakes and is counterproductive to
    learning.
  - **Rigid Answer Acceptance:** Users find it infuriating when correct but
    slightly varied translations are rejected.
  - **Lack of Depth:** Users complain about struggling with basic HSK 3 even
    after long periods of use because it severely lacks grammar explanations.
  - **Audio Issues:** The speech recognition is criticized for accepting
    incorrect tones, and the text-to-speech sounds unnatural.

---

## 7. LingoPie

**Primary Focus:** Native video-based immersion.

### 🔷 Core Features

- **Interactive Dual-Subtitles on VOD:**
  - _UX:_ Users watch actual Chinese dramas with both English and Chinese
    subtitles. Consuming entertainment while learning.
  - _Technical:_ A video player wrapper overlaying synced VTT tracks. A
    segmenter (like Jieba) parses text to make words clickable.
- **Click-to-Translate Subtitles:**
  - _UX:_ Clicking an unknown word pauses the video and shows a definition,
    removing the massive hurdle of dictionary lookup during fast TV shows.

### ➕ Extra Features

- **Auto-generated Flashcards:**
  - _UX:_ Clicked words are sent to a flashcard deck alongside the exact
    5-second video clip they appeared in for context review.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Great for exposing learners to "real" native speeds and slang.
- **Cons & Frustrations:**
  - **Lack of Context:** Translations can lack context because they are
    auto-generated.
  - **Content Caps:** Advanced users wish for more high-level content and
    integrated audio/text for deep study.
  - **High Barrier to Entry:** Beginners hit a wall quickly and wish they had
    stronger grammar foundations first.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users love the entertaining methodology of
  learning through TV and movies (the "Netflix of language learning"). The
  interactive "click-to-translate" subtitles and automatic flashcard creation
  are major highlights.
- **What Users Hate (1-Star):**
  - **Subscription Issues:** A massive portion of 1-star reviews complain about
    unexpected auto-renewals, difficult cancellations, and poor refund policies.
  - **Lack of Context:** Translations are sometimes overly literal because they
    are auto-generated.
  - **High Barrier to Entry:** Beginners hit a wall quickly, hating the
    native-speed dialogue without having foundational grammar first.

---

## 8. LingoDeer

**Primary Focus:** Grammar-centric path learning with multi-language support.

### 🔷 Core Features

- **Grammar-focused Path:**
  - _UX:_ Lessons organized around grammatical concepts. Users use this to truly
    understand sentence structure.
  - _Technical:_ Robust mobile/web client with structured, locally cached lesson
    payloads.

### ➕ Extra Features

- **Web Browser Access:**
  - _UX:_ Users can log in on laptops to type answers using a physical keyboard,
    preferred by serious students.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Clean interface, great for users studying multiple Asian languages.
- **Cons & Frustrations:**
  - **Hidden Progress:** Users wish they could see a full, transparent list of
    all the characters they have learned (like HelloChinese provides).
  - **Annoying UI Crutches:** Users complain that the red "stroke order arrows"
    in practice mode are counterproductive, as users just follow the arrows
    blindly rather than learning the character.
  - **Paywalls:** Users were annoyed when the app transitioned to stricter
    paywalls after the initial "Basics 1" level.
  - **Pacing:** Lessons feel slightly more "passive." Users frequently request
    more audio resources and native speaking exercises.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users love the structured, "teacher-led" feel of
  the lessons. It is widely praised as being significantly better than Duolingo
  for Asian languages, specifically due to its clear grammar explanations.
- **What Users Hate (1-Star):**
  - **Aggressive Paywall:** The most common source of 1-star reviews is from
    users who hit a hard paywall after the "Basics 1" section and feel tricked.
  - **Annoying UI Crutches:** Users complain that the red "stroke order arrows"
    in practice mode are counterproductive (users follow the arrows blindly
    rather than learning).
  - **Hidden Progress:** Users hate that there is no transparent list of all the
    characters they have actually learned.

---

## 9. Pingo (Pingo AI)

**Primary Focus:** AI Voice Chat & Roleplay.

### 🔷 Core Features

- **AI Voice Roleplay Scenarios:**
  - _UX:_ Users select a scenario (e.g., "At the airport") and reply verbally to
    an AI. Used to practice spontaneous speech output without the embarrassment
    of talking to humans.
  - _Technical:_ Integrates LLMs (like GPT-4) with prompt-engineering, piped
    through high-quality STT and TTS pipelines.

### ➕ Extra Features

- **Pronunciation & Grammar Feedback:**
  - _UX:_ After the conversation, the app provides a report on what was said
    wrong.

### 🗣️ Community Feedback & Wishes (Reddit)

- **Pros:** Great for reducing anxiety of speaking.
- **Cons & Frustrations:**
  - **Technical Glitches:** Users complain about app lag and the microphone
    cutting off the first or last word of their sentences.
  - **AI Memory & Feedback:** Users find it annoying that the AI doesn't
    remember previously learned words. The feedback is often superficial (just
    echoing the user) rather than explaining how to improve.
  - **Forced Memorization:** Users "hate" UI features that hide the text of a
    phrase, forcing them to memorize it instead of allowing them to review it.
  - **Speech Recognition:** It is "too forgiving" for Mandarin tones.
  - **Friction:** Users are annoyed by forced account sign-ins and high
    subscription paywalls just to test the app.

### ⭐ App Store Reviews (Love & Hate)

- **What Users Love (5-Star):** Users love the low-pressure practice; it reduces
  the anxiety of speaking to real humans. The immersive "Roleplay" mode is
  highly praised for simulating real conversations instantly.
- **What Users Hate (1-Star):**
  - **Lenient Speech Recognition:** Users hate that the app is "too forgiving"
    for Mandarin tones, accepting incorrect pronunciation or nonsense words.
  - **AI Memory & Feedback:** Users find it annoying that the AI doesn't
    remember previously learned words. The feedback is often superficial (just
    echoing the user).
  - **Forced Memorization:** Users hate UI features that hide the text of a
    phrase, forcing memorization instead of review.
  - **Subscription & Friction:** Users are highly annoyed by forced account
    sign-ins and high subscription paywalls just to test the app.

---

## Synthesis: Feature Ideas for Our App

Based on the UX maps, Technical implementations, and the deep Community Feedback
(Love/Hate) we gathered, here is an expanded and rated list of high-value
features we should consider building next:

### 1. Pinyin Toggle (Global Hide/Show)

- **Score:** **10/10** (Extremely Useful & Low Effort)
- **Cost:** **Free** (Purely client-side CSS and Javascript).
- **Why:** The most requested feature in reading apps (like DuChinese). It
  forces active character recognition. Beginners can lean on it, and
  intermediate users can hide it to avoid relying on a crutch.
- **Tech:** Add a CSS class `.hide-pinyin` to the body that sets `opacity: 0` on
  `.card-p` elements, linked to a simple UI toggle switch.

### 2. Spaced Repetition Workload Management (Vacation Mode)

- **Score:** **9/10** (Extremely Useful & Medium Effort)
- **Cost:** **Free** (Purely client-side logic in IndexedDB).
- **Why:** The #1 complaint on Reddit across Skritter, Duolingo, and others is
  "review backlog fatigue." Punitive systems cause users to quit.
- **Tech:** Add a "Vacation Mode" to pause SRS decay, or a "Max Daily Reviews"
  cap in `cards.js` to ensure users don't get overwhelmed if they miss a few
  days.

### 3. Tap-to-Translate in Texts (Seamless Lookup)

- **Score:** **9/10** (Highly Useful & Medium Effort)
- **Cost:** **Free** (Client-side text segmentation using the local dictionary).
- **Why:** Users hate "lookup disruption" (being kicked out of a story to look
  up a word). A seamless, inline tap-to-translate (like LingoPie or DuChinese)
  is the highest value feature for a reading app.
- **Tech:** Use `Intl.Segmenter` (or a lightweight JS port of Jieba) to wrap
  words in `<span>` tags in `texts.js`. Clicking a span opens a small,
  non-intrusive tooltip using our dictionary.

### 4. Contextual Flashcards

- **Score:** **8/10** (Highly Useful & Low Effort)
- **Cost:** **Free** (String manipulation stored in local IndexedDB).
- **Why:** Rote memorization of isolated words is boring and lacks context.
  Adding the sentence the word was found in provides a massive memory hook (a
  feature loved in LingoPie and DuChinese).
- **Tech:** When a user taps a word in a text to save it, pass the parent
  sentence string into the `putCard` payload in `store.js`.

### 5. Easy Cloud or File Syncing (JSON Export/Import)

- **Score:** **8/10** (Highly Useful & Low Effort)
- **Cost:** **Free** (Generating a local JSON Blob file download costs nothing.
  If we ever build cloud-sync, Firebase/Supabase free tiers would cover
  thousands of users).
- **Why:** The biggest complaint about Pleco is manual, annoying device syncing.
  Since our app is local-first (IndexedDB), providing a one-click "Export Data"
  and "Import Data" button is crucial so users don't lose progress if they clear
  their browser cache.
- **Tech:** A JS script that stringifies the `store.js` IndexedDB state and
  triggers a `.json` file download/upload.

### 6. Export to Anki

- **Score:** **7/10** (Useful & Low Effort)
- **Cost:** **Free** (Client-side generation of a CSV file).
- **Why:** Power users live and die by Anki. Allowing them to export their
  vocabulary list prevents them from feeling "trapped" in our ecosystem.
- **Tech:** A JS script that iterates over `settings.history` or vocabulary
  arrays and triggers a Blob `.csv` download formatted for Anki imports.

### 7. Strict Handwriting Mode

- **Score:** **6/10** (Useful but High Effort)
- **Cost:** **Free** (HanziWriter is an open-source library that runs entirely
  in the browser).
- **Why:** Users love muscle memory practice, but hate paying $15/month for
  Skritter. However, Skritter users heavily complain about strict stroke
  recognition failing on small screens/styluses, meaning getting the UX right is
  difficult.
- **Tech:** We already use HanziWriter. We can build a "Quiz" mode utilizing
  HanziWriter's `quiz()` API with strict options, logging failures to our SRS
  queue.

### 8. Granular Flashcard Disabling/Filtering

- **Score:** **6/10** (Useful & Medium Effort)
- **Cost:** **Free** (Client-side array filtering).
- **Why:** Users hate being forced to study cards they don't want (a massive
  Skritter complaint). Allowing users to disable specific card types (e.g.,
  "Don't test me on writing, only reading") gives them control over their
  pacing.
- **Tech:** Add filter toggles in the study view that filter out certain card
  types from the SRS array before the session begins.

### 9. Pitch Contour Visualizer (Web Audio API)

- **Score:** **4/10** (Niche & Very High Effort)
- **Cost:** **Free** (If processing pitch purely locally via the browser's Web
  Audio API). Doing this via cloud APIs (like Google Cloud Speech) would cost
  around $0.024 per minute of audio.
- **Why:** Tones are the hardest part of Mandarin. Visual feedback is incredibly
  helpful (loved in SuperChinese). However, it requires complex signal
  processing that might be overkill for a lightweight web app, and speech
  recognition APIs are notoriously bad at grading Mandarin tones (a major
  complaint for Pingo).
- **Tech:** Implement Web Audio API to record the user's voice and run a Pitch
  Detection Algorithm (PDA) to map their pitch against the TTS pitch.

### 10. AI Grammar Explanations & Sentence Generation

- **Score:** **9/10** (Highly Useful & Low Effort with API)
- **Cost:** **~$0.0001 per call** (Using Gemini 1.5 Flash or Claude 3 Haiku). A
  heavy user asking for 50 grammar explanations a day would cost you about
  **$0.15 per month**. Alternatively, using a local WebGPU LLM is **Free**.
- **Why:** Users hate when apps like Duolingo or SuperChinese mark them wrong
  without explaining _why_. A simple "Explain this grammar" button is a massive
  quality-of-life upgrade that bridges the gap between a flashcard app and a
  real tutor.
- **Tech (LLM Integration):**
  - **Cheap API (Recommended):** Using a fast, cheap model like Gemini 1.5 Flash
    or Claude Haiku costs fractions of a cent per query and provides instant,
    highly accurate grammar breakdowns.
  - **Local LLM (Alternative):** WebGPU (via WebLLM) could run a small,
    quantized model entirely locally in the browser for zero cost and 100%
    privacy, though it requires users to have decent hardware and wait for an
    initial model download.

### 11. AI Voice Roleplay (Conversation Practice)

- **Score:** **8/10** (Highly Useful & Medium Effort)
- **Cost:** **~$0.001 per conversation** (Using Gemini 1.5 Flash for the LLM
  logic, and the browser's native Web Speech API for free STT/TTS). A user
  doing a 10-turn conversation daily would cost about **$0.30 per month**.
- **Why:** Like Pingo AI, users love low-anxiety speaking practice. It builds
  confidence before talking to native speakers.
- **Tech (LLM Integration):**
  - Use the browser's native Web Speech API for free Speech-to-Text (STT) and
    Text-to-Speech (TTS).
  - Pipe the transcribed text to a cheap LLM API (like Gemini Flash) with a
    system prompt like: "You are a barista in Beijing. Keep responses under 2
    sentences. Correct my grammar."
  - **Local vs API:** A cheap API is vastly superior here. Local LLMs in the
    browser might be too slow to generate real-time conversational responses,
    breaking the "flow" of the roleplay.
