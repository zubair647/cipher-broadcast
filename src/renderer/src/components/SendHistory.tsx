import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

export function SendHistory({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const acc = state.data[state.account]
  const q = state.historySearch.trim().toLowerCase()

  const filtered = acc.history.filter(
    (h) => !q || (h.list_name + ' ' + h.text + ' ' + h.when).toLowerCase().includes(q)
  )

  return (
    <section style={{ animation: 'fadeUp .25s ease' }}>
      <div style={{ marginBottom: 22 }}>
        <h1
          style={{
            fontSize: 'clamp(24px,3.4vw,30px)',
            fontWeight: 600,
            letterSpacing: '-.02em',
            margin: '0 0 6px',
            color: 'var(--ink)'
          }}
        >
          Send history
        </h1>
        <p style={{ margin: 0, fontSize: 14.5, color: 'var(--sub)', lineHeight: 1.55 }}>
          Every broadcast, with per-group delivery status. Failures are flagged in red.
        </p>
      </div>

      {acc.history.length > 0 ? (
        <>
          <div style={{ position: 'relative', marginBottom: 18, maxWidth: 420 }}>
            <Icon
              name="search"
              size={17}
              sw={1.8}
              color="var(--muted)"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              value={state.historySearch}
              onChange={(e) => actions.onHistorySearch(e.target.value)}
              placeholder="Search by list, message, or date…"
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                fontSize: 13.5,
                color: 'var(--ink)',
                background: 'var(--surface)',
                border: '1px solid var(--line-strong)',
                borderRadius: 11
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((h) => {
              const sent = h.results.filter((r) => r.status === 'sent').length
              const failed = h.results.filter((r) => r.status === 'failed').length
              const expanded = state.expandedHistory === h.id
              const badge = failed > 0
                ? { color: 'var(--red-ink)', background: 'var(--red-soft)', border: '1px solid var(--red-border)' }
                : { color: 'var(--green-ink)', background: 'var(--green-soft)', border: '1px solid var(--green-border)' }
              const mediaChip =
                h.media_type === 'pdf'
                  ? 'PDF · ' + h.media_name
                  : h.media_type === 'image'
                    ? 'Image · ' + h.media_name
                    : ''
              return (
                <div
                  key={h.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 15,
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => actions.toggleHistory(h.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      padding: '16px 18px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 9,
                          marginBottom: 6
                        }}
                      >
                        <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{h.list_name}</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 9px',
                            borderRadius: 20,
                            ...badge
                          }}
                        >
                          {failed > 0 ? failed + ' failed' : 'All sent'}
                        </span>
                        {h.media_type !== 'none' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 11,
                              fontWeight: 500,
                              color: 'var(--sub)',
                              background: 'var(--bg)',
                              border: '1px solid var(--line)',
                              padding: '2px 8px',
                              borderRadius: 20
                            }}
                          >
                            {mediaChip}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--sub)',
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '60ch'
                        }}
                      >
                        {h.text}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--muted)',
                          marginTop: 6,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {h.when} · {sent} delivered{failed ? ', ' + failed + ' failed' : ''}
                      </div>
                    </div>
                    <Icon
                      name="chevron-down"
                      size={18}
                      sw={1.8}
                      color="var(--muted)"
                      style={{
                        flex: '0 0 auto',
                        marginTop: 2,
                        transform: expanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform .18s'
                      }}
                    />
                  </button>

                  {expanded && (
                    <div style={{ borderTop: '1px solid var(--line)', padding: '6px 0', animation: 'fadeUp .2s ease' }}>
                      {h.results.map((r, i) => {
                        const isFailed = r.status === 'failed'
                        const color = isFailed ? 'var(--red-ink)' : 'var(--green-ink)'
                        return (
                          <div
                            key={r.group_id + i}
                            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 18px' }}
                          >
                            <span style={{ display: 'inline-flex', flex: '0 0 auto', color }}>
                              <Icon name={isFailed ? 'x' : 'check'} size={16} sw={2.4} />
                            </span>
                            <span
                              style={{
                                fontSize: 13.5,
                                color: 'var(--text2)',
                                flex: '1 1 auto',
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {r.name}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 500, color, whiteSpace: 'nowrap' }}>
                              {isFailed ? 'Failed' : 'Sent'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: 'var(--surface)',
            border: '1px dashed var(--line-strong)',
            borderRadius: 18
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--bg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              marginBottom: 16
            }}
          >
            <Icon name="history" size={24} sw={1.6} />
          </div>
          <h3 style={{ margin: '0 0 7px', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>No broadcasts yet</h3>
          <p style={{ margin: '0 auto', maxWidth: '40ch', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.6 }}>
            Once you send your first broadcast on this account, it&apos;ll appear here with full delivery detail.
          </p>
        </div>
      )}
    </section>
  )
}
