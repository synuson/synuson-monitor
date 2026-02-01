'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

interface Problem {
  eventid: string;
  name: string;
  severity: string;
  severityName: string;
  hosts?: { hostid: string; name: string }[];
}

interface AcknowledgeDialogProps {
  problems: Problem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AckAction = 'acknowledge' | 'close' | 'message';

export function AcknowledgeDialog({
  problems,
  isOpen,
  onClose,
  onSuccess,
}: AcknowledgeDialogProps) {
  const [action, setAction] = useState<AckAction>('acknowledge');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds: problems.map((p) => p.eventid),
          action,
          message: message.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to acknowledge problems');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (act: AckAction) => {
    switch (act) {
      case 'acknowledge':
        return '확인 처리';
      case 'close':
        return '문제 닫기';
      case 'message':
        return '메시지 추가';
    }
  };

  const getActionIcon = (act: AckAction) => {
    switch (act) {
      case 'acknowledge':
        return <CheckCircle className="w-5 h-5" />;
      case 'close':
        return <XCircle className="w-5 h-5" />;
      case 'message':
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            문제 확인 ({problems.length}개)
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 선택된 문제 목록 */}
          <div className="p-4 max-h-48 overflow-y-auto border-b dark:border-gray-700">
            {problems.map((problem) => (
              <div
                key={problem.eventid}
                className="flex items-center gap-2 py-2 text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: getSeverityColor(problem.severity),
                  }}
                />
                <span className="truncate flex-1">{problem.name}</span>
                {problem.hosts?.[0] && (
                  <span className="text-gray-500 text-xs">
                    {problem.hosts[0].name}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 액션 선택 */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['acknowledge', 'close', 'message'] as AckAction[]).map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setAction(act)}
                  className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                    action === act
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  {getActionIcon(act)}
                  <span className="text-xs">{getActionLabel(act)}</span>
                </button>
              ))}
            </div>

            {/* 메시지 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                메시지 {action === 'message' ? '(필수)' : '(선택)'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="문제에 대한 메시지를 입력하세요..."
                rows={3}
                required={action === 'message'}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 경고 메시지 */}
            {action === 'close' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-yellow-700 dark:text-yellow-400">
                  문제를 닫으면 Zabbix에서 해결된 것으로 처리됩니다.
                  실제로 문제가 해결되지 않은 경우 다시 발생할 수 있습니다.
                </p>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || (action === 'message' && !message.trim())}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  {getActionIcon(action)}
                  {getActionLabel(action)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    '0': '#97AAB3',
    '1': '#7499FF',
    '2': '#FFC859',
    '3': '#FFA059',
    '4': '#E97659',
    '5': '#E45959',
  };
  return colors[severity] || '#97AAB3';
}

export default AcknowledgeDialog;
