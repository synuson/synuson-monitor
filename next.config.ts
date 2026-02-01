import type { NextConfig } from "next";

// Security headers (CSP is now set dynamically in middleware with nonce)
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  // CSP is set dynamically in middleware with nonce support
  // See: src/middleware.ts - getCSPHeader()
];

const nextConfig: NextConfig = {
  // Docker 배포를 위한 standalone 출력
  output: 'standalone',

  // 보안 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // 프로덕션 환경에서 HTTPS 리다이렉트
  async redirects() {
    // 프로덕션에서만 HTTPS 리다이렉트 (개발 환경에서는 제외)
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://:host/:path*',
          permanent: true,
        },
      ];
    }
    return [];
  },

  // 빌드 최적화
  poweredByHeader: false, // X-Powered-By 헤더 제거
  compress: true, // Gzip 압축

  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // 환경 변수 노출 (클라이언트에서 사용 가능)
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // 실험적 기능
  experimental: {
    // 서버 액션 활성화
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
