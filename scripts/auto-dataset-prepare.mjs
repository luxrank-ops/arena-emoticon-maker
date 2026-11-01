// scripts/auto-dataset-prepare.mjs
// 학습용 데이터셋 폴더 구조를 자동 생성하고 샘플 캡션을 매칭하는 스크립트입니다.

import fs from "fs";
import path from "path";

const targetDir = path.resolve("C:/Users/luxra/emoticon-maker-app/data/lora-training/cute_3d");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`[생성 완료] 디렉터리: ${targetDir}`);
}

// 샘플 캡션 및 설정 파일 생성
const datasetConfig = {
  style: "cute_3d",
  targetResolution: "1024x1024",
  triggerWord: "emotime_3d_style",
  createdAt: new Date().toISOString()
};

fs.writeFileSync(
  path.join(path.dirname(targetDir), "dataset_config.json"),
  JSON.stringify(datasetConfig, null, 2)
);

console.log("=== LoRA 학습 데이터셋 기본 폴더 및 설정 파일 준비 완료 ===");
console.log(`경로: ${targetDir}`);
