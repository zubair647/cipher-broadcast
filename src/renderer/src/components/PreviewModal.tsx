import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

export function PreviewModal({ app }: { app: AppCtx }): React.JSX.Element | null {
  const { state, actions } = app
  if (!state.preview) return null

  const acc = state.data[state.account]
  const curList = acc.lists.find((l) => l.id === state.composer.listId) || acc.lists[0]
  const targetGroups = (curList ? curList.group_ids : [])
    .map((id) => acc.groups.find((g) => g.id === id))
    .filter(Boolean) as { id: string; display_name: string }[]
  const c = state.composer
  const hasMedia = c.mediaType !== 'none'
  const previewText = c.text.trim() || '(no message text)'

  const modalStyle: React.CSSProperties = {
    background: 'var(--surface)',
    width: state.isMobile ? '100%' : 560,
    maxWidth: '100%',
    maxHeight: state.isMobile ? '92vh' : '86vh',
    borderRadius: state.isMobile ? '20px 20px 0 0' : 20,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 -8px 40px rgba(20,20,20,.18), 0 20px 60px rgba(20,20,20,.22)',
    animation: 'popIn .22s ease'
  }

  return (
    <div
      onClick={actions.closePreview}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,20,.46)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 80,
        animation: 'fadeUp .15s ease'
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div
          style={{
            padding: '22px 24px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--orange-ink)',
                marginBottom: 5
              }}
            >
              Review before sending
            </div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>
              Confirm this broadcast
            </h2>
          </div>
          <button
            onClick={actions.closePreview}
            aria-label="Close"
            style={{
              display: 'inline-flex',
              padding: 7,
              border: 'none',
              background: 'var(--bg)',
              color: 'var(--sub)',
              borderRadius: 9,
              cursor: 'pointer'
            }}
          >
            <Icon name="x" size={18} sw={1.9} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 9
            }}
          >
            Message
          </div>
          <div
            style={{
              background: '#E8F3EC',
              border: '1px solid #CFE8D8',
              borderRadius: '4px 14px 14px 14px',
              padding: '14px 16px',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#1a2b20',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {previewText}
          </div>
          {hasMedia && (
            <div
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 13px',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 11
              }}
            >
              <span style={{ display: 'inline-flex', color: 'var(--orange-ink)' }}>
                <Icon name={c.mediaType === 'pdf' ? 'pdf' : 'image'} size={16} sw={1.7} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{c.mediaName}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 11px' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                color: 'var(--muted)'
              }}
            >
              Delivering to
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--orange-ink)' }}>
              {curList ? curList.name : ''} · {targetGroups.length} groups
            </div>
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 13, overflow: 'hidden' }}>
            {targetGroups.map((g) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '11px 15px',
                  borderBottom: '1px solid var(--line)'
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flex: '0 0 auto' }} />
                <span style={{ fontSize: 13.5, color: 'var(--text2)' }}>{g.display_name}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: 11,
            justifyContent: 'flex-end',
            background: 'var(--surface)'
          }}
        >
          <button
            onClick={actions.closePreview}
            style={{
              padding: '12px 18px',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface)',
              color: 'var(--text2)',
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Back to edit
          </button>
          <button
            onClick={() => actions.confirmSend()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              border: 'none',
              background: 'var(--orange)',
              color: '#1a1205',
              borderRadius: 11,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Icon name="megaphone" size={17} sw={1.8} />
            Send to {targetGroups.length} groups
          </button>
        </div>
      </div>
    </div>
  )
}
