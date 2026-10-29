// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  done: string
  failed: string
  permission: string
  input: string
  backgroundInput: string
  backgroundDone: string
  quota: string
}

const TABLES: Record<Lang, Strings> = {
  en: {
    done: 'Claude has finished.',
    failed: 'Claude stopped on an error.',
    permission: 'Claude is waiting for your permission.',
    input: 'Claude is waiting for your answer.',
    backgroundInput: 'A background session is waiting for you.',
    backgroundDone: 'A background session has finished.',
    quota: 'Usage limit: Claude Code needs you.',
  },
  fr: {
    done: 'Claude a terminé.',
    failed: 'Claude s’est arrêté sur une erreur.',
    permission: 'Claude attend ton autorisation.',
    input: 'Claude attend ta réponse.',
    backgroundInput: 'Une session en arrière-plan t’attend.',
    backgroundDone: 'Une session en arrière-plan a terminé.',
    quota: 'Limite d’usage : Claude Code a besoin de toi.',
  },
  ja: {
    done: 'Claude が完了しました。',
    failed: 'Claude がエラーで停止しました。',
    permission: 'Claude が許可を待っています。',
    input: 'Claude が返答を待っています。',
    backgroundInput: 'バックグラウンドのセッションが待っています。',
    backgroundDone: 'バックグラウンドのセッションが完了しました。',
    quota: '使用上限：Claude Code の操作が必要です。',
  },
  zh: {
    done: 'Claude 已完成。',
    failed: 'Claude 因错误而停止。',
    permission: 'Claude 正在等待你的授权。',
    input: 'Claude 正在等待你的回复。',
    backgroundInput: '一个后台会话正在等待你。',
    backgroundDone: '一个后台会话已完成。',
    quota: '用量上限：Claude Code 需要你处理。',
  },
}

export function strings(language: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(language) ? (language as Lang) : 'en']
}
