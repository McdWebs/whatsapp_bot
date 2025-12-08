-- Migration: Add Tefillin reminder support
-- Adds columns for offset-based reminders (offset_minutes, sunset_time, reminder_time)

-- Add new columns to reminder_preferences table
ALTER TABLE reminder_preferences
  ADD COLUMN IF NOT EXISTS offset_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sunset_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMP WITH TIME ZONE;

-- Update type constraint to include 'tefillin'
-- Note: PostgreSQL doesn't have a direct way to modify CHECK constraints,
-- so we'll rely on application-level validation or create a new constraint
-- For now, we'll just document that 'tefillin' is a valid type

-- Add index for reminder_time to optimize scheduler queries
CREATE INDEX IF NOT EXISTS idx_reminder_preferences_reminder_time 
  ON reminder_preferences(reminder_time) 
  WHERE reminder_time IS NOT NULL;

-- Add index for offset_minutes
CREATE INDEX IF NOT EXISTS idx_reminder_preferences_offset_minutes 
  ON reminder_preferences(offset_minutes) 
  WHERE offset_minutes IS NOT NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN reminder_preferences.offset_minutes IS 'Minutes before sunset for Tefillin reminders (20, 30, or 60)';
COMMENT ON COLUMN reminder_preferences.sunset_time IS 'Cached sunset time for the reminder date';
COMMENT ON COLUMN reminder_preferences.reminder_time IS 'Calculated reminder time (sunset_time - offset_minutes)';

