import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'
import { AccountSwitcher, navItems } from './Sidebar'
import mark from '../assets/cipher-mark.png'

export function MobileTopbar({ app }: { app: AppCtx }): React.JSX.Element {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <img src={mark} alt="" width={26} height={26} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Broadcast</span>
      </div>
      <button
        onClick={app.actions.openNav}
        aria-label="Open menu"
        style={{
          display: 'inline-flex',
          padding: 8,
          border: '1px solid var(--line-strong)',
          borderRadius: 9,
          background: 'var(--surface)',
          color: 'var(--text2)',
          cursor: 'pointer'
        }}
      >
        <Icon name="menu" size={20} sw={1.8} />
      </button>
    </header>
  )
}

export function MobileSlideover({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  return (
    <div
      onClick={actions.closeNav}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,20,.4)',
        zIndex: 60,
        animation: 'fadeUp .15s ease'
      }}
    >
      <nav
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 280,
          maxWidth: '84vw',
          background: 'var(--surface)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          animation: 'popIn .18s ease'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Menu</span>
          <button
            onClick={actions.closeNav}
            aria-label="Close menu"
            style={{
              padding: 6,
              border: 'none',
              background: 'var(--bg)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--sub)',
              display: 'inline-flex'
            }}
          >
            <Icon name="x" size={18} sw={1.8} />
          </button>
        </div>
        <div style={{ marginBottom: 10 }}>
          <AccountSwitcher app={app} />
        </div>
        {navItems.map((item) => {
          const active = state.screen === item.key
          return (
            <button
              key={item.key}
              onClick={() => actions.go(item.key)}
              style={{
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
                background: active ? 'var(--orange-soft)' : 'transparent',
                color: active ? 'var(--orange-ink)' : 'var(--sub)'
              }}
            >
              <Icon name={item.icon} size={18} sw={1.7} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
