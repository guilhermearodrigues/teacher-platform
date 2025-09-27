import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Message {
  id: string;
  studentId: string;
  userId: string;
  inputContent: string;
  outputContent: string | null;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageData {
  studentId: string;
  inputContent: string;
  outputContent?: string | null;
  messageType?: 'text' | 'image' | 'file';
}

export interface MessageInsight {
  userId: string;
  studentId: string;
  messageDate: string;
  messageCount: number;
  unreadCount: number;
  totalTokens: number;
}

interface MessagesContextType {
  messages: Message[];
  loading: boolean;
  error: string | null;
  getMessagesForStudent: (studentId: string) => Message[];
  getUnreadCount: (studentId?: string) => number;
  fetchMessages: () => Promise<void>;
  getStudentUsageStats: (studentId: string) => {
    totalMessages: number;
    messagesThisWeek: number;
    lastMessageDate: string | null;
    averageMessagesPerDay: number;
  };
  getOverallStats: () => {
    totalMessages: number;
    activeStudents: number;
    messagesThisWeek: number;
    activeStudentsThisWeek: number;
    tokensUsedThisWeek: number;
  };
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const formattedMessages: Message[] = data.map(message => ({
        id: message.id,
        studentId: message.student_id,
        userId: message.user_id,
        inputContent: message.input_content,
        outputContent: message.output_content,
        messageType: message.message_type,
        isRead: message.is_read,
        createdAt: message.created_at,
        updatedAt: message.updated_at
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };


  const getStudentUsageStats = (studentId: string) => {
    const studentMessages = messages.filter(msg => msg.studentId === studentId);
    const totalMessages = studentMessages.length;

    // Calculate messages this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const messagesThisWeek = studentMessages.filter(
      msg => new Date(msg.createdAt) >= oneWeekAgo
    ).length;

    // Get last message date
    const lastMessage = studentMessages
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const lastMessageDate = lastMessage ? lastMessage.createdAt : null;

    // Calculate average messages per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const messagesLast30Days = studentMessages.filter(
      msg => new Date(msg.createdAt) >= thirtyDaysAgo
    ).length;
    const averageMessagesPerDay = messagesLast30Days / 30;

    return {
      totalMessages,
      messagesThisWeek,
      lastMessageDate,
      averageMessagesPerDay: Math.round(averageMessagesPerDay * 100) / 100
    };
  };

  const getOverallStats = () => {
    // Total messages (conversations) - each message represents a student input + bot response
    const totalMessages = messages.length;

    // Get unique students who have sent messages
    const activeStudentIds = new Set(messages.map(msg => msg.studentId));
    const activeStudents = activeStudentIds.size;

    // Calculate messages this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const messagesThisWeek = messages.filter(
      msg => new Date(msg.createdAt) >= oneWeekAgo
    ).length;

    // Calculate unique students who sent at least one message this week
    const studentsThisWeekIds = new Set(
      messages
        .filter(msg => new Date(msg.createdAt) >= oneWeekAgo)
        .map(msg => msg.studentId)
    );
    const activeStudentsThisWeek = studentsThisWeekIds.size;

    // Note: Token usage now retrieved from OpenAI API, not stored in database
    const tokensUsedThisWeek = 0; // Placeholder - will be fetched from OpenAI API

    return {
      totalMessages,
      activeStudents,
      messagesThisWeek,
      activeStudentsThisWeek,
      tokensUsedThisWeek
    };
  };

  const getMessagesForStudent = (studentId: string) => {
    return messages.filter(message => message.studentId === studentId);
  };

  const getUnreadCount = (studentId?: string) => {
    const filteredMessages = studentId
      ? messages.filter(msg => msg.studentId === studentId)
      : messages;

    return filteredMessages.filter(msg => !msg.isRead).length;
  };


  useEffect(() => {
    if (user) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [user]);

  const value = {
    messages,
    loading,
    error,
    getMessagesForStudent,
    getUnreadCount,
    fetchMessages,
    getStudentUsageStats,
    getOverallStats
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};