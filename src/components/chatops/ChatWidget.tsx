'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  Bot,
  User,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

// 테이블 행 타입
type TableRowData = Record<string, string | number | boolean | null | undefined>;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: TableRowData[] | Record<string, unknown>;
  type?: 'text' | 'table' | 'list' | 'stats' | 'error';
  suggestions?: string[];
}

interface ChatResponse {
  success: boolean;
  message: string;
  data?: TableRowData[] | Record<string, unknown>;
  suggestions?: string[];
  type: 'text' | 'table' | 'list' | 'stats' | 'error';
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! SYNUSON 모니터링 챗봇입니다. 무엇을 도와드릴까요?\n\n예시: "현재 문제 보여줘", "호스트 상태", "통계"',
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 스크롤 자동 이동
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 자동완성 제안 가져오기
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/chat?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      if (data?.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  // 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    fetchSuggestions(value);
  };

  // 메시지 전송
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.trim() }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data?.message || '응답을 처리할 수 없습니다.',
        timestamp: new Date(),
        data: data?.data,
        type: data?.type || 'error',
        suggestions: data?.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date(),
        type: 'error',
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // 제안 클릭
  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // 메시지 렌더링
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        {/* 아바타 */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser
              ? 'bg-blue-100 text-blue-600'
              : message.type === 'error'
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-600'
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : message.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* 메시지 내용 */}
        <div
          className={`max-w-[80%] rounded-lg px-3 py-2 ${
            isUser
              ? 'bg-blue-500 text-white'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {/* 텍스트 메시지 */}
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

          {/* 테이블 데이터 */}
          {message.type === 'table' && message.data && Array.isArray(message.data) && (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-xs">
                <tbody>
                  {(message.data as TableRowData[]).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-gray-200 first:border-t-0"
                    >
                      {Object.entries(row).map(([key, val], cellIdx) => (
                        <td key={cellIdx} className="py-1 px-2">
                          {key === 'severityIcon' || key === 'status' ? (
                            <span>{String(val ?? '')}</span>
                          ) : (
                            <span className="text-gray-600">
                              {String(val ?? '')}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 제안 */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs px-2 py-1 bg-white/80 hover:bg-white rounded border text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* 시간 */}
          <div
            className={`text-[10px] mt-1 ${
              isUser ? 'text-blue-200' : 'text-gray-400'
            }`}
          >
            {message.timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    );
  };

  // 플로팅 버튼
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
        title="ChatOps 열기"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  // 최소화 상태
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center gap-2 cursor-pointer z-50"
        onClick={() => setIsMinimized(false)}
      >
        <Bot className="w-5 h-5 text-green-500" />
        <span className="text-sm font-medium">ChatOps</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 전체 채팅 창
  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border dark:border-gray-700">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-medium">SYNUSON ChatOps</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-blue-500 rounded"
            title="최소화"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-blue-500 rounded"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(renderMessage)}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="text-sm text-gray-500">입력 중...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 자동완성 제안 */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t dark:border-gray-700 flex flex-wrap gap-1">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(suggestion);
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 입력 영역 */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-3 border-t dark:border-gray-700"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default ChatWidget;
