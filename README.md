<h1 align="center">🎵 LyricAI</h1>
<p align="center">
  <b>AI-Powered Lyric Video Generator</b> <br/>
  Create stunning synchronized lyric videos with customizable styles, animation, and real-time previews.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Next.js%2014-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/UI-TailwindCSS%20%2B%20shadcn/ui-38bdf8?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Storage-Cloudinary-orange?style=for-the-badge&logo=cloudinary" />
  <img src="https://img.shields.io/badge/Database-Firebase%20Firestore-ffca28?style=for-the-badge&logo=firebase" />
</p>

---

## 🌌 Overview

**LyricAI** is a next-generation web application designed to automate and simplify the process of creating professional, visually aesthetic lyric videos.

It combines **video processing**, **real-time text synchronization**, and **custom animation controls** into a seamless browser-based workflow.  
The system reads `.srt` subtitle files or extracts lyrics from audio (optionally via AI), overlays them dynamically on uploaded video content, and allows the user to export a rendered lyric video.

---

## 🎯 Core Concept

```mermaid
graph TD
A[User Uploads MP4/SRT] --> B[Lyric Parser]
B --> C[Preview Engine]
C --> D[Style & Animation Layer]
D --> E[FFmpeg Renderer]
E --> F[Cloudinary Upload]
F --> G[Download Final Video]
