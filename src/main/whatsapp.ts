import { app } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'
import { homedir } from 'os'
import QRCode from 'qrcode'
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js'
import type {
  AccountId,
  Group,
  SendResult,
  SendStatus,
  SessionStatus
} from '../shared/types'

type WAClient = Client

// Human-like throttle between sends (ms). Larger jitter => lower flag risk (PRD Risks).
const MIN_DELAY = 3000
const MAX_DELAY = 7000

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const jitter = (): number => MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY))

function firstExisting(paths: string[]): string | undefined {
  return paths.find((p) => {
    try {
      return p && existsSync(p)
    } catch {
      return false
    }
  })
}

/**
 * Resolve a usable Chrome/Chromium executable. Priority:
 *  1. PUPPETEER_EXECUTABLE_PATH env override
 *  2. Full "Chrome for Testing" downloaded into puppeteer's cache
 *  3. A system Chrome/Chromium install
 *  4. chrome-headless-shell cache (headless-only last resort)
 * Returns undefined to let puppeteer fall back to its own default resolution.
 */
function resolveChromePath(): string | undefined {
  const env = process.env['PUPPETEER_EXECUTABLE_PATH']
  if (env && existsSync(env)) return env

  const cache = join(homedir(), '.cache', 'puppeteer')
  const candidates: string[] = []

  const scan = (base: string, leaves: string[]): void => {
    try {
      if (!existsSync(base)) return
      for (const v of readdirSync(base)) {
        for (const leaf of leaves) candidates.push(join(base, v, leaf))
      }
    } catch {
      /* ignore */
    }
  }

  // 2) puppeteer-managed full Chrome for Testing
  scan(join(cache, 'chrome'), [
    join('chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join('chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join('chrome-linux64', 'chrome'),
    join('chrome-win64', 'chrome.exe')
  ])

  // 3) system browsers
  candidates.push(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  )

  // 4) chrome-headless-shell (headless-only)
  scan(join(cache, 'chrome-headless-shell'), [
    join('chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
    join('chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
    join('chrome-headless-shell-linux64', 'chrome-headless-shell')
  ])

  return firstExisting(candidates)
}

export interface WAEmitter {
  qr: (account: AccountId, dataUrl: string) => void
  status: (account: AccountId, status: SessionStatus, linkedWhen?: string) => void
}

export interface WARawGroup {
  whatsapp_group_id: string
  name: string
}

/** Manages one whatsapp-web.js Client per account, each with its own LocalAuth session. */
export class WhatsAppManager {
  private clients = new Map<AccountId, WAClient>()
  private sessionDir: string

  constructor(private emit: WAEmitter) {
    this.sessionDir = join(app.getPath('userData'), 'wa-sessions')
  }

  private clientId(account: AccountId): string {
    return `cipher-${account}`
  }

  isActive(account: AccountId): boolean {
    return this.clients.has(account)
  }

  private build(account: AccountId): WAClient {
    const executablePath = resolveChromePath()
    if (executablePath) {
      console.log(`[wa] using Chrome at: ${executablePath}`)
    } else {
      console.warn('[wa] no Chrome found; falling back to puppeteer default resolution')
    }
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.clientId(account),
        dataPath: this.sessionDir
      }),
      puppeteer: {
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    })

    client.on('qr', async (qr: string) => {
      try {
        const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 })
        this.emit.qr(account, dataUrl)
        this.emit.status(account, 'connecting')
      } catch (err) {
        console.error('[wa] qr render failed', err)
      }
    })

    client.on('authenticated', () => {
      this.emit.status(account, 'connecting')
    })

    client.on('ready', () => {
      this.emit.status(account, 'active', 'Linked just now')
    })

    client.on('disconnected', (reason: string) => {
      console.warn(`[wa] ${account} disconnected:`, reason)
      this.emit.status(account, 'needs_relink', 'Session dropped — re-link to resume')
      // Drop the client; a re-link rebuilds it.
      void this.destroy(account)
    })

    client.on('auth_failure', (msg: string) => {
      console.error(`[wa] ${account} auth failure:`, msg)
      this.emit.status(account, 'needs_relink', 'Authentication failed — re-link')
    })

    return client
  }

  /** Start (or restart) a client and begin the link flow / auto-reconnect. */
  async start(account: AccountId): Promise<void> {
    if (this.clients.has(account)) return
    const client = this.build(account)
    this.clients.set(account, client)
    this.emit.status(account, 'connecting')
    try {
      await client.initialize()
    } catch (err) {
      console.error(`[wa] ${account} initialize failed`, err)
      this.clients.delete(account)
      this.emit.status(account, 'needs_relink', 'Could not start session — try again')
      throw err
    }
  }

  /** Tear down a client without wiping saved credentials. */
  async destroy(account: AccountId): Promise<void> {
    const client = this.clients.get(account)
    this.clients.delete(account)
    if (!client) return
    try {
      await client.destroy()
    } catch (err) {
      console.warn(`[wa] ${account} destroy error`, err)
    }
  }

  /** Full logout: ends the session and clears saved credentials for this account. */
  async logout(account: AccountId): Promise<void> {
    const client = this.clients.get(account)
    if (client) {
      try {
        await client.logout()
      } catch (err) {
        console.warn(`[wa] ${account} logout error`, err)
      }
    }
    await this.destroy(account)
    this.emit.status(account, 'not_linked', 'Not linked yet')
  }

  /** Pull every group the account belongs to. */
  async fetchGroups(account: AccountId): Promise<WARawGroup[]> {
    const client = this.clients.get(account)
    if (!client) throw new Error('Account is not linked')
    const chats = await client.getChats()
    return chats
      .filter((c) => c.isGroup)
      .map((c) => ({ whatsapp_group_id: c.id._serialized, name: c.name || 'Unnamed group' }))
  }

  /**
   * Send `text` (+ optional media) to each target group, one at a time with a
   * randomized delay. Reports each group's result via `onResult`. A failure on
   * one group never stops the rest (PRD FR5 / Reliability).
   */
  async broadcast(
    account: AccountId,
    targets: Group[],
    text: string,
    mediaPath: string | null,
    onResult: (r: SendResult, index: number) => void
  ): Promise<SendResult[]> {
    const client = this.clients.get(account)
    if (!client) throw new Error('Account is not linked')

    const media = mediaPath ? MessageMedia.fromFilePath(mediaPath) : null
    const results: SendResult[] = []

    for (let i = 0; i < targets.length; i++) {
      const g = targets[i]
      let status: SendStatus = 'sent'
      let error: string | null = null
      try {
        if (media) {
          await client.sendMessage(g.whatsapp_group_id, media, {
            caption: text || undefined
          })
        } else {
          await client.sendMessage(g.whatsapp_group_id, text)
        }
      } catch (err) {
        status = 'failed'
        error = err instanceof Error ? err.message : 'Send failed'
        console.error(`[wa] send to ${g.display_name} failed:`, err)
      }

      const result: SendResult = {
        group_id: g.id,
        name: g.display_name,
        status,
        error_message: error,
        timestamp: Date.now()
      }
      results.push(result)
      onResult(result, i)

      // Throttle between sends (not after the last one).
      if (i < targets.length - 1) await sleep(jitter())
    }

    return results
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.clients.keys()].map((a) => this.destroy(a)))
  }
}
