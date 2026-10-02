import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

function RefreshButton({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 15px',
    border: '1px solid var(--line-strong)',
    background: 'var(--surface)',
    color: 'var(--text2)',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: state.syncing ? 'wait' : 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    opacity: state.syncing ? 0.7 : 1
  }
  return (
    <button onClick={() => actions.refreshGroups()} style={base}>
      <Icon
        name="refresh"
        size={16}
        sw={1.8}
        style={state.syncing ? { animation: 'spin .9s linear infinite' } : undefined}
      />
      {state.syncing ? 'Syncing…' : 'Refresh from WhatsApp'}
    </button>
  )
}

export function ManageGroups({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const acc = state.data[state.account]
  const lists = acc.lists

  const listCountLabel = (gid: string): string => {
    const n = lists.filter((l) => l.group_ids.includes(gid)).length
    return n === 0 ? '—' : n + (n === 1 ? ' list' : ' lists')
  }

  return (
    <section style={{ animation: 'fadeUp .25s ease' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 26
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'clamp(24px,3.4vw,30px)',
              fontWeight: 600,
              letterSpacing: '-.02em',
              margin: '0 0 6px',
              color: 'var(--ink)'
            }}
          >
            Group registry
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--sub)', lineHeight: 1.55 }}>
            Every group this {acc.label} account belongs to. Rename for clarity; refresh to pull new ones.
          </p>
        </div>
        <RefreshButton app={app} />
      </div>

      {state.syncing && (
        <div
          style={{
            height: 3,
            borderRadius: 3,
            background: 'var(--line)',
            overflow: 'hidden',
            marginBottom: 18
          }}
        >
          <div
            style={{
              width: '30%',
              height: '100%',
              background: 'var(--orange)',
              borderRadius: 3,
              animation: 'sweep 1.1s ease-in-out infinite'
            }}
          />
        </div>
      )}

      {acc.groups.length > 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              padding: '12px 18px',
              borderBottom: '1px solid var(--line)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--muted)'
            }}
          >
            <span>Group</span>
            <span>In lists</span>
          </div>

          {acc.groups.map((g) => {
            const editing = state.editingGroup === g.id
            return (
              <div
                key={g.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--line)'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  {editing ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={state.renameDraft}
                        onChange={(e) => actions.onRenameInput(e.target.value)}
                        autoFocus
                        style={{
                          flex: '1 1 auto',
                          minWidth: 0,
                          padding: '8px 11px',
                          fontSize: 14,
                          color: 'var(--ink)',
                          background: 'var(--bg)',
                          border: '1px solid var(--orange)',
                          borderRadius: 9
                        }}
                      />
                      <button
                        onClick={() => actions.saveRename()}
                        style={{
                          padding: '7px 12px',
                          border: 'none',
                          background: 'var(--orange)',
                          color: '#1a1205',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={actions.cancelRename}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid var(--line-strong)',
                          background: 'var(--surface)',
                          color: 'var(--sub)',
                          borderRadius: 8,
                          fontSize: 12.5,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 14.5,
                            fontWeight: 500,
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {g.display_name}
                        </span>
                        <button
                          onClick={() => actions.startRename(g.id)}
                          aria-label="Rename group"
                          style={{
                            flex: '0 0 auto',
                            display: 'inline-flex',
                            padding: 5,
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--muted)',
                            borderRadius: 7,
                            cursor: 'pointer'
                          }}
                        >
                          <Icon name="pencil" size={14} sw={1.8} />
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--muted)',
                          fontFamily: "'Geist Mono', monospace",
                          marginTop: 3
                        }}
                      >
                        {g.whatsapp_group_id}
                      </div>
                    </>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'var(--sub)',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {listCountLabel(g.id)}
                </span>
              </div>
            )
          })}
        </div>
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
            <Icon name="users" size={24} sw={1.5} />
          </div>
          <h3 style={{ margin: '0 0 7px', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            No groups synced yet
          </h3>
          <p style={{ margin: '0 auto 20px', maxWidth: '42ch', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.6 }}>
            Once the {acc.label} session is linked, pull in every WhatsApp group this account belongs to.
          </p>
          <RefreshButton app={app} />
        </div>
      )}
    </section>
  )
}
