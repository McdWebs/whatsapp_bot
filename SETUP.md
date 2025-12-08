# Setup Guide

This guide will help you set up the WhatsApp Reminder Bot from scratch.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- A Redis instance (local or cloud)
- A WhatsApp Business API account via a provider (Twilio, 360dialog, or MessageBird)
- (Optional) Google Cloud account for Sheets export

## Step 1: Clone and Install

```bash
# Navigate to the project
cd whatsapp_bot

# Install backend dependencies
cd backend
npm install

# Install admin dashboard dependencies
cd ../admin-dashboard
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes a few minutes)
3. Go to **Project Settings > API**
4. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret!)
5. Go to **SQL Editor**
6. Copy and run the SQL from `backend/supabase/migrations/001_initial_schema.sql`

## Step 3: Set Up Redis

### Option A: Local Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### Option B: Cloud Redis (Recommended for Production)

- **Render**: Add Redis service in dashboard
- **Railway**: Add Redis service
- **Redis Cloud**: Create free account at [redis.com](https://redis.com)

## Step 4: Configure Environment Variables

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

**Required variables:**
- `SUPABASE_URL` - From Step 2
- `SUPABASE_ANON_KEY` - From Step 2
- `SUPABASE_SERVICE_ROLE_KEY` - From Step 2
- `REDIS_URL` - From Step 3
- `WHATSAPP_PROVIDER` - Choose: `twilio`, `360dialog`, or `messagebird`
- Provider credentials (see below)
- `WHATSAPP_TEMPLATE_*` - Template IDs (see Step 5)
- `ADMIN_API_KEY` - Generate with: `openssl rand -hex 32`
- `ADMIN_JWT_SECRET` - Generate with: `openssl rand -hex 32`

### Admin Dashboard

```bash
cd admin-dashboard
cp .env.example .env
# Edit .env with your actual values
```

**Required variables:**
- `VITE_API_URL` - Backend URL (e.g., `http://localhost:3000`)
- `VITE_API_KEY` - Same as `ADMIN_API_KEY` from backend

## Step 5: Set Up WhatsApp Provider

### Twilio Setup

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get a WhatsApp-enabled number
3. Go to **Console > Account > API Keys & Tokens**
4. Copy:
   - Account SID
   - Auth Token
5. Set `WHATSAPP_PROVIDER=twilio` in `.env`
6. Fill in `TWILIO_*` variables

### 360dialog Setup

1. Sign up at [360dialog.com](https://www.360dialog.com)
2. Get API key from dashboard
3. Set `WHATSAPP_PROVIDER=360dialog` in `.env`
4. Fill in `DIALOG360_*` variables

### MessageBird Setup

1. Sign up at [messagebird.com](https://www.messagebird.com)
2. Get API key from dashboard
3. Set `WHATSAPP_PROVIDER=messagebird` in `.env`
4. Fill in `MESSAGEBIRD_*` variables

## Step 6: Create WhatsApp Templates

**Important:** All outbound messages must use approved templates.

1. Create templates in your provider dashboard:
   - Welcome template
   - Reminder template (with 2 parameters: type, time)
   - Confirmation template (with 1 parameter: message)
   - Help template

2. Submit for WhatsApp approval (takes 24-48 hours)

3. Once approved, copy template IDs to `.env`:
   ```
   WHATSAPP_TEMPLATE_WELCOME=your_welcome_template_id
   WHATSAPP_TEMPLATE_REMINDER=your_reminder_template_id
   WHATSAPP_TEMPLATE_CONFIRMATION=your_confirmation_template_id
   WHATSAPP_TEMPLATE_HELP=your_help_template_id
   ```

See `docs/TEMPLATE_APPROVAL.md` for detailed instructions.

## Step 7: Configure Webhook

1. Get your webhook URL:
   - Local: `http://your-ngrok-url.ngrok.io/webhook/whatsapp`
   - Production: `https://your-service.onrender.com/webhook/whatsapp`

2. Set webhook in your provider dashboard:
   - **Twilio**: Console > Messaging > Settings > WhatsApp Sandbox Settings
   - **360dialog**: Dashboard > Webhooks
   - **MessageBird**: Dashboard > Webhooks

3. Enable signature verification and save the secret to `.env`

## Step 8: Run the Application

### Development

**Backend:**
```bash
cd backend
npm run dev
```

**Admin Dashboard:**
```bash
cd admin-dashboard
npm run dev
```

### Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Admin Dashboard:**
```bash
cd admin-dashboard
npm run build
# Serve the dist/ folder with a static server
```

## Step 9: Test

1. Send a WhatsApp message to your bot number
2. You should receive a welcome message
3. Follow the onboarding flow
4. Check admin dashboard at `http://localhost:3001`

## Troubleshooting

### Database Connection Issues

- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure migration was run successfully

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check `REDIS_URL` format: `redis://host:port` or `redis://password@host:port`
- For cloud Redis, use the provided connection string

### WhatsApp Not Receiving Messages

- Verify webhook URL is accessible
- Check webhook signature verification
- Ensure templates are approved
- Check provider dashboard for delivery status

### Scheduler Not Running

- Check Redis connection
- Verify cron jobs are enabled
- Check application logs for errors

## Next Steps

- Read [Deployment Guide](docs/DEPLOYMENT.md) for production deployment
- Read [API Documentation](docs/API.md) for API endpoints
- Read [Adding Reminders Guide](docs/ADDING_REMINDERS.md) to add new reminder types

## Getting Help

- Check application logs for detailed error messages
- Review documentation in `docs/` folder
- Verify all environment variables are set correctly

