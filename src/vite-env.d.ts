/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL проекта Supabase, например https://xyz.supabase.co. Задаётся в .env, не в коде. */
  readonly VITE_SUPABASE_URL?: string;
  /** Публичный anon-ключ Supabase. Публичен по дизайну; защита данных — на RLS-политиках. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** WebSocket-адрес sandbox-сервера для капстоуна, например wss://sandbox.example.com/sandbox. */
  readonly VITE_SANDBOX_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
