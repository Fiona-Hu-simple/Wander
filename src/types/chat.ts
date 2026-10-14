export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  status: 'completed' | 'generating' | 'failed' | 'interrupted'
  requestId: string | null
  replyTo: number | null
  error: string | null
  createdAt: string
  time: string
}
export interface Conversation {
  id: string
  title: string
  draft: string
  version: number
  createdAt: string
  updatedAt: string
}
export interface ConversationDetail extends Conversation {
  messages: ChatMessage[]
  hasMore: boolean
  nextBefore: number | null
}
