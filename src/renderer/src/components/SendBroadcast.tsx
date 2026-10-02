import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

export function SendBroadcast({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const acc = state.data[state.account]
  const isActive = acc.status === 'active'
  const curList = acc.lists.find((l) => l.id === state.composer.listId) || acc.lists[0]
  const targetGroups = (curList ? curList.group_ids : [])
    .map((id) => acc.groups.find((g) => g.id === id))
    .filter(Boolean)
  const c = state.composer
  const hasMedia = c.mediaType !== 'none'
  const canSend = isActive && targetGroups.length > 0 && (c.text.trim().length > 0 || hasMedia)

  const previewBtnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '13px 24px',
    border: 'none',
    borderRadius: 12,
    background: 'var(--orange)',
    color: '#1a1205',
    fontWeight: 600,
    fontSize: 14.5,
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
  const previewBtnStyle = canSend
    ? previewBtnBase
    : { ...previewBtnBase, opacity: 0.4, cursor: 'not-allowed' }

  const outlineBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 14px',
    border: '1px solid var(--line-strong)',
    background: 'var(--surface)',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text2)',
    cursor: 'pointer',
    fontFamily: 'inherit'
  }

  return (
    <section style={{ animation: 'fadeUp .25s ease' }}>
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
          Send a broadcast
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14.5,
            color: 'var(--sub)',
            lineHeight: 1.55,
            maxWidth: '60ch'
          }}
        >
          Compose once, review, and deliver to every group in your chosen list — {acc.label} account.
        </p>
      </div>

      {!isActive && (
        <div
          style={{
            display: 'flex',
            gap: 13,
            alignItems: 'flex-start',
            background: 'var(--amber-soft)',
            border: '1px solid var(--amber)',
            borderRadius: 13,
            padding: '15px 17px',
            marginBottom: 22
          }}
        >
          <Icon name="alert" size={20} sw={1.8} color="var(--amber-ink)" style={{ flex: '0 0 auto', marginTop: 1 }} />
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--amber-ink)', marginBottom: 2 }}>
              {acc.label} session needs re-linking
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--amber-ink)', opacity: 0.85, lineHeight: 1.5 }}>
              Sending is paused until you reconnect. It takes under a minute.
            </div>
          </div>
          <button
            onClick={() => actions.go('account')}
            style={{
              flex: '0 0 auto',
              padding: '8px 14px',
              border: '1px solid var(--amber-ink)',
              background: 'transparent',
              color: 'var(--amber-ink)',
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Re-link now
          </button>
        </div>
      )}

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: 'clamp(18px,2.5vw,26px)',
          boxShadow: '0 1px 2px rgba(20,20,20,.03)'
        }}
      >
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text2)', marginBottom: 9 }}>
          Recipient list
        </label>
        <div style={{ position: 'relative', marginBottom: 22 }}>
          <select
            value={curList ? curList.id : ''}
            onChange={(e) => actions.onListChange(e.target.value)}
            style={{
              width: '100%',
              appearance: 'none',
              WebkitAppearance: 'none',
              padding: '13px 42px 13px 15px',
              fontSize: 14.5,
              color: 'var(--ink)',
              background: 'var(--bg)',
              border: '1px solid var(--line-strong)',
              borderRadius: 11,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {acc.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}  ({l.group_ids.length})
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            size={18}
            sw={1.8}
            color="var(--muted)"
            style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <div
            style={{
              marginTop: 9,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              color: 'var(--sub)'
            }}
          >
            <Icon name="users" size={15} sw={1.8} color="var(--orange-ink)" />
            Delivers to{' '}
            <strong style={{ color: 'var(--text2)', fontWeight: 600 }}>{targetGroups.length} groups</strong> in this
            list
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text2)', marginBottom: 9 }}>
          Message
        </label>
        <textarea
          value={c.text}
          onChange={(e) => actions.onText(e.target.value)}
          rows={6}
          placeholder="Type the message your groups will receive…"
          style={{
            width: '100%',
            padding: '14px 15px',
            fontSize: 14.5,
            lineHeight: 1.6,
            color: 'var(--ink)',
            background: 'var(--bg)',
            border: '1px solid var(--line-strong)',
            borderRadius: 12,
            minHeight: 130
          }}
        />

        <div style={{ margin: '16px 0 4px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {!hasMedia ? (
            <>
              <button onClick={() => actions.attach('image')} style={outlineBtn}>
                <Icon name="image" size={16} sw={1.7} />
                Add image
              </button>
              <button onClick={() => actions.attach('pdf')} style={outlineBtn}>
                <Icon name="pdf" size={16} sw={1.7} />
                Add PDF
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Optional — one image or one PDF</span>
            </>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 11px 9px 13px',
                background: 'var(--orange-soft)',
                border: '1px solid var(--orange)',
                borderRadius: 11
              }}
            >
              <span style={{ display: 'inline-flex', color: 'var(--orange-ink)' }}>
                <Icon name={c.mediaType === 'pdf' ? 'pdf' : 'image'} size={16} sw={1.7} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{c.mediaName}</span>
              <button
                onClick={actions.clearMedia}
                aria-label="Remove attachment"
                style={{
                  display: 'inline-flex',
                  padding: 3,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--sub)',
                  cursor: 'pointer',
                  borderRadius: 6
                }}
              >
                <Icon name="x" size={15} sw={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}
      >
        <span style={{ marginRight: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>
          You&apos;ll review everything before anything is sent.
        </span>
        <button onClick={actions.openPreview} disabled={!canSend} style={previewBtnStyle}>
          <Icon name="eye" size={17} sw={1.8} />
          Preview &amp; send
        </button>
      </div>
    </section>
  )
}
