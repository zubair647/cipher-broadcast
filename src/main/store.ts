import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs'
import { join } from 'path'
import type { AccountData, AccountId, AllData } from '../shared/types'

/**
 * Minimal, dependency-free JSON persistence for the two account stores.
 * Everything lives under the OS userData dir — fully local, nothing leaves the machine.
 */

const uid = (p = 'x'): string => p + Math.random().toString(36).slice(2, 9)

function emptyAccount(label: string): AccountData {
  return {
    label,
    status: 'not_linked',
    linkedWhen: 'Not linked yet',
    groups: [],
    // A default "All Groups" list is always maintained (PRD FR3).
    lists: [{ id: uid('l'), name: 'All Groups', group_ids: [] }],
    history: []
  }
}

function defaultData(): AllData {
  return {
    business: emptyAccount('Business'),
    personal: emptyAccount('Personal')
  }
}

export class Store {
  private file: string
  private dir: string
  private data: AllData

  constructor() {
    this.dir = join(app.getPath('userData'), 'data')
    this.file = join(this.dir, 'store.json')
    this.data = this.load()
  }

  private load(): AllData {
    try {
      if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
      if (!existsSync(this.file)) {
        const d = defaultData()
        this.persist(d)
        return d
      }
      const raw = JSON.parse(readFileSync(this.file, 'utf-8')) as Partial<AllData>
      // Merge onto defaults so a partial/old file never crashes the app.
      const base = defaultData()
      const merged: AllData = {
        business: { ...base.business, ...(raw.business || {}) },
        personal: { ...base.personal, ...(raw.personal || {}) }
      }
      // Guarantee an "All Groups" default list survives.
      for (const k of ['business', 'personal'] as AccountId[]) {
        if (!merged[k].lists?.length) merged[k].lists = base[k].lists
      }
      return merged
    } catch (err) {
      console.error('[store] failed to load, resetting:', err)
      return defaultData()
    }
  }

  private persist(d: AllData = this.data): void {
    try {
      if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
      const tmp = this.file + '.tmp'
      writeFileSync(tmp, JSON.stringify(d, null, 2), 'utf-8')
      renameSync(tmp, this.file) // atomic-ish write
    } catch (err) {
      console.error('[store] failed to persist:', err)
    }
  }

  all(): AllData {
    return this.data
  }

  account(id: AccountId): AccountData {
    return this.data[id]
  }

  /** Apply a mutation to one account and persist. */
  update(id: AccountId, fn: (a: AccountData) => void): AccountData {
    fn(this.data[id])
    this.persist()
    return this.data[id]
  }

  /** Ensure the default "All Groups" list tracks every registry group. */
  syncAllGroupsList(id: AccountId): void {
    const a = this.data[id]
    const all = a.lists.find((l) => l.name === 'All Groups')
    if (all) all.group_ids = a.groups.map((g) => g.id)
  }
}

export { uid }
