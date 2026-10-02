import React from 'react'
import type { AccountId } from '../../../shared/types'
import type { AppCtx, Screen } from '../state/types'
import { Icon, type IconName } from '../icons'
import mark from '../assets/cipher-mark.png'

function dotColor(status: string): string {
  return status === 'active'
    ? 'var(--green)'
    : status === 'needs_relink'
      ? 'var(--amber)'
      : 'var(--muted)'
}

const navItems: { key: Screen; label: string; icon: IconName }[] = [
  { key: 'send', label: 'Send Broadcast', icon: 'megaphone' },
  { key: 'lists', label: 'Manage Lists', icon: 'list' },
  { key: 'groups', label: 'Manage Groups', icon: 'users' },
  { key: 'history', label: 'Send History', icon: 'history' },
  { key: 'account', label: 'Account Setup', icon: 'link' }
]

export function AccountSwitcher({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const accBtn = (key: AccountId): React.CSSProperties => {
    const on = state.account === key
    return {
      flex: '1 1 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      padding: '8px 6px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'inherit',
      background: on ? 'var(--surface)' : 'transparent',
      color: on ? 'var(--ink)' : 'var(--muted)',
      boxShadow: on ? '0 1px 2px rgba(20,20,20,.08)' : 'none'
    }
  }
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: 11,
        padding: 4
      }}
    >
      <button onClick={() => actions.setAccount('business')} style={accBtn('business')}>
        <span
          style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor(state.data.business.status) }}
        />
        Business
      </button>
      <button onClick={() => actions.setAccount('personal')} style={accBtn('personal')}>
        <span
          style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor(state.data.personal.status) }}
        />
        Personal
      </button>
    </div>
  )
}

function NavButton({
  app,
  item,
  compact
}: {
  app: AppCtx
  item: { key: Screen; label: string; icon: IconName }
  compact?: boolean
}): React.JSX.Element {
  const active = app.state.screen === item.key
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '10px 12px',
    borderRadius: 10,
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background .12s',
    background: active ? 'var(--orange-soft)' : 'transparent',
    color: active ? 'var(--orange-ink)' : 'var(--sub)'
  }
  return (
    <button onClick={() => app.actions.go(item.key)} style={base}>
      {!compact && <Icon name={item.icon} size={18} sw={1.7} />}
      {item.label}
    </button>
  )
}

export function Sidebar({ app }: { app: AppCtx }): React.JSX.Element {
  const { state } = app
  const acc = state.data[state.account]
  const isActive = acc.status === 'active'
  const statusColor = dotColor(acc.status)
  const sessionNote = isActive
    ? acc.linkedWhen + ' · ready to send'
    : acc.status === 'needs_relink'
      ? 'Expired — re-link to resume sending'
      : 'Not linked yet'

  return (
    <aside
      style={{
        width: 264,
        flex: '0 0 264px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0
      }}
    >
      <div style={{ padding: '22px 20px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <img src={mark} alt="CipherSchools" width={30} height={30} style={{ display: 'block' }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', color: 'var(--ink)' }}>
            CipherSchools
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.02em' }}>Broadcast Tool</div>
        </div>
      </div>

      <div style={{ padding: '6px 16px 14px' }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '.09em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            padding: '0 4px 8px'
          }}
        >
          Account
        </div>
        <AccountSwitcher app={app} />
      </div>

      <nav style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {navItems.map((item) => (
          <NavButton key={item.key} app={app} item={item} />
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: 16 }}>
        <div
          style={{
            background: isActive ? 'var(--bg)' : 'var(--amber-soft)',
            border: '1px solid ' + (isActive ? 'var(--line)' : 'var(--amber)'),
            borderRadius: 12,
            padding: '13px 14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)' }}>
              {acc.label} session
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', lineHeight: 1.5 }}>{sessionNote}</div>
        </div>
      </div>
    </aside>
  )
}

export { navItems, dotColor }
