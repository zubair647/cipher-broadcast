import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

export function SendModal({ app }: { app: AppCtx }): React.JSX.Element | null {
  const { state, actions } = app
  const sd = state.send
  if (!sd.open) return null

  const sentCount = sd.results.filter((r) => r.status === 'sent').length
  const failedCount = sd.results.filter((r) => r.status === 'failed').length
  const hasFailures = failedCount > 0
  const pct = sd.total ? Math.round((sd.current / sd.total) * 100) + '%' : '0%'

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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,20,.46)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 90,
        animation: 'fadeUp .15s ease'
      }}
    >
      <div style={modalStyle}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--line)' }}>
          {sd.active && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    border: '3px solid var(--line-strong)',
                    borderTopColor: 'var(--orange)',
                    borderRadius: '50%',
                    animation: 'spin .8s linear infinite'
                  }}
                />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Sending broadcast…</h2>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--sub)' }}>
                Posting to each group in{' '}
                <strong style={{ color: 'var(--text2)', fontWeight: 600 }}>{sd.listName}</strong> with a short
                randomized delay between sends.
              </p>
              <div
                style={{ marginTop: 14, height: 7, background: 'var(--line)', borderRadius: 5, overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--orange)',
                    borderRadius: 5,
                    transition: 'width .3s ease',
                    width: pct
                  }}
                />
              </div>
              <div style={{ marginTop: 7, fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                {sd.current} of {sd.total} groups
              </div>
            </>
          )}
          {sd.done && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ display: 'inline-flex', color: hasFailures ? 'var(--amber)' : 'var(--green)' }}>
                  <Icon name={hasFailures ? 'alert' : 'circle-check'} size={22} sw={2} />
                </span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                  {hasFailures ? 'Broadcast sent with some failures' : 'Broadcast sent'}
                </h2>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--green-ink)',
                    background: 'var(--green-soft)',
                    border: '1px solid var(--green-border)',
                    padding: '5px 11px',
                    borderRadius: 20
                  }}
                >
                  <Icon name="check" size={14} sw={2.2} />
                  {sentCount} delivered
                </span>
                {hasFailures && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--red-ink)',
                      background: 'var(--red-soft)',
                      border: '1px solid var(--red-border)',
                      padding: '5px 11px',
                      borderRadius: 20
                    }}
                  >
                    <Icon name="x" size={14} sw={2.2} />
                    {failedCount} failed
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 0', flex: '1 1 auto' }}>
          {sd.results.map((r, i) => {
            const isFailed = r.status === 'failed'
            const color = isFailed ? 'var(--red-ink)' : 'var(--green-ink)'
            return (
              <div key={r.group_id + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 24px' }}>
                <span style={{ display: 'inline-flex', flex: '0 0 auto', color }}>
                  <Icon name={isFailed ? 'x' : 'check'} size={17} sw={2.4} />
                </span>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--text2)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {r.name}
                  </div>
                  {isFailed && r.error_message && (
                    <div style={{ fontSize: 11.5, color: 'var(--red-ink)', marginTop: 2 }}>{r.error_message}</div>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color, whiteSpace: 'nowrap' }}>
                  {isFailed ? 'Failed' : 'Sent'}
                </span>
              </div>
            )
          })}
        </div>

        {sd.done && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              gap: 11,
              justifyContent: 'flex-end'
            }}
          >
            <button
              onClick={actions.viewInHistory}
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
              View in history
            </button>
            <button
              onClick={actions.closeSend}
              style={{
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
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
