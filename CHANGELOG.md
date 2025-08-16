# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-01-16

### Added
- MIT License (same as Next.js)
- Comprehensive README.md with setup instructions and architecture overview
- Open source preparation with repository metadata
- Keywords and homepage information in package.json

### Changed  
- Updated all package versions to 0.2.1
- Made main package.json public for open source release
- Enhanced project documentation for contributors

### Map Controls & Location Features
- Disabled camera controls on Google Maps using `disableDefaultUI: true` 
- Added circular "Get My Location" target button positioned like Google Maps
- Replaced large "Confirm Location" button with clean close-on-icon-click UX
- Map icon turns blue when map is open to indicate close functionality
- Location is automatically stored in URL when dragging map (no redirect needed)
- Added Cancel/Save buttons only for address editing mode

### Places Autocomplete Modernization
- Upgraded from deprecated `google.maps.places.Autocomplete` to `google.maps.places.PlaceAutocompleteElement`
- Fixed location updates when selecting from Places dropdown
- Added left-aligned styling for autocomplete results
- Improved error handling and event listeners

### Bug Fixes
- Fixed Google Maps loader conflicts between map and autocomplete
- Resolved Biome linting issues (removed unused imports, fixed dependencies)
- Fixed location coordinate updates when using GPS or address selection

## [0.1.0] - 2025-01-15

### Added
- Initial monorepo setup with Turborepo
- Next.js 15 frontend with React 19 and Tailwind CSS
- Nitro backend API with Vercel AI SDK integration
- Supabase database and authentication
- Google Maps integration with custom location picker
- AI-powered dish search and recommendations
- User profiles and taste preferences
- Image sourcing from Google Images and Unsplash
- Real-time dish streaming during AI generation
- OAuth authentication with multiple providers
- Shared TypeScript types package
- Biome for code formatting and linting

### Architecture
- API-first design with clear separation of concerns
- Shared types ensuring consistency between frontend and backend  
- Row Level Security policies for data access
- Real production data (no mock data policy)
- Location-centric user experience