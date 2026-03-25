# Changelog

All notable changes to the FairOrder product app are documented in this file.

## [0.5.0.0] - 2026-03-25

### Added
- Guest pickup time selection — 15-minute windows generated from operating hours
- Rush distribution — operators can cap orders per time slot (`maxOrdersPerSlot`)
- Order-ready email notifications — optional email at checkout, notified when order is READY
- Analytics dashboard with recharts — orders/day, revenue/day, popular items, peak hours
- Day-end report with print and CSV export
- react-email templates with inline FairOrder logo (magic link + order ready)
- 30 new tests covering all new code paths (136 → 166 total)
- Available time slots API (`GET /api/orders/available-slots`)
- Analytics API (`GET /api/analytics`) with date range support
- Day report API (`GET /api/analytics/day-report`)

### Fixed
- Dashboard overview showed hardcoded "0" for today's orders — now queries actual count
- Analytics page loaded all orders into memory — replaced with aggregate SQL queries
- Replaced `$queryRawUnsafe` with safe `$queryRaw` tagged template literal

### Changed
- Email builders (`buildMagicLinkEmail`, `buildOrderReadyEmail`) are now async (react-email `render()`)
- Kitchen display shows requested pickup time on order cards

## [0.4.0.0] - 2026-03-23

### Added
- Stripe payment integration (pluggable via `PAYMENT_PROVIDER`)
- AI menu extraction from images and URLs (Gemini via Vercel AI SDK)
- Enhanced public menu with search, dietary filters, allergen display
- Image upload for menu items with magic byte validation
- Payment verification cron sweep

## [0.3.0.0] - 2026-03-22

### Added
- Image upload with secure file validation
- Interactive kitchen display with real-time order board (3-column workflow)
- Public ordering flow (cart, checkout, payment)
- Atomic order creation with sequential numbering

## [0.2.0.0] - 2026-03-21

### Added
- Public menu page with QR-scannable URLs
- Kitchen display (token-authenticated)
- QA auth fixes (email validation, mobile login centering)

### Fixed
- Vercel deploy issues (db connection, plunk email, OCR, empty state)

## [0.1.0.0] - 2026-03-20

### Added
- Initial open-source release
- Magic link authentication with session management
- Location management with operating hours
- Menu management (categories, items, sorting)
- 3-step onboarding wizard
- Operator dashboard with sidebar/bottom-tab navigation
