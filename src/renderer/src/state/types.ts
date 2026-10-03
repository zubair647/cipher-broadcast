import type {
  AccountId,
  AllData,
  MediaType,
  SendResult
} from '../../../shared/types'

export type Screen = 'send' | 'lists' | 'groups' | 'history' | 'account'

export interface Composer {
  listId: string
  text: string
  mediaType: MediaType
  mediaName: string
  mediaPath: string | null
}

export interface EditorDraft {
  id: string | null
  name: string
  groupIds: string[]
}

export interface SendUIState {
  open: boolean
  active: boolean
  done: boolean
  current: number
  total: number
  results: SendResult[]
  listName: string
}

export interface QrUIState {
  account: AccountId
  dataUrl: string | null
  connecting: boolean
}

export interface AppState {
  account: AccountId
  screen: Screen
  data: AllData
  loading: boolean
  composer: Composer
  preview: boolean
  send: SendUIState
  editor: EditorDraft | null
  editingGroup: string | null
  renameDraft: string
  syncing: boolean
  historySearch: string
  expandedHistory: string | null
  qr: QrUIState | null
  isMobile: boolean
  mobileNav: boolean
  banner: { kind: 'error' | 'info'; text: string } | null
}

export interface AppActions {
  setAccount(acc: AccountId): void
  go(screen: Screen): void
  openNav(): void
  closeNav(): void

  onListChange(listId: string): void
  onText(text: string): void
  attach(kind: 'image' | 'pdf'): Promise<void>
  clearMedia(): void

  openPreview(): void
  closePreview(): void
  confirmSend(): Promise<void>
  closeSend(): void
  viewInHistory(): void

  newList(): void
  editList(id: string): void
  cancelEditor(): void
  onEditorName(name: string): void
  toggleEditorGroup(gid: string): void
  saveEditor(): Promise<void>
  deleteList(listId: string): Promise<void>
  setDefaultList(listId: string): Promise<void>

  refreshGroups(): Promise<void>
  startRename(id: string): void
  onRenameInput(v: string): void
  saveRename(): Promise<void>
  cancelRename(): void

  onHistorySearch(v: string): void
  toggleHistory(id: string): void

  startLink(acc: AccountId): Promise<void>
  cancelQr(): Promise<void>
  logout(acc: AccountId): Promise<void>
  dismissBanner(): void
}

export interface AppCtx {
  state: AppState
  actions: AppActions
}
