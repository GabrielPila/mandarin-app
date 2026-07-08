# Changelog

All notable changes to the Mandarin App will be documented in this file.

## [v0.6.2] - Reader UX Polish
- **Fixed:** Tone marks now render at a much larger, readable size when "Tones" mode is active.
- **Fixed:** Chinese characters in the Text Reader now correctly scale dynamically with the global Text Size setting.
- **Changed:** Removed speaker names from being spoken aloud by the audio reader to improve immersion.

## [v0.6.1] - Voice Actors
- **Added:** Smart Auto-Casting: The audio reader now dynamically assigns Male and Female voices to characters based on the speaker's name.
- **Added:** Fallback Pitch-Shifting for iOS/Mac users to simulate male voices if premium ones are unavailable.

## [v0.6] - Interactive Reader & Premium Voices
- **Added:** Interactive Text Reader: texts are now read line-by-line with visual highlighting.
- **Added:** Click-to-Play: tap any sentence in a text to instantly start reading from there.
- **Added:** Voice speed control slider in Settings (0.5x to 1.5x).
- **Added:** Voice selection dropdown, heavily filtered to only show high-quality premium/neural voices (auto-detects source).
- **Changed:** The main text audio button is now a Play/Stop toggle.

## [v0.5] - Stroke Tracing & Streaks
- **Added:** Interactive Stroke Order Quiz (✍️ Practice button).
- **Added:** Daily Study Streaks tracking in the "Estudiar" tab.
- **Added:** 14-Day Activity Heatmap (GitHub-style contributions graph).

## [v0.4] - Audio & Themes
- **Added:** Text-to-Speech audio support (🔊 Speak button).
- **Added:** Premium Day/Night/System theme toggle engine.
- **Changed:** Bespoke porcelain/jade colors for Light Mode and slate/teal for Dark Mode.

## [v0.3] - UI Facelift
- **Changed:** Entire UI redesigned with modern Glassmorphism aesthetics.
- **Added:** Customizable text size slider in the Settings tab.
- **Changed:** Improved responsive layouts for mobile and tablet compatibility.

## [v0.2] - Book 2 Expansion
- **Added:** Book 2 vocabulary integration (Lessons 11-20).
- **Added:** "Repaso libre por lección" (Cram sessions) now broken down by Book 1 and Book 2.

## [v0.1] - Initial MVP
- **Added:** Base Offline PWA setup (`sw.js`).
- **Added:** Simple SRS (Spaced Repetition System) for Book 1 vocabulary.
- **Added:** Dictionary search and basic tab navigation.
