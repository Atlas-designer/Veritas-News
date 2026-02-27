import { Article, Source } from "@/types";

const sources: Record<string, Source> = {
  reuters: {
    id: "reuters",
    name: "Reuters",
    domain: "reuters.com",
    bias: "CENTER",
    factualRating: 95,
  },
  bbc: {
    id: "bbc",
    name: "BBC News",
    domain: "bbc.com",
    bias: "LEFT_CENTER",
    factualRating: 90,
  },
  fox: {
    id: "fox",
    name: "Fox News",
    domain: "foxnews.com",
    bias: "RIGHT",
    factualRating: 55,
  },
  cnn: {
    id: "cnn",
    name: "CNN",
    domain: "cnn.com",
    bias: "LEFT",
    factualRating: 65,
  },
  ap: {
    id: "ap",
    name: "Associated Press",
    domain: "apnews.com",
    bias: "CENTER",
    factualRating: 96,
  },
  nyt: {
    id: "nyt",
    name: "NY Times",
    domain: "nytimes.com",
    bias: "LEFT_CENTER",
    factualRating: 82,
  },
  wsj: {
    id: "wsj",
    name: "Wall Street Journal",
    domain: "wsj.com",
    bias: "RIGHT_CENTER",
    factualRating: 85,
  },
};

const now = new Date();
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 3600000).toISOString();

export const mockArticles: Article[] = [
  {
    id: "1",
    title: "Global Climate Summit Reaches Historic Emissions Agreement",
    url: "https://reuters.com/example-1",
    source: sources.reuters,
    publishedAt: hoursAgo(1),
    summary:
      "World leaders at the Global Climate Summit have agreed to a landmark deal targeting 60% emissions reduction by 2035, with binding commitments from all major economies.",
    sentiment: 0.3,
    validityScore: 94,
    corroborationCount: 23,
    cluster: {
      id: "c1",
      topic: "CLIMATE",
      articles: [],
      articleCount: 23,
      avgValidity: 91,
      sources: [sources.reuters, sources.bbc, sources.ap],
    },
    isBreaking: true,
  },
  {
    id: "2",
    title: "Tech Giants Report Record AI Infrastructure Spending",
    url: "https://wsj.com/example-2",
    source: sources.wsj,
    publishedAt: hoursAgo(3),
    summary:
      "Major technology companies have collectively invested over $200B in AI infrastructure this quarter, raising concerns about market sustainability and long-term returns.",
    sentiment: -0.1,
    validityScore: 87,
    corroborationCount: 15,
    cluster: {
      id: "c2",
      topic: "AI-SPENDING",
      articles: [],
      articleCount: 15,
      avgValidity: 84,
      sources: [sources.wsj, sources.nyt, sources.reuters],
    },
  },
  {
    id: "3",
    title: "Central Bank Signals Potential Rate Cut Amid Slowing Growth",
    url: "https://bbc.com/example-3",
    source: sources.bbc,
    publishedAt: hoursAgo(5),
    summary:
      "The Federal Reserve has indicated it may cut interest rates in the coming months as economic indicators point to a slowdown in growth across key sectors.",
    sentiment: -0.2,
    validityScore: 78,
    corroborationCount: 18,
    cluster: {
      id: "c3",
      topic: "ECONOMY",
      articles: [],
      articleCount: 18,
      avgValidity: 76,
      sources: [sources.bbc, sources.wsj, sources.reuters],
    },
  },
  {
    id: "4",
    title: "Controversial New Immigration Policy Sparks Nationwide Debate",
    url: "https://cnn.com/example-4",
    source: sources.cnn,
    publishedAt: hoursAgo(7),
    summary:
      "A newly proposed immigration policy has drawn sharp reactions from both sides of the political spectrum, with protests planned in multiple cities this weekend.",
    sentiment: -0.6,
    validityScore: 52,
    corroborationCount: 8,
    cluster: {
      id: "c4",
      topic: "IMMIGRATION",
      articles: [],
      articleCount: 12,
      avgValidity: 48,
      sources: [sources.cnn, sources.fox, sources.nyt],
    },
  },
  {
    id: "5",
    title: "Breakthrough Cancer Treatment Shows 90% Remission Rate in Trials",
    url: "https://apnews.com/example-5",
    source: sources.ap,
    publishedAt: hoursAgo(10),
    summary:
      "A new immunotherapy approach developed by researchers has shown remarkable success in Phase 3 clinical trials, with 90% of patients achieving full remission.",
    sentiment: 0.7,
    validityScore: 71,
    corroborationCount: 6,
    cluster: {
      id: "c5",
      topic: "HEALTH",
      articles: [],
      articleCount: 6,
      avgValidity: 68,
      sources: [sources.ap, sources.reuters],
    },
  },
  {
    id: "6",
    title: "Social Media Platform Accused of Suppressing Political Content",
    url: "https://foxnews.com/example-6",
    source: sources.fox,
    publishedAt: hoursAgo(12),
    summary:
      "Leaked internal documents allegedly show systematic suppression of certain political viewpoints on a major social media platform, sparking calls for investigation.",
    sentiment: -0.7,
    validityScore: 34,
    corroborationCount: 3,
    cluster: {
      id: "c6",
      topic: "CENSORSHIP",
      articles: [],
      articleCount: 5,
      avgValidity: 31,
      sources: [sources.fox],
    },
  },
];
