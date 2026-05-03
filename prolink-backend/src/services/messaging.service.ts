import { supabase } from '../config/supabase';
import { Conversation, Message } from '../types';

export interface CreateConversationInput {
  client_id?: string;
  job_id?: string;
  subject?: string;
}

export interface SendMessageInput {
  body: string;
  message_type?: 'text' | 'image' | 'document' | 'system';
  attachment_url?: string;
}

export const messagingService = {
  /**
   * Returns all conversations for a contractor, newest first.
   */
  async listConversations(contractorId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Conversation[];
  },

  /**
   * Creates a new conversation thread.
   */
  async createConversation(contractorId: string, input: CreateConversationInput): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ ...input, contractor_id: contractorId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create conversation');
    return data as Conversation;
  },

  /**
   * Fetches a single conversation with ownership check.
   */
  async getConversation(contractorId: string, conversationId: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('contractor_id', contractorId)
      .single();

    if (error || !data) throw new Error('Conversation not found');
    return data as Conversation;
  },

  /**
   * Returns all messages in a conversation, oldest first.
   */
  async getMessages(contractorId: string, conversationId: string): Promise<Message[]> {
    await this.getConversation(contractorId, conversationId);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as Message[];
  },

  /**
   * Sends a message to a conversation and bumps last_message_at.
   */
  async sendMessage(
    contractorId: string,
    conversationId: string,
    senderId: string,
    input: SendMessageInput
  ): Promise<Message> {
    await this.getConversation(contractorId, conversationId);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...input,
        conversation_id: conversationId,
        contractor_id: contractorId,
        sender_id: senderId,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to send message');

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data as Message;
  },

  /**
   * Marks a specific message as read.
   */
  async markMessageRead(contractorId: string, conversationId: string, messageId: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Message not found');
    return data as Message;
  },
};
