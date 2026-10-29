// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  helpSkills: string
  builtIn: string
  helpMods: string
  skillsTitle: string
  globalAccount: string
  globalMachine: string
  project: (root: string) => string
  none: string
  modsTitle: string
  enabled: string
  notEnabled: string
  commands: string
  options: string
  noMarketplace: string
}

const TABLES: Record<Lang, Strings> = {
  en: {
    helpSkills: 'List every available skill: account, Claude Code and plugins, machine, project; one line each',
    builtIn: 'Global · Claude Code and installed plugins (skills and commands; come with Claude Code and the plugins installed)',
    helpMods: 'List the mods of claude-mods: what they do, their commands and options',
    skillsTitle: 'Skills',
    globalAccount: 'Global · claude.ai account (synced to every machine you log in on)',
    globalMachine: 'This machine (~/.claude/skills, not synced: stays on this computer)',
    project: r => `Project (${r}/.claude/skills)`,
    none: '(none)',
    modsTitle: 'Mods (claude-mods)',
    enabled: 'enabled',
    notEnabled: 'not enabled',
    commands: 'commands',
    options: 'options',
    noMarketplace: 'The claude-mods marketplace file was not found next to this mod.',
  },
  fr: {
    helpSkills: 'Lister tous les skills disponibles : compte, Claude Code et plugins, machine, projet ; une ligne chacun',
    builtIn: 'Global · Claude Code et plugins installés (skills et commandes ; viennent avec Claude Code et les plugins installés)',
    helpMods: 'Lister les mods de claude-mods : ce qu’ils font, leurs commandes et options',
    skillsTitle: 'Skills',
    globalAccount: 'Global · compte claude.ai (synchronisé sur chaque machine où tu es connecté)',
    globalMachine: 'Cette machine (~/.claude/skills, non synchronisé : reste sur cet ordinateur)',
    project: r => `Projet (${r}/.claude/skills)`,
    none: '(aucun)',
    modsTitle: 'Mods (claude-mods)',
    enabled: 'activé',
    notEnabled: 'non activé',
    commands: 'commandes',
    options: 'options',
    noMarketplace: 'Le fichier de la marketplace claude-mods est introuvable à côté de ce mod.',
  },
  ja: {
    helpSkills: '利用可能な全スキル（アカウント、Claude Code とプラグイン、マシン、プロジェクト）を一行ずつ表示',
    builtIn: 'グローバル · Claude Code とインストール済みプラグイン（スキルとコマンド。Claude Code とプラグインに付属）',
    helpMods: 'claude-mods のモッド一覧：機能、コマンド、オプション',
    skillsTitle: 'スキル',
    globalAccount: 'グローバル · claude.ai アカウント（ログインした全マシンに同期）',
    globalMachine: 'このマシン（~/.claude/skills、同期なし：このコンピューターのみ）',
    project: r => `プロジェクト（${r}/.claude/skills）`,
    none: '（なし）',
    modsTitle: 'モッド（claude-mods）',
    enabled: '有効',
    notEnabled: '無効',
    commands: 'コマンド',
    options: 'オプション',
    noMarketplace: 'このモッドの近くに claude-mods のマーケットプレイスファイルが見つかりません。',
  },
  zh: {
    helpSkills: '列出所有可用技能：账户、Claude Code 与插件、本机、项目，每个一行说明',
    builtIn: '全局 · Claude Code 与已安装插件（技能与命令，随 Claude Code 及已装插件提供）',
    helpMods: '列出 claude-mods 的模组：功能、命令与选项',
    skillsTitle: '技能',
    globalAccount: '全局 · claude.ai 账户（同步到你登录的每台机器）',
    globalMachine: '本机（~/.claude/skills，不同步：仅限此电脑）',
    project: r => `项目（${r}/.claude/skills）`,
    none: '（无）',
    modsTitle: '模组（claude-mods）',
    enabled: '已启用',
    notEnabled: '未启用',
    commands: '命令',
    options: '选项',
    noMarketplace: '在此模组旁未找到 claude-mods 市场文件。',
  },
}

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
