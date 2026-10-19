/**
 * Task 1 Seed 验收脚本（只读，不修改数据）。
 *
 * 校验项：
 * 1. sop_cards = 13，students = 6，编码集合与契约一致。
 * 2. 操作卡的 JSON 字段可解析且类型正确。
 * 3. 学生层级/分流状态/晋级状态均在枚举范围内。
 * 4. 关键演示状态正确：张梓轩 RED_ZONE_LOCKED；林小宇、刘诺一 PROMOTION_READY。
 *
 * 执行：npm run db:verify
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '../config/database.config';

loadEnv({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: { url: getDatabaseUrl() },
  },
});

const EXPECTED_CARD_CODES = [
  'M1-1-1',
  'M1-1-2',
  'M1-1-3',
  'M2-2-1',
  'M2-2-2',
  'M2-2-3',
  'M3-3-1',
  'M3-3-2',
  'M3-3-3',
  'M4-4-1',
  'M4-4-2',
  'M4-4-3',
  'M5-5-1',
];

const EXPECTED_STUDENT_CODES = [
  'VMI-2026001',
  'VMI-2026002',
  'VMI-2026003',
  'VMI-2026004',
  'VMI-2026005',
  'VMI-2026006',
];

const VALID_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const VALID_TRIAGE_STATUS = [
  'PENDING_SCREENING',
  'RED_ZONE_LOCKED',
  'REFERRAL_UPLOADED',
  'GREEN_ACTIVE',
];
const VALID_PROMOTION_STATUS = ['IN_PROGRESS', 'PROMOTION_READY'];
const VALID_GAME_MODES = ['bubble', 'brock', 'star'];

function parseJson(label: string, value: string | null, failures: string[]): unknown {
  if (value === null || value.trim().length === 0) {
    failures.push(`${label}: 为空`);
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${label}: 不是合法 JSON（${message}）`);
    return null;
  }
}

function checkCodeSet(
  label: string,
  actual: string[],
  expected: string[],
  failures: string[],
): void {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  const missing = expectedSorted.filter((code) => !actualSorted.includes(code));
  const unexpected = actualSorted.filter((code) => !expectedSorted.includes(code));
  if (missing.length > 0) {
    failures.push(`${label}: 缺少编码 ${missing.join(', ')}`);
  }
  if (unexpected.length > 0) {
    failures.push(`${label}: 多出编码 ${unexpected.join(', ')}`);
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];

  const cards = await prisma.sopCard.findMany({ orderBy: { cardCode: 'asc' } });
  const students = await prisma.student.findMany({ orderBy: { studentCode: 'asc' } });

  if (cards.length !== EXPECTED_CARD_CODES.length) {
    failures.push(
      `sop_cards 数量: 期望 ${EXPECTED_CARD_CODES.length}，实际 ${cards.length}`,
    );
  }
  if (students.length !== EXPECTED_STUDENT_CODES.length) {
    failures.push(
      `students 数量: 期望 ${EXPECTED_STUDENT_CODES.length}，实际 ${students.length}`,
    );
  }

  checkCodeSet(
    'sop_cards',
    cards.map((card) => card.cardCode),
    EXPECTED_CARD_CODES,
    failures,
  );
  checkCodeSet(
    'students',
    students.map((student) => student.studentCode),
    EXPECTED_STUDENT_CODES,
    failures,
  );

  for (const card of cards) {
    const label = `SopCard ${card.cardCode}`;

    if (!VALID_LEVELS.includes(card.cardLevel)) {
      failures.push(`${label}: cardLevel 非法（${card.cardLevel}）`);
    }
    if (!card.moduleName.trim()) {
      failures.push(`${label}: moduleName 为空`);
    }
    if (!card.cardTitle.trim()) {
      failures.push(`${label}: cardTitle 为空`);
    }
    if (!card.targetSkill.trim()) {
      failures.push(`${label}: targetSkill 为空`);
    }
    if (!card.passCriteria.trim()) {
      failures.push(`${label}: passCriteria 为空`);
    }

    const materials = parseJson(`${label}.materialsJson`, card.materialsJson, failures);
    if (!Array.isArray(materials) || materials.length === 0) {
      failures.push(`${label}.materialsJson: 期望非空数组`);
    }

    const steps = parseJson(
      `${label}.procedureStepsJson`,
      card.procedureStepsJson,
      failures,
    );
    if (!Array.isArray(steps) || steps.length < 3) {
      failures.push(`${label}.procedureStepsJson: 期望至少 3 步的数组`);
    }

    const cues = parseJson(`${label}.cueTextJson`, card.cueTextJson, failures);
    if (!Array.isArray(cues) || cues.length === 0) {
      failures.push(`${label}.cueTextJson: 期望非空数组`);
    }

    const parentTask = parseJson(
      `${label}.parentTaskJson`,
      card.parentTaskJson,
      failures,
    );
    if (
      parentTask === null ||
      typeof parentTask !== 'object' ||
      Array.isArray(parentTask) ||
      !('taskName' in parentTask) ||
      !('instruction' in parentTask)
    ) {
      failures.push(`${label}.parentTaskJson: 期望包含 taskName/instruction 的对象`);
    }

    if (
      card.digitalGameMode !== null &&
      !VALID_GAME_MODES.includes(card.digitalGameMode)
    ) {
      failures.push(
        `${label}.digitalGameMode: 非法（${card.digitalGameMode}），期望 null/${VALID_GAME_MODES.join('/')}`,
      );
    }
  }

  for (const student of students) {
    const label = `Student ${student.studentCode}`;

    if (!VALID_LEVELS.includes(student.currentLevel)) {
      failures.push(`${label}: currentLevel 非法（${student.currentLevel}）`);
    }
    if (!VALID_TRIAGE_STATUS.includes(student.triageStatus)) {
      failures.push(`${label}: triageStatus 非法（${student.triageStatus}）`);
    }
    if (!VALID_PROMOTION_STATUS.includes(student.promotionStatus)) {
      failures.push(`${label}: promotionStatus 非法（${student.promotionStatus}）`);
    }
    if (!student.primaryTherapistId.trim()) {
      failures.push(`${label}: primaryTherapistId 为空`);
    }
    if (Number.isNaN(student.birthDate.getTime())) {
      failures.push(`${label}: birthDate 非法`);
    }
  }

  const zhangZixuan = students.find(
    (student) => student.studentCode === 'VMI-2026003',
  );
  if (zhangZixuan?.triageStatus !== 'RED_ZONE_LOCKED') {
    failures.push(
      `VMI-2026003 张梓轩: triageStatus 期望 RED_ZONE_LOCKED，实际 ${zhangZixuan?.triageStatus ?? '缺失'}`,
    );
  }

  for (const code of ['VMI-2026001', 'VMI-2026005']) {
    const student = students.find((item) => item.studentCode === code);
    if (student?.promotionStatus !== 'PROMOTION_READY') {
      failures.push(
        `${code}: promotionStatus 期望 PROMOTION_READY，实际 ${student?.promotionStatus ?? '缺失'}`,
      );
    }
  }

  console.log(`[verify] database = ${getDatabaseUrl()}`);
  console.log(`[verify] sop_cards = ${cards.length}（期望 13）`);
  console.log(`[verify] students = ${students.length}（期望 6）`);

  if (failures.length > 0) {
    console.error(`[verify] FAILED: ${failures.length} 项`);
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[verify] JSON 字段、枚举状态、关键演示状态全部通过');
  console.log('[verify] ALL CHECKS PASSED');
}

main()
  .catch((error) => {
    console.error('[verify] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
