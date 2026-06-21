export const API_BASE_URL = "https://janitorai.com/hampter";
export const AUTH_BASE_URL = "https://auth.janitorai.com";
export const JANITOR_DOMAIN = "https://janitorai.com";

export const STORAGE_KEYS = {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
    USER: "user",
    CF_CLEARANCE: "cf_clearance",
    CF_BM: "cf_bm",
    TOKEN_EXPIRES_AT: "token_expires_at",
    USER_AGENT: "user_agent",
    DISCOVER_FILTERS: "discover_filters",
    CHAT_LAYOUT: "chat_layout",
    SHOW_TIMESTAMPS: "show_timestamps",
    AUTO_FORMAT_ENABLED: "auto_format_enabled",
    NARRATION_WRAPPER: "narration_wrapper",
  CHAT_CENTERED: "chat_centered",
    CREATE_BOT_STATE: "create_bot_state",
    EDIT_BOT_STATE: "edit_bot_state",
    CHAT_LOCAL_DATA_PREFIX: "chat_local_",
} as const;

export const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbXp4dHpvbW1wbnhreW5kZGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzNzA3NDAsImV4cCI6MjA0Mzk0Njc0MH0.UfRPni4ga9Lmin8j0JjV5ouuK9bXp8tsqPJ8pMTDDAI";

export const THINKING_REGEX = /<thinking>([\s\S]*?)<\/thinking>/g;
export const THINKING_TAG_OPEN = "<thinking>";
export const THINKING_TAG_CLOSE = "</thinking>";
