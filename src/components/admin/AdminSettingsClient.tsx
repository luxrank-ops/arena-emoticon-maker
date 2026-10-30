'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import {
  Shield,
  CreditCard,
  Zap,
  Globe,
  Mail,
  Bell,
  Database,
  Key,
  Users,
  Settings,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSettingsClient() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Arena Emoticon Maker',
    siteDescription: 'AI로 나만의 캐릭터 이모티콘을 만들어보세요.',
    contactEmail: 'admin@arena.ai',
    maintenanceMode: false,
    registrationEnabled: true,
    defaultCredits: 10,
    maxPromptLength: 500,
  });

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    currency: 'KRW',
    taxRate: 10,
    freeCredits: 10,
    starterPrice: 9900,
    starterCredits: 100,
    proPrice: 29900,
    proCredits: 500,
    businessPrice: 69900,
    businessCredits: 1200,
  });

  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    geminiApiKey: '',
    openaiApiKey: '',
    defaultModel: 'dall-e-3',
    maxImageSize: '1024x1024',
    defaultQuality: 'standard',
    generationTimeout: 60000,
    concurrentGenerations: 2,
    enableGeminiOptimization: true,
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    resendApiKey: '',
    fromEmail: 'noreply@arena.ai',
    fromName: 'Arena Emoticon Maker',
    replyTo: 'support@arena.ai',
    emailVerificationRequired: true,
    marketingEmailsEnabled: false,
    notificationEmailsEnabled: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionMaxAge: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    require2FA: false,
    allowedOrigins: 'https://arena.ai,https://www.arena.ai',
    corsEnabled: true,
  });

  const handleSave = async (section: string) => {
    setIsSaving(true);
    setMessage(null);
    try {
      // TODO: API 호출로 저장
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: `${section} 설정이 저장되었습니다.` });
    } catch {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { value: 'general', label: '일반', icon: Settings },
    { value: 'payment', label: '결제', icon: CreditCard },
    { value: 'ai', label: 'AI 모델', icon: Zap },
    { value: 'email', label: '이메일', icon: Mail },
    { value: 'security', label: '보안', icon: Shield },
    { value: 'integrations', label: '연동', icon: Globe },
  ];

  const renderSwitch = ({ label, description, checked, onChange, Icon }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    Icon?: React.ComponentType<any>;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-slate-400" />}
        <div>
          <Label className="font-medium text-slate-900">{label}</Label>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 설정</h1>
          <p className="text-slate-600 mt-1">시스템 전체 설정을 관리하세요.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => {
          if (activeTab === 'general') handleSave('일반');
          else if (activeTab === 'payment') handleSave('결제');
          else if (activeTab === 'ai') handleSave('AI');
          else if (activeTab === 'email') handleSave('이메일');
          else if (activeTab === 'security') handleSave('보안');
        }} loading={isSaving}>
          <Save className="w-4 h-4 mr-1" />
          저장
        </Button>
      </div>

      {message && (
        <div className={cn(
          'mb-6 p-4 rounded-xl flex items-center gap-3',
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        )}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                일반 설정
              </CardTitle>
              <CardDescription>사이트 기본 정보와 운영 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="사이트 이름" value={generalSettings.siteName} onChange={e => setGeneralSettings({...generalSettings, siteName: e.target.value})} />
                <Input label="연락처 이메일" type="email" value={generalSettings.contactEmail} onChange={e => setGeneralSettings({...generalSettings, contactEmail: e.target.value})} />
              </div>
              <Input label="사이트 설명" value={generalSettings.siteDescription} onChange={e => setGeneralSettings({...generalSettings, siteDescription: e.target.value})} className="min-h-[100px]" />
              
              <div className="space-y-4">
                {renderSwitch({
                  label: '유지보수 모드',
                  description: '활성화 시 일반 사용자의 접근을 차단합니다. (관리자 제외)',
                  checked: generalSettings.maintenanceMode,
                  onChange: (v) => setGeneralSettings({...generalSettings, maintenanceMode: v}),
                  Icon: Settings,
                })}
                {renderSwitch({
                  label: '회원가입 허용',
                  description: '새로운 사용자 회원가입을 허용합니다.',
                  checked: generalSettings.registrationEnabled,
                  onChange: (v) => setGeneralSettings({...generalSettings, registrationEnabled: v}),
                  Icon: Users,
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <Input label="기본 지급 크레딧" type="number" value={generalSettings.defaultCredits} onChange={e => setGeneralSettings({...generalSettings, defaultCredits: parseInt(e.target.value)})} />
                <Input label="최대 프롬프트 길이" type="number" value={generalSettings.maxPromptLength} onChange={e => setGeneralSettings({...generalSettings, maxPromptLength: parseInt(e.target.value)})} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('일반')} loading={isSaving}><Save className="w-4 h-4 mr-1" /> 저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Stripe 연동 설정
              </CardTitle>
              <CardDescription>Stripe API 키와 웹훅을 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Publishable Key" value={paymentSettings.stripePublishableKey} onChange={e => setPaymentSettings({...paymentSettings, stripePublishableKey: e.target.value})} placeholder="pk_live_..." />
                <Input label="Secret Key" type="password" value={paymentSettings.stripeSecretKey} onChange={e => setPaymentSettings({...paymentSettings, stripeSecretKey: e.target.value})} placeholder="sk_live_..." />
              </div>
              <Input label="Webhook Secret" value={paymentSettings.stripeWebhookSecret} onChange={e => setPaymentSettings({...paymentSettings, stripeWebhookSecret: e.target.value})} placeholder="whsec_..." />
              
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-medium text-slate-900 mb-4">플랜별 가격 설정</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { name: 'Starter', key: 'starter' as const, icon: '🌱' },
                    { name: 'Pro', key: 'pro' as const, icon: '⚡' },
                    { name: 'Business', key: 'business' as const, icon: '🏢' },
                  ].map(plan => (
                    <div key={plan.key} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">{plan.icon} {plan.name}</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="월 가격 (원)" type="number" value={paymentSettings[`${plan.key}Price`]} onChange={e => setPaymentSettings({...paymentSettings, [`${plan.key}Price`]: parseInt(e.target.value)})} />
                        <Input label="월 크레딧" type="number" value={paymentSettings[`${plan.key}Credits`]} onChange={e => setPaymentSettings({...paymentSettings, [`${plan.key}Credits`]: parseInt(e.target.value)})} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                <Input label="기본 통화" value={paymentSettings.currency} onChange={e => setPaymentSettings({...paymentSettings, currency: e.target.value})} />
                <Input label="세율 (%)" type="number" value={paymentSettings.taxRate} onChange={e => setPaymentSettings({...paymentSettings, taxRate: parseFloat(e.target.value)})} />
                <Input label="가입 무료 크레딧" type="number" value={paymentSettings.freeCredits} onChange={e => setPaymentSettings({...paymentSettings, freeCredits: parseInt(e.target.value)})} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('결제')} loading={isSaving}><Save className="w-4 h-4 mr-1" /> 저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI 모델 설정
              </CardTitle>
              <CardDescription>이미지 생성 모델과 프롬프트 최적화 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Gemini API Key" type="password" value={aiSettings.geminiApiKey} onChange={e => setAiSettings({...aiSettings, geminiApiKey: e.target.value})} placeholder="AIzaSy..." />
                <Input label="OpenAI API Key" type="password" value={aiSettings.openaiApiKey} onChange={e => setAiSettings({...aiSettings, openaiApiKey: e.target.value})} placeholder="sk-..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select label="기본 모델" value={aiSettings.defaultModel} onChange={e => setAiSettings({...aiSettings, defaultModel: e.target.value})} options={[
                  { value: 'dall-e-3', label: 'DALL·E 3' },
                  { value: 'gpt-image-1', label: 'GPT Image' },
                  { value: 'stable-diffusion-xl', label: 'SDXL' },
                ]} />
                <Select label="기본 이미지 크기" value={aiSettings.maxImageSize} onChange={e => setAiSettings({...aiSettings, maxImageSize: e.target.value})} options={[
                  { value: '1024x1024', label: '1024x1024 (정사각)' },
                  { value: '1792x1024', label: '1792x1024 (가로)' },
                  { value: '1024x1792', label: '1024x1792 (세로)' },
                ]} />
                <Select label="기본 품질" value={aiSettings.defaultQuality} onChange={e => setAiSettings({...aiSettings, defaultQuality: e.target.value})} options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'hd', label: 'HD' },
                ]} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                <Input label="생성 타임아웃 (ms)" type="number" value={aiSettings.generationTimeout} onChange={e => setAiSettings({...aiSettings, generationTimeout: parseInt(e.target.value)})} />
                <Input label="동시 생성 수" type="number" value={aiSettings.concurrentGenerations} onChange={e => setAiSettings({...aiSettings, concurrentGenerations: parseInt(e.target.value)})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200">
                {renderSwitch({
                  label: 'Gemini 프롬프트 최적화',
                  description: 'Gemini AI로 프롬프트를 자동 개선하여 이미지 품질 향상',
                  checked: aiSettings.enableGeminiOptimization,
                  onChange: (v) => setAiSettings({...aiSettings, enableGeminiOptimization: v}),
                  Icon: Zap,
                })}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('AI')} loading={isSaving}><Save className="w-4 h-4 mr-1" /> 저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                이메일 설정 (Resend)
              </CardTitle>
              <CardDescription>Resend API를 통한 이메일 발송 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Resend API Key" type="password" value={emailSettings.resendApiKey} onChange={e => setEmailSettings({...emailSettings, resendApiKey: e.target.value})} placeholder="re_..." />
                <Input label="발송자 이메일" type="email" value={emailSettings.fromEmail} onChange={e => setEmailSettings({...emailSettings, fromEmail: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="발송자 이름" value={emailSettings.fromName} onChange={e => setEmailSettings({...emailSettings, fromName: e.target.value})} />
                <Input label="답장받을 이메일" type="email" value={emailSettings.replyTo} onChange={e => setEmailSettings({...emailSettings, replyTo: e.target.value})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200">
                {renderSwitch({
                  label: '이메일 인증 필수',
                  description: '회원가입 시 이메일 인증을 필수로 요구합니다.',
                  checked: emailSettings.emailVerificationRequired,
                  onChange: (v) => setEmailSettings({...emailSettings, emailVerificationRequired: v}),
                  Icon: Shield,
                })}
                {renderSwitch({
                  label: '마케팅 이메일 발송',
                  description: '동의한 사용자에게 마케팅 이메일을 발송합니다.',
                  checked: emailSettings.marketingEmailsEnabled,
                  onChange: (v) => setEmailSettings({...emailSettings, marketingEmailsEnabled: v}),
                  Icon: Mail,
                })}
                {renderSwitch({
                  label: '알림 이메일 발송',
                  description: '생성 완료, 결제 등 주요 알림 이메일을 발송합니다.',
                  checked: emailSettings.notificationEmailsEnabled,
                  onChange: (v) => setEmailSettings({...emailSettings, notificationEmailsEnabled: v}),
                  Icon: Bell,
                })}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('이메일')} loading={isSaving}><Save className="w-4 h-4 mr-1" /> 저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                보안 설정
              </CardTitle>
              <CardDescription>세션, 인증, CORS 등 보안 관련 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="세션 만료일 (일)" type="number" value={securitySettings.sessionMaxAge} onChange={e => setSecuritySettings({...securitySettings, sessionMaxAge: parseInt(e.target.value)})} />
                <Input label="최대 로그인 시도 횟수" type="number" value={securitySettings.maxLoginAttempts} onChange={e => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})} />
                <Input label="계정 잠금 시간 (분)" type="number" value={securitySettings.lockoutDuration} onChange={e => setSecuritySettings({...securitySettings, lockoutDuration: parseInt(e.target.value)})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <Input label="최소 비밀번호 길이" type="number" value={securitySettings.passwordMinLength} onChange={e => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})} />
                <Input label="허용된 Origin (쉼표 구분)" value={securitySettings.allowedOrigins} onChange={e => setSecuritySettings({...securitySettings, allowedOrigins: e.target.value})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200">
                {renderSwitch({
                  label: '2FA 필수 (관리자)',
                  description: '관리자 계정은 2단계 인증을 필수로 요구합니다.',
                  checked: securitySettings.require2FA,
                  onChange: (v) => setSecuritySettings({...securitySettings, require2FA: v}),
                  Icon: Shield,
                })}
                {renderSwitch({
                  label: 'CORS 활성화',
                  description: 'Cross-Origin Resource Sharing을 허용합니다.',
                  checked: securitySettings.corsEnabled,
                  onChange: (v) => setSecuritySettings({...securitySettings, corsEnabled: v}),
                  Icon: Globe,
                })}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('보안')} loading={isSaving}><Save className="w-4 h-4 mr-1" /> 저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card variant="outlined" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                외부 서비스 연동
              </CardTitle>
              <CardDescription>Supabase, Redis, Sentry 등 외부 서비스 연동 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2"><Database className="w-5 h-5" /> Supabase (이미지 스토리지)</h4>
                  <Input label="Project URL" placeholder="https://xxx.supabase.co" />
                  <Input label="Service Role Key" type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." className="mt-3" />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2"><Zap className="w-5 h-5" /> Redis (작업 큐)</h4>
                  <Input label="Redis URL" placeholder="redis://localhost:6379 or rediss://user:pass@host:port" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2"><Shield className="w-5 h-5" /> Sentry (에러 추적)</h4>
                  <Input label="DSN" placeholder="https://xxx@o1.ingest.sentry.io/xxx" />
                  <Input label="Environment" placeholder="production" className="mt-3" />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2"><Bell className="w-5 h-5" /> Slack 알림</h4>
                  <Input label="Webhook URL" placeholder="https://hooks.slack.com/services/xxx/xxx/xxx" />
                  <Input label="채널" placeholder="#alerts" className="mt-3" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => handleSave('연동')} loading={isSaving}><Save className="w-4 h-4 mr-1" /> 저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}