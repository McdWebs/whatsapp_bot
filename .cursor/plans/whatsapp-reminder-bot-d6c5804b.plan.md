<!-- d6c5804b-d6d6-4e12-a09d-a69b86d33bc2 713affcb-e7dc-4126-a993-7e3f2dcfd077 -->
# WhatsApp Reminder Bot - Implementation Plan

## Architecture Overview

- **Backend**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Queue System**: BullMQ + Redis
- **WhatsApp**: Third-party provider integration (Twilio/360dialog/MessageBird compatible)
- **Scheduler**: BullMQ workers for reminder dispatch
- **Admin**: React dashboard + Google Sheets export
- **Deployment**: Render-ready configuration

## Phase 1: Project Setup & Configuration

### 1.1 Initialize Project Structure

- Set up Express + TypeScript project with proper folder structure
- Configure ESLint, Prettier, and TypeScript compiler
- Create `.env.example` with all required variables
- Set up package.json with dependencies (express, @supabase/supabase-js, bullmq, ioredis, etc.)

**Files to create:**

- `package.json`
- `tsconfig.json`
- `.env.example`
- `src/index.ts` (main entry point)
- `src/config/index.ts` (configuration management)

### 1.2 Database Schema Design

Create Supabase migration files for:

- `users` table (id, phone_number, current_state, created_at, updated_at)
- `reminder_preferences` table (id, user_id, type, time, location, enabled, created_at)
- `reminder_history` table (id, user_id, type, sent_at, delivery_status, error_message)
- Indexes on foreign keys and frequently queried fields

**Files to create:**

- `supabase/migrations/001_initial_schema.sql`

## Phase 2: Core Infrastructure

### 2.1 Database Layer

- Create Supabase client wrapper
- Implement repository pattern for Users, ReminderPreferences, ReminderHistory
- Add connection pooling and error handling

**Files to create:**

- `src/db/supabase.ts` (client initialization)
- `src/db/repositories/user.repository.ts`
- `src/db/repositories/reminder.repository.ts`
- `src/db/repositories/history.repository.ts`

### 2.2 WhatsApp Integration

- Create abstract WhatsApp provider interface
- Implement provider adapter (supporting Twilio, 360dialog, MessageBird patterns)
- Webhook endpoint with signature verification
- Template message sender with retry logic
- Error handling and delivery status tracking

**Files to create:**

- `src/integrations/whatsapp/types.ts`
- `src/integrations/whatsapp/base.provider.ts`
- `src/integrations/whatsapp/twilio.provider.ts` (example implementation)
- `src/integrations/whatsapp/message.service.ts`
- `src/api/webhooks/whatsapp.webhook.ts`

### 2.3 HebCal Integration

- Create HebCal API client
- Implement daily sync job to fetch sunset, candle-lighting, prayer times
- Cache mechanism (store in Supabase cache table or Redis)
- Location-based data fetching (Israel cities support)
- Timezone handling (Israel DST support)

**Files to create:**

- `src/integrations/hebcal/hebcal.client.ts`
- `src/integrations/hebcal/types.ts`
- `src/services/hebcal-sync.service.ts`
- `src/db/repositories/hebcal-cache.repository.ts`

## Phase 3: User Management & State Machine

### 3.1 State Machine

- Implement conversation state machine for onboarding flow
- States: INITIAL, SELECTING_REMINDER_TYPE, SELECTING_TIME, SELECTING_LOCATION, CONFIRMED
- State persistence in user.current_state field
- State transition handlers

**Files to create:**

- `src/bot/state-machine.ts`
- `src/bot/states/index.ts`
- `src/bot/states/initial.state.ts`
- `src/bot/states/selecting-reminder.state.ts`
- `src/bot/states/selecting-time.state.ts`
- `src/bot/states/selecting-location.state.ts`

### 3.2 Message Handlers

- Incoming message parser (text, commands, interactive buttons)
- Command handlers: HELP, STOP, UNSUBSCRIBE, SETTINGS, CHANGE_REMINDER, etc.
- Multi-language support (Hebrew + English commands)
- Welcome message handler
- Settings update handlers

**Files to create:**

- `src/bot/message-handler.ts`
- `src/bot/commands/index.ts`
- `src/bot/commands/help.command.ts`
- `src/bot/commands/stop.command.ts`
- `src/bot/commands/settings.command.ts`
- `src/bot/utils/message-parser.ts`

## Phase 4: Reminder Scheduling System

### 4.1 Queue Setup

- Initialize BullMQ with Redis connection
- Create reminder queue and worker
- Job data structure (user_id, reminder_type, scheduled_time, location)
- Retry mechanism with exponential backoff

**Files to create:**

- `src/scheduler/queue.config.ts`
- `src/scheduler/reminder.queue.ts`
- `src/scheduler/reminder.worker.ts`

### 4.2 Scheduler Service

- Per-minute cron job to check pending reminders
- Calculate next reminder time based on user preferences + HebCal data
- Enqueue reminder jobs
- Handle timezone conversions (Israel DST)
- Support for dynamic times (sunset, candle-lighting) vs fixed times

**Files to create:**

- `src/scheduler/scheduler.service.ts`
- `src/scheduler/jobs/daily-hebcal-sync.job.ts`
- `src/scheduler/jobs/reminder-dispatcher.job.ts`
- `src/utils/timezone.utils.ts`

### 4.3 Reminder Execution

- Worker processes reminder jobs
- Fetch user preferences and HebCal data
- Generate personalized message from template
- Send via WhatsApp provider
- Log to ReminderHistory
- Handle failures and retries

**Files to create:**

- `src/scheduler/processors/reminder.processor.ts`
- `src/services/message-template.service.ts`

## Phase 5: Admin Dashboard & Monitoring

### 5.1 Admin API

- Protected admin routes (API key or JWT)
- Endpoints: users list, reminder stats, delivery status, export data
- Google Sheets export integration
- User management endpoints

**Files to create:**

- `src/api/admin/admin.middleware.ts`
- `src/api/admin/admin.routes.ts`
- `src/api/admin/stats.controller.ts`
- `src/api/admin/export.controller.ts`
- `src/services/sheets-export.service.ts`

### 5.2 Admin Dashboard (React)

- Simple React app with authentication
- User list with filters
- Reminder statistics dashboard
- Delivery status monitoring
- Export to Sheets button

**Files to create:**

- `admin-dashboard/package.json`
- `admin-dashboard/src/App.tsx`
- `admin-dashboard/src/components/UserList.tsx`
- `admin-dashboard/src/components/Stats.tsx`
- `admin-dashboard/src/components/ExportButton.tsx`

### 5.3 Logging & Monitoring

- Structured logging (Winston or Pino)
- Error tracking
- Scheduler execution logs
- Delivery failure alerts
- Health check endpoint

**Files to create:**

- `src/utils/logger.ts`
- `src/api/health/health.routes.ts`
- `src/services/monitoring.service.ts`

## Phase 6: Testing & Documentation

### 6.1 Testing

- Unit tests for scheduler, state machine, HebCal integration
- Integration tests for message flow
- Test utilities and mocks

**Files to create:**

- `src/__tests__/scheduler/scheduler.test.ts`
- `src/__tests__/bot/state-machine.test.ts`
- `src/__tests__/integrations/hebcal.test.ts`
- `jest.config.js`
- `src/__tests__/utils/mocks.ts`

### 6.2 Documentation

- Comprehensive README with setup instructions
- WhatsApp template approval workflow guide
- Deployment guide for Render
- API documentation
- Adding new reminder types guide

**Files to create:**

- `README.md`
- `docs/TEMPLATE_APPROVAL.md`
- `docs/DEPLOYMENT.md`
- `docs/API.md`
- `docs/ADDING_REMINDERS.md`

## Phase 7: Deployment Configuration

### 7.1 Render Configuration

- `render.yaml` for service definitions
- Environment variable setup
- Redis service configuration
- Health check configuration
- Build and start scripts

**Files to create:**

- `render.yaml`
- `.renderignore`
- `scripts/build.sh`
- `scripts/start.sh`

## Key Implementation Details

### Reminder Types Supported

- Sunset times (dynamic, from HebCal)
- Candle-lighting times (Shabbat, dynamic)
- Prayer times (dynamic, from HebCal)
- Custom fixed-time reminders (user-defined HH:MM)

### Message Templates

All outbound messages use WhatsApp template format:

- Welcome template
- Reminder confirmation template
- Reminder alert template (with dynamic parameters)
- Help menu template
- Settings update confirmation template

### Error Handling

- Webhook signature validation
- Retry logic with exponential backoff (3 attempts)
- Failed delivery logging
- Dead letter queue for permanently failed jobs

### Scalability Considerations

- Redis connection pooling
- Database query optimization with indexes
- Job queue batching for large-scale reminders
- Caching of HebCal data to reduce API calls