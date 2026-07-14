export interface BlockedContent {
    bots: string[];
    creators: string[];
    keywords: string[];
    tags: number[];
}

export interface LoginRequest {
    email: string;
    password: string;
    gotrue_meta_security: { captcha_token: string };
}

export interface AuthUser {
    id: string;
    aud: string;
    role: string;
    email: string;
    email_confirmed_at: string;
    phone: string;
    confirmation_sent_at: string;
    confirmed_at: string;
    last_sign_in_at: string;
    app_metadata: { provider: string; providers: string[] };
    user_metadata: {
        allow_mobile_nsfw: boolean;
        created_at: number;
        email: string;
        email_verified: boolean;
        phone_verified: boolean;
        sub: string;
    };
    identities: Array<{
        identity_id: string;
        id: string;
        user_id: string;
        identity_data: {
            created_at: number;
            email: string;
            email_verified: boolean;
            phone_verified: boolean;
            sub: string;
        };
        provider: string;
        last_sign_in_at: string;
        created_at: string;
        updated_at: string;
        email: string;
    }>;
    created_at: string;
    updated_at: string;
    is_anonymous: boolean;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    refresh_token: string;
    user: AuthUser;
    weak_password: null;
}

export interface Pronouns {
    subjective: string;
    objective: string;
    possessive: string;
    possessivePronoun: string;
    reflexive: string;
}

export interface Persona {
    appearance: string;
    avatar: string;
    groupId: null | string;
    id: string;
    is_default: boolean;
    name: string;
    pronouns: null | Pronouns;
}

export interface ChatListItem {
    character: {
        avatar: string;
        chat_name: string;
        creator_id?: string;
        creator_name?: string;
        description: string;
        is_image_nsfw: boolean;
        is_public: boolean;
        name: string;
    };
    character_id: string;
    chat_count: number;
    created_at: string;
    id: number;
    is_public: boolean;
    persona_id: string | null;
    personas: unknown[];
    summary: string;
    updated_at: string;
    user_id: string;
}

export interface ChatDetail {
    character: {
        allow_proxy: boolean;
        avatar: string;
        chat_name: string;
        creator_id?: string;
        creator_name?: string;
        description: string;
        first_message: string;
        first_messages: string[];
        id: string;
        is_image_nsfw: boolean;
        is_nsfw: boolean;
        is_public: boolean;
        name: string;
        soundcloud_track_id: string | null;
    };
    chat: {
        can_publish: boolean;
        character_id: string;
        created_at: string;
        id: number;
        is_public: boolean;
        persona_id: string | null;
        published_message_count: number | null;
        published_slug: string | null;
        summary: string;
        summary_chat_id: number | null;
        user_id: string;
    };
    chatMessages: ChatMessage[];
    fork_source_chat_id: number | null;
    personas: Array<Persona>;
}

export interface ChatMessage {
    chat_id: number;
    created_at: string;
    id: number;
    is_bot: boolean;
    is_main: boolean;
    message: string;
    metadata: null | unknown;
    rating: null | unknown;
}

export interface CreateMessageRequest {
    is_bot: boolean;
    is_main: boolean;
    message: string;
    metadata?: {
        persona_id: string | null;
        persona_name?: string;
        persona_avatar?: string;
    };
    character_id: string;
    chat_id: number;
    created_at?: string | Date;
    rating?: null;
}

export interface CreateMessageResponse extends ChatMessage {
    metadata: {
        persona_id: string;
        persona_name: string;
        persona_avatar: string;
    } | null;
}

export interface SuccessResponse {
    success: boolean;
}

export interface CreateChatRequest {
    character_id: string;
}

export interface CreateChatResponse {
    id: number;
    created_at: string;
    character_id: string;
    user_id: string;
    is_public: boolean;
    summary: string;
    summary_chat_id: number | null;
    updated_at: string;
    chat_count: number;
    is_deleted: boolean;
}

export interface CharacterTag {
    created_at: string;
    description: string;
    id: number;
    name: string;
    slug: string;
}

export interface TrendingCharacter {
    avatar: string;
    created_at: string;
    creator_id: string;
    creator_name: string;
    creator_subscriber_badge: boolean;
    creator_verified: boolean;
    custom_tags: string[];
    description: string;
    first_published_at: string;
    id: string;
    is_deleted: boolean;
    is_force_remove: boolean;
    is_image_nsfw: boolean;
    is_nsfw: boolean;
    is_proxy_enabled: boolean;
    is_public: boolean;
    name: string;
    scheduled_publish_at: string | null;
    showdefinition: boolean;
    stats: { chat: number; message: number };
    tags: CharacterTag[];
    total_tokens: number;
    updated_at: string;
    public_chat_count: number;
}

export interface TrendingResponse {
    data: TrendingCharacter[];
    page: number;
    size: number;
    total: number;
    top_custom_tags: string[];
}

export interface CharacterDetail {
    allow_proxy: boolean;
    allow_published_chats: boolean;
    avatar: string;
    chat_name: string;
    created_at: string;
    creator_id: string;
    creator_name: string;
    creator_subscriber_badge: boolean;
    creator_verified: boolean;
    custom_tags: string[];
    description: string;
    example_dialogs: string;
    first_message: string;
    first_messages: string[];
    first_published_at: string;
    id: string;
    is_deleted: boolean;
    is_explicit_for_anon: boolean;
    is_force_remove: boolean;
    is_nsfw: boolean;
    is_public: boolean;
    name: string;
    obscenity_score: number;
    personality: string;
    raw_avatar: null;
    scenario: string;
    scheduled_publish_at: null;
    scripts: unknown[];
    showDefinitionOverride: boolean;
    showdefinition: boolean;
    silent_publish: null;
    soundcloud_track_id: string;
    text_obscenity_score: number;
    updated_at: string;
    token_counts: {
        example_dialog_tokens: number;
        first_message_tokens: number;
        personality_tokens: number;
        scenario_tokens: number;
        total_tokens: number;
    };
    tags: CharacterTag[];
    stats: {
        chat: number;
        message: number;
    };
}

export interface ProxyConfiguration {
    apiKey: string;
    apiUrl: string;
    id: string;
    jailbreakPrompt: string;
    model: string;
    name: string;
}

export interface GenerationSettings {
    context_length: number;
    max_new_token: number;
    temperature: number;
    frequency_penalty: number;
    prefill_enabled: boolean;
    prefill_text: string;
    repetition_penalty: number;
    top_k: number;
    top_p: number;
    enable_thinking: boolean;
    enable_reasoning: boolean;
    enable_reasoning_chat: boolean;
    privacy_mode: boolean;
    local_mode: boolean;
}

export interface UserProfile {
    id: string;
    avatar: string;
    name: string;
    user_name: string;
    about_me: string;
    is_verified: boolean;
    followers_count?: string;
    config: {
        allow_mobile_nsfw: boolean;
        api: string;
        bad_words: string[];
        generation_settings: GenerationSettings;
        llm_prompt: string;
        open_ai_jailbreak_prompt: string;
        open_ai_mode: string;
        open_ai_reverse_proxy: string;
        openAiModel: string;
        proxy_global_prompt: string;
        proxyConfigurations: ProxyConfiguration[];
        selectedProxyConfigId: string;
        bio_preview_images: boolean;
    };
    profile: string;
    block_list: BlockedContent;
    style: {
        background_blur: number;
        background_color: string;
        background_image: string;
        background_opacity: number;
    };
    created_at: string;
    birth_date: string;
    username_changed_at: string | null;
    is_review_cooldown: boolean;
    user_roles: string[];
    badges: Array<{
        id: string;
        img: string;
        sortOrder: number;
        title: string;
    }>;
    entitlements: unknown[];
    subscription: {
        active: boolean;
        expires_at: string | null;
        grace_period_ends_at: string | null;
        in_grace_period: boolean;
        platform: string | null;
        status: string;
        will_renew: boolean;
    };
    subscriber_badge: boolean;
}

export interface PersonaGroup {
    id: string;
    userId: string;
    name: string;
    description: string;
    color: string;
    order: number;
    created_at: string;
    updated_at: string;
}

export interface UploadFileResponse {
    url: string;
    filename: string;
}

export interface CreatePersonaRequest {
    appearance: string;
    avatar: string;
    groupId?: string | null;
    name: string;
    pronouns?: Pronouns | null;
}

export interface UpdatePersonaRequest {
    appearance: string;
    avatar: string;
    groupId?: string | null;
    id: string;
    name: string;
    pronouns?: Pronouns | null;
}

export interface CreateCharacterRequest {
    avatar: string;
    chat_name: string | null;
    custom_tags: string[];
    description: string;
    example_dialogs: string;
    first_message: string;
    first_messages: string[];
    is_nsfw: boolean;
    name: string;
    personality: string;
    scenario: string;
    scheduled_publish_at: string | null;
    silent_publish: string | null;
    tag_ids: number[];
    token_counts: {
        example_dialog_tokens: number;
        first_message_tokens: number;
        first_messages_tokens: number[];
        personality_tokens: number;
        scenario_tokens: number;
        total_tokens: number;
    };
}

export interface CharacterResponse {
    created_at: string;
    updated_at: string;
    avatar: string;
    name: string;
    description: string;
    first_message: string;
    personality: string;
    scenario: string;
    example_dialogs: string;
    is_public: boolean;
    creator_id: string;
    id: string;
    is_nsfw: boolean;
    is_force_remove: boolean;
    showdefinition: boolean;
    is_deleted: boolean;
    allow_proxy: boolean;
    tags: number[];
    stats: { chat: number; message: number };
    custom_tags: string[];
}

// Reviews

export interface ReviewUserProfile {
    avatar: string;
    is_verified: boolean;
    name: string;
    plusbadge: boolean;
    user_name: string;
}

export interface Review {
    character_id: string;
    comment_count: number;
    content: string;
    created_at: string;
    dislike_count: number;
    id: string;
    is_like: boolean;
    is_liked_by_user: boolean;
    is_pinned: boolean;
    like_count: number;
    moderator: boolean;
    pinned_at: string | null;
    user_id: string;
    user_profiles: ReviewUserProfile;
}

export interface ReviewComment {
    content: string;
    created_at: string;
    dislike_count: number;
    id: string;
    is_liked_by_user: boolean;
    like_count: number;
    moderator: boolean;
    review_id: string;
    user_id: string;
    user_profiles: ReviewUserProfile;
}

export interface ReviewCounts {
    dislikes: number;
    likes: number;
    total: number;
}

export interface ReviewSettings {
    character_id: string;
    comment_mode: "open";
}

export interface CreateReviewRequest {
    character_id: string;
    content: string;
    is_like: boolean;
}

export interface CreateReviewResponse {
    user_id: string;
    character_id: string;
    created_at: string;
    content: string;
    is_like: boolean;
    id: string;
    deleted_at: string | null;
    deleted_by: string | null;
    like_count: number;
    comment_count: number;
    dislike_count: number;
    is_pinned: boolean;
    pinned_at: string | null;
}

export interface CreateCommentRequest {
    content: string;
    review_id: string;
}

export interface CreateCommentResponse {
    id: string;
    review_id: string;
    user_id: string;
    content: string;
    created_at: string;
    like_count: number;
    dislike_count: number;
    is_deleted: boolean;
    is_liked_by_user: boolean;
}
