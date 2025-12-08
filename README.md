# WhatsApp Reminder Bot - Backend

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Set up database:**
   - Create a Supabase project at https://supabase.com
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Copy your Supabase URL and keys to `.env`

4. **Set up Redis:**
   - Install Redis locally or use a cloud service
   - Update `REDIS_URL` in `.env`

5. **Configure WhatsApp:**
   - Choose a provider (Twilio, 360dialog, or MessageBird)
   - Set up your WhatsApp Business account
   - Create and approve message templates
   - Update template IDs in `.env`

6. **Run the application:**
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## Environment Variables

See `.env.example` for all required variables. Key sections:

- **Server**: Port and environment
- **Supabase**: Database connection
- **Redis**: Queue system connection
- **WhatsApp**: Provider configuration and templates
- **Admin**: API keys for admin access
- **Google Sheets**: Optional export feature
- **HebCal**: Calendar API configuration

## Required Variables

Minimum required variables to run:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (or `REDIS_HOST` + `REDIS_PORT`)
- `WHATSAPP_PROVIDER`
- Provider-specific credentials (e.g., `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
- `TWILIO_WHATSAPP_FROM` (or equivalent for your provider)
- `WHATSAPP_TEMPLATE_*` (all four template IDs)
- `ADMIN_API_KEY`
- `ADMIN_JWT_SECRET`

## Optional Variables

- `GOOGLE_SHEETS_*`: Only needed for Google Sheets export
- `LOG_LEVEL`: Defaults to 'info' if not set
- `DEFAULT_TIMEZONE`: Defaults to 'Asia/Jerusalem' if not set

## Testing

```bash
npm test
```

## Documentation

- [Template Approval Guide](../docs/TEMPLATE_APPROVAL.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [API Documentation](../docs/API.md)
- [Adding Reminders Guide](../docs/ADDING_REMINDERS.md)
