# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chinese tax learning H5 application that implements a spaced repetition system (SRS) using flashcards for tax professionals preparing for certification exams. The application features a 3D card flip interface, mobile-responsive design, and cloud-based progress synchronization using Supabase.

## Architecture

### Frontend Architecture
- **Pure HTML5/CSS3/JavaScript** - No frameworks, minimal dependencies for maximum compatibility
- **Single Page Application (SPA)** - All functionality in one HTML file with event-driven architecture
- **Mobile-first responsive design** - Optimized for touch interactions with 3D CSS animations
- **Chinese language support** - Full localization with proper character encoding

### Data Flow Architecture
1. **Static Content** (`data.json`) - Tax questions and answers stored locally
2. **User Progress** - Synchronized with Supabase cloud database
3. **Local State** - Application state managed in JavaScript variables
4. **User Identification** - Anonymous user IDs generated/stored in localStorage

### Key Components

#### Core Application (`script.js`)
- **Configuration** - Supabase credentials (lines 7-8 need to be replaced with real values)
- **User Management** - Anonymous user ID generation using `getUserId()`
- **Data Loading** - Combines static JSON data with cloud progress in `initializeApp()`
- **Spaced Repetition Algorithm** - Implemented in `calculateNextReviewDate()` with progressive intervals: [1, 2, 4, 8, 16, 32, 64, 128] days
- **Card Management** - `showNextCard()` handles card selection and UI state
- **Progress Sync** - `saveProgress()` uses Supabase upsert with conflict resolution

#### UI Components (`index.html` + `style.css`)
- **3D Card Flip Interface** - CSS transforms with perspective and backface-visibility
- **Responsive Layout** - Flexbox with mobile-optimized breakpoints
- **Interactive Elements** - Touch-friendly buttons with hover/active states
- **Design System** - CSS custom properties for consistent theming

## Database Schema (Supabase)

The application requires a `progress` table with this structure:
```sql
CREATE TABLE progress (
    card_id INTEGER,
    user_id TEXT,
    level INTEGER,
    review_date DATE,
    last_updated TIMESTAMP,
    PRIMARY KEY (card_id, user_id)
);
```

## Development Commands

### Local Development
```bash
# Start local development server
python3 -m http.server 8000
# Then open http://localhost:8000 in browser

# Or open directly in browser
open index.html
```

### Deployment
The application can be deployed to any static hosting service:
- **GitHub Pages** - Free hosting for public repositories
- **Netlify/Vercel** - Modern static hosting with CI/CD
- **AWS S3 + CloudFront** - Scalable enterprise solution

## Configuration Requirements

### Supabase Setup
1. Create Supabase project and obtain:
   - Project URL (line 7 in script.js)
   - Anonymous/public API key (line 8 in script.js)
2. Create `progress` table with specified schema
3. Disable Row Level Security (RLS) for simplicity

### Content Management
- **Tax Questions** - Edit `data.json` to add/modify questions
- **Card IDs** - Must be unique integers
- **Default Values** - New cards start with `level: 0` and `reviewDate: "2023-01-01"`

## Key Technical Details

### Spaced Repetition Algorithm
- **Memory Failure** - Reset to level 0, review next day
- **Memory Success** - Advance level, double interval (up to 256 days)
- **Card Selection** - Sort by review date, show due cards first

### CSS Animation System
- **3D Transforms** - `rotateY(180deg)` for card flip
- **Perspective** - `perspective: 1000px` for 3D effect
- **Timing** - `transition: transform 0.6s` for smooth animation

### User Experience Patterns
- **Anonymous Users** - No authentication required, localStorage-based identification
- **Offline Capability** - Works without internet, syncs when online
- **Progress Persistence** - Cloud-based progress sync across devices

## Browser Compatibility

- **Modern Browsers** - Requires ES6+ support (async/await, arrow functions)
- **Mobile Devices** - Optimized for iOS Safari and Android Chrome
- **Touch Interface** - All interactions designed for touch input
- **Viewport** - Fixed viewport with `user-scalable=no` for consistent experience