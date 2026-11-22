'use client';

import { useEffect } from 'react';

// 공유 이미지·링크의 ?ref=<코드> 를 한 번만 서버에 기록한다.
//  · 방문만으로는 보상이 없다 — 초대받은 사람이 첫 미리보기 팩을 만들 때 초대한 사람이 3컷을 받는다.
//  · 이미 다른 초대 코드를 쓴 사용자는 서버가 무시한다 (첫 초대만 인정).
const STORAGE_KEY = 'emotime:invite:ref:v1';
const CLAIMED_KEY = 'emotime:invite:claimed:v1';
const CODE_PATTERN = /^[a-f0-9]{8}$/;

export function InviteCapture() {
  useEffect(() => {
    let code: string | null = null;
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref');
      if (fromUrl && CODE_PATTERN.test(fromUrl.toLowerCase())) {
        code = fromUrl.toLowerCase();
        localStorage.setItem(STORAGE_KEY, code);
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && CODE_PATTERN.test(saved)) code = saved;
      }
    } catch {
      return;
    }
    if (!code) return;
    let already = '';
    try { already = localStorage.getItem(CLAIMED_KEY) ?? ''; } catch { /* 저장소 없이도 1회 시도 */ }
    if (already === code) return;
    try { localStorage.setItem(CLAIMED_KEY, code); } catch { /* 무시 */ }
    void fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {
      // 실패하면 다음 방문에서 다시 시도한다.
      try { localStorage.removeItem(CLAIMED_KEY); } catch { /* 무시 */ }
    });
  }, []);
  return null;
}
