import React from 'react'
import type { AccountId } from '../../../shared/types'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

function QrPanel({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const qr = state.qr!
  const label = state.data[qr.account].label
  const hasQr = Boolean(qr.dataUrl)
  const connecting = qr.connecting && hasQr

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 'clamp(20px,3vw,32px)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 36,
        alignItems: 'center',
        animation: 'popIn .2s ease'
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          position: 'relative',
          width: 208,
          height: 208,
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}
      >
        {hasQr ? (
          <img
            src={qr.dataUrl!}
            alt="WhatsApp QR code"
            style={{ width: '100%', height: '100%', opacity: connecting ? 0.25 : 1 }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                border: '3px solid var(--line-strong)',
                borderTopColor: 'var(--orange)',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite'
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)' }}>Preparing code…</span>
          </div>
        )}
        {connecting && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,.82)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                border: '3px solid var(--line-strong)',
                borderTopColor: 'var(--orange)',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite'
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)' }}>Connecting…</span>
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 260px', minWidth: 240 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--orange-ink)',
            marginBottom: 8
          }}
        >
          Linking {label}
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>
          Scan with your phone
        </h2>
        <ol style={{ margin: '0 0 24px', paddingLeft: 20, fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.9 }}>
          <li>Open WhatsApp on your phone</li>
          <li>
            Tap <strong style={{ color: 'var(--text2)', fontWeight: 600 }}>Settings → Linked Devices</strong>
          </li>
          <li>
            Tap <strong style={{ color: 'var(--text2)', fontWeight: 600 }}>Link a Device</strong> and scan this code
          </li>
        </ol>
        <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {connecting ? 'Connecting your account…' : 'Waiting for you to scan…'}
          </span>
          <button
            onClick={() => actions.cancelQr()}
            style={{
              padding: '11px 18px',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface)',
              color: 'var(--text2)',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function AccountSetup({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app

  if (state.qr) {
    return (
      <section style={{ animation: 'fadeUp .25s ease' }}>
        <Header />
        <QrPanel app={app} />
      </section>
    )
  }

  const cards = (['business', 'personal'] as AccountId[]).map((key) => {
    const a = state.data[key]
    const st = a.status
    const palette =
      st === 'active'
        ? { color: 'var(--green-ink)', background: 'var(--green-soft)', border: '1px solid var(--green-border)' }
        : st === 'needs_relink'
          ? { color: 'var(--amber-ink)', background: 'var(--amber-soft)', border: '1px solid var(--amber)' }
          : { color: 'var(--sub)', background: 'var(--bg)', border: '1px solid var(--line-strong)' }
    const statusText = st === 'active' ? 'Active' : st === 'needs_relink' ? 'Needs re-link' : 'Not linked'
    const meta = st === 'active' || st === 'needs_relink' ? a.linkedWhen : 'Scan to connect'
    const btnLabel = st === 'active' ? 'Re-link' : st === 'needs_relink' ? 'Re-link now' : 'Link account'
    const btnPrimary = st !== 'active'
    return { key, label: a.label, st, palette, statusText, meta, btnLabel, btnPrimary, groups: a.groups.length }
  })

  return (
    <section style={{ animation: 'fadeUp .25s ease' }}>
      <Header />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        {cards.map((c) => (
          <div
            key={c.key}
            style={{
              background: 'var(--surface)',
              border: '1px solid ' + (c.st === 'needs_relink' ? 'var(--amber)' : 'var(--line)'),
              borderRadius: 16,
              padding: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text2)'
                  }}
                >
                  <Icon name="whatsapp" size={22} sw={1.7} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{c.label} WhatsApp</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.meta}</div>
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  ...c.palette
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {c.statusText}
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '0 0 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 12.5, color: 'var(--sub)', fontVariantNumeric: 'tabular-nums' }}>
                {c.groups} {c.groups === 1 ? 'group synced' : 'groups synced'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {c.st === 'active' && (
                  <button
                    onClick={() => actions.logout(c.key)}
                    style={{
                      padding: '9px 14px',
                      border: '1px solid var(--line-strong)',
                      background: 'var(--surface)',
                      color: 'var(--sub)',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Log out
                  </button>
                )}
                <button
                  onClick={() => actions.startLink(c.key)}
                  style={
                    c.btnPrimary
                      ? {
                          padding: '9px 16px',
                          border: 'none',
                          background: 'var(--orange)',
                          color: '#1a1205',
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }
                      : {
                          padding: '9px 16px',
                          border: '1px solid var(--line-strong)',
                          background: 'var(--surface)',
                          color: 'var(--text2)',
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }
                  }
                >
                  {c.btnLabel}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          gap: 11,
          alignItems: 'flex-start',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '15px 17px'
        }}
      >
        <Icon name="shield-check" size={18} sw={1.8} color="var(--green)" style={{ flex: '0 0 auto', marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.6 }}>
          Both account types run in parallel — each keeps its own registry, lists, and saved session, entirely on this
          machine.
        </div>
      </div>
    </section>
  )
}

function Header(): React.JSX.Element {
  return (
    <div style={{ marginBottom: 26 }}>
      <h1
        style={{
          fontSize: 'clamp(24px,3.4vw,30px)',
          fontWeight: 600,
          letterSpacing: '-.02em',
          margin: '0 0 6px',
          color: 'var(--ink)'
        }}
      >
        Account setup
      </h1>
      <p style={{ margin: 0, fontSize: 14.5, color: 'var(--sub)', lineHeight: 1.55, maxWidth: '62ch' }}>
        Link each WhatsApp account by scanning a QR code — the same flow as WhatsApp Web. Sessions stay on this
        machine; nothing is sent to a third party.
      </p>
    </div>
  )
}
