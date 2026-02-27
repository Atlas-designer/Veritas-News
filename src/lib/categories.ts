/**
 * Category detection — keyword-based matching against cluster topics + headlines.
 * No API calls. Works entirely on the text already fetched.
 */

export type Category =
  | "Politics"
  | "Military"
  | "Sports"
  | "Environment"
  | "Science & Tech"
  | "Uplifting";

export const ALL_CATEGORIES: Category[] = [
  "Politics",
  "Military",
  "Sports",
  "Environment",
  "Science & Tech",
  "Uplifting",
];

export const CATEGORY_META: Record<
  Category,
  { icon: string; short: string; keywords: string[] }
> = {
  Politics: {
    icon: "⚡",
    short: "POLITICS",
    keywords: [
      "election", "president", "senate", "congress", "parliament",
      "government", "minister", "vote", "voting", "policy", "democrat",
      "republican", "trump", "biden", "harris", "political", "legislation",
      "law", "administration", "campaign", "diplomat", "diplomacy", "treaty",
      "white house", "prime minister", "chancellor", "sanctions", "tariff",
      "immigration", "border", "constitution", "supreme court", "judiciary",
    ],
  },
  Military: {
    icon: "✦",
    short: "MILITARY",
    keywords: [
      "war", "military", "army", "navy", "troops", "soldier", "missile",
      "weapon", "attack", "conflict", "battle", "nato", "defense", "defence",
      "strike", "bomb", "nuclear", "drone", "combat", "invasion", "ceasefire",
      "artillery", "tank", "air force", "fighter jet", "warship", "pentagon",
      "ukraine", "russia", "hamas", "hezbollah", "isis", "terror", "hostage",
      "airstrike", "siege", "blockade", "guerrilla", "insurgent",
    ],
  },
  Sports: {
    icon: "◈",
    short: "SPORTS",
    keywords: [
      "sport", "football", "soccer", "basketball", "tennis", "cricket",
      "olympics", "championship", "tournament", "medal", "athlete",
      "nfl", "nba", "fifa", "premier league", "formula 1", "grand prix",
      "golf", "rugby", "baseball", "hockey", "swimming", "cycling",
      "stadium", "referee", "boxing", "ufc", "mma", "snooker", "darts",
      "wicket", "touchdown", "hat trick", "knockout", "bout", "golfer",
      "footballer", "cricketer", "wimbledon", "open championship",
    ],
  },
  Environment: {
    icon: "⊛",
    short: "ENVIRON",
    keywords: [
      "climate", "environment", "carbon", "emission", "weather", "flood",
      "wildfire", "drought", "ocean", "wildlife", "species", "pollution",
      "renewable", "solar", "wind energy", "forest", "glacier", "coral",
      "deforestation", "biodiversity", "extinction", "plastic", "recycling",
      "fossil fuel", "net zero", "cop", "greenhouse", "methane", "ozone",
      "hurricane", "tornado", "earthquake", "tsunami", "natural disaster",
    ],
  },
  "Science & Tech": {
    icon: "⌬",
    short: "SCI/TECH",
    keywords: [
      "science", "technology", "artificial intelligence", "ai ", " ai",
      "machine learning", "space", "nasa", "research", "study", "discovery",
      "robot", "quantum", "gene", "medical", "health", "drug", "vaccine",
      "tech", "digital", "cyber", "hack", "data", "privacy", "apple",
      "google", "microsoft", "meta", "openai", "chip", "semiconductor",
      "cancer", "virus", "pandemic", "physics", "astronomy", "telescope",
      "mars", "rocket", "launch", "satellite", "dna", "crispr",
    ],
  },
  Uplifting: {
    icon: "◎",
    short: "UPLIFTING",
    keywords: [
      "rescue", "saved", "hero", "inspiring", "breakthrough", "celebrate",
      "achievement", "donate", "volunteer", "community", "hope", "recovery",
      "success", "award", "milestone", "innovation", "record", "first ever",
      "breakthrough", "reunited", "survived", "charity", "kindness",
      "generous", "wholesome", "good news", "triumph", "historic win",
      "cure", "healed", "rebuilt", "restored", "thriving",
    ],
  },
};

/**
 * Detect which categories a piece of text matches.
 * Returns all matching categories (a story can belong to multiple).
 */
export function detectCategories(text: string): Category[] {
  const lower = text.toLowerCase();
  return ALL_CATEGORIES.filter((cat) =>
    CATEGORY_META[cat].keywords.some((kw) => lower.includes(kw))
  );
}

/**
 * Returns true if a cluster matches ANY of the selected categories.
 * Pass an empty set to mean "all categories" (no filter).
 */
export function clusterMatchesCategories(
  cluster: { topic: string; articles: Array<{ title: string }> },
  selected: Set<Category>
): boolean {
  if (selected.size === 0) return true;

  const searchText = [
    cluster.topic,
    ...cluster.articles.slice(0, 5).map((a) => a.title),
  ].join(" ");

  const matched = detectCategories(searchText);
  return matched.some((cat) => selected.has(cat));
}
