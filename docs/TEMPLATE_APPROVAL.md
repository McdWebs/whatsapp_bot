# WhatsApp Template Approval Workflow

WhatsApp requires all outbound messages to use pre-approved message templates. This guide explains how to create and get approval for templates.

## Template Requirements

1. **Template Format**: Templates must follow WhatsApp's template format
2. **Approval Process**: All templates must be approved by WhatsApp before use
3. **Template Variables**: Use parameters for dynamic content

## Required Templates

The bot requires the following templates:

### 1. Welcome Template

**Name**: `welcome_template_id`

**Content**:
```
Welcome! I can help you set up reminders for sunset, candle-lighting, and prayer times. Reply with HELP for commands.
```

**Variables**: None

### 2. Reminder Template

**Name**: `reminder_template_id`

**Content**:
```
Reminder: {{1}} at {{2}}
```

**Variables**:
- `{{1}}`: Reminder type (e.g., "Sunset", "Candle-lighting")
- `{{2}}`: Time (e.g., "18:30")

### 3. Confirmation Template

**Name**: `confirmation_template_id`

**Content**:
```
Your reminder has been set: {{1}}
```

**Variables**:
- `{{1}}`: Confirmation message (e.g., "Sunset reminder at 18:30 in Jerusalem")

### 4. Help Template

**Name**: `help_template_id`

**Content**:
```
Available commands:
• HELP - Show this menu
• STOP / UNSUBSCRIBE - Stop all reminders
• SETTINGS - View your current settings
• CHANGE_REMINDER - Modify your reminders
```

**Variables**: None

## Provider-Specific Instructions

### Twilio

1. Go to Twilio Console → Messaging → Content Templates
2. Create new template for each message type
3. Submit for approval
4. Once approved, note the template SID
5. Update `WHATSAPP_TEMPLATE_*` in `.env`

### 360dialog

1. Go to 360dialog Dashboard → Templates
2. Create new template
3. Submit for WhatsApp approval
4. Wait for approval (usually 24-48 hours)
5. Update template IDs in `.env`

### MessageBird

1. Go to MessageBird Dashboard → WhatsApp → Templates
2. Create template
3. Submit for approval
4. Update template IDs in `.env`

## Approval Process

1. **Submit Template**: Create template in provider dashboard
2. **Wait for Review**: WhatsApp reviews templates (24-48 hours typically)
3. **Approval Status**: Check status in provider dashboard
4. **Update Configuration**: Once approved, update `.env` with template IDs

## Template Best Practices

1. **Keep it Simple**: Clear, concise messages
2. **Use Variables**: For dynamic content (times, locations)
3. **Avoid Promotional Content**: Templates should be informational
4. **Follow Guidelines**: Adhere to WhatsApp's template policies

## Testing Templates

Before going live:

1. Test each template with sample data
2. Verify variable substitution works correctly
3. Check message formatting on mobile devices
4. Test in different languages if needed

## Troubleshooting

### Template Not Approved

- Check rejection reason in provider dashboard
- Revise template content based on feedback
- Resubmit for approval

### Template Not Found

- Verify template ID is correct
- Check template is approved and active
- Ensure provider account has access

### Variables Not Substituting

- Verify variable format matches provider requirements
- Check parameter count matches template variables
- Review provider-specific documentation

