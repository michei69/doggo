# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Package manager

Use `bun` instead of `npm` and `bunx` instead of `npx` for all commands.

Examples:

- `bun install` (not `npm install`)
- `bun add <package>` (not `npm install <package>`)
- `bunx expo start` (not `npx expo start`)
- `bunx oxlint` and `bunx oxfmt --check`

# TypeScript & JSX Coding Preferences

## General

- Use **double quotes** for all strings and JSX props.
- Use `import type { ... }` for all type-only imports (no bare `import` for types).
- Use TypeScript utility types (`Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,V>`) to avoid duplicating type shapes.
- Never annotate component return types — let TypeScript infer them (no `React.FC<>`, no `JSX.Element`).
- Keep `strict: true` and `noExplicitAny: off` (as configured in tsconfig.json, .oxlintrc.json, and .oxfmtrc.json).
- Enforce `try/catch` on all async operations. Do not use `.then().catch()` chains.

## Imports

- Use **relative imports only**. No path aliases (`@/`, `~/`) — keep `../../stores/authStore`, `../components/common/Avatar`, etc.

## Component Conventions

- **Components use `export default function`** (never arrow functions for components/JSX). Arrow functions are fine for hooks, utilities, callbacks, and non-JSX code.
- **Props go directly in the function argument list** — do not create a separate `Props` interface. Example:
    ```tsx
    export default function Avatar({ uri, name, size = 48 }: { uri?: string; name?: string; size?: number }) {
    ```
- One component per file is preferred, but co-located small helper components in the same file are allowed when tightly coupled.
- Components and their screen files use **PascalCase** filenames (`CharacterCard.tsx`, `LoginScreen.tsx`).
- Styles are always co-located at the bottom of the file via `StyleSheet.create({...})`. No separate `.styles.ts` files.

## Non-Component Exports

- **API functions, hooks, stores, utilities, and types use named exports** (not default exports).
- Non-component files use **camelCase** filenames (`authStore.ts`, `useAuth.ts`, `constants.ts`).

## State Management (Zustand)

- Stores use a single `interface` for state + actions. Example: `create<AuthState>((set, get) => ({ ... }))`.
- Inside React components/hooks: access store via **selectors** (`useAuthStore((s) => s.isAuthenticated)`).
- Outside React (callbacks, utilities): access store via **`useAuthStore.getState()`**.
- Use **selective subscriptions** to minimize re-renders — subscribe to individual fields, not the whole store.
- Use `useShallow` for batching multiple field subscriptions where needed.
- Paginated loads must use a **guard pattern** to prevent duplicate requests:
    ```ts
    if (get().isLoadingChats) return;
    set({ isLoadingChats: true });
    ```

## Hooks vs Module-Scope Helpers

- Do not use module-scope (non-exported) helper functions. Move reusable logic into exported hook functions or utilities with explicit exports.

## React Performance

- Use `useCallback` for handlers passed as props when it prevents unnecessary re-renders.
- Use `useMemo` for expensive computations.
- Use `React.memo` strategically on components that re-render frequently with identical props.
- **Do NOT remove existing memoization** (useCallback, useMemo, React.memo) — even if it looks unnecessary, it was likely added deliberately.

## Navigation

- Enforce **typed navigation**: use `useNavigation<Nav>()` and `useRoute<Route>()` with explicit type parameters per screen.
- Navigation param list types belong in `src/navigation/types.ts`.
- Screens handle navigation params, data fetching, and orchestration. Components handle rendering.

## Lists

- **Always use `@shopify/flash-list`** (`FlashList`) for list rendering. Never use React Native's `FlatList`.

## Animations

- Use **`react-native-reanimated`** (v4) for all animations.

## Colors & Theming

- Do not hardcode color strings in components. Import colors from a shared theme/colors file.

## Type Organization

- API types → `src/types/api.ts`
- Navigation param list types → `src/navigation/types.ts`
- Component-local types (pros, handles, refs) → co-located in the component file

## API Layer

- All API calls go through `src/api/`. Components and hooks never call `fetch` or `axios` directly.
- API functions return `response.data` directly (the axios response is unwrapped).
- Request params should filter out `undefined`/`null`/empty-string values before sending.

## Dependencies

- **Ask before adding any new dependency.** First check if existing installed packages already provide the needed functionality.

## Security

- Never commit secrets, API keys, or sensitive credentials to the repository.
- Use `expo-secure-store` for storing auth tokens and sensitive user data.
- Cloudflare site keys and turnstile tokens may remain hardcoded — they are not secrets.

## Pre-Commit Checklist

Before committing any code, run these checks:

1. **TypeScript type-checking**: `bunx tsc --noEmit`
2. **Oxc lint/format**: `bunx oxlint` and `bunx oxfmt --check`
3. **React Doctor**: `bunx react-doctor@latest` — must be ≥80. Never install react-doctor as a project dependency; always run it via `bunx`.
4. **stop-slop skill**: Use the stop-slop skill to check for AI-generated slop patterns

## Alerts

- **Never use React Native's built-in `Alert.alert`.** Always use the custom alert system: `useAlert()` from `src/hooks/useAlert.ts` + `<CustomAlert>` from `src/components/common/CustomAlert.tsx`. Screens own their `CustomAlert` instance and render it in their root JSX.
- `AlertButton` type is exported from `src/components/common/CustomAlert.tsx`.
