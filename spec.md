# Specification

## Summary
**Goal:** Add a "Video Downloader" tab to the existing All-in-One Conversion Tool that lets users download videos from YouTube and Facebook entirely client-side.

**Planned changes:**
- Add a "Video Downloader" tab to the existing `TabNavigation` component alongside the five current tabs, maintaining existing tab styling and animations.
- Update `App.tsx` to render the new `VideoDownloader` module when the tab is active.
- Create a new `VideoDownloader` module with a URL input field and a "Download" button.
- For YouTube links, call the YouTube Data API v3 (using the provided API key client-side) to fetch video title, thumbnail, and available quality options (360p, 720p, 1080p, etc.).
- For Facebook links, attempt to resolve downloadable stream info via a client-side fetch to publicly accessible embed endpoints.
- Display the video thumbnail, title, and quality selector once metadata is fetched.
- Trigger a browser download via an anchor tag or open the stream URL in a new tab if CORS blocks direct download.
- Show a loading spinner while fetching and a clear error message on invalid/unsupported URLs or API errors.
- Style the module with the existing dark-first glassmorphism design system (glass-card panels, teal/cyan accents, charcoal backgrounds) and ensure mobile-responsive layout.

**User-visible outcome:** Users can paste a YouTube or Facebook video URL, fetch video metadata, select a quality, and download or open the video — all within a new dedicated tab in the tool.
