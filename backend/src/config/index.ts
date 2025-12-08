import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
  };
  whatsapp: {
    provider: 'twilio' | '360dialog' | 'messagebird';
    twilio?: {
      accountSid: string;
      authToken: string;
      from: string;
      webhookSecret: string;
    };
    dialog360?: {
      apiKey: string;
      webhookSecret: string;
    };
    messagebird?: {
      apiKey: string;
      webhookSecret: string;
    };
    templates: {
      welcome: string;
      reminder: string;
      confirmation: string;
      help: string;
    };
  };
  admin: {
    apiKey: string;
    jwtSecret: string;
  };
  googleSheets?: {
    clientEmail: string;
    privateKey: string;
    spreadsheetId: string;
  };
  hebcal: {
    apiBaseUrl: string;
  };
  timezone: {
    default: string;
  };
  logging: {
    level: string;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

// Determine provider first
const provider = (getOptionalEnv('WHATSAPP_PROVIDER', 'twilio') || 'twilio') as
  | 'twilio'
  | '360dialog'
  | 'messagebird';

// Build provider-specific config
const getProviderConfig = () => {
  if (provider === 'twilio') {
    return {
      twilio: {
        accountSid: getRequiredEnv('TWILIO_ACCOUNT_SID'),
        authToken: getRequiredEnv('TWILIO_AUTH_TOKEN'),
        from: getRequiredEnv('TWILIO_WHATSAPP_FROM'),
        webhookSecret: getRequiredEnv('TWILIO_WEBHOOK_SECRET'),
      },
      dialog360: undefined,
      messagebird: undefined,
    };
  } else if (provider === '360dialog') {
    return {
      twilio: undefined,
      dialog360: {
        apiKey: getRequiredEnv('DIALOG360_API_KEY'),
        webhookSecret: getRequiredEnv('DIALOG360_WEBHOOK_SECRET'),
      },
      messagebird: undefined,
    };
  } else {
    return {
      twilio: undefined,
      dialog360: undefined,
      messagebird: {
        apiKey: getRequiredEnv('MESSAGEBIRD_API_KEY'),
        webhookSecret: getRequiredEnv('MESSAGEBIRD_WEBHOOK_SECRET'),
      },
    };
  }
};

// Build Google Sheets config if all required fields are present
const googleSheetsClientEmail = getOptionalEnv('GOOGLE_SHEETS_CLIENT_EMAIL');
const googleSheetsPrivateKey = getOptionalEnv('GOOGLE_SHEETS_PRIVATE_KEY');
const googleSheetsSpreadsheetId = getOptionalEnv('GOOGLE_SHEETS_SPREADSHEET_ID');

const googleSheetsConfig =
  googleSheetsClientEmail && googleSheetsPrivateKey && googleSheetsSpreadsheetId
    ? {
        clientEmail: googleSheetsClientEmail,
        privateKey: googleSheetsPrivateKey,
        spreadsheetId: googleSheetsSpreadsheetId,
      }
    : undefined;

export const config: Config = {
  server: {
    port: parseInt(getOptionalEnv('PORT', '3000') || '3000', 10),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development') || 'development',
  },
  supabase: {
    url: getRequiredEnv('SUPABASE_URL'),
    anonKey: getRequiredEnv('SUPABASE_ANON_KEY'),
    serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  redis: {
    url: getOptionalEnv('REDIS_URL'),
    host: getOptionalEnv('REDIS_HOST', 'localhost') || 'localhost',
    port: parseInt(getOptionalEnv('REDIS_PORT', '6379') || '6379', 10),
    password: getOptionalEnv('REDIS_PASSWORD'),
  },
  whatsapp: {
    provider,
    ...getProviderConfig(),
    templates: {
      welcome: getRequiredEnv('WHATSAPP_TEMPLATE_WELCOME'),
      reminder: getRequiredEnv('WHATSAPP_TEMPLATE_REMINDER'),
      confirmation: getRequiredEnv('WHATSAPP_TEMPLATE_CONFIRMATION'),
      help: getRequiredEnv('WHATSAPP_TEMPLATE_HELP'),
    },
  },
  admin: {
    apiKey: getRequiredEnv('ADMIN_API_KEY'),
    jwtSecret: getRequiredEnv('ADMIN_JWT_SECRET'),
  },
  googleSheets: googleSheetsConfig,
  hebcal: {
    apiBaseUrl: getOptionalEnv('HEBCAL_API_BASE_URL', 'https://www.hebcal.com/hebcal') || '',
  },
  timezone: {
    default: getOptionalEnv('DEFAULT_TIMEZONE', 'Asia/Jerusalem') || 'Asia/Jerusalem',
  },
  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info') || 'info',
  },
};

