import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { API_BASE_URL } from '@/config/api'
import { sessionUserId, redirectToLogin } from './session'
import type { ChatMessage, Conversation, ConversationDetail } from '@/types/chat'

class ChatError extends Error {
  constructor(message: string, public status = 0) { super(message) }
}

export function useChat() {
  const userId = sessionUserId.value
  const token = localStorage.getItem('token') || ''
  let disposed = false
  const alive = () => !disposed && sessionUserId.value === userId && localStorage.getItem('token') === token
  const conversations = ref<Conversation[]>([])
  const currentConvId = ref('')
  const messages = ref<ChatMessage[]>([])
  const inputText = ref('')
  const loading = ref(true)
  const sending = ref(false)
  const error = ref('')
  const historyMore = ref(false)
  let historyCursor: string | null = null
  const messagesMore = ref(false)
  const nextBefore = ref<number | null>(null)
  const current = computed(() => conversations.value.find(c => c.id === currentConvId.value))
  const isTyping = computed(() => sending.value || messages.value.some(m => m.status === 'generating'))
  const ready = computed(() => !loading.value && !!current.value)
  const draftKey = (id: string) => `wander_draft:${userId}:${id}`
  const pendingKey = (id: string) => `wander_pending:${userId}:${id}`
  const pageRequests = new AbortController()
  let streamController: AbortController | null = null
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<unknown> = Promise.resolve()
  const dirty = new Map<string, string>()
  const draftBases = new Map<string, number>()
  const conflictedDrafts = new Set<string>()
  let selecting = 0

  function backupDraft(id: string, draft: string) {
    localStorage.setItem(draftKey(id), JSON.stringify({ draft, version: draftBases.get(id), conflict: conflictedDrafts.has(id) }))
  }
  function readDraft(id: string): { draft: string; version?: number; conflict?: boolean } | null {
    const raw = localStorage.getItem(draftKey(id))
    if (raw === null) return null
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.draft === 'string') return { draft: parsed.draft, version: parsed.version, conflict: parsed.conflict }
    } catch { /* Older local backup format was a plain string. */ }
    return { draft: raw }
  }
  function restoreDraft(id: string) {
    const row = conversations.value.find(c => c.id === id)
    const backup = readDraft(id)
    inputText.value = backup?.draft ?? row?.draft ?? ''
    if (!backup || !row) return
    if (backup.draft === row.draft) {
      dirty.delete(id); draftBases.delete(id); conflictedDrafts.delete(id); localStorage.removeItem(draftKey(id))
      return
    }
    dirty.set(id, backup.draft)
    // A backup from an earlier visit may predate changes on another device.
    if (backup.version !== row.version || backup.conflict) {
      draftBases.set(id, row.version)
      conflictedDrafts.add(id)
      backupDraft(id, backup.draft)
      error.value = '服务器草稿已更新，本地草稿已保留。点击重新同步可保存本地内容。'
    } else {
      draftBases.set(id, row.version)
      saveTimer = setTimeout(() => { void flushDraft().catch(report) }, 400)
    }
  }

  async function request<T>(path: string, method = 'GET', body?: unknown, keepalive = false): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/chat${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(keepalive ? { keepalive: true } : { signal: pageRequests.signal }),
    })
    const result = await response.json()
    if (response.status === 401 && alive()) redirectToLogin()
    if (!response.ok) throw new ChatError(result.message || '聊天数据同步失败', response.status)
    return result.data as T
  }
  function report(e: unknown) { if (alive()) error.value = e instanceof Error ? e.message : '聊天数据同步失败' }
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const next = queue.catch(() => {}).then(action)
    queue = next
    return next
  }
  function merge(row: Conversation) {
    const index = conversations.value.findIndex(c => c.id === row.id)
    if (index < 0) conversations.value.unshift(row)
    else conversations.value[index] = row
  }
  async function update(id: string, fields: { title?: string; draft?: string }, version?: number) {
    const row = conversations.value.find(c => c.id === id)
    if (!row) return
    try {
      const saved = await request<Conversation>(`/conversations/${id}`, 'PATCH', { ...fields, version: version ?? row.version })
      if (alive()) merge(saved)
      return saved
    } catch (e) {
      if (e instanceof ChatError && e.status === 409 && alive()) {
        const latest = await request<ConversationDetail>(`/conversations/${id}`)
        if (alive()) {
          merge(latest)
          if (dirty.has(id)) { draftBases.set(id, latest.version); conflictedDrafts.add(id); backupDraft(id, dirty.get(id)!) }
        }
        throw new ChatError('会话已在其他页面更新。本地草稿已保留，请再次同步。', 409)
      }
      throw e
    }
  }
  async function flushDraft(resolveConflict = false) {
    clearTimeout(saveTimer)
    return enqueue(async () => {
      for (const [id, draft] of [...dirty]) {
        if (!alive()) return
        if (conflictedDrafts.has(id) && !resolveConflict) throw new ChatError('草稿存在版本冲突，请点击重新同步保存本地内容。', 409)
        const saved = await update(id, { draft }, draftBases.get(id))
        conflictedDrafts.delete(id)
        if (dirty.get(id) === draft) { dirty.delete(id); draftBases.delete(id); localStorage.removeItem(draftKey(id)) }
        else if (saved) { draftBases.set(id, saved.version); backupDraft(id, dirty.get(id)!) }
      }
    })
  }
  watch(inputText, value => {
    if (!ready.value || !current.value || value === current.value.draft && !dirty.has(current.value.id)) return
    const id = current.value.id
    conflictedDrafts.delete(id)
    if (!dirty.has(id)) draftBases.set(id, current.value.version)
    dirty.set(id, value)
    try { backupDraft(id, value) } catch { error.value = '本地草稿备份失败，请保持页面打开直到同步完成' }
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void flushDraft().catch(report) }, 400)
  }, { flush: 'sync' })

  async function importLegacy() {
    const key = `wander_conversations:${userId}`
    const raw = localStorage.getItem(key)
    if (!raw || localStorage.getItem(`${key}:imported`) === raw) return
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved.conversations)) throw new Error('旧聊天记录格式异常，原记录已保留')
    // Import the selected conversation first so it becomes the restored active conversation.
    const ordered = [...saved.conversations].sort((a, b) => Number(b.id === saved.currentId) - Number(a.id === saved.currentId))
    for (const item of ordered) {
      await request('/import', 'POST', { conversations: [item], currentId: saved.currentId })
      if (!alive()) return
    }
    // Keep the original as a backup; the marker prevents future local writes from resurrecting deletions.
    localStorage.setItem(`${key}:imported`, raw)
  }
  async function fetchHistory(cursor?: string) {
    const result = await request<{ conversations: Conversation[]; hasMore: boolean; nextCursor: string | null }>(`/conversations${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`)
    if (!alive()) return
    if (!cursor) conversations.value = result.conversations
    else for (const row of result.conversations) if (!conversations.value.some(c => c.id === row.id)) conversations.value.push(row)
    historyMore.value = result.hasMore
    historyCursor = result.nextCursor
  }
  async function loadDetail(id: string, older = false) {
    const serial = selecting
    const suffix = older && nextBefore.value ? `?before=${nextBefore.value}` : ''
    const result = await request<ConversationDetail>(`/conversations/${id}${suffix}`)
    if (!alive() || serial !== selecting || currentConvId.value !== id) return
    if (!older) merge(result)
    messages.value = older ? [...result.messages, ...messages.value.filter(m => !result.messages.some(item => item.id === m.id))] : result.messages
    messagesMore.value = result.hasMore
    nextBefore.value = result.nextBefore
    // Reconcile a send whose response was lost; it must not be resent as a new request.
    try {
      const pending = JSON.parse(localStorage.getItem(pendingKey(id)) || 'null')
      if (pending && result.messages.some(m => m.requestId === pending.requestId)) {
        localStorage.removeItem(pendingKey(id))
        if (!pending.retryOf && readDraft(id)?.draft.trim() === pending.content) {
          dirty.delete(id); draftBases.delete(id); localStorage.removeItem(draftKey(id))
        }
        // A lost HTTP response still means the message was accepted. Do not leave it ready to resend.
        if (!pending.retryOf && inputText.value.trim() === pending.content) {
          const wasLoading = loading.value
          loading.value = true; inputText.value = ''; loading.value = wasLoading
          dirty.delete(id); draftBases.delete(id); localStorage.removeItem(draftKey(id))
        }
      }
    } catch { /* Preserve invalid local data for manual recovery. */ }
    if (!older && !sending.value && result.messages.some(m => m.status === 'generating')) schedulePoll()
  }
  function schedulePoll() {
    clearTimeout(pollTimer)
    pollTimer = setTimeout(() => { if (alive() && currentConvId.value && !sending.value) void loadDetail(currentConvId.value).catch(report) }, 1000)
  }
  async function initialize() {
    loading.value = true
    error.value = ''
    try {
      // Import failures must not hide records already saved on the server.
      try { await importLegacy() } catch (e) { report(e) }
      await fetchHistory()
      const state = await request<{ currentId: string | null }>('/state')
      if (!alive()) return
      let id = state.currentId || conversations.value[0]?.id
      if (!id) {
        const created = await request<Conversation>('/conversations', 'POST', { title: '新对话' })
        if (!alive()) return
        merge(created); id = created.id
      }
      currentConvId.value = id
      selecting++
      await loadDetail(id)
      if (!alive()) return
      restoreDraft(id)
      loading.value = false
    } catch (e) { report(e); if (alive()) loading.value = false }
  }
  async function selectConversation(id: string) {
    if (loading.value || sending.value) return
    await flushDraft()
    loading.value = true
    try {
      await request('/state', 'PATCH', { currentId: id })
      if (!alive()) return
      selecting++; currentConvId.value = id; messages.value = []
      await loadDetail(id)
      if (!alive()) return
      // Change the input while loading so it is not saved into the old conversation.
      restoreDraft(id)
    } finally { if (alive()) loading.value = false }
  }
  async function create(title: string) {
    await flushDraft()
    const row = await request<Conversation>('/conversations', 'POST', { title: title.trim() || '新对话' })
    if (!alive()) return
    merge(row)
    await selectConversation(row.id)
  }
  async function rename(id: string, title: string) {
    await flushDraft()
    await enqueue(() => update(id, { title: title.trim() || '新对话' }))
  }
  async function remove(id: string) {
    await flushDraft()
    await request(`/conversations/${id}`, 'DELETE')
    if (!alive()) return
    localStorage.removeItem(draftKey(id)); localStorage.removeItem(pendingKey(id))
    await initialize()
  }
  const canRetry = computed(() => {
    const last = messages.value[messages.value.length - 1]
    return !!last?.replyTo && ['failed', 'interrupted'].includes(last.status)
  })
  async function send(retryOf?: number) {
    if (!ready.value || isTyping.value) return
    const text = inputText.value.trim()
    if (!retryOf && !text) return
    if (text.length > 16000) { error.value = '消息不能超过 16000 个字符'; return }
    error.value = ''
    sending.value = true
    const id = currentConvId.value
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    const controller = new AbortController()
    streamController = controller
    const timeout = setTimeout(() => controller.abort(), 120000)
    try {
      await flushDraft()
      if (!alive()) return
      let pending: { content?: string; requestId: string; retryOf?: number } | null = null
      try { pending = JSON.parse(localStorage.getItem(pendingKey(id)) || 'null') } catch { /* Recreate a malformed pending send. */ }
      if (!pending || (retryOf ? pending.retryOf !== retryOf : pending.content !== text || pending.retryOf)) {
        pending = { requestId: crypto.randomUUID(), ...(retryOf ? { retryOf } : { content: text }) }
      }
      localStorage.setItem(pendingKey(id), JSON.stringify(pending))
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${id}/messages`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        body: JSON.stringify(pending),
      })
      if (response.status === 401) { if (alive()) redirectToLogin(); return }
      if (!response.headers.get('content-type')?.includes('text/event-stream')) {
        const result = await response.json()
        if (!response.ok) {
          if ([400, 404, 409].includes(response.status)) localStorage.removeItem(pendingKey(id))
          if (result.data?.user) acceptTurn(result.data, id, !retryOf)
          throw new ChatError(result.message || '发送失败', response.status)
        }
        acceptTurn(result.data, id, !retryOf)
      } else {
        reader = response.body?.getReader()
        if (!reader) throw new Error('没有收到回复流')
        const decoder = new TextDecoder()
        let buffer = ''
        let finished = false
        let assistantId = 0
        while (!finished) {
          const { done, value } = await reader.read()
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
          buffer = buffer.replace(/\r\n/g, '\n')
          let split: number
          while ((split = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, split); buffer = buffer.slice(split + 2)
            const event = block.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim()
            const raw = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            if (!raw || !alive()) continue
            const data = JSON.parse(raw)
            if (event === 'meta') { acceptTurn(data, id, !retryOf); assistantId = data.assistant.id }
            const assistant = messages.value.find(m => m.id === assistantId)
            if (event === 'delta' && assistant) assistant.content += data.content
            if (event === 'done') { if (assistant) assistant.status = 'completed'; finished = true }
            if (event === 'error') { if (assistant) { assistant.status = data.status; assistant.error = data.message }; finished = true; throw new Error(data.message) }
          }
          if (done) { if (!finished) throw new Error('回复连接中断，已接收的内容会保留'); break }
        }
      }
    } catch (e) { report(e) }
    finally {
      clearTimeout(timeout); controller.abort()
      await reader?.cancel().catch(() => {}); reader?.releaseLock()
      if (streamController === controller) streamController = null
      if (alive()) {
        // Refresh authoritative content and version after both successful and uncertain sends.
        await loadDetail(id).catch(report)
        if (!alive()) return
        sending.value = false
        if (messages.value.some(m => m.status === 'generating')) schedulePoll()
        if (dirty.size) void flushDraft().catch(report)
      }
    }
  }
  function acceptTurn(data: { user: ChatMessage; assistant: ChatMessage }, id: string, clearDraft: boolean) {
    if (!alive() || currentConvId.value !== id) return
    localStorage.removeItem(pendingKey(id))
    for (const item of [data.user, data.assistant]) if (!messages.value.some(m => m.id === item.id)) messages.value.push(item)
    if (clearDraft) {
      loading.value = true
      inputText.value = ''
      loading.value = false
      dirty.delete(id); draftBases.delete(id); localStorage.removeItem(draftKey(id))
      if (current.value) current.value.draft = ''
    }
  }
  function pageHide() {
    // Keepalive is best effort. Synchronous local backup remains until server acknowledgement.
    for (const [id, draft] of dirty) {
      if (conflictedDrafts.has(id)) continue
      const row = conversations.value.find(c => c.id === id)
      if (row) void request(`/conversations/${id}`, 'PATCH', { draft, version: draftBases.get(id) ?? row.version }, true).catch(() => {})
    }
  }
  window.addEventListener('pagehide', pageHide)
  onBeforeUnmount(() => {
    pageHide(); disposed = true; selecting++
    clearTimeout(saveTimer); clearTimeout(pollTimer)
    pageRequests.abort(); streamController?.abort()
    window.removeEventListener('pagehide', pageHide)
  })
  void initialize()
  return {
    conversations, currentConvId, messages, inputText, loading, error, ready, isTyping, sending,
    historyMore, messagesMore, canRetry, initialize, create, rename, remove, selectConversation,
    sendMessage: () => send(), retryReply: () => send(messages.value[messages.value.length - 1]?.replyTo || undefined),
    loadMoreHistory: () => fetchHistory(historyCursor || undefined),
    loadOlderMessages: () => loadDetail(currentConvId.value, true), flushDraft, report,
  }
}
