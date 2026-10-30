'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { User, Bell, Shield, Trash2, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const user = session?.user;
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'billing'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    company: '',
    website: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const tabs = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'notifications', label: '알림', icon: Bell },
    { id: 'security', label: '보안', icon: Shield },
    { id: 'billing', label: '결제', icon: CreditCard },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      if (res.ok) {
        await update({ name: profileData.name });
        setMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
      } else {
        setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: '비밀번호는 8자 이상이어야 합니다.' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });
      if (res.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || '변경 중 오류가 발생했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    if (!confirm('모든 데이터(생성 기록, 크레딧, 구독)가 영구 삭제됩니다. 계속하시겠습니까?')) return;
    
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/auth/signout';
      } else {
        alert('계정 삭제 중 오류가 발생했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  const renderTabs = () => {
    return tabs.map((tab) => {
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500 margin-bottom-[-1px]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Icon className="w-4 h-4" />
          {tab.label}
        </button>
      );
    });
  };

  const renderMessage = () => {
    if (!message) return null;
    return (
      <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
        {message.type === 'success' ? '✓' : '⚠️'}
        {message.text}
      </div>
    );
  };

  const renderProfileTab = () => (
    <Card variant="outlined" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          프로필 정보
        </CardTitle>
        <CardDescription>표시될 이름과 공개 프로필 정보를 설정하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="이름"
            value={profileData.name}
            onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="홍길동"
          />
          <Input
            label="이메일"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
            disabled
            helperText="이메일 변경은 고객지원으로 문의해주세요."
          />
        </div>
        <Input
          label="한 줄 소개"
          value={profileData.bio}
          onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
          placeholder="이모티콘 크리에이터 / 디자이너 / 개발자"
          maxLength={100}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="회사/소속"
            value={profileData.company}
            onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="(주)아레나 AI"
          />
          <Input
            label="웹사이트/포트폴리오"
            type="url"
            value={profileData.website}
            onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://example.com"
          />
        </div>
        <CardFooter>
          <Button onClick={handleSaveProfile} loading={isSaving}>
            저장하기
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );

  const renderNotificationsTab = () => (
    <Card variant="outlined" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          알림 설정
        </CardTitle>
        <CardDescription>받고 싶은 알림을 선택하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { id: 'email_marketing', label: '마케팅 이메일', desc: '신기능, 할인, 팁 등 마케팅 소식 수신' },
          { id: 'email_generation', label: '생성 완료 알림', desc: '이모티콘 생성 완료 시 이메일 알림' },
          { id: 'email_credits', label: '크레딧 부족 알림', desc: '크레딧이 5개 미만일 때 알림' },
          { id: 'email_billing', label: '결제/구독 알림', desc: '결제 영수증, 갱신 예정, 실패 알림' },
          { id: 'push_generation', label: '푸시 알림 (생성)', desc: '브라우저 푸시로 생성 완료 알림' },
        ].map((item) => (
          <label key={item.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <input type="checkbox" className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" defaultChecked={item.id !== 'email_marketing'} />
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );

  const renderSecurityTab = () => (
    <>
      <Card variant="outlined" padding="lg" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>계정 보안을 위해 정기적으로 비밀번호를 변경하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="현재 비밀번호"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <Input
            label="새 비밀번호"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            helperText="최소 8자, 영문/숫자/특수문자 조합 권장"
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <Button onClick={handleChangePassword} loading={isSaving}>
            비밀번호 변경
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined" padding="lg" className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            계정 삭제
          </CardTitle>
          <CardDescription className="text-red-600">계정을 영구적으로 삭제합니다. 복구할 수 없습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            계정 삭제 시 다음 데이터가 영구 삭제됩니다:
          </p>
          <ul className="text-sm text-slate-600 space-y-1 mb-6 list-disc list-inside">
            <li>프로필 정보 및 설정</li>
            <li>모든 이모티콘 생성 기록 및 프롬프트</li>
            <li>보유 크레딧 및 구독 내역</li>
            <li>결제 내역 및 영수증</li>
          </ul>
          <Button variant="danger" onClick={handleDeleteAccount}>
            <Trash2 className="w-4 h-4 mr-2" />
            계정 영구 삭제
          </Button>
        </CardContent>
      </Card>
    </>
  );

  const renderBillingTab = () => (
    <Card variant="outlined" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          결제 수단 및 구독 관리
        </CardTitle>
        <CardDescription>Stripe 고객 포털에서 결제 수단과 구독을 관리하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => window.location.href = '/api/billing/portal'}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            결제 수단 관리 (Stripe 포털)
          </Button>
          <p className="text-sm text-slate-500">
            Stripe 보안 포털에서 카드 정보 변경, 구독 해지/변경, 청구서 다운로드 등을 할 수 있습니다.
          </p>
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-medium text-slate-900 mb-2">세금계산서 정보</h4>
            <Input
              label="사업자등록번호"
              placeholder="123-45-67890"
              helperText="등록 시 자동으로 세금계산서가 발행됩니다."
            />
            <Input
              label="상호명"
              placeholder="(주)아레나 AI"
            />
            <Input
              label="대표자명"
              placeholder="홍길동"
            />
            <Input
              label="업태/종목"
              placeholder="소프트웨어 개발/공급"
            />
            <Input
              label="사업장 주소"
              placeholder="서울시 강남구..."
            />
            <Input
              label="담당자 이메일"
              type="email"
              placeholder="billing@example.com"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      case 'billing':
        return renderBillingTab();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container-main max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">설정</h1>
          <p className="text-slate-600 mt-1">계정 정보, 알림, 보안, 결제 설정을 관리하세요.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200">
          {renderTabs()}
        </div>

        {renderMessage()}

        {renderActiveTab()}
      </div>
    </div>
  );
}