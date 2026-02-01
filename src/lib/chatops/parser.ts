/**
 * Natural Language Query Parser
 * 자연어 명령을 분석하여 시스템 액션으로 변환
 */

// 쿼리 인텐트 타입
export type QueryIntent =
  | 'get_problems'
  | 'get_hosts'
  | 'get_host_status'
  | 'get_services'
  | 'acknowledge_problem'
  | 'get_stats'
  | 'get_maintenance'
  | 'search'
  | 'help'
  | 'unknown';

// 파싱된 쿼리 결과
export interface ParsedQuery {
  intent: QueryIntent;
  entities: {
    severity?: string[];
    hostName?: string;
    hostId?: string;
    problemId?: string;
    status?: string;
    timeRange?: string;
    searchTerm?: string;
    count?: number;
  };
  confidence: number;
  originalQuery: string;
}

// 키워드 매핑
const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  get_problems: [
    '문제', '알림', '이슈', '장애', '에러', '오류', '경고',
    'problem', 'alert', 'issue', 'error', 'warning',
  ],
  get_hosts: [
    '호스트', '서버', '노드', '머신', '시스템',
    'host', 'server', 'node', 'machine',
  ],
  get_host_status: [
    '상태', '온라인', '오프라인', '가동', '중지',
    'status', 'online', 'offline', 'up', 'down',
  ],
  get_services: [
    '서비스', '웹', 'http', 'https', 'url', '모니터링',
    'service', 'web', 'monitoring',
  ],
  acknowledge_problem: [
    '확인', '처리', '승인', 'ack', 'acknowledge',
    '인지', '담당',
  ],
  get_stats: [
    '통계', '요약', '현황', '대시보드', '개요',
    'stats', 'summary', 'dashboard', 'overview',
  ],
  get_maintenance: [
    '점검', '유지보수', '메인터넌스', '정비',
    'maintenance', 'downtime',
  ],
  search: [
    '검색', '찾기', '조회',
    'search', 'find', 'lookup',
  ],
  help: [
    '도움', '도움말', '사용법', '명령어',
    'help', 'usage', 'command',
  ],
  unknown: [],
};

// 심각도 키워드
const SEVERITY_KEYWORDS: Record<string, string[]> = {
  '5': ['재해', '치명적', 'disaster', 'critical'],
  '4': ['높음', '심각', 'high', 'severe'],
  '3': ['중간', '보통', '경고', 'average', 'medium', 'warning'],
  '2': ['낮음', '정보', 'low', 'information'],
  '1': ['매우낮음', 'not classified'],
  '0': ['분류안됨'],
};

// 시간 범위 키워드
const TIME_KEYWORDS: Record<string, string[]> = {
  '1h': ['1시간', '한시간', '1hour', 'one hour'],
  '6h': ['6시간', '6hour'],
  '12h': ['12시간', '12hour'],
  '24h': ['24시간', '하루', '1일', 'today', 'day'],
  '7d': ['7일', '일주일', '1주', 'week'],
  '30d': ['30일', '한달', '1달', 'month'],
};

// 상태 키워드
const STATUS_KEYWORDS: Record<string, string[]> = {
  online: ['온라인', '정상', '가동중', 'online', 'up', 'active'],
  offline: ['오프라인', '중지', '다운', 'offline', 'down', 'inactive'],
  maintenance: ['점검중', '유지보수중', 'maintenance'],
};

// 숫자 추출
function extractNumber(text: string): number | undefined {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

// 키워드 매칭 점수 계산
function calculateKeywordScore(text: string, keywords: string[]): number {
  const normalizedText = text.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      score += keyword.length; // 긴 키워드에 높은 점수
    }
  }

  return score;
}

// 인텐트 감지
function detectIntent(text: string): { intent: QueryIntent; confidence: number } {
  const scores: Map<QueryIntent, number> = new Map();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const score = calculateKeywordScore(text, keywords);
    if (score > 0) {
      scores.set(intent as QueryIntent, score);
    }
  }

  if (scores.size === 0) {
    return { intent: 'unknown', confidence: 0 };
  }

  // 가장 높은 점수의 인텐트 선택
  let maxIntent: QueryIntent = 'unknown';
  let maxScore = 0;

  for (const [intent, score] of scores) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent;
    }
  }

  // 신뢰도 계산 (0~1)
  const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);
  const confidence = Math.min(maxScore / Math.max(totalScore * 0.5, 1), 1);

  return { intent: maxIntent, confidence };
}

// 엔티티 추출
function extractEntities(text: string): ParsedQuery['entities'] {
  const entities: ParsedQuery['entities'] = {};
  const normalizedText = text.toLowerCase();

  // 심각도 추출
  const severities: string[] = [];
  for (const [level, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some((k) => normalizedText.includes(k.toLowerCase()))) {
      severities.push(level);
    }
  }
  if (severities.length > 0) {
    entities.severity = severities;
  }

  // 시간 범위 추출
  for (const [range, keywords] of Object.entries(TIME_KEYWORDS)) {
    if (keywords.some((k) => normalizedText.includes(k.toLowerCase()))) {
      entities.timeRange = range;
      break;
    }
  }

  // 상태 추출
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
    if (keywords.some((k) => normalizedText.includes(k.toLowerCase()))) {
      entities.status = status;
      break;
    }
  }

  // 숫자 추출 (개수)
  const count = extractNumber(text);
  if (count && count <= 100) {
    entities.count = count;
  }

  // 따옴표 안의 검색어 추출
  const quotedMatch = text.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    entities.searchTerm = quotedMatch[1];
  }

  // 호스트 이름 패턴 추출 (예: host-001, server01)
  const hostPattern = text.match(/\b(host[-_]?\d+|server[-_]?\d+|node[-_]?\d+)\b/i);
  if (hostPattern) {
    entities.hostName = hostPattern[1];
  }

  return entities;
}

// 메인 파서 함수
export function parseQuery(query: string): ParsedQuery {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      intent: 'unknown',
      entities: {},
      confidence: 0,
      originalQuery: query,
    };
  }

  const { intent, confidence } = detectIntent(trimmedQuery);
  const entities = extractEntities(trimmedQuery);

  return {
    intent,
    entities,
    confidence,
    originalQuery: query,
  };
}

// 쿼리 제안 생성
export function getSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const normalizedInput = input.toLowerCase();

  const allSuggestions = [
    '현재 문제 보여줘',
    '심각도 높은 문제',
    '오프라인 호스트 목록',
    '호스트 상태 확인',
    '서비스 현황',
    '통계 보여줘',
    '점검 중인 시스템',
    '최근 24시간 문제',
    '도움말',
  ];

  if (!normalizedInput) {
    return allSuggestions.slice(0, 5);
  }

  for (const suggestion of allSuggestions) {
    if (suggestion.toLowerCase().includes(normalizedInput)) {
      suggestions.push(suggestion);
    }
  }

  return suggestions.slice(0, 5);
}

// 도움말 메시지 생성
export function getHelpMessage(): string {
  return `
**ChatOps 명령어 안내**

📊 **조회 명령어**
- "문제 보여줘" - 현재 발생 중인 문제 목록
- "심각도 높은 문제" - 심각도 4-5 문제만 표시
- "호스트 목록" - 전체 호스트 상태
- "오프라인 호스트" - 오프라인 상태 호스트
- "서비스 현황" - HTTP 서비스 모니터링 상태
- "통계" - 전체 시스템 요약

🔧 **필터링**
- 시간: "24시간", "1주일", "한달"
- 심각도: "치명적", "높음", "경고"
- 상태: "온라인", "오프라인", "점검중"

💡 **예시**
- "최근 1시간 동안 발생한 문제"
- "server01 상태"
- "심각도 높은 문제 5개"
`.trim();
}

export default parseQuery;
