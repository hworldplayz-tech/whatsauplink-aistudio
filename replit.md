# WhatsUpLink - WhatsApp Group Directory

## Overview
A Next.js web application that serves as a directory for WhatsApp groups and channels. Users can discover, join, and submit WhatsApp groups from around the world. Built with Firebase (Firestore) for data storage and authentication.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Firebase Firestore
- **AI**: Google Genkit for AI features
- **Email**: EmailJS, Mailchimp
- **UI Components**: Radix UI primitives

## Project Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components (ui, admin, contact, groups, layout, sports)
- `src/firebase/` - Firebase client configuration and providers
- `src/lib/` - Utility functions, data fetching, types, schemas
- `src/ai/` - Genkit AI flows and configuration
- `src/hooks/` - Custom React hooks
- `public/` - Static assets

## Running
- **Dev**: `npm run dev` (runs on port 5000, bound to 0.0.0.0)
- **Build**: `npm run build`
- **Start**: `npm run start` (production, port 5000)

## Configuration
- Next.js configured with `allowedDevOrigins: ['*']` for Replit proxy compatibility
- Firebase config in `src/firebase/config.ts`
- Firebase Admin SDK in `src/lib/firebase-admin.ts`

## Recent Changes
- 2026-02-24: Imported project, configured for Replit environment (port 5000, allowed dev origins)
