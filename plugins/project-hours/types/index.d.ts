export type ReportRow = { project: string; ms: number; isTooling: boolean }
export type ReportAlert = { project: string; weeks: number | null }
export type Report = { week: number; rows: ReportRow[]; alerts: ReportAlert[] }

declare module 'claude-code' {
  interface PluginState {
    'project-hours': { report: Shaped<Report | null> }
  }
}
