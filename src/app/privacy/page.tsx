'use client';

import { useStore } from '@/store/useStore';

export default function PrivacyPolicyPage() {
  const { language } = useStore();
  const isKorean = language === 'ko';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {isKorean ? '개인정보 처리방침' : 'Privacy Policy'}
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          {isKorean ? (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                시행일: 2024년 1월 1일
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  1. 개인정보의 수집 및 이용 목적
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  SYNUSON Monitor(이하 &quot;서비스&quot;)는 다음의 목적을 위해 개인정보를 수집 및 이용합니다:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mt-2">
                  <li>서비스 이용을 위한 회원 식별 및 인증</li>
                  <li>서비스 제공 및 운영</li>
                  <li>보안 및 접근 제어</li>
                  <li>서비스 개선 및 오류 분석</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  2. 수집하는 개인정보 항목
                </h2>
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">구분</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">수집 항목</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">필수 여부</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 dark:text-gray-300">
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">회원 정보</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">사용자명(ID)</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">필수</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">회원 정보</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">이메일 주소</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">선택</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">자동 수집</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">IP 주소, 접속 일시, 브라우저 정보</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">필수</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  3. 개인정보의 보유 및 이용 기간
                </h2>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li><strong>회원 정보:</strong> 회원 탈퇴 시까지</li>
                  <li><strong>접속 로그:</strong> 1년 (정보통신망법 준수)</li>
                  <li><strong>감사 로그:</strong> 3년 (내부 보안 정책)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  4. 개인정보의 제3자 제공
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                  다만, 다음의 경우에는 예외로 합니다:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mt-2">
                  <li>이용자가 사전에 동의한 경우</li>
                  <li>법령의 규정에 의하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  5. 개인정보의 파기 절차 및 방법
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  이용자의 개인정보는 수집 및 이용 목적이 달성된 후에는 지체 없이 파기합니다.
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mt-2">
                  <li><strong>전자적 파일:</strong> 복구 불가능한 방법으로 영구 삭제</li>
                  <li><strong>종이 문서:</strong> 분쇄하거나 소각</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  6. 이용자의 권리와 행사 방법
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  이용자는 다음의 권리를 행사할 수 있습니다:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mt-2">
                  <li>개인정보 열람 요청</li>
                  <li>오류 등이 있을 경우 정정 요청</li>
                  <li>삭제 요청</li>
                  <li>처리 정지 요청</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  권리 행사는 설정 메뉴 또는 개인정보 보호책임자에게 서면, 이메일로 요청할 수 있습니다.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  7. 개인정보 보호를 위한 기술적/관리적 대책
                </h2>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li>비밀번호 암호화 저장 (bcrypt)</li>
                  <li>SSL/TLS를 통한 데이터 암호화 전송</li>
                  <li>접근 권한 관리 및 제한</li>
                  <li>보안 프로그램 설치 및 갱신</li>
                  <li>개인정보 취급 직원의 최소화 및 교육</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  8. 개인정보 보호책임자
                </h2>
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <tbody className="text-gray-600 dark:text-gray-300">
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-semibold w-32">성명</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">[담당자명]</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-semibold">직책</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">개인정보 보호책임자</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-semibold">연락처</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">[이메일 주소]</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  9. 개인정보 처리방침 변경
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의
                  추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Effective Date: January 1, 2024
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  1. Purpose of Collection and Use of Personal Information
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  SYNUSON Monitor (&quot;Service&quot;) collects and uses personal information for the following purposes:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mt-2">
                  <li>User identification and authentication for service use</li>
                  <li>Service provision and operation</li>
                  <li>Security and access control</li>
                  <li>Service improvement and error analysis</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  2. Personal Information Collected
                </h2>
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Category</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Items</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">Required</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 dark:text-gray-300">
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">User Info</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Username (ID)</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Required</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">User Info</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Email Address</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Optional</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Auto-collected</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">IP Address, Access Time, Browser Info</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Required</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  3. Retention Period
                </h2>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li><strong>User Information:</strong> Until account deletion</li>
                  <li><strong>Access Logs:</strong> 1 year</li>
                  <li><strong>Audit Logs:</strong> 3 years</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  4. Your Rights
                </h2>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li>Right to access your personal information</li>
                  <li>Right to correct inaccurate information</li>
                  <li>Right to delete your information</li>
                  <li>Right to restrict processing</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  5. Security Measures
                </h2>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li>Password encryption (bcrypt)</li>
                  <li>SSL/TLS encrypted transmission</li>
                  <li>Access control and authorization</li>
                  <li>Regular security updates</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  6. Contact
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  For privacy-related inquiries, please contact the Privacy Officer at [email address].
                </p>
              </section>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isKorean ? '← 홈으로 돌아가기' : '← Back to Home'}
          </a>
        </div>
      </div>
    </div>
  );
}
