export const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Trending 24h", value: "trending24" },
  { label: "Trending", value: "trending" },
  { label: "Popular", value: "popular" },
  { label: "Latest", value: "latest" },
  { label: "Relevance", value: "relevance" },
];

export type FilterOperator = "lte" | "gte";

export interface FilterState {
  messages: string;
  messagesMode: FilterOperator;
  tokens: string;
  tokensMode: FilterOperator;
  proxyOnly: boolean;
  limitlessMode: boolean;
  customAvatar: boolean;
}

export const INITIAL_FILTERS: FilterState = {
  messages: "",
  messagesMode: "gte",
  tokens: "",
  tokensMode: "gte",
  proxyOnly: false,
  limitlessMode: true,
  customAvatar: false,
};
