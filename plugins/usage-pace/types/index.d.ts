export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Limits = Limit[]

declare module 'claude-code' {
  interface PluginState {
    'usage-pace': { limits: Limits; tick: number }
  }
}
