import React, { useEffect } from 'react'
import { useApp } from './state/useApp'
import { Sidebar } from './components/Sidebar'
import { MobileTopbar, MobileSlideover } from './components/MobileNav'
import { SendBroadcast } from './components/SendBroadcast'
import { ManageLists } from './components/ManageLists'
import { ManageGroups } from './components/ManageGroups'
import { SendHistory } from './components/SendHistory'
import { AccountSetup } from './components/AccountSetup'
import { PreviewModal } from './components/PreviewModal'
import { SendModal } from './components/SendModal'
import { Icon } from './icons'

function Banner({
  kind,
  text,
  onClose
}: {
  kind: 'error' | 'info'
  text: string
  onClose: () => void
}): React.JSX.Element {
  const palette =
    kind === 'error'
      ? { bg: 'var(--red-soft)', border: 'var(--red-border)', ink: 'var(--red-ink)' }
      : { bg: 'var(--amber-soft)', border: 'var(--amber)', ink: 'var(--amber-ink)' }
  // Auto-dismiss so a banner never lingers across screens.
  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 120,
        maxWidth: 'min(520px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        background: palette.bg,
        border: '1px solid ' + palette.border,
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 8px 30px rgba(20,20,20,.12)',
        animation: 'fadeUp .18s ease'
      }}
    >
      <Icon name="alert" size={18} sw={1.8} color={palette.ink} style={{ flex: '0 0 auto', marginTop: 1 }} />
      <div style={{ flex: '1 1 auto', fontSize: 13, color: palette.ink, lineHeight: 1.5 }}>{text}</div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          padding: 2,
          border: 'none',
          background: 'transparent',
          color: palette.ink,
          cursor: 'pointer'
        }}
      >
        <Icon name="x" size={16} sw={2} />
      </button>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const app = useApp()
  const { state, actions } = app

  const screen = state.screen

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: state.isMobile ? 'column' : 'row',
        minHeight: '100vh',
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--ink)'
      }}
    >
      {state.banner && (
        <Banner kind={state.banner.kind} text={state.banner.text} onClose={actions.dismissBanner} />
      )}

      {!state.isMobile && <Sidebar app={app} />}
      {state.isMobile && <MobileTopbar app={app} />}
      {state.isMobile && state.mobileNav && <MobileSlideover app={app} />}

      <main style={{ flex: '1 1 auto', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        <div
          style={{
            maxWidth: 940,
            margin: '0 auto',
            padding: 'clamp(20px,4vw,44px) clamp(18px,4vw,40px) 80px'
          }}
        >
          {state.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--sub)', paddingTop: 40 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: '3px solid var(--line-strong)',
                  borderTopColor: 'var(--orange)',
                  borderRadius: '50%',
                  animation: 'spin .8s linear infinite'
                }}
              />
              Loading…
            </div>
          ) : (
            <>
              {screen === 'send' && <SendBroadcast app={app} />}
              {screen === 'lists' && <ManageLists app={app} />}
              {screen === 'groups' && <ManageGroups app={app} />}
              {screen === 'history' && <SendHistory app={app} />}
              {screen === 'account' && <AccountSetup app={app} />}
            </>
          )}
        </div>
      </main>

      <PreviewModal app={app} />
      <SendModal app={app} />
    </div>
  )
}
