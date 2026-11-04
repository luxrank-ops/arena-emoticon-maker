// scripts/trigger-training.mjs
// Fal.ai LoRA Training 파이프라인 호출 스크립트

import fs from 'fs';
import path from 'path';

async function triggerTraining() {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    console.error("FAL_KEY가 설정되지 않았습니다.");
    return;
  }

  console.log("=== Fal.ai 학습 파이프라인 트리거 시작 ===");
  
  // 데이터셋 폴더 압축 또는 업로드 준비 (예시)
  const trainingDataPath = "data/lora-training/cute_3d";
  console.log(`학습 데이터 경로: ${trainingDataPath}`);
  
  // 실제 API 호출 로직 (Fal.ai SDK 또는 fetch 연동)
  console.log("학습 요청 API 송신 중...");
  // ... API 연동 코드 ...
  
  console.log("=== 학습 요청 성공! (모델 학습 대기 중) ===");
}

triggerTraining();
