import { app } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, rmSync } from 'fs'
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

// Max time to wait for a QR / ready after starting a session before giving up.
const START_TIMEOUT = 90000

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

  // 2) puppeteer-managed full Chrome for Testing (isolated profile, ideal)
  scan(join(cache, 'chrome'), [
    join('chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join('chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join('chrome-linux64', 'chrome'),
    join('chrome-win64', 'chrome.exe')
  ])

  // 3) chrome-headless-shell — isolated from the user's everyday Chrome and
  // purpose-built for automation. Preferred over system Chrome, which can hang
  // when the user already has Chrome open (we always run headless anyway).
  scan(join(cache, 'chrome-headless-shell'), [
    join('chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
    join('chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
    join('chrome-headless-shell-linux64', 'chrome-headless-shell')
  ])

  // 4) system browsers (last resort)
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

/** Minimal shape of the puppeteer Page we use (whatsapp-web.js exposes client.pupPage). */
interface PuppeteerPage {
  evaluate<T>(pageFunction: () => T | Promise<T>): Promise<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluate<T>(pageFunction: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T>
}

/** A plain, structured-clone-safe copy of a MessageMedia for sending via page.evaluate. */
interface MediaPayload {
  mimetype: string
  data: string
  filename?: string
  filesize?: number
}

/** Manages one whatsapp-web.js Client per account, each with its own LocalAuth session. */
export class WhatsAppManager {
  private clients = new Map<AccountId, WAClient>()
  private startTimers = new Map<AccountId, ReturnType<typeof setTimeout>>()
  private sessionDir: string

  constructor(private emit: WAEmitter) {
    this.sessionDir = join(app.getPath('userData'), 'wa-sessions')
  }

  private clientId(account: AccountId): string {
    return `cipher-${account}`
  }

  /** Cancel the startup watchdog once the client reaches a known state. */
  private settle(account: AccountId): void {
    const t = this.startTimers.get(account)
    if (t) {
      clearTimeout(t)
      this.startTimers.delete(account)
    }
  }

  /**
   * Remove stale Chrome profile lock files. If the app was killed while a
   * session was starting, these locks remain and make the next launch hang
   * forever with no QR. Safe to delete when no client is using the profile.
   */
  private clearProfileLocks(account: AccountId): void {
    const dir = join(this.sessionDir, `session-${this.clientId(account)}`)
    for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
      try {
        rmSync(join(dir, name), { force: true })
      } catch {
        /* ignore */
      }
    }
  }

  isActive(account: AccountId): boolean {
    return this.clients.has(account)
  }

  /** True if a saved WhatsApp auth session exists on disk for this account. */
  hasSavedSession(account: AccountId): boolean {
    try {
      const dir = join(this.sessionDir, `session-${this.clientId(account)}`)
      return existsSync(dir) && readdirSync(dir).length > 0
    } catch {
      return false
    }
  }

  /** Force a fresh start (used by Link / Re-link): always yields a new QR if needed. */
  async restart(account: AccountId): Promise<void> {
    await this.destroy(account)
    await this.start(account)
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
      this.settle(account) // a QR means the browser came up fine
      try {
        const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 })
        // NOTE: do NOT emit a 'connecting' status here. The UI shows its
        // "Connecting…" overlay (which dims the QR) whenever it sees 'connecting'
        // while a QR is on screen — that must only happen AFTER the user scans
        // (the 'authenticated' event below), never while the QR is waiting to be
        // scanned.
        this.emit.qr(account, dataUrl)
      } catch (err) {
        console.error('[wa] qr render failed', err)
      }
    })

    client.on('authenticated', () => {
      this.settle(account)
      // User has scanned — now show the "Connecting…" state while WA finishes.
      this.emit.status(account, 'connecting')
    })

    client.on('ready', () => {
      this.settle(account)
      this.emit.status(account, 'active', 'Linked just now')
    })

    client.on('disconnected', (reason: string) => {
      console.warn(`[wa] ${account} disconnected:`, reason)
      this.settle(account)
      this.emit.status(account, 'needs_relink', 'Session dropped — re-link to resume')
      // Drop the client; a re-link rebuilds it.
      void this.destroy(account)
    })

    client.on('auth_failure', (msg: string) => {
      console.error(`[wa] ${account} auth failure:`, msg)
      this.settle(account)
      this.emit.status(account, 'needs_relink', 'Authentication failed — re-link')
    })

    return client
  }

  /** Start (or restart) a client and begin the link flow / auto-reconnect. */
  async start(account: AccountId): Promise<void> {
    if (this.clients.has(account)) return
    this.emit.status(account, 'connecting')

    // Watchdog spans the whole (possibly retried) startup.
    this.settle(account)
    this.startTimers.set(
      account,
      setTimeout(() => {
        if (!this.clients.has(account)) return
        console.error(`[wa] ${account} timed out before QR/ready`)
        void this.destroy(account)
        this.emit.status(account, 'needs_relink', 'Timed out starting WhatsApp — please try again')
      }, START_TIMEOUT)
    )

    // WhatsApp Web reloads itself once right after loading, which can destroy the
    // injection context ("Execution context was destroyed") on the first try. Retry
    // a few times — the next attempt lands after that reload and succeeds.
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      this.clearProfileLocks(account)
      const client = this.build(account)
      this.clients.set(account, client)
      try {
        await client.initialize()
        return // success — qr/ready events take over (and clear the watchdog)
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        await this.destroy(account)
        const transient =
          /execution context was destroyed|detached frame|target closed|session closed|navigation/i.test(
            msg
          )
        if (transient && attempt < 3) {
          console.warn(`[wa] ${account} startup hit a reload (attempt ${attempt}) — retrying`)
          await sleep(2500)
          continue
        }
        break
      }
    }
    console.error(`[wa] ${account} initialize failed`, lastErr)
    this.settle(account)
    this.emit.status(account, 'needs_relink', 'Could not start session — try again')
    throw lastErr
  }

  /** Tear down a client without wiping saved credentials. */
  async destroy(account: AccountId): Promise<void> {
    this.settle(account)
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

  /**
   * Pull every group the account belongs to.
   *
   * We deliberately do NOT use client.getChats(): in current whatsapp-web.js it
   * builds a full "chat model" for every chat AND every channel, and that step
   * throws against recent WhatsApp Web builds. We only need each group's id and
   * name, so we read the WhatsApp store directly and defensively — far more
   * resilient to WhatsApp Web changes.
   */
  async fetchGroups(account: AccountId): Promise<WARawGroup[]> {
    const client = this.clients.get(account)
    if (!client) throw new Error('Account is not linked')
    const page = (client as unknown as { pupPage?: PuppeteerPage }).pupPage
    if (!page) throw new Error('WhatsApp session is not ready yet')

    const raw = (await page.evaluate(() => {
      const out: { whatsapp_group_id: string; name: string }[] = []
      try {
        // Use whatsapp-web.js's own module loader + collection — the same path its
        // getChats() uses to list chats. We then read only each group's id + title
        // directly, deliberately skipping chat.serialize() / groupMetadata.update()
        // (the steps that throw on current WhatsApp Web builds).
        const req = (globalThis as unknown as { require?: (m: string) => unknown }).require
        if (typeof req !== 'function') return out
        const collections = req('WAWebCollections') as {
          Chat?: { getModelsArray?: () => unknown[] }
        }
        const chats = collections?.Chat?.getModelsArray?.() || []
        for (const chat of chats) {
          try {
            const c = chat as {
              id?: { _serialized?: string; server?: string }
              groupMetadata?: { subject?: string }
              formattedTitle?: string
              name?: string
            }
            const id = c.id && c.id._serialized ? c.id._serialized : ''
            const isGroup = Boolean(c.groupMetadata) || c.id?.server === 'g.us' || id.endsWith('@g.us')
            if (!id || !isGroup) continue
            let name = ''
            try {
              name = c.formattedTitle || ''
            } catch {
              /* getter can throw; ignore */
            }
            if (!name && c.groupMetadata && c.groupMetadata.subject) name = c.groupMetadata.subject
            if (!name && c.name) name = c.name
            if (!name) name = id.replace('@g.us', '')
            out.push({ whatsapp_group_id: id, name: String(name) })
          } catch {
            /* skip a bad chat, keep the rest */
          }
        }
      } catch {
        /* fall through to whatever we collected */
      }
      return out
    })) as WARawGroup[]

    console.log(`[wa] ${account} fetched ${raw.length} group(s)`)
    return raw
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
    // Re-read pupPage each time: if WhatsApp Web reloads mid-broadcast, the page's
    // frame is replaced and a stale reference throws "detached Frame".
    const getPage = (): PuppeteerPage | undefined =>
      (client as unknown as { pupPage?: PuppeteerPage }).pupPage
    if (!getPage()) throw new Error('WhatsApp session is not ready yet')

    // Build a structured-clone-safe media payload once (base64 data + mimetype).
    let media: MediaPayload | null = null
    if (mediaPath) {
      const m = MessageMedia.fromFilePath(mediaPath) as unknown as MediaPayload
      media = { mimetype: m.mimetype, data: m.data, filename: m.filename, filesize: m.filesize }
    }
    // Token so the page uploads the image ONCE and reuses it for every group
    // (re-processing only if a reload wipes the page-side cache).
    const mediaToken = media ? 'cm' + Date.now().toString(36) : null

    // Errors that mean "WhatsApp Web navigated/reloaded" — recoverable by waiting.
    const isRetryable = (msg: string): boolean =>
      /detached frame|target closed|session closed|execution context was destroyed|most likely because of a navigation|still loading|cannot find context/i.test(
        msg
      )

    // Wait (up to ~40s) for WhatsApp Web to finish (re)loading after a reload.
    const waitReady = async (): Promise<boolean> => {
      for (let k = 0; k < 20; k++) {
        try {
          const p = getPage()
          if (p) {
            const ok = await p.evaluate(() => {
              const g = globalThis as unknown as { WWebJS?: { getChat?: unknown }; require?: unknown }
              return (
                typeof g.require === 'function' &&
                !!g.WWebJS &&
                typeof g.WWebJS.getChat === 'function'
              )
            })
            if (ok) return true
          }
        } catch {
          /* page not ready yet */
        }
        await sleep(2000)
      }
      return false
    }

    const results: SendResult[] = []

    for (let i = 0; i < targets.length; i++) {
      const g = targets[i]
      let status: SendStatus = 'sent'
      let error: string | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
       try {
        const page = getPage()
        if (!page) throw new Error('WhatsApp session not available')
        // whatsapp-web.js@1.34.7's own sendMessage return path is broken against the
        // current WhatsApp Web (LID addressing): for text it returns undefined, and for
        // media it mangles the message (never attaches). So we drive WhatsApp's real send
        // primitive (WAWebSendMsgChatAction.addAndSendMsgToChat) directly, building the
        // message from the library's own helpers — media fields come from the processed
        // media's clean toJSON() (spreading the raw model corrupts the message). Success
        // is confirmed by a matching new "from me" message appearing in the chat. This was
        // verified end-to-end (text + image delivered, ack=1) against a live session.
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const res = (await page.evaluate(
          async (
            chatId: string,
            body: string,
            mediaPayload: MediaPayload | null,
            token: string | null
          ) => {
            const g = globalThis as any
            const req = g.require as ((m: string) => any) | undefined
            const WWebJS = g.WWebJS
            try {
              if (typeof req !== 'function' || !WWebJS || typeof WWebJS.getChat !== 'function') {
                return { ok: false, error: 'WhatsApp is still loading — try again in a moment' }
              }
              const chat = await WWebJS.getChat(chatId, { getAsModel: false })
              if (!chat) return { ok: false, error: 'Group not found on WhatsApp' }

              const before = new Set(
                (() => {
                  try {
                    return chat.msgs
                      .getModelsArray()
                      .map((m: any) => m.id && m.id._serialized)
                      .filter(Boolean)
                  } catch {
                    return []
                  }
                })()
              )

              let content = body || ''
              let mediaJson: any = null
              if (mediaPayload && token) {
                // Upload/process the media ONCE per broadcast and reuse it for every
                // group. If a reload wiped the cache, re-process transparently.
                g.__cipherMedia = g.__cipherMedia || {}
                let mo = g.__cipherMedia[token]
                if (!mo) {
                  mo = await WWebJS.processMediaData(mediaPayload, {
                    forceDocument: false,
                    forceGif: false,
                    forceVoice: false,
                    forceMediaHd: false
                  })
                  g.__cipherMedia[token] = mo
                }
                mediaJson = mo && mo.toJSON ? mo.toJSON() : {}
                content = typeof mo.preview === 'string' ? mo.preview : ''
              }

              const { getMaybeMeLidUser, getMaybeMePnUser } = req('WAWebUserPrefsMeUser')
              const lidUser = getMaybeMeLidUser()
              const meUser = getMaybeMePnUser()
              const newId = await req('WAWebMsgKey').newId()
              let from = chat.id.isLid && chat.id.isLid() ? lidUser : meUser
              let participant
              if (typeof chat.id?.isGroup === 'function' && chat.id.isGroup()) {
                from = chat.groupMetadata && chat.groupMetadata.isLidAddressingMode ? lidUser : meUser
                participant = req('WAWebWidFactory').asUserWidOrThrow(from)
              }
              const MsgKey = req('WAWebMsgKey')
              const newMsgKey = new MsgKey({ from, to: chat.id, id: newId, participant, selfDir: 'out' })
              let ephemeralFields = {}
              try {
                ephemeralFields = req('WAWebGetEphemeralFieldsMsgActionsUtils').getEphemeralFields(chat)
              } catch {
                /* optional */
              }
              const base = {
                id: newMsgKey,
                ack: 0,
                from,
                to: chat.id,
                local: true,
                self: 'out',
                t: parseInt(String(new Date().getTime() / 1000), 10),
                isNewMsg: true,
                ...ephemeralFields
              }
              const message = mediaJson
                ? { ...base, ...mediaJson, body: content, caption: body || undefined }
                : { ...base, type: 'chat', body: content }

              let threw: string | null = null
              try {
                const r = req('WAWebSendMsgChatAction').addAndSendMsgToChat(chat, message)
                await (Array.isArray(r) ? r[0] : r)
              } catch (e: any) {
                threw = String((e && e.message) || e)
              }

              // Confirm a matching new "from me" message landed in the chat.
              const arr = chat.msgs.getModelsArray()
              const now = Math.floor(Date.now() / 1000)
              const mine = arr.filter(
                (m: any) =>
                  m.id &&
                  m.id.fromMe === true &&
                  !before.has(m.id._serialized) &&
                  m.t &&
                  now - m.t < 180
              )
              const ok = mediaJson
                ? mine.some((m: any) => ['image', 'video', 'document', 'ptt', 'audio'].includes(m.type))
                : mine.some((m: any) => m.type === 'chat')
              if (ok) return { ok: true }
              return { ok: false, error: threw || 'Message was not delivered' }
            } catch (e: any) {
              return { ok: false, error: String((e && e.message) || e) }
            }
          },
          g.whatsapp_group_id,
          text,
          media,
          mediaToken
        )) as { ok: boolean; error?: string }
        /* eslint-enable @typescript-eslint/no-explicit-any */

        if (res.ok) {
          status = 'sent'
          error = null
        } else {
          status = 'failed'
          error = res.error || 'Send failed'
          console.error(`[wa] send to ${g.display_name} failed:`, error)
        }
        break // done with this group (success or a definitive app-level failure)
       } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (isRetryable(msg) && attempt < 3) {
          console.warn(
            `[wa] ${g.display_name}: WhatsApp Web reloaded (attempt ${attempt}) — waiting to retry`
          )
          await waitReady()
          continue // retry this same group
        }
        status = 'failed'
        error = msg
        console.error(`[wa] send to ${g.display_name} threw:`, msg)
        break
       }
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

    // Free the one-time media cache in the page.
    if (mediaToken) {
      try {
        const p = getPage()
        if (p)
          await p.evaluate((t: string) => {
            const g = globalThis as unknown as { __cipherMedia?: Record<string, unknown> }
            if (g.__cipherMedia) delete g.__cipherMedia[t]
          }, mediaToken)
      } catch {
        /* best effort */
      }
    }

    return results
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.clients.keys()].map((a) => this.destroy(a)))
  }
}
