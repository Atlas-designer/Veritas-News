/**
 * Canonical list of RSS sources used by the /api/news route.
 * Metadata is derived from the sourceDatabase in ratings.ts.
 */

export interface SourceDef {
  domain: string;
  name: string;
  bias: "CENTER" | "LEFT_CENTER" | "LEFT" | "RIGHT_CENTER" | "RIGHT";
  country: string;
  flag: string;
  factualRating: number;
  rssUrl: string;
}

export const SOURCES: SourceDef[] = [
  {
    domain:        "apnews.com",
    name:          "Associated Press",
    bias:          "CENTER",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 96,
    rssUrl:        "https://feeds.apnews.com/rss/apf-topnews",
  },
  {
    domain:        "bbc.co.uk",
    name:          "BBC News",
    bias:          "LEFT_CENTER",
    country:       "UK",
    flag:          "🇬🇧",
    factualRating: 90,
    rssUrl:        "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    domain:        "npr.org",
    name:          "NPR",
    bias:          "LEFT_CENTER",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 88,
    rssUrl:        "https://feeds.npr.org/1001/rss.xml",
  },
  {
    domain:        "wsj.com",
    name:          "Wall Street Journal",
    bias:          "RIGHT_CENTER",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 85,
    rssUrl:        "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
  },
  {
    domain:        "nytimes.com",
    name:          "New York Times",
    bias:          "LEFT_CENTER",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 82,
    rssUrl:        "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  },
  {
    domain:        "washingtonpost.com",
    name:          "Washington Post",
    bias:          "LEFT_CENTER",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 80,
    rssUrl:        "https://feeds.washingtonpost.com/rss/world",
  },
  {
    domain:        "theguardian.com",
    name:          "The Guardian",
    bias:          "LEFT_CENTER",
    country:       "UK",
    flag:          "🇬🇧",
    factualRating: 78,
    rssUrl:        "https://www.theguardian.com/world/rss",
  },
  {
    domain:        "aljazeera.com",
    name:          "Al Jazeera",
    bias:          "LEFT_CENTER",
    country:       "QA",
    flag:          "🇶🇦",
    factualRating: 75,
    rssUrl:        "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    domain:        "cnn.com",
    name:          "CNN",
    bias:          "LEFT",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 65,
    rssUrl:        "http://rss.cnn.com/rss/cnn_topstories.rss",
  },
  {
    domain:        "foxnews.com",
    name:          "Fox News",
    bias:          "RIGHT",
    country:       "US",
    flag:          "🇺🇸",
    factualRating: 55,
    rssUrl:        "https://moxie.foxnews.com/google-publisher/latest.xml",
  },
];

export const BIAS_LABELS: Record<SourceDef["bias"], string> = {
  CENTER:       "Center",
  LEFT_CENTER:  "Left-Center",
  LEFT:         "Left",
  RIGHT_CENTER: "Right-Center",
  RIGHT:        "Right",
};

export const BIAS_COLORS: Record<SourceDef["bias"], string> = {
  CENTER:       "text-vn-cyan   border-vn-cyan",
  LEFT_CENTER:  "text-sky-400   border-sky-500",
  LEFT:         "text-blue-400  border-blue-500",
  RIGHT_CENTER: "text-amber-400 border-amber-500",
  RIGHT:        "text-red-400   border-red-500",
};
