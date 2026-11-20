export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Limits = Limit[]
export type Context = { tokens?: number; percent?: number }
export type Info = { model: string; folder: string; branch: string }

declare module 'claude-code' {
  interface PluginState {
    statusbar: { limits: Limits; context: Context; info: Info; tick: number; hidden: boolean }
  }
}
