// Shared domain types used by both the main process and the renderer.

export type AccountId = 'business' | 'personal'

/** Session status for an account. Mirrors the PRD/design state machine. */
export type SessionStatus =
  | 'active' // linked and ready to send (green)
  | 'needs_relink' // was linked, session dropped (amber)
  | 'connecting' // QR shown / authenticating
  | 'not_linked' // never linked on this machine (gray)

export type MediaType = 'none' | 'image' | 'pdf'

export interface Group {
  id: string // stable local id
  whatsapp_group_id: string // the WhatsApp chat id, e.g. 1203...@g.us
  display_name: string // friendly, user-editable name
}

export interface List {
  id: string
  name: string
  group_ids: string[] // many-to-many with Group
}

export type SendStatus = 'sent' | 'failed'

export interface SendResult {
  group_id: string
  name: string
  status: SendStatus
  error_message: string | null
  timestamp: number
}

export interface Broadcast {
  id: string
  timestamp: number
  when: string // human-readable label, computed at render time if absent
  list_id: string
  list_name: string
  text: string
  media_type: MediaType
  media_name: string
  results: SendResult[]
}

/** The persisted + live state for a single account. */
export interface AccountData {
  label: string // "Business" | "Personal"
  status: SessionStatus
  linkedWhen: string // human-readable last-linked note
  groups: Group[]
  lists: List[]
  history: Broadcast[]
  defaultListId?: string // which list is pre-selected in the composer
}

export type AllData = Record<AccountId, AccountData>

/** Composer payload sent from renderer to main to start a broadcast. */
export interface SendRequest {
  account: AccountId
  listId: string
  text: string
  mediaType: MediaType
  mediaPath: string | null
  mediaName: string
}

/** Progressive send events pushed from main -> renderer. */
export interface SendProgress {
  account: AccountId
  current: number
  total: number
  listName: string
  result: SendResult // the result for the group that just completed
}

export interface SendDone {
  account: AccountId
  broadcast: Broadcast
}

/** QR event pushed from main -> renderer (a data-URL PNG of the QR). */
export interface QrEvent {
  account: AccountId
  dataUrl: string
}

/** Status change pushed from main -> renderer. */
export interface StatusEvent {
  account: AccountId
  status: SessionStatus
  linkedWhen?: string
}
