import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { HebCalResponse, ParsedHebCalData } from './types';

export class HebCalClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.hebcal.apiBaseUrl;
  }

  async fetchCalendarData(
    location: string,
    date: Date = new Date()
  ): Promise<ParsedHebCalData> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // HebCal API endpoint for daily calendar
      const url = `${this.baseUrl}?cfg=json&city=${encodeURIComponent(
        location
      )}&year=${year}&month=${month}&day=${day}&geonameid=281184`;

      logger.info('Fetching HebCal data', { location, date: date.toISOString(), url });

      const response = await axios.get<HebCalResponse>(url, {
        timeout: 10000,
      });

      const parsed = this.parseResponse(response.data, location, date);

      logger.info('HebCal data fetched successfully', {
        location,
        date: date.toISOString(),
        hasSunset: !!parsed.sunsetTime,
        hasCandleLighting: !!parsed.candleLightingTime,
      });

      return parsed;
    } catch (error) {
      logger.error('Error fetching HebCal data', {
        location,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async fetchWeeklyData(
    location: string,
    startDate: Date = new Date()
  ): Promise<ParsedHebCalData[]> {
    const results: ParsedHebCalData[] = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      try {
        const data = await this.fetchCalendarData(location, new Date(d));
        results.push(data);
        // Small delay to avoid rate limiting
        await this.sleep(200);
      } catch (error) {
        logger.warn('Error fetching HebCal data for date', {
          location,
          date: d.toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  async getSunsetTime(
    latitude?: number,
    longitude?: number,
    date: Date = new Date()
  ): Promise<Date | null> {
    try {
      // Default to Jerusalem if coordinates not provided
      const location = latitude && longitude ? `${latitude},${longitude}` : 'Jerusalem';
      
      const hebcalData = await this.fetchCalendarData(location, date);
      
      if (hebcalData.sunsetTime) {
        logger.info('Sunset time retrieved', {
          location,
          date: date.toISOString(),
          sunsetTime: hebcalData.sunsetTime.toISOString(),
        });
        return hebcalData.sunsetTime;
      }

      logger.warn('Sunset time not found in HebCal data', {
        location,
        date: date.toISOString(),
      });
      return null;
    } catch (error) {
      logger.error('Error getting sunset time', {
        latitude,
        longitude,
        date: date.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private parseResponse(
    response: HebCalResponse,
    location: string,
    date: Date
  ): ParsedHebCalData {
    const dateStr = date.toISOString().split('T')[0];
    let sunsetTime: Date | null = null;
    let candleLightingTime: Date | null = null;
    const prayerTimes: {
      shacharit?: string;
      mincha?: string;
      maariv?: string;
    } = {};

    // Parse events from response
    for (const item of response.items || []) {
      const eventDate = new Date(item.date);

      // Find sunset time
      if (
        item.title.toLowerCase().includes('sunset') ||
        item.category === 'astronomy' ||
        item.subcat === 'sunset'
      ) {
        sunsetTime = eventDate;
      }

      // Find candle lighting time
      if (
        item.title.toLowerCase().includes('candle') ||
        item.title.toLowerCase().includes('shabbat') ||
        item.subcat === 'candles'
      ) {
        candleLightingTime = eventDate;
      }

      // Find prayer times
      if (item.category === 'prayer') {
        if (item.title.toLowerCase().includes('shacharit') || item.subcat === 'shacharit') {
          prayerTimes.shacharit = eventDate.toISOString();
        }
        if (item.title.toLowerCase().includes('mincha') || item.subcat === 'mincha') {
          prayerTimes.mincha = eventDate.toISOString();
        }
        if (item.title.toLowerCase().includes('maariv') || item.subcat === 'maariv') {
          prayerTimes.maariv = eventDate.toISOString();
        }
      }
    }

    return {
      location,
      date: dateStr,
      sunsetTime,
      candleLightingTime,
      prayerTimes,
      rawData: response,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const hebcalClient = new HebCalClient();

