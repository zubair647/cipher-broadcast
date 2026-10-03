import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  AccountData,
  AccountId,
  AllData,
  Broadcast,
  List,
  QrEvent,
  SendDone,
  SendProgress,
  SendRequest,
  StatusEvent
} from '../shared/types'

const api = {
  getData: (): Promise<AllData> => ipcRenderer.invoke(IPC.getData),

  linkAccount: (account: AccountId): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.linkAccount, account),
  cancelLink: (account: AccountId): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.cancelLink, account),
  logout: (account: AccountId): Promise<AccountData> => ipcRenderer.invoke(IPC.logout, account),

  refreshGroups: (account: AccountId): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.refreshGroups, account),
  renameGroup: (account: AccountId, groupId: string, name: string): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.renameGroup, account, groupId, name),

  saveList: (account: AccountId, list: Partial<List>): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.saveList, account, list),
  deleteList: (account: AccountId, listId: string): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.deleteList, account, listId),
  setDefaultList: (account: AccountId, listId: string): Promise<AccountData> =>
    ipcRenderer.invoke(IPC.setDefaultList, account, listId),

  sendBroadcast: (req: SendRequest): Promise<Broadcast> =>
    ipcRenderer.invoke(IPC.sendBroadcast, req),

  pickFile: (kind: 'image' | 'pdf'): Promise<{ path: string; name: string } | null> =>
    ipcRenderer.invoke(IPC.pickFile, kind),

  openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.openExternal, url),

  // --- event subscriptions (return an unsubscribe fn) ---
  onQr: (cb: (e: QrEvent) => void): (() => void) => {
    const h = (_: unknown, payload: QrEvent): void => cb(payload)
    ipcRenderer.on(IPC.onQr, h)
    return () => ipcRenderer.removeListener(IPC.onQr, h)
  },
  onStatus: (cb: (e: StatusEvent) => void): (() => void) => {
    const h = (_: unknown, payload: StatusEvent): void => cb(payload)
    ipcRenderer.on(IPC.onStatus, h)
    return () => ipcRenderer.removeListener(IPC.onStatus, h)
  },
  onSendProgress: (cb: (e: SendProgress) => void): (() => void) => {
    const h = (_: unknown, payload: SendProgress): void => cb(payload)
    ipcRenderer.on(IPC.onSendProgress, h)
    return () => ipcRenderer.removeListener(IPC.onSendProgress, h)
  },
  onSendDone: (cb: (e: SendDone) => void): (() => void) => {
    const h = (_: unknown, payload: SendDone): void => cb(payload)
    ipcRenderer.on(IPC.onSendDone, h)
    return () => ipcRenderer.removeListener(IPC.onSendDone, h)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
