import React from 'react'
import type { AppCtx } from '../state/types'
import { Icon } from '../icons'

export function ManageLists({ app }: { app: AppCtx }): React.JSX.Element {
  const { state, actions } = app
  const acc = state.data[state.account]
  const hasGroups = acc.groups.length > 0
  const editorOpen = state.editor !== null

  const h1: React.CSSProperties = {
    fontSize: 'clamp(24px,3.4vw,30px)',
    fontWeight: 600,
    letterSpacing: '-.02em',
    margin: '0 0 6px',
    color: 'var(--ink)'
  }

  const saveBtnBase: React.CSSProperties = {
    padding: '11px 20px',
    border: 'none',
    borderRadius: 10,
    background: 'var(--orange)',
    color: '#1a1205',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
  const saveEnabled = editorOpen && state.editor!.name.trim().length > 0
  const saveBtnStyle = saveEnabled ? saveBtnBase : { ...saveBtnBase, opacity: 0.4, cursor: 'not-allowed' }

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
          <h1 style={h1}>Manage lists</h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--sub)', lineHeight: 1.55 }}>
            Reusable named sets of groups. A group can live in more than one list.
          </p>
        </div>
        {hasGroups && !editorOpen && (
          <button
            onClick={actions.newList}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 16px',
              border: 'none',
              background: 'var(--orange)',
              color: '#1a1205',
              borderRadius: 11,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Icon name="plus" size={17} sw={2} />
            New list
          </button>
        )}
      </div>

      {editorOpen ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 'clamp(18px,2.5vw,26px)',
            boxShadow: '0 1px 2px rgba(20,20,20,.03)',
            animation: 'popIn .2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button
              onClick={actions.cancelEditor}
              aria-label="Back"
              style={{
                display: 'inline-flex',
                padding: 7,
                border: '1px solid var(--line-strong)',
                background: 'var(--surface)',
                borderRadius: 9,
                color: 'var(--text2)',
                cursor: 'pointer'
              }}
            >
              <Icon name="arrow-left" size={17} sw={1.8} />
            </button>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
              {state.editor!.id ? 'Edit list' : 'Create a new list'}
            </h2>
          </div>

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text2)', marginBottom: 9 }}>
            List name
          </label>
          <input
            value={state.editor!.name}
            onChange={(e) => actions.onEditorName(e.target.value)}
            placeholder="e.g. Current Semester Batch"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 14.5,
              color: 'var(--ink)',
              background: 'var(--bg)',
              border: '1px solid var(--line-strong)',
              borderRadius: 11,
              marginBottom: 22
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)' }}>Groups in this list</label>
            <span style={{ fontSize: 12, color: 'var(--orange-ink)', fontWeight: 600 }}>
              {state.editor!.groupIds.length} selected
            </span>
          </div>

          <div style={{ border: '1px solid var(--line)', borderRadius: 13, overflow: 'hidden' }}>
            {acc.groups.map((g) => {
              const checked = state.editor!.groupIds.includes(g.id)
              return (
                <label
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '13px 15px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer'
                  }}
                >
                  <span
                    style={{
                      flex: '0 0 auto',
                      width: 21,
                      height: 21,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: checked ? '1px solid var(--orange)' : '1px solid var(--line-strong)',
                      background: checked ? 'var(--orange)' : 'var(--surface)'
                    }}
                  >
                    {checked && <Icon name="check" size={13} sw={3} color="#1a1205" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => actions.toggleEditorGroup(g.id)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{g.display_name}</span>
                </label>
              )
            })}
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 11, justifyContent: 'flex-end' }}>
            <button
              onClick={actions.cancelEditor}
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
            <button onClick={() => actions.saveEditor()} disabled={!saveEnabled} style={saveBtnStyle}>
              Save list
            </button>
          </div>
        </div>
      ) : hasGroups ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {acc.lists.map((l) => {
            const names = l.group_ids
              .map((id) => acc.groups.find((g) => g.id === id)?.display_name)
              .filter(Boolean) as string[]
            const sample = names.length
              ? names.slice(0, 3).join(' · ') + (names.length > 3 ? ' +' + (names.length - 3) + ' more' : '')
              : 'No groups yet'
            const isDefault = l.name === 'All Groups'
            return (
              <div
                key={l.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>
                      {l.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--muted)',
                        marginTop: 3,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {l.group_ids.length} groups
                    </div>
                  </div>
                  {isDefault && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '.04em',
                        textTransform: 'uppercase',
                        color: 'var(--orange-ink)',
                        background: 'var(--orange-soft)',
                        border: '1px solid var(--orange)',
                        padding: '3px 8px',
                        borderRadius: 20
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.55, minHeight: 34 }}>{sample}</div>
                <button
                  onClick={() => actions.editList(l.id)}
                  style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 13px',
                    border: '1px solid var(--line-strong)',
                    background: 'var(--surface)',
                    color: 'var(--text2)',
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <Icon name="pencil" size={14} sw={1.8} />
                  Edit
                </button>
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
            <Icon name="list" size={24} sw={1.6} />
          </div>
          <h3 style={{ margin: '0 0 7px', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            No groups to organize yet
          </h3>
          <p style={{ margin: '0 auto 20px', maxWidth: '40ch', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.6 }}>
            Link this account and sync your group registry first — then you can group them into reusable lists.
          </p>
          <button
            onClick={() => actions.go('groups')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface)',
              color: 'var(--text2)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Go to registry
          </button>
        </div>
      )}
    </section>
  )
}
