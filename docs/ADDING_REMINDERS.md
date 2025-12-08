# Adding New Reminder Types

This guide explains how to add new reminder types to the WhatsApp Reminder Bot.

## Overview

The bot supports four reminder types:
- `sunset`: Sunset times (dynamic, from HebCal)
- `candle`: Candle-lighting times (dynamic, from HebCal)
- `prayer`: Prayer times (dynamic, from HebCal)
- `custom`: Custom fixed-time reminders (user-defined HH:MM)

## Steps to Add a New Reminder Type

### 1. Update Database Schema

If needed, update the reminder type constraint in the database. The current schema allows any string value, so no changes are typically needed.

### 2. Update TypeScript Types

Edit `src/db/repositories/reminder.repository.ts`:

```typescript
export type ReminderType = 'sunset' | 'candle' | 'prayer' | 'custom' | 'your_new_type';
```

### 3. Update State Machine

Edit `src/bot/states/selecting-reminder.state.ts`:

```typescript
private readonly reminderTypes: Record<string, ReminderType> = {
  // ... existing types
  '5': 'your_new_type',
  YOUR_NEW_TYPE: 'your_new_type',
};
```

### 4. Update Message Templates

Edit `src/services/message-template.service.ts`:

```typescript
buildReminderMessage(reminderType: ReminderType, time: Date, location?: string): string {
  switch (reminderType) {
    // ... existing cases
    case 'your_new_type':
      return `Your new reminder: ${timeStr}${locationStr}`;
    // ...
  }
}
```

### 5. Update Reminder Processor

Edit `src/scheduler/processors/reminder.processor.ts`:

Add logic to calculate the reminder time for your new type:

```typescript
switch (preference.type) {
  // ... existing cases
  case 'your_new_type':
    // Calculate time for your new reminder type
    reminderTime = calculateYourNewTypeTime(hebcalData);
    break;
}
```

### 6. Update Reminder Dispatcher

Edit `src/scheduler/jobs/reminder-dispatcher.job.ts`:

Add logic to calculate next reminder time:

```typescript
switch (reminder.type) {
  // ... existing cases
  case 'your_new_type':
    reminderTime = calculateYourNewTypeTime(hebcalData);
    break;
}
```

### 7. Update HebCal Integration (if needed)

If your new reminder type requires data from HebCal:

1. Update `src/integrations/hebcal/hebcal.client.ts` to parse the new data
2. Update `src/integrations/hebcal/types.ts` to include new data types
3. Update `src/services/hebcal-sync.service.ts` to cache the new data

### 8. Update User Interface (State Handlers)

Update the prompt messages in state handlers to include your new type:

```typescript
private async sendReminderTypePrompt(phoneNumber: string): Promise<void> {
  const prompt = `Please select a reminder type:
1. Sunset times
2. Candle-lighting times
3. Prayer times
4. Custom time reminder
5. Your new reminder type  // Add this
`;
}
```

## Example: Adding "Havdalah" Reminder

Here's a complete example of adding a Havdalah (end of Shabbat) reminder:

### 1. Update Types

```typescript
export type ReminderType = 'sunset' | 'candle' | 'prayer' | 'custom' | 'havdalah';
```

### 2. Update State Machine

```typescript
private readonly reminderTypes: Record<string, ReminderType> = {
  // ... existing
  '5': 'havdalah',
  HAVDALAH: 'havdalah',
};
```

### 3. Update Message Template

```typescript
case 'havdalah':
  return `Havdalah reminder: ${timeStr}${locationStr}`;
```

### 4. Update Processor

```typescript
case 'havdalah':
  // Havdalah is typically 42-72 minutes after sunset
  if (!hebcalData.sunsetTime) {
    throw new Error('Sunset time not available for Havdalah');
  }
  reminderTime = new Date(hebcalData.sunsetTime);
  reminderTime.setMinutes(reminderTime.getMinutes() + 50); // 50 minutes after sunset
  break;
```

### 5. Update Dispatcher

Similar logic in the dispatcher to calculate Havdalah time.

## Testing

After adding a new reminder type:

1. Test the onboarding flow
2. Verify reminder is created correctly
3. Check reminder is scheduled properly
4. Verify message is sent at correct time
5. Test with different locations

## Best Practices

1. **Use Descriptive Names**: Clear, lowercase names
2. **Handle Missing Data**: Always check if required HebCal data exists
3. **Error Messages**: Provide clear error messages if data is unavailable
4. **Documentation**: Update this guide with your new type
5. **Testing**: Write tests for new reminder type logic

## Dynamic vs Fixed Time Reminders

- **Dynamic Reminders**: Get time from HebCal API (sunset, candle, prayer)
- **Fixed Time Reminders**: User provides time (custom)

When adding a new type, decide if it's:
- **Dynamic**: Requires HebCal data, location-dependent
- **Fixed**: User provides time, location-independent

## HebCal Data Structure

If you need new data from HebCal, check the API response structure:

```typescript
interface HebCalResponse {
  items: HebCalEvent[];
  // ... other fields
}
```

Parse the events array to find your required data.

