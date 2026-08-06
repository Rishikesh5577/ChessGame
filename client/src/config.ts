function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const APP_CONFIG = {
  apiUrl: trimSlash(import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'),
  wsUrl: trimSlash(import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:8000/ws'),
}
