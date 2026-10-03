import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccountData, AccountId, AllData } from '../../../shared/types'
import type { AppActions, AppCtx, AppState, Screen } from './types'

function firstListId(data: AllData, acc: AccountId): string {
  const a = data[acc]
  const def = a.defaultListId && a.lists.find((l) => l.id === a.defaultListId)
  return (def ? def.id : a.lists[0]?.id) || ''
}

const emptyData: AllData = {
  business: {
    label: 'Business',
    status: 'not_linked',
    linkedWhen: 'Not linked yet',
    groups: [],
    lists: [],
    history: []
  },
  personal: {
    label: 'Personal',
    status: 'not_linked',
    linkedWhen: 'Not linked yet',
    groups: [],
    lists: [],
    history: []
  }
}

export function useApp(): AppCtx {
  const [state, setState] = useState<AppState>({
    account: 'business',
    screen: 'send',
    data: emptyData,
    loading: true,
    composer: { listId: '', text: '', mediaType: 'none', mediaName: '', mediaPath: null },
    preview: false,
    send: { open: false, active: false, done: false, current: 0, total: 0, results: [], listName: '' },
    editor: null,
    editingGroup: null,
    renameDraft: '',
    syncing: false,
    historySearch: '',
    expandedHistory: null,
    qr: null,
    isMobile: window.innerWidth < 880,
    mobileNav: false,
    banner: null
  })

  // Keep a ref to the latest state for use inside event listeners.
  const ref = useRef(state)
  ref.current = state

  const patch = useCallback((p: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
    setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }))
  }, [])

  const setAccountData = useCallback((acc: AccountId, ad: AccountData) => {
    setState((s) => ({ ...s, data: { ...s.data, [acc]: ad } }))
  }, [])

  // --- initial load ---
  useEffect(() => {
    let mounted = true
    window.api
      .getData()
      .then((data) => {
        if (!mounted) return
        setState((s) => ({
          ...s,
          data,
          loading: false,
          composer: { ...s.composer, listId: firstListId(data, s.account) }
        }))
      })
      .catch((err) => {
        console.error('getData failed', err)
        if (mounted) patch({ loading: false })
      })
    return () => {
      mounted = false
    }
  }, [patch])

  // --- responsive ---
  useEffect(() => {
    const onResize = (): void => {
      const m = window.innerWidth < 880
      if (m !== ref.current.isMobile) patch({ isMobile: m, mobileNav: false })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [patch])

  // --- backend event subscriptions ---
  useEffect(() => {
    const offQr = window.api.onQr(({ account, dataUrl }) => {
      setState((s) => {
        if (!s.qr || s.qr.account !== account) return s
        return { ...s, qr: { ...s.qr, dataUrl, connecting: false } }
      })
    })

    const offStatus = window.api.onStatus(({ account, status, linkedWhen }) => {
      // Snapshot BEFORE updating, to decide on side-effects without running them
      // inside the (must-be-pure) state updater.
      const prev = ref.current
      const qrForThis = prev.qr && prev.qr.account === account ? prev.qr : null
      const shouldSync =
        status === 'active' && Boolean(qrForThis) && prev.data[account].groups.length === 0

      setState((s) => {
        const data = {
          ...s.data,
          [account]: {
            ...s.data[account],
            status,
            ...(linkedWhen ? { linkedWhen } : {})
          }
        }
        let next: AppState = { ...s, data }
        // After the user scans, the client authenticates -> show the "Connecting…" overlay.
        if (status === 'connecting' && s.qr && s.qr.account === account && s.qr.dataUrl) {
          next = { ...next, qr: { ...s.qr, connecting: true } }
        }
        // A link attempt that failed/timed out while the QR panel is open:
        // close the panel and surface the reason instead of spinning forever.
        if ((status === 'needs_relink' || status === 'not_linked') && s.qr && s.qr.account === account) {
          next = {
            ...next,
            qr: null,
            banner: {
              kind: 'error',
              text:
                (linkedWhen && linkedWhen.length > 0 ? linkedWhen : 'Could not link WhatsApp') +
                '. Make sure your phone has internet and try again.'
            }
          }
        }
        // When the account becomes active while its QR is open, close the QR panel.
        if (status === 'active' && s.qr && s.qr.account === account) {
          next = { ...next, qr: null }
        }
        return next
      })

      // One-time registry sync after linking (side-effect kept OUT of the updater).
      if (shouldSync) {
        window.api
          .refreshGroups(account)
          .then((ad) => setAccountData(account, ad))
          .catch((err) => console.error('post-link sync failed', err))
      }
    })

    const offProgress = window.api.onSendProgress(({ account, current, total, listName, result }) => {
      setState((s) => {
        if (account !== s.account) return s
        const results = [...s.send.results, result]
        return { ...s, send: { ...s.send, current, total, listName, results } }
      })
    })

    const offDone = window.api.onSendDone(({ account, broadcast }) => {
      setState((s) => {
        const acc = s.data[account]
        const history = [broadcast, ...acc.history.filter((b) => b.id !== broadcast.id)]
        return {
          ...s,
          data: { ...s.data, [account]: { ...acc, history } },
          send: { ...s.send, active: false, done: true },
          expandedHistory: broadcast.id
        }
      })
    })

    return () => {
      offQr()
      offStatus()
      offProgress()
      offDone()
    }
  }, [setAccountData])

  // ---------- actions ----------
  const acc = (): AccountData => ref.current.data[ref.current.account]

  const setAccount = useCallback(
    (account: AccountId) => {
      setState((s) => ({
        ...s,
        account,
        composer: {
          listId: firstListId(s.data, account),
          text: '',
          mediaType: 'none',
          mediaName: '',
          mediaPath: null
        },
        editor: null,
        editingGroup: null,
        mobileNav: false,
        preview: false,
        banner: null
      }))
    },
    []
  )

  const go = useCallback((screen: Screen) => {
    patch({ screen, mobileNav: false, editor: null, editingGroup: null })
  }, [patch])

  const onListChange = useCallback((listId: string) => {
    patch((s) => ({ composer: { ...s.composer, listId } }))
  }, [patch])

  const onText = useCallback((text: string) => {
    patch((s) => ({ composer: { ...s.composer, text } }))
  }, [patch])

  const attach = useCallback(
    async (kind: 'image' | 'pdf') => {
      const picked = await window.api.pickFile(kind)
      if (!picked) return
      patch((s) => ({
        composer: { ...s.composer, mediaType: kind, mediaName: picked.name, mediaPath: picked.path }
      }))
    },
    [patch]
  )

  const clearMedia = useCallback(() => {
    patch((s) => ({ composer: { ...s.composer, mediaType: 'none', mediaName: '', mediaPath: null } }))
  }, [patch])

  const currentList = (): { id: string; name: string; group_ids: string[] } | undefined => {
    const a = acc()
    return a.lists.find((l) => l.id === ref.current.composer.listId) || a.lists[0]
  }

  const openPreview = useCallback(() => {
    const a = acc()
    if (a.status !== 'active') return
    const list = currentList()
    const c = ref.current.composer
    if (!list || list.group_ids.length === 0) return
    if (!c.text.trim() && c.mediaType === 'none') return
    patch({ preview: true })
  }, [patch])

  const closePreview = useCallback(() => patch({ preview: false }), [patch])

  const confirmSend = useCallback(async () => {
    const a = acc()
    const list = currentList()
    if (!list) return
    const total = list.group_ids.filter((id) => a.groups.some((g) => g.id === id)).length
    const c = ref.current.composer
    const account = ref.current.account
    patch({
      preview: false,
      send: { open: true, active: true, done: false, current: 0, total, results: [], listName: list.name }
    })
    try {
      await window.api.sendBroadcast({
        account,
        listId: list.id,
        text: c.text,
        mediaType: c.mediaType,
        mediaPath: c.mediaPath,
        mediaName: c.mediaName
      })
    } catch (err) {
      console.error('sendBroadcast failed', err)
      patch({
        send: { open: false, active: false, done: false, current: 0, total: 0, results: [], listName: '' },
        banner: { kind: 'error', text: err instanceof Error ? err.message : 'Broadcast failed to start.' }
      })
    }
  }, [patch])

  const closeSend = useCallback(() => {
    patch((s) => ({
      send: { open: false, active: false, done: false, current: 0, total: 0, results: [], listName: '' },
      composer: { ...s.composer, text: '', mediaType: 'none', mediaName: '', mediaPath: null }
    }))
  }, [patch])

  const viewInHistory = useCallback(() => {
    closeSend()
    patch({ screen: 'history' })
  }, [patch, closeSend])

  const newList = useCallback(() => patch({ editor: { id: null, name: '', groupIds: [] } }), [patch])

  const editList = useCallback(
    (id: string) => {
      const l = acc().lists.find((x) => x.id === id)
      if (l) patch({ editor: { id: l.id, name: l.name, groupIds: [...l.group_ids] } })
    },
    [patch]
  )

  const cancelEditor = useCallback(() => patch({ editor: null }), [patch])
  const onEditorName = useCallback(
    (name: string) => patch((s) => (s.editor ? { editor: { ...s.editor, name } } : {})),
    [patch]
  )
  const toggleEditorGroup = useCallback(
    (gid: string) => {
      patch((s) => {
        if (!s.editor) return {}
        const set = [...s.editor.groupIds]
        const i = set.indexOf(gid)
        if (i > -1) set.splice(i, 1)
        else set.push(gid)
        return { editor: { ...s.editor, groupIds: set } }
      })
    },
    [patch]
  )

  const saveEditor = useCallback(async () => {
    const ed = ref.current.editor
    const account = ref.current.account
    if (!ed || !ed.name.trim()) return
    const ad = await window.api.saveList(account, {
      id: ed.id || undefined,
      name: ed.name.trim(),
      group_ids: ed.groupIds
    })
    setAccountData(account, ad)
    patch({ editor: null })
  }, [patch, setAccountData])

  const deleteList = useCallback(
    async (listId: string) => {
      const account = ref.current.account
      const ad = await window.api.deleteList(account, listId)
      setAccountData(account, ad)
      // If the composer was pointing at the deleted list, move it to the default.
      patch((s) => {
        const stillThere = ad.lists.some((l) => l.id === s.composer.listId)
        return {
          editor: null,
          composer: stillThere
            ? s.composer
            : { ...s.composer, listId: ad.defaultListId || ad.lists[0]?.id || '' }
        }
      })
    },
    [patch, setAccountData]
  )

  const setDefaultList = useCallback(
    async (listId: string) => {
      const account = ref.current.account
      const ad = await window.api.setDefaultList(account, listId)
      setAccountData(account, ad)
    },
    [setAccountData]
  )

  const refreshGroups = useCallback(async () => {
    if (ref.current.syncing) return
    const account = ref.current.account
    if (ref.current.data[account].status !== 'active') {
      patch({ banner: { kind: 'info', text: 'Link this account first to sync its groups.' } })
      return
    }
    patch({ syncing: true })
    try {
      const ad = await window.api.refreshGroups(account)
      setAccountData(account, ad)
    } catch (err) {
      console.error('refresh failed', err)
      patch({ banner: { kind: 'error', text: 'Could not sync groups. Is the session still linked?' } })
    } finally {
      patch({ syncing: false })
    }
  }, [patch, setAccountData])

  const startRename = useCallback(
    (id: string) => {
      const g = acc().groups.find((x) => x.id === id)
      if (g) patch({ editingGroup: id, renameDraft: g.display_name })
    },
    [patch]
  )
  const onRenameInput = useCallback((v: string) => patch({ renameDraft: v }), [patch])
  const saveRename = useCallback(async () => {
    const id = ref.current.editingGroup
    const name = ref.current.renameDraft.trim()
    const account = ref.current.account
    if (!id || !name) return
    const ad = await window.api.renameGroup(account, id, name)
    setAccountData(account, ad)
    patch({ editingGroup: null, renameDraft: '' })
  }, [patch, setAccountData])
  const cancelRename = useCallback(() => patch({ editingGroup: null, renameDraft: '' }), [patch])

  const onHistorySearch = useCallback((v: string) => patch({ historySearch: v }), [patch])
  const toggleHistory = useCallback(
    (id: string) => patch((s) => ({ expandedHistory: s.expandedHistory === id ? null : id })),
    [patch]
  )

  const startLink = useCallback(
    async (account: AccountId) => {
      patch({ account, screen: 'account', mobileNav: false, qr: { account, dataUrl: null, connecting: true } })
      try {
        await window.api.linkAccount(account)
      } catch (err) {
        console.error('linkAccount failed', err)
        patch({ qr: null, banner: { kind: 'error', text: 'Could not start the WhatsApp session. Try again.' } })
      }
    },
    [patch]
  )

  const cancelQr = useCallback(async () => {
    const account = ref.current.qr?.account
    patch({ qr: null })
    if (account) {
      try {
        const ad = await window.api.cancelLink(account)
        setAccountData(account, ad)
      } catch (err) {
        console.error('cancelLink failed', err)
      }
    }
  }, [patch, setAccountData])

  const logout = useCallback(
    async (account: AccountId) => {
      try {
        const ad = await window.api.logout(account)
        setAccountData(account, ad)
      } catch (err) {
        console.error('logout failed', err)
      }
    },
    [setAccountData]
  )

  const openNav = useCallback(() => patch({ mobileNav: true }), [patch])
  const closeNav = useCallback(() => patch({ mobileNav: false }), [patch])
  const dismissBanner = useCallback(() => patch({ banner: null }), [patch])

  const actions: AppActions = {
    setAccount,
    go,
    openNav,
    closeNav,
    onListChange,
    onText,
    attach,
    clearMedia,
    openPreview,
    closePreview,
    confirmSend,
    closeSend,
    viewInHistory,
    newList,
    editList,
    cancelEditor,
    onEditorName,
    toggleEditorGroup,
    saveEditor,
    deleteList,
    setDefaultList,
    refreshGroups,
    startRename,
    onRenameInput,
    saveRename,
    cancelRename,
    onHistorySearch,
    toggleHistory,
    startLink,
    cancelQr,
    logout,
    dismissBanner
  }

  return { state, actions }
}
