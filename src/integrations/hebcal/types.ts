export interface HebCalEvent {
  title: string;
  date: string; // ISO date string
  category: string;
  subcat?: string;
  hebrew?: string;
  memo?: string;
}

export interface HebCalResponse {
  items: HebCalEvent[];
  title: string;
  date: string;
  location: {
    geo: string; // "lat;lon"
    city: string;
  };
}

export interface ParsedHebCalData {
  location: string;
  date: string; // YYYY-MM-DD
  sunsetTime: Date | null;
  candleLightingTime: Date | null;
  prayerTimes: {
    shacharit?: string;
    mincha?: string;
    maariv?: string;
  };
  rawData: HebCalResponse;
}

