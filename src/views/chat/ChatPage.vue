<template>
  <BgLayout>
    <StatusBar />
    <div class="chat-page">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="chat-avatar">
          <div class="avatar-glow"></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
            <path d="M18 10c0 0 1 2 1 4a7 7 0 0 1-14 0c0-2 1-4 1-4"/>
            <circle cx="9" cy="7" r="0.5" fill="currentColor"/>
            <circle cx="15" cy="7" r="0.5" fill="currentColor"/>
            <path d="M10 10.5s0.5 1 2 1 2-1 2-1"/>
          </svg>
        </div>
        <div class="chat-header-info">
          <div class="chat-header-name">Travel AI</div>
          <div class="chat-header-status">
            <span class="status-dot"></span> Online
          </div>
        </div>
        <!-- 右上角按钮组 -->
        <div class="header-actions">
          <button class="action-btn" @click="createNewChat" title="新建对话" :disabled="!ready || isTyping || mutating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="action-btn" :class="{ active: showHistory }" @click="showHistory = !showHistory" title="历史对话">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 历史对话面板 -->
      <transition name="panel-slide">
        <div v-if="showHistory" class="history-panel">
          <div class="history-title">历史对话</div>
          <button v-if="historyMore" class="chat-state-button" :disabled="mutating" @click="perform(chat.loadMoreHistory)">加载更多会话</button>
          <div class="history-list">
            <div v-for="conv in conversations" :key="conv.id"
                 :class="['history-item', { active: conv.id === currentConvId }]"
                 @click="switchConversation(conv.id)">
              <div class="history-item-info">
                <!-- 编辑模式 -->
                <input v-if="editingConvId === conv.id"
                       class="history-rename-input"
                       v-model="editingTitle"
                       @click.stop
                       @keyup.enter="confirmRename(conv.id)"
                       @keyup.escape="cancelRename"
                       @blur="confirmRename(conv.id)"
                       ref="renameInput"
                       maxlength="30" />
                <!-- 显示模式 -->
                <div v-else class="history-item-title" @dblclick.stop="startRename(conv)">{{ conv.title }}</div>
                <div class="history-item-time">{{ formatTime(conv.updatedAt) }}</div>
              </div>
              <div class="history-item-actions">
                <button class="history-action-btn rename-btn" @click.stop="startRename(conv)" title="重命名">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="history-action-btn delete-btn" :disabled="isTyping || mutating" @click.stop="deleteConversation(conv.id)" title="删除">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 聊天消息 -->
      <div class="chat-messages" ref="messagesContainer">
        <p v-if="loading" role="status">正在恢复对话…</p>
        <button v-if="messagesMore" class="chat-state-button" :disabled="mutating" @click="loadOlderMessages">加载更早的消息</button>
        <div v-if="ready && !messages.length" class="message-bubble bubble-ai">Hi there! 👋 I'm your Travel AI assistant.</div>
        <div v-for="msg in messages" :key="msg.id"
             :class="['message-row', msg.role === 'user' ? 'message-user' : 'message-ai']">
          <div v-if="msg.role === 'assistant'" class="msg-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
              <path d="M18 10c0 0 1 2 1 4a7 7 0 0 1-14 0c0-2 1-4 1-4"/>
            </svg>
          </div>
          <div class="message-bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
            <div class="message-text" v-html="renderMarkdown(msg.content)"></div>
            <div v-if="msg.status !== 'completed'" class="message-status">{{ msg.status === 'generating' ? '正在生成…' : msg.error || '回复已中断，可重试' }}</div>
            <div v-if="msg.time" class="message-time">{{ formatTime(msg.time) }}</div>
          </div>
        </div>

        <!-- AI 正在输入动画 -->
        <div v-if="isTyping" class="message-row message-ai">
          <div class="msg-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
              <path d="M18 10c0 0 1 2 1 4a7 7 0 0 1-14 0c0-2 1-4 1-4"/>
            </svg>
          </div>
          <div class="message-bubble bubble-ai typing-bubble">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷提问（仅初始状态显示） -->
      <div v-if="ready && !messages.some(m => m.role === 'user')" class="chat-suggestions">
        <div class="suggestions-title">Try asking me:</div>
        <div class="suggestions-list">
          <div class="suggestion-chip" v-for="s in suggestions" :key="s.text" @click="sendSuggestion(s)">
            <span class="suggestion-icon">{{ s.icon }}</span> {{ s.text }}
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <div v-if="error" class="chat-sync-error" role="alert">{{ error }} <button :disabled="mutating || isTyping" @click="perform(async () => { await chat.flushDraft(true); await chat.initialize() })">重新同步</button></div>
      <button v-if="canRetry" class="chat-state-button" :disabled="isTyping || mutating || !ready" @click="chat.retryReply">重试回复</button>
      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <input v-model="inputText" :disabled="!ready || isTyping" maxlength="16000" type="text" class="chat-input" placeholder="Ask me anything about travel..." @keyup.enter="sendMessage" ref="chatInput" />
          <button class="chat-send-btn" @click="sendMessage" :disabled="!ready || !inputText.trim() || isTyping || mutating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 新建对话命名弹窗 -->
    <transition name="modal-fade">
      <div v-if="showNewChatModal" class="modal-overlay" @click.self="cancelNewChat">
        <div class="modal-dialog">
          <div class="modal-title">新建对话</div>
          <div class="modal-body">
            <input class="modal-input"
                   v-model="newChatName"
                   placeholder="请输入对话名称"
                   @keyup.enter="confirmNewChat"
                   @keyup.escape="cancelNewChat"
                   ref="newChatInput"
                   maxlength="30" />
          </div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" @click="cancelNewChat">取消</button>
            <button class="modal-btn modal-btn-confirm" @click="confirmNewChat">确认</button>
          </div>
        </div>
      </div>
    </transition>
  </BgLayout>
</template>

<script setup lang="ts">
import BgLayout from '@/components/layout/BgLayout.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import { ref, nextTick, watch, onActivated } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useChat } from '@/stores/chat'
import type { Conversation } from '@/types/chat'

defineOptions({ name: 'ChatPage' })
const chat = useChat()
const { conversations, currentConvId, messages, inputText, loading, error, ready, isTyping,
  historyMore, messagesMore, canRetry } = chat
const showHistory = ref(false)
const showNewChatModal = ref(false)
const newChatName = ref('')
const newChatInput = ref<HTMLInputElement | null>(null)
const editingConvId = ref<string | null>(null)
const editingTitle = ref('')
const renameInput = ref<HTMLInputElement[] | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const chatInput = ref<HTMLInputElement | null>(null)
const mutating = ref(false)
const suggestions = [
  { icon: '🗼', text: 'Best time to visit Paris?' },
  { icon: '🌸', text: 'Plan a trip to Japan' },
  { icon: '💰', text: 'Budget travel tips' },
  { icon: '🏖️', text: 'Top beach destinations' },
]
const renderMarkdown = (text: string) => DOMPurify.sanitize(marked.parse(text, { async: false }) as string)
const formatTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}
watch(() => [messages.value[messages.value.length - 1]?.content, currentConvId.value], () => { void scrollToBottom() })
async function perform(action: () => Promise<unknown>) {
  if (mutating.value) return
  mutating.value = true
  try { await action() } catch (e) { chat.report(e) } finally { mutating.value = false }
}
function createNewChat() {
  if (!ready.value || isTyping.value || mutating.value) return
  newChatName.value = ''; showNewChatModal.value = true
  nextTick(() => newChatInput.value?.focus())
}
async function confirmNewChat() {
  await perform(async () => { await chat.create(newChatName.value); showNewChatModal.value = false; showHistory.value = false })
}
function cancelNewChat() { showNewChatModal.value = false }
function startRename(conv: Conversation) {
  if (mutating.value) return
  editingConvId.value = conv.id; editingTitle.value = conv.title
  nextTick(() => { renameInput.value?.[0]?.focus(); renameInput.value?.[0]?.select() })
}
async function confirmRename(id: string) {
  if (!editingConvId.value) return
  const title = editingTitle.value
  editingConvId.value = null
  await perform(() => chat.rename(id, title))
}
function cancelRename() { editingConvId.value = null; editingTitle.value = '' }
async function switchConversation(id: string) {
  await perform(async () => { await chat.selectConversation(id); showHistory.value = false; await scrollToBottom() })
}
async function deleteConversation(id: string) { await perform(() => chat.remove(id)) }
async function sendMessage() { if (!mutating.value) await chat.sendMessage() }
function sendSuggestion(s: { text: string }) {
  if (!ready.value || isTyping.value) return
  inputText.value = s.text; void sendMessage()
}
async function loadOlderMessages() {
  const container = messagesContainer.value
  const height = container?.scrollHeight || 0
  const top = container?.scrollTop || 0
  await perform(() => chat.loadOlderMessages())
  await nextTick()
  if (container) container.scrollTop = top + container.scrollHeight - height
}
onActivated(() => { if (!loading.value && !isTyping.value) void perform(async () => { await chat.flushDraft(); await chat.initialize() }) })
</script>

<style scoped>
.chat-sync-error { padding: 8px 16px; color: #943d4d; background: #fff1f4; font-size: 13px; }
.chat-state-button { margin: 8px; padding: 8px 12px; border: 0; border-radius: 8px; cursor: pointer; color: #6555a6; background: #eeebff; }
.message-status { margin-top: 6px; font-size: 12px; color: #986b43; }
button:disabled { opacity: .5; cursor: default; }

/* ===== Page Layout ===== */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  z-index: 1;
}

/* ===== Header ===== */
.chat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 52px 20px 16px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.chat-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-avatar svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.avatar-glow {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  opacity: 0.3;
  filter: blur(6px);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.08); }
}

.chat-header-name {
  font-size: 18px;
  font-weight: 700;
  color: #253c5c;
}

.chat-header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6B7280;
  margin-top: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 6px rgba(52, 199, 89, 0.5);
  animation: dot-blink 2s ease-in-out infinite;
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== Header Actions ===== */
.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  color: #4a3d6e;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.55);
  transform: scale(1.08);
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn.active {
  background: linear-gradient(135deg, rgba(155, 109, 255, 0.3), rgba(255, 109, 171, 0.3));
  border-color: rgba(155, 109, 255, 0.4);
}

.action-btn.active svg {
  color: #7c5ce9;
}

/* ===== History Panel ===== */
.history-panel {
  position: absolute;
  top: 100px;
  right: 12px;
  left: 12px;
  max-height: 50vh;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  z-index: 10;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-title {
  padding: 14px 18px 10px;
  font-size: 15px;
  font-weight: 700;
  color: #253c5c;
  border-bottom: 1px solid rgba(155, 109, 255, 0.1);
  flex-shrink: 0;
}

.history-list {
  overflow-y: auto;
  padding: 6px 8px 8px;
  flex: 1;
}

.history-list::-webkit-scrollbar {
  width: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: rgba(155, 109, 255, 0.2);
  border-radius: 3px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}

.history-item:hover {
  background: rgba(155, 109, 255, 0.08);
}

.history-item.active {
  background: linear-gradient(135deg, rgba(155, 109, 255, 0.15), rgba(255, 109, 171, 0.1));
}

.history-item-info {
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item.active .history-item-title {
  color: #7c5ce9;
  font-weight: 600;
}

.history-item-time {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 2px;
}

/* Rename input */
.history-rename-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid rgba(155, 109, 255, 0.4);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  color: #374151;
  outline: none;
  font-family: inherit;
}

.history-rename-input:focus {
  border-color: #9b6dff;
  box-shadow: 0 0 0 2px rgba(155, 109, 255, 0.15);
}

/* Action buttons group */
.history-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 6px;
}

.history-action-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-action-btn svg {
  color: #9CA3AF;
}

.rename-btn:hover {
  background: rgba(155, 109, 255, 0.1);
}

.rename-btn:hover svg {
  color: #7c5ce9;
}

.delete-btn:hover {
  background: rgba(255, 100, 100, 0.1);
}

.delete-btn:hover svg {
  color: #ef4444;
}

/* Panel slide transition */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

/* ===== New Chat Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-dialog {
  width: 85%;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  padding: 24px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #253c5c;
  margin-bottom: 18px;
  text-align: center;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(155, 109, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  color: #374151;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: #9b6dff;
  box-shadow: 0 0 0 3px rgba(155, 109, 255, 0.12);
}

.modal-input::placeholder {
  color: #9CA3AF;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.modal-btn-cancel {
  background: rgba(0, 0, 0, 0.06);
  color: #6B7280;
}

.modal-btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

.modal-btn-confirm {
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  color: #fff;
  box-shadow: 0 4px 12px rgba(155, 109, 255, 0.3);
}

.modal-btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(155, 109, 255, 0.4);
}

.modal-btn-confirm:active {
  transform: scale(0.97);
}

/* Modal fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-dialog {
  transform: scale(0.9) translateY(10px);
}

.modal-fade-leave-to .modal-dialog {
  transform: scale(0.95);
}

/* ===== Messages Area ===== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px 8px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(155, 109, 255, 0.2);
  border-radius: 4px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  animation: msg-appear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes msg-appear {
  from { opacity: 0; transform: translateY(12px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.message-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-avatar svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

/* ===== Message Bubbles ===== */
.message-bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 20px;
  position: relative;
  word-wrap: break-word;
  line-height: 1.5;
}

.bubble-ai {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(155, 109, 255, 0.08);
  color: #374151;
}

.bubble-user {
  background: linear-gradient(135deg, #9b6dff, #7c5ce9);
  border-radius: 20px 20px 6px 20px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(155, 109, 255, 0.25);
}

/* Markdown 渲染后的文本样式 */
.message-text {
  font-size: 15px;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}

.message-text :deep(p) {
  margin: 0 0 0.5em 0;
}
.message-text :deep(p:last-child) {
  margin-bottom: 0;
}
.message-text :deep(ul), .message-text :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.message-text :deep(li) {
  margin: 0.2em 0;
}
.message-text :deep(code) {
  background: rgba(0,0,0,0.08);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}
.message-text :deep(pre) {
  background: rgba(0,0,0,0.05);
  padding: 0.75em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}
.message-text :deep(pre code) {
  background: none;
  padding: 0;
}
.message-text :deep(strong) {
  font-weight: 700;
}
.message-text :deep(a) {
  color: #9b6dff;
  text-decoration: underline;
}
.bubble-user .message-text :deep(a) {
  color: #fff;
  text-decoration: underline;
}

.message-time {
  font-size: 11px;
  text-align: right;
  margin-top: 4px;
}

.bubble-ai .message-time {
  color: #9CA3AF;
}

.bubble-user .message-time {
  color: rgba(255, 255, 255, 0.65);
}

/* ===== Typing Indicator ===== */
.typing-bubble {
  padding: 14px 20px;
}

.typing-indicator {
  display: flex;
  gap: 5px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  animation: typing-pulse 1.2s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-pulse {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
  40% { transform: scale(1.2); opacity: 1; }
}

/* ===== Suggestions ===== */
.chat-suggestions {
  padding: 0 16px 8px;
  flex-shrink: 0;
}

.suggestions-title {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 10px;
  padding-left: 4px;
  font-weight: 500;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  font-size: 13px;
  color: #4a3d6e;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.suggestion-chip:hover {
  background: rgba(255, 255, 255, 0.75);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(155, 109, 255, 0.12);
}

.suggestion-chip:active {
  transform: scale(0.95);
}

/* ===== Input Area ===== */
.chat-input-area {
  padding: 8px 12px;
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 25px;
  padding: 6px 6px 6px 18px;
  transition: all 0.3s ease;
}

.chat-input-wrapper:focus-within {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(155, 109, 255, 0.3);
  box-shadow: 0 4px 24px rgba(155, 109, 255, 0.12);
}

.chat-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: #374151;
  padding: 8px 0;
  font-family: inherit;
}

.chat-input::placeholder {
  color: #9CA3AF;
}

.chat-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #9b6dff, #ff6dab);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(155, 109, 255, 0.3);
}

.chat-send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(155, 109, 255, 0.4);
}

.chat-send-btn:active {
  transform: scale(0.92);
}

.chat-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.chat-send-btn svg {
  width: 18px;
  height: 18px;
  color: #fff;
}
</style>
