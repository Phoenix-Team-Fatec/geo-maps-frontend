# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a React Native mobile application built with Expo Router, focused on rural property management and addressing (CAR - Cadastro Ambiental Rural). The app provides digital addressing for rural properties, route management, and real-time road conditions.

## Technology Stack
- **Framework**: React Native with Expo (v54)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Fonts**: Custom Poppins and Lato fonts with global font configuration
- **Architecture**: New Architecture enabled
- **TypeScript**: Strict mode enabled with path aliases (@/*)

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server
npm start
# or
npx expo start

# Platform-specific builds
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser

# Linting
npm run lint

# Reset project (moves starter code to app-example)
npm run reset-project
```

## Project Structure

### File-based Routing (app/ directory)
- `app/_layout.tsx` - Root layout with Stack navigation and splash screen logic
- `app/index.tsx` - Welcome screen with app introduction and onboarding
- `app/create-account.tsx` - Account creation flow
- `app/create-profile.tsx` - User profile setup
- `app/template-page.tsx` - Template/visitor mode page

### Components Architecture
- `components/initial-screen/` - Splash screen and initial app experience
- `components/login-screen/` - Authentication related components
- Custom fonts are loaded globally via `config/font-config.ts`

### Key Configuration Files
- `config/font-config.ts` - Font loading and global font setup (Poppins/Lato)
- `app.json` - Expo configuration with splash screen, icons, and platform settings
- `tailwind.config.js` - NativeWind/Tailwind configuration
- `global.css` - Global styles imported in root layout

## Architecture Notes

### Splash Screen Flow
The app uses a custom splash screen system:
1. Fonts load via `useAppFonts()` hook
2. Global font is set to Poppins-Regular when loaded
3. Custom splash screen shows for 2.5 seconds minimum
4. Navigation proceeds to main app after fonts load and timer completes

### Font System
- Custom font loading with Poppins (Regular, Bold, Light, SemiBold) and Lato families
- Global font application to all Text and TextInput components
- Font constants exported via `FONT_FAMILIES` object

### Styling Approach
- Primary use of NativeWind (Tailwind) classes
- Custom color scheme: dark theme with `#1a1a2e` background and `#00D4FF` accent
- Animated components using React Native Animated API
- Custom shadow and elevation effects

### Navigation Structure
Stack-based navigation with hidden headers for all screens. File-based routing through Expo Router with typed routes enabled.

## Development Notes
- TypeScript strict mode is enabled
- Path alias `@/*` maps to root directory
- New React Architecture and React Compiler experiments enabled
- Edge-to-edge display enabled on Android
- Predictive back gesture disabled on Android