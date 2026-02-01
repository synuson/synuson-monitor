'use client';

import { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Mail,
  Clock,
  LogOut,
  Save,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/lib/i18n';

export default function AccountPage() {
  const { user, logout } = useStore();
  const { t, language } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // In a real app, this would call an API
    setSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSaved(false), 2000);
  };

  const lastLogin = new Date().toLocaleString('ko-KR');

  return (
    <AppLayout title={t.settings.account}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">{t.settings.account}</h1>
          </div>
          <p className="text-gray-500">
            {language === 'ko' ? '계정 정보 및 보안 설정을 관리합니다.' : 'Manage your account information and security settings.'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {language === 'ko' ? '프로필 정보' : 'Profile Information'}
              </h2>
            </div>

            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t.settings.username}
                  </label>
                  <p className="text-lg font-medium text-gray-900">{user?.username || 'Unknown'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t.settings.role}
                  </label>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    user?.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    {user?.role === 'admin' ? 'Administrator' : 'Viewer'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {language === 'ko' ? '마지막 로그인' : 'Last Login'}
                  </label>
                  <p className="text-gray-700">{lastLogin}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {language === 'ko' ? '이메일 설정' : 'Email Settings'}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  {language === 'ko' ? '이메일 주소' : 'Email Address'}
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'ko'
                    ? '알림을 받을 이메일 주소를 입력하세요'
                    : 'Enter email address to receive notifications'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {language === 'ko' ? '이메일 알림' : 'Email Notifications'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {language === 'ko'
                      ? '중요 알림을 이메일로 받습니다'
                      : 'Receive important alerts via email'}
                  </p>
                </div>
                <button className="relative w-12 h-6 rounded-full bg-gray-300 transition-colors">
                  <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow" />
                </button>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {language === 'ko' ? '비밀번호 변경' : 'Change Password'}
              </h2>
            </div>

            <div className="space-y-4">
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  {language === 'ko' ? '현재 비밀번호' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  {language === 'ko' ? '새 비밀번호' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  {language === 'ko' ? '비밀번호 확인' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {language === 'ko' ? '비밀번호 변경' : 'Change Password'}
              </button>
            </div>
          </div>

          {/* Session */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <LogOut className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {language === 'ko' ? '세션' : 'Session'}
              </h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {language === 'ko' ? '로그아웃' : 'Sign Out'}
                </p>
                <p className="text-sm text-gray-500">
                  {language === 'ko'
                    ? '현재 세션을 종료하고 로그아웃합니다'
                    : 'End your current session and sign out'}
                </p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t.nav.logout}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  {t.settings.saved}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t.settings.saveChanges}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
