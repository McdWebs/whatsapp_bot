-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    current_state VARCHAR(50) NOT NULL DEFAULT 'INITIAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminder preferences table
CREATE TABLE reminder_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'sunset', 'candle', 'prayer', 'custom'
    time VARCHAR(10), -- HH:MM format for custom reminders, NULL for dynamic
    location VARCHAR(100) NOT NULL DEFAULT 'Jerusalem', -- City name for HebCal
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, type)
);

-- Reminder history table
CREATE TABLE reminder_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    error_message TEXT,
    reminder_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HebCal cache table
CREATE TABLE hebcal_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    sunset_time TIMESTAMP WITH TIME ZONE,
    candle_lighting_time TIMESTAMP WITH TIME ZONE,
    prayer_times JSONB, -- Store prayer times as JSON
    raw_data JSONB, -- Store full HebCal response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(location, date)
);

-- Indexes for performance
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_current_state ON users(current_state);
CREATE INDEX idx_reminder_preferences_user_id ON reminder_preferences(user_id);
CREATE INDEX idx_reminder_preferences_enabled ON reminder_preferences(enabled);
CREATE INDEX idx_reminder_history_user_id ON reminder_history(user_id);
CREATE INDEX idx_reminder_history_sent_at ON reminder_history(sent_at);
CREATE INDEX idx_reminder_history_delivery_status ON reminder_history(delivery_status);
CREATE INDEX idx_hebcal_cache_location_date ON hebcal_cache(location, date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_preferences_updated_at BEFORE UPDATE ON reminder_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hebcal_cache_updated_at BEFORE UPDATE ON hebcal_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

