# Deployment Guide

This guide covers deploying the WhatsApp Reminder Bot to Render.

## Prerequisites

- Render account
- GitHub repository
- Supabase project
- Redis instance (Render Redis or external)
- WhatsApp Business API access

## Step 1: Prepare Repository

1. Ensure all code is committed and pushed to GitHub
2. Verify `.env.example` includes all required variables
3. Test build locally: `npm run build`

## Step 2: Create Supabase Project

1. Create a new Supabase project
2. Run migrations:
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the migration
3. Note your project URL and API keys

## Step 3: Create Redis Instance

### Option A: Render Redis

1. In Render dashboard, create new Redis instance
2. Note the Redis URL

### Option B: External Redis

1. Use Redis Cloud, AWS ElastiCache, or similar
2. Note connection details

## Step 4: Deploy Web Service

1. In Render dashboard, click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure service:

   **Name**: `whatsapp-reminder-bot`

   **Environment**: `Node`

   **Build Command**:
   ```bash
   npm install && npm run build
   ```

   **Start Command**:
   ```bash
   npm start
   ```

   **Health Check Path**: `/health`

4. Set environment variables:

   ```
   NODE_ENV=production
   PORT=10000
   
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   REDIS_URL=your_redis_url
   REDIS_HOST=your_redis_host
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
   
   WHATSAPP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   TWILIO_WEBHOOK_SECRET=your_webhook_secret
   
   WHATSAPP_TEMPLATE_WELCOME=your_welcome_template_id
   WHATSAPP_TEMPLATE_REMINDER=your_reminder_template_id
   WHATSAPP_TEMPLATE_CONFIRMATION=your_confirmation_template_id
   WHATSAPP_TEMPLATE_HELP=your_help_template_id
   
   ADMIN_API_KEY=your_secure_admin_key
   ADMIN_JWT_SECRET=your_jwt_secret
   
   DEFAULT_TIMEZONE=Asia/Jerusalem
   LOG_LEVEL=info
   ```

5. Deploy the service

## Step 5: Configure Webhook

1. Get your webhook URL from Render: `https://your-service.onrender.com/webhook/whatsapp`
2. In your WhatsApp provider dashboard:
   - Go to webhook settings
   - Set webhook URL
   - Enable signature verification
   - Save webhook secret to environment variables

## Step 6: Deploy Admin Dashboard (Optional)

1. Create new Static Site in Render
2. Connect GitHub repository
3. Set root directory: `admin-dashboard`
4. Build command: `npm install && npm run build`
5. Publish directory: `dist`
6. Set environment variables:
   ```
   VITE_API_URL=https://your-service.onrender.com
   VITE_API_KEY=your_admin_api_key
   ```

## Step 7: Verify Deployment

1. Check health endpoint: `https://your-service.onrender.com/health`
2. Test webhook with a test message
3. Verify scheduler is running (check logs)
4. Test admin dashboard (if deployed)

## Step 8: Monitoring

1. Set up log aggregation (optional)
2. Monitor Redis connection
3. Check job queue status
4. Set up alerts for failed reminders

## Environment-Specific Notes

### Development

- Use local Redis instance
- Use Supabase local development (optional)
- Enable debug logging

### Staging

- Use separate Supabase project
- Use test WhatsApp number
- Enable verbose logging

### Production

- Use production Supabase
- Use approved WhatsApp templates
- Set appropriate log levels
- Enable monitoring

## Scaling Considerations

1. **Horizontal Scaling**: Multiple instances can share Redis queue
2. **Database**: Supabase handles connection pooling
3. **Redis**: Use Redis Cluster for high availability
4. **Worker Processes**: Consider separate worker service for job processing

## Troubleshooting

### Build Failures

- Check Node.js version (18+)
- Verify all dependencies in package.json
- Check build logs for errors

### Runtime Errors

- Check environment variables are set
- Verify database connection
- Check Redis connection
- Review application logs

### Webhook Issues

- Verify webhook URL is accessible
- Check signature verification
- Review webhook logs
- Test with provider's webhook tester

### Scheduler Not Running

- Check cron job configuration
- Verify Redis connection
- Check job queue status
- Review scheduler logs

## Backup and Recovery

1. **Database**: Supabase provides automatic backups
2. **Redis**: Configure persistence if needed
3. **Environment Variables**: Store securely (use Render's secret management)
4. **Code**: Version control in GitHub

## Security Checklist

- [ ] All secrets in environment variables
- [ ] Webhook signature verification enabled
- [ ] Admin API key is strong and secure
- [ ] Database access restricted
- [ ] Redis password set
- [ ] HTTPS enabled (automatic on Render)
- [ ] CORS configured appropriately

