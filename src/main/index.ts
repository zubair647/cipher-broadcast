import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { join } from 'path'
import { Store, uid } from './store'
import { WhatsAppManager } from './whatsapp'
import { IPC } from '../shared/ipc'
import type {
  AccountId,
  AllData,
  Broadcast,
  Group,
  List,
  MediaType,
  SendRequest,
  SendResult,
  SessionStatus
} from '../shared/types'

let mainWindow: BrowserWindow | null = null
const store = new Store()

function send(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}
// new changes
const wa = new WhatsAppManager({
  qr: (account, dataUrl) => send(IPC.onQr, { account, dataUrl }),
  status: (account, status, linkedWhen) => {
    store.update(account, (a) => {
      a.status = status
      if (linkedWhen) a.linkedWhen = linkedWhen
    })
    send(IPC.onStatus, { account, status, linkedWhen })
  }
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'CipherSchools Broadcast',
    backgroundColor: '#FAFAF8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Merge freshly-pulled groups into the registry, preserving friendly display names. */
function mergeGroups(account: AccountId, raw: { whatsapp_group_id: string; name: string }[]): void {
  store.update(account, (a) => {
    const byWid = new Map(a.groups.map((g) => [g.whatsapp_group_id, g]))
    for (const r of raw) {
      const existing = byWid.get(r.whatsapp_group_id)
      if (existing) {
        // keep the user's friendly display_name; do not overwrite
        continue
      }
      a.groups.push({
        id: uid('g'),
        whatsapp_group_id: r.whatsapp_group_id,
        display_name: r.name
      })
    }
  })
  store.syncAllGroupsList(account)
}

function registerIpc(): void {
  ipcMain.handle(IPC.getData, (): AllData => store.all())

  ipcMain.handle(IPC.linkAccount, async (_e, account: AccountId) => {
    await wa.start(account)
    return store.account(account)
  })

  ipcMain.handle(IPC.cancelLink, async (_e, account: AccountId) => {
    await wa.destroy(account)
    const wasEverLinked = store.account(account).groups.length > 0
    const status: SessionStatus = wasEverLinked ? 'needs_relink' : 'not_linked'
    store.update(account, (a) => {
      a.status = status
    })
    send(IPC.onStatus, { account, status })
    return store.account(account)
  })

  ipcMain.handle(IPC.logout, async (_e, account: AccountId) => {
    await wa.logout(account)
    return store.account(account)
  })

  ipcMain.handle(IPC.refreshGroups, async (_e, account: AccountId) => {
    const raw = await wa.fetchGroups(account)
    mergeGroups(account, raw)
    return store.account(account)
  })

  ipcMain.handle(
    IPC.renameGroup,
    (_e, account: AccountId, groupId: string, name: string) => {
      const clean = name.trim()
      if (clean) {
        store.update(account, (a) => {
          const g = a.groups.find((x) => x.id === groupId)
          if (g) g.display_name = clean
        })
      }
      return store.account(account)
    }
  )

  ipcMain.handle(IPC.saveList, (_e, account: AccountId, list: Partial<List>) => {
    const name = (list.name || '').trim()
    if (!name) return store.account(account)
    store.update(account, (a) => {
      if (list.id) {
        const existing = a.lists.find((l) => l.id === list.id)
        if (existing) {
          existing.name = name
          existing.group_ids = list.group_ids || []
        }
      } else {
        a.lists.push({ id: uid('l'), name, group_ids: list.group_ids || [] })
      }
    })
    return store.account(account)
  })

  ipcMain.handle(IPC.deleteList, (_e, account: AccountId, listId: string) => {
    store.update(account, (a) => {
      const target = a.lists.find((l) => l.id === listId)
      if (target && target.name !== 'All Groups') {
        a.lists = a.lists.filter((l) => l.id !== listId)
      }
    })
    return store.account(account)
  })

  ipcMain.handle(IPC.pickFile, async (_e, kind: 'image' | 'pdf') => {
    if (!mainWindow) return null
    const filters =
      kind === 'image'
        ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
        : [{ name: 'PDF', extensions: ['pdf'] }]
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters
    })
    if (res.canceled || !res.filePaths.length) return null
    const path = res.filePaths[0]
    return { path, name: path.split(/[\\/]/).pop() || 'attachment' }
  })

  ipcMain.handle(IPC.sendBroadcast, async (_e, req: SendRequest) => {
    const acc = store.account(req.account)
    if (acc.status !== 'active') throw new Error('Account session is not active')

    const list = acc.lists.find((l) => l.id === req.listId)
    if (!list) throw new Error('List not found')

    const targets: Group[] = list.group_ids
      .map((id) => acc.groups.find((g) => g.id === id))
      .filter((g): g is Group => Boolean(g))

    if (!targets.length) throw new Error('No groups in this list')

    const total = targets.length
    const results = await wa.broadcast(
      req.account,
      targets,
      req.text,
      req.mediaPath,
      (result: SendResult, index: number) => {
        send(IPC.onSendProgress, {
          account: req.account,
          current: index + 1,
          total,
          listName: list.name,
          result
        })
      }
    )

    const broadcast: Broadcast = {
      id: uid('b'),
      timestamp: Date.now(),
      when: 'Just now',
      list_id: list.id,
      list_name: list.name,
      text: req.text.trim() || '(no message text)',
      media_type: req.mediaType as MediaType,
      media_name: req.mediaName,
      results
    }

    store.update(req.account, (a) => {
      a.history.unshift(broadcast)
    })

    send(IPC.onSendDone, { account: req.account, broadcast })
    return broadcast
  })

  ipcMain.handle(IPC.openExternal, (_e, url: string) => shell.openExternal(url))
}

/** On launch, auto-reconnect any account that was previously linked. */
function autoReconnect(): void {
  for (const account of ['business', 'personal'] as AccountId[]) {
    const a = store.account(account)
    if (a.status === 'active' || a.status === 'needs_relink') {
      wa.start(account).catch((err) => console.error(`[main] autoReconnect ${account}`, err))
    }
  }
}

function applyCsp(): void {
  const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])
  const csp = isDev
    ? "default-src 'self' 'unsafe-inline' data: blob: ws://localhost:* http://localhost:*; " +
      "img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' http://localhost:*"
    : "default-src 'self'; img-src 'self' data: blob:; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; script-src 'self'"
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

app.whenReady().then(() => {
  applyCsp()
  registerIpc()
  createWindow()
  autoReconnect()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void wa.shutdown()
})
