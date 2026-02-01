/**
 * Zabbix Configuration
 * 환경 변수를 검증하고 Zabbix 클라이언트를 생성
 */

import { ZabbixClient } from './client';

export interface ZabbixConfig {
  url: string;
  user: string;
  password: string;
}

/**
 * 환경 변수 검증 및 설정 로드
 * 프로덕션 환경에서는 모든 환경 변수가 필수
 */
export function getZabbixConfig(): ZabbixConfig {
  const url = process.env.ZABBIX_URL;
  const user = process.env.ZABBIX_USER;
  const password = process.env.ZABBIX_PASSWORD;

  const isProduction = process.env.NODE_ENV === 'production';

  // 프로덕션에서는 환경 변수 필수
  if (isProduction) {
    if (!url) {
      throw new Error('ZABBIX_URL environment variable is required in production');
    }
    if (!user) {
      throw new Error('ZABBIX_USER environment variable is required in production');
    }
    if (!password) {
      throw new Error('ZABBIX_PASSWORD environment variable is required in production');
    }
  }

  // 개발 환경에서만 기본값 허용 (경고 표시)
  if (!isProduction) {
    if (!url || !user || !password) {
      console.warn('[SECURITY] Using default Zabbix credentials. Set ZABBIX_URL, ZABBIX_USER, ZABBIX_PASSWORD in production.');
    }
  }

  return {
    url: url || 'http://localhost:8080',
    user: user || 'Admin',
    password: password || 'zabbix',
  };
}

/**
 * 검증된 설정으로 Zabbix 클라이언트 생성
 */
export function createZabbixClient(): ZabbixClient {
  const config = getZabbixConfig();
  return new ZabbixClient(config);
}

/**
 * 환경 변수 검증 상태 확인
 */
export function isZabbixConfigured(): boolean {
  return !!(
    process.env.ZABBIX_URL &&
    process.env.ZABBIX_USER &&
    process.env.ZABBIX_PASSWORD
  );
}

export default getZabbixConfig;
