# Specification

## Summary
**Goal:** Build a new standalone Multimedia Studio React application with four tool modules: MP3 Cutter, Video Cutter, Video Downloader, and IP Camera.

**Planned changes:**
- Create a new standalone React app with a tabbed navigation layout featuring four tabs: MP3 Cutter, Video Cutter, Video Downloader, and IP Camera
- Add a dark/light mode toggle in the header with smooth tab-switching animations and full mobile responsiveness
- Implement MP3 Cutter: file upload (MP3, AAC, WAV, MP4), Web Audio API waveform visualization on Canvas, two draggable start/end handles, and client-side audio trimming with MP3 download via lamejs
- Implement Video Cutter: file upload (MP4, WebM, MOV, AVI, MKV), HTML5 video preview, timeline scrubber with two draggable trim handles, client-side video extraction via MediaRecorder or ffmpeg.wasm (lazy-loaded), progress indicator, and trimmed video download
- Implement Video Downloader: YouTube URL input, metadata fetch via YouTube Data API v3 (thumbnail and title display), loading spinner, error handling, and a download button that opens the video in a new tab with an explanatory message
- Implement IP Camera: "IP Cam" button that requests webcam access and streams live video, WebRTC ICE candidate extraction to detect and display the local WiFi IP address, a "Stop Camera" button, and error handling for denied permissions
- Apply a cohesive dark-first design system across all modules using deep charcoal/slate backgrounds, teal/cyan accents, glassmorphism card surfaces, crisp white typography, and smooth micro-interaction animations

**User-visible outcome:** Users can open the Multimedia Studio app and use four separate tools — cutting audio files, cutting video clips, previewing and opening YouTube videos, and streaming their webcam while viewing their local network IP — all from a single responsive, visually polished interface with dark/light mode support.
