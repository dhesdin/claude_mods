// Absolute paths of the repos in teacher mode for this session.
export type Roots = string[]

declare module 'claude-code' {
  interface PluginState {
    'teacher-guard': { roots: Roots }
  }
}
