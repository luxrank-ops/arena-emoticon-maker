// scripts/auto-caption-generator.mjs
// 학습 데이터셋의 이미지를 분석하여 캡션을 생성하는 스크립트입니다.
// Gemini API 또는 오픈소스(Clip/BLIP) 기반 캡션 생성을 가정합니다.

import fs from "fs";
import path from "path";

const imagesDir = path.resolve("C:/Users/luxra/emoticon-maker-app/data/lora-training/cute_3d");
const files = fs.readdirSync(imagesDir);

console.log("=== 캡션 생성 시작 ===");

files.forEach(file => {
  if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
    const baseName = path.parse(file).name;
    const captionPath = path.join(imagesDir, `${baseName}.txt`);
    
    // 이모티콘 스타일 캡션 생성 (예시)
    const caption = "emotime_3d_style emoticon, cute character, high quality, white background";
    
    fs.writeFileSync(captionPath, caption);
    console.log(`[캡션 생성 완료] ${baseName}.txt`);
  }
});

console.log("=== 모든 이미지 캡션 매칭 완료 ===");
