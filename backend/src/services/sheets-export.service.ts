import { google } from 'googleapis';
import { config } from '../config';
import { userRepository } from '../db/repositories/user.repository';
import { reminderRepository } from '../db/repositories/reminder.repository';
import { historyRepository } from '../db/repositories/history.repository';
import { logger } from '../utils/logger';

export class SheetsExportService {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    if (!config.googleSheets) {
      throw new Error('Google Sheets configuration is missing');
    }

    const auth = new google.auth.JWT({
      email: config.googleSheets.clientEmail,
      key: config.googleSheets.privateKey?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = config.googleSheets.spreadsheetId;
  }

  async exportAllData(): Promise<{ spreadsheetUrl: string }> {
    try {
      // Export users
      await this.exportUsers();

      // Export reminders
      await this.exportReminders();

      // Export history
      await this.exportHistory();

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;

      logger.info('Data exported to Google Sheets', { spreadsheetUrl });

      return { spreadsheetUrl };
    } catch (error) {
      logger.error('Error exporting data to sheets', { error });
      throw error;
    }
  }

  private async exportUsers(): Promise<void> {
    const users = await userRepository.getAllUsers(1000, 0);

    const values = [
      ['ID', 'Phone Number', 'Current State', 'Created At', 'Updated At'],
      ...users.map((user) => [
        user.id,
        user.phone_number,
        user.current_state,
        user.created_at,
        user.updated_at,
      ]),
    ];

    await this.updateSheet('Users', values);
  }

  private async exportReminders(): Promise<void> {
    const allReminders: any[] = [];
    const users = await userRepository.getAllUsers(1000, 0);

    for (const user of users) {
      const reminders = await reminderRepository.findByUserId(user.id);
      allReminders.push(...reminders);
    }

    const values = [
      ['ID', 'User ID', 'Type', 'Time', 'Location', 'Enabled', 'Created At'],
      ...allReminders.map((reminder) => [
        reminder.id,
        reminder.user_id,
        reminder.type,
        reminder.time || '',
        reminder.location,
        reminder.enabled ? 'Yes' : 'No',
        reminder.created_at,
      ]),
    ];

    await this.updateSheet('Reminders', values);
  }

  private async exportHistory(): Promise<void> {
    const users = await userRepository.getAllUsers(1000, 0);
    const allHistory: any[] = [];

    for (const user of users) {
      const history = await historyRepository.findByUserId(user.id, 100);
      allHistory.push(...history);
    }

    const values = [
      ['ID', 'User ID', 'Type', 'Sent At', 'Delivery Status', 'Error Message', 'Reminder Time'],
      ...allHistory.map((h) => [
        h.id,
        h.user_id,
        h.type,
        h.sent_at,
        h.delivery_status,
        h.error_message || '',
        h.reminder_time || '',
      ]),
    ];

    await this.updateSheet('History', values);
  }

  private async updateSheet(sheetName: string, values: any[][]): Promise<void> {
    try {
      // Clear existing data
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z10000`,
      });

      // Update with new data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
      });

      logger.info('Sheet updated', { sheetName, rowCount: values.length });
    } catch (error) {
      logger.error('Error updating sheet', { sheetName, error });
      throw error;
    }
  }
}

export const sheetsExportService = config.googleSheets
  ? new SheetsExportService()
  : ({
      exportAllData: async () => {
        throw new Error('Google Sheets configuration is missing');
      },
    } as SheetsExportService);

