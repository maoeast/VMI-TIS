#!/usr/bin/env node
/**
 * Task 3 验收脚本：R2 连续 3 题 0 分中止、L0–L5 自动分级、评估记录分组、报告生成。
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const seed = require('@vmi-tis/shared-types');

const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';
const ORIGIN = BASE.replace(/\/api\/?$/, '');
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    failures.push(`${name}: ${detail}`);
    console.error(`✗ ${name}: ${detail}`);
  }
}

async function call(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

const JSON_HEADERS = { 'content-type': 'application/json' };

function monthsBetween(birthDate, now = new Date()) {
  let months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());
  if (now.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

async function submitScore(studentId, score) {
  return call('/assessments/scale-score', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      studentId,
      evalPhase: 'BASELINE',
      sessionId: 'verify-task3-session',
      score,
    }),
  });
}

async function createRecord(studentId, payload) {
  return call('/assessments/records', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      studentId,
      evalPhase: 'BASELINE',
      ...payload,
    }),
  });
}

async function main() {
  const students = await call('/students?pageSize=100');
  const lin = students.body.items.find(
    (item) => item.studentCode === 'VMI-2026001',
  );
  check('找到林小宇', Boolean(lin), 'VMI-2026001 不存在');

  const linDetail = await call(`/students/${lin.id}`);
  const ageMonths = monthsBetween(new Date(linDetail.body.birthDate));
  const ageYears = ageMonths / 12;

  const initialReset = await call('/assessments/scale-score', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      studentId: lin.id,
      evalPhase: 'BASELINE',
      sessionId: 'verify-task3-session',
      reset: true,
    }),
  });
  check(
    '初始 reset 清空会话',
    initialReset.body.submittedItems === 0,
    JSON.stringify(initialReset.body),
  );

  const first = await submitScore(lin.id, 0);
  const second = await submitScore(lin.id, 0);
  const third = await submitScore(lin.id, 0);
  check(
    '连续 3 题 0 分第 3 次返回 shouldTerminate=true',
    first.body.shouldTerminate === false &&
      second.body.shouldTerminate === false &&
      third.body.shouldTerminate === true,
    JSON.stringify({
      first: first.body.shouldTerminate,
      second: second.body.shouldTerminate,
      third: third.body.shouldTerminate,
    }),
  );
  check(
    '中止提示包含连续 3 题 0 分',
    typeof third.body.message === 'string' &&
      third.body.message.includes('连续 3 题'),
    `message=${third.body.message}`,
  );
  check(
    '中止响应带 consecutiveZeroCount=3',
    third.body.consecutiveZeroCount === 3,
    `consecutiveZeroCount=${third.body.consecutiveZeroCount}`,
  );
  check(
    '中止响应带 ceilingItemIndex=3',
    third.body.ceilingItemIndex === 3,
    `ceilingItemIndex=${third.body.ceilingItemIndex}`,
  );
  check(
    '中止响应带 totalRawScore=0',
    third.body.totalRawScore === 0,
    `totalRawScore=${third.body.totalRawScore}`,
  );

  const afterTerminate = await submitScore(lin.id, 0);
  check(
    '中止后继续提交被拒绝且保留累计进度',
    afterTerminate.body.shouldTerminate === true &&
      afterTerminate.body.submittedItems === 3 &&
      afterTerminate.body.totalRawScore === 0,
    JSON.stringify({
      shouldTerminate: afterTerminate.body.shouldTerminate,
      submittedItems: afterTerminate.body.submittedItems,
      totalRawScore: afterTerminate.body.totalRawScore,
    }),
  );

  const reset = await call('/assessments/scale-score', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      studentId: lin.id,
      evalPhase: 'BASELINE',
      sessionId: 'verify-task3-session',
      reset: true,
    }),
  });
  check('reset=true 返回已重置', reset.body.submittedItems === 0, JSON.stringify(reset.body));

  const afterReset = await submitScore(lin.id, 0);
  check(
    'reset 后可重新开始计分',
    afterReset.body.shouldTerminate === false &&
      afterReset.body.submittedItems === 1,
    JSON.stringify(afterReset.body),
  );
  await call('/assessments/scale-score', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      studentId: lin.id,
      evalPhase: 'BASELINE',
      sessionId: 'verify-task3-session',
      reset: true,
    }),
  });

  const l1 = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 12,
    beeryVmiStd: 85,
    tvps4Std: 85,
  });
  check(
    'NPC=12cm → L1',
    l1.status === 201 && l1.body.autoLevel === 'L1',
    `status=${l1.status}, level=${l1.body?.autoLevel}`,
  );

  const l2 = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 75,
    beeryVmiStd: 85,
  });
  check(
    'TVPS-4=75 且 Beery VMI=85 → L2',
    l2.status === 201 && l2.body.autoLevel === 'L2',
    `status=${l2.status}, level=${l2.body?.autoLevel}`,
  );

  const l3 = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 85,
    beeryVmiStd: 70,
  });
  check(
    'Beery VMI=70 → L3',
    l3.status === 201 && l3.body.autoLevel === 'L3',
    `status=${l3.status}, level=${l3.body?.autoLevel}`,
  );

  const l0 = await createRecord(lin.id, {
    stabilityPass: false,
    npcCm: 7,
    tvps4Std: 85,
    beeryVmiStd: 85,
  });
  check(
    '身体稳定不达标 → L0',
    l0.status === 201 && l0.body.autoLevel === 'L0',
    `status=${l0.status}, level=${l0.body?.autoLevel}`,
  );

  const l4 = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 85,
    beeryVmiStd: 85,
    classroomAdaptationPass: false,
  });
  check(
    '课堂应用不足 → L4',
    l4.status === 201 && l4.body.autoLevel === 'L4',
    `status=${l4.status}, level=${l4.body?.autoLevel}`,
  );

  const l4Missing = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    beeryVmiStd: 85,
    classroomAdaptationPass: false,
  });
  check(
    '课堂应用不足且缺 TVPS → L4（缺失指标按达标处理）',
    l4Missing.status === 201 && l4Missing.body.autoLevel === 'L4',
    `status=${l4Missing.status}, level=${l4Missing.body?.autoLevel}`,
  );

  const l4Beery = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 95,
    beeryVmiStd: 85,
    classroomAdaptationPass: true,
  });
  check(
    'Beery VMI=85（种子阈值 <90）→ L4',
    l4Beery.status === 201 && l4Beery.body.autoLevel === 'L4',
    `status=${l4Beery.status}, level=${l4Beery.body?.autoLevel}`,
  );

  const quadruped3 = await createRecord(lin.id, {
    stabilityPass: true,
    quadrupedHoldSec: 3,
    npcCm: 7,
    tvps4Std: 95,
    beeryVmiStd: 95,
    classroomAdaptationPass: true,
  });
  check(
    'quadrupedHoldSec=3 + stabilityPass=true → L0（不忽略真实低分）',
    quadruped3.status === 201 && quadruped3.body.autoLevel === 'L0',
    `status=${quadruped3.status}, level=${quadruped3.body?.autoLevel}`,
  );

  const beeryExpected = seed.calculateBeeryVmiNorms(12, ageMonths, 'vmiMain');
  const beeryRaw = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 95,
    beeryVmiRaw: 12,
    classroomAdaptationPass: true,
  });
  check(
    `Beery 原始分 12 → 标准分 ${beeryExpected.standardScore}`,
    beeryRaw.status === 201 &&
      beeryRaw.body.beeryVmiStd === beeryExpected.standardScore,
    `status=${beeryRaw.status}, std=${beeryRaw.body?.beeryVmiStd}, expected=${beeryExpected.standardScore}`,
  );
  const beeryMeta = JSON.parse(beeryRaw.body.assessmentMetaJson);
  check(
    'meta.raw 保存 Beery 原始分',
    beeryMeta.raw?.beeryVmiRaw === 12,
    JSON.stringify(beeryMeta.raw),
  );

  const tvpsRawInput = {
    DIS: 14,
    MEM: 12,
    SPA: 13,
    CON: 11,
    SEQ: 12,
    FGR: 13,
    CLO: 12,
  };
  const tvpsExpected = seed.calculateTvps4ProfileNorms(tvpsRawInput, ageYears);
  const tvpsRaw = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    beeryVmiStd: 95,
    tvps4RawScores: tvpsRawInput,
    classroomAdaptationPass: true,
  });
  check(
    `TVPS-4 七项原始分 → 综合标准分 ${tvpsExpected.overallStandardScore}`,
    tvpsRaw.status === 201 &&
      tvpsRaw.body.tvps4Std === tvpsExpected.overallStandardScore,
    `status=${tvpsRaw.status}, std=${tvpsRaw.body?.tvps4Std}, expected=${tvpsExpected.overallStandardScore}`,
  );
  const tvpsMeta = JSON.parse(tvpsRaw.body.assessmentMetaJson);
  check(
    'meta.raw 保存 TVPS-4 七项原始分',
    tvpsMeta.raw?.tvps4RawScores?.DIS === 14 &&
      tvpsMeta.raw?.tvps4RawScores?.CLO === 12,
    JSON.stringify(tvpsMeta.raw),
  );

  const demRawInput = {
    testAVerticalSec: 30,
    testBVerticalSec: 32,
    testCHorizontalRawSec: 60,
    omissionErrors: 0,
    additionErrors: 0,
  };
  const demExpected = seed.evaluateDemTestResult({
    ageYears,
    ...demRawInput,
  });
  const demRaw = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    beeryVmiStd: 95,
    tvps4Std: 95,
    demRaw: demRawInput,
    classroomAdaptationPass: true,
  });
  check(
    `DEM 原始输入 → ${demExpected.behaviorType}`,
    demRaw.status === 201 && demRaw.body.demNormTier === demExpected.behaviorType,
    `status=${demRaw.status}, tier=${demRaw.body?.demNormTier}, expected=${demExpected.behaviorType}`,
  );
  const demMeta = JSON.parse(demRaw.body.assessmentMetaJson);
  check(
    'meta.raw 保存 DEM 原始输入',
    demMeta.raw?.demRaw?.testAVerticalSec === 30 &&
      demMeta.raw?.demRaw?.omissionErrors === 0,
    JSON.stringify(demMeta.raw),
  );

  const mvptOnly = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    beeryVmiStd: 95,
    mvpt3Std: 75,
    classroomAdaptationPass: true,
  });
  check(
    '仅 MVPT-3=75 时 tvps4Std 保持为空',
    mvptOnly.status === 201 &&
      mvptOnly.body.tvps4Std === null &&
      mvptOnly.body.mvpt3Std === 75,
    `status=${mvptOnly.status}, tvps4Std=${mvptOnly.body?.tvps4Std}, mvpt3Std=${mvptOnly.body?.mvpt3Std}`,
  );
  check(
    'MVPT-3 兜底参与定级 → L2',
    mvptOnly.body.autoLevel === 'L2',
    `level=${mvptOnly.body?.autoLevel}`,
  );

  const l5 = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 95,
    beeryVmiStd: 95,
    classroomAdaptationPass: true,
    radarScores: {
      stabilize: 88,
      efficiency: 85,
      perception: 82,
      integration: 80,
      adaptation: 78,
      transfer: 75,
    },
  });
  check(
    '全部达标 → L5',
    l5.status === 201 && l5.body.autoLevel === 'L5',
    `status=${l5.status}, level=${l5.body?.autoLevel}`,
  );
  const l5Meta = JSON.parse(l5.body.assessmentMetaJson);
  check(
    'L5 记录写入 assessmentMetaJson.grading',
    l5Meta.grading?.recommendedLevel === 'L5' &&
      l5Meta.grading?.recommendedSopCardCodes?.length > 0,
    JSON.stringify(l5Meta.grading),
  );

  const l5Radar = JSON.parse(l5.body.radarScoresJson);
  check(
    '人工雷达分数优先落库',
    l5Radar.stabilize === 88,
    JSON.stringify(l5Radar),
  );
  const studentAfter = await call(`/students/${lin.id}`);
  check(
    '自动定级回写学生 currentLevel',
    studentAfter.body.currentLevel === 'L5',
    `currentLevel=${studentAfter.body.currentLevel}`,
  );

  const zhang = students.body.items.find(
    (item) => item.studentCode === 'VMI-2026003',
  );
  const redRecord = await createRecord(zhang.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 95,
    beeryVmiStd: 95,
    classroomAdaptationPass: true,
  });
  const redMeta = JSON.parse(redRecord.body.assessmentMetaJson);
  check(
    '红区学生评估记录定级 L0 且 meta 标记 RED_ZONE_LOCKED',
    redRecord.status === 201 &&
      redRecord.body.autoLevel === 'L0' &&
      redMeta.grading?.triageStatus === 'RED_ZONE_LOCKED',
    `status=${redRecord.status}, level=${redRecord.body?.autoLevel}, triage=${redMeta.grading?.triageStatus}`,
  );
  const zhangAfter = await call(`/students/${zhang.id}`);
  check(
    '评估服务不改学生 triageStatus（R1 仍归 TriageService）',
    zhangAfter.body.triageStatus === 'RED_ZONE_LOCKED',
    `triageStatus=${zhangAfter.body.triageStatus}`,
  );

  const records = await call(`/assessments/${lin.id}/records`);
  check(
    '评估记录按 evalPhase 分组返回',
    records.status === 200 &&
      records.body.total === 13 &&
      records.body.groups.BASELINE.length === 13,
    `status=${records.status}, total=${records.body?.total}`,
  );

  // ===== b2 评估中心 5 步向导数据链：阶段透传、R2 阶段隔离、原始分确认 =====
  const scaleCall = (studentId, evalPhase, sessionId, extra = {}) =>
    call('/assessments/scale-score', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ studentId, evalPhase, sessionId, ...extra }),
    });

  // R2 会话键 = studentId:evalPhase:sessionId：同一学生、同一 sessionId、两个阶段互不影响。
  const phaseSession = 'verify-task3-phase-isolation';
  await scaleCall(lin.id, 'BASELINE', phaseSession, { reset: true });
  await scaleCall(lin.id, 'STAGE_8W', phaseSession, { reset: true });
  const baselinePhaseOne = await scaleCall(lin.id, 'BASELINE', phaseSession, {
    score: 1,
  });
  const baselinePhaseTwo = await scaleCall(lin.id, 'BASELINE', phaseSession, {
    score: 1,
  });
  const stagePhaseOne = await scaleCall(lin.id, 'STAGE_8W', phaseSession, {
    score: 0,
  });
  check(
    'R2 阶段隔离：BASELINE 累计 2 分时 STAGE_8W 仍从 0 开始',
    baselinePhaseOne.body.totalRawScore === 1 &&
      baselinePhaseTwo.body.totalRawScore === 2 &&
      baselinePhaseTwo.body.submittedItems === 2 &&
      stagePhaseOne.body.totalRawScore === 0 &&
      stagePhaseOne.body.submittedItems === 1 &&
      stagePhaseOne.body.shouldTerminate === false,
    JSON.stringify({
      baseline: baselinePhaseTwo.body,
      stage: stagePhaseOne.body,
    }),
  );

  const stagePhaseZeroTwo = await scaleCall(
    lin.id,
    'STAGE_8W',
    phaseSession,
    { score: 0 },
  );
  const stagePhaseZeroThree = await scaleCall(
    lin.id,
    'STAGE_8W',
    phaseSession,
    { score: 0 },
  );
  check(
    'STAGE_8W Beery 主测验连续 3 题 0 分触发 R2 中止',
    stagePhaseZeroTwo.body.shouldTerminate === false &&
      stagePhaseZeroThree.body.shouldTerminate === true &&
      stagePhaseZeroThree.body.consecutiveZeroCount === 3 &&
      stagePhaseZeroThree.body.totalRawScore === 0,
    JSON.stringify({
      second: stagePhaseZeroTwo.body,
      third: stagePhaseZeroThree.body,
    }),
  );

  const stagePhaseReset = await scaleCall(lin.id, 'STAGE_8W', phaseSession, {
    reset: true,
  });
  const stagePhaseAfterReset = await scaleCall(
    lin.id,
    'STAGE_8W',
    phaseSession,
    { score: 1 },
  );
  const baselineAfterStageReset = await scaleCall(
    lin.id,
    'BASELINE',
    phaseSession,
    { score: 1 },
  );
  check(
    'STAGE_8W reset 只清本阶段，BASELINE 累计分保留',
    stagePhaseReset.body.submittedItems === 0 &&
      stagePhaseAfterReset.body.submittedItems === 1 &&
      stagePhaseAfterReset.body.totalRawScore === 1 &&
      baselineAfterStageReset.body.submittedItems === 3 &&
      baselineAfterStageReset.body.totalRawScore === 3,
    JSON.stringify({
      reset: stagePhaseReset.body,
      stage: stagePhaseAfterReset.body,
      baseline: baselineAfterStageReset.body,
    }),
  );

  // “确认原始分”链路：R2 totalRawScore → recordForm.beeryVmiRaw → 记录原始分与标准分。
  const beeryConfirmSession = 'verify-task3-beery-confirm';
  await scaleCall(lin.id, 'STAGE_8W', beeryConfirmSession, { reset: true });
  let beeryScoreResult = null;
  for (let index = 0; index < 12; index += 1) {
    beeryScoreResult = await scaleCall(
      lin.id,
      'STAGE_8W',
      beeryConfirmSession,
      { score: 1 },
    );
  }
  check(
    'Beery 主测验逐题判分累计原始分 12',
    beeryScoreResult.body.totalRawScore === 12 &&
      beeryScoreResult.body.submittedItems === 12 &&
      beeryScoreResult.body.shouldTerminate === false,
    JSON.stringify(beeryScoreResult.body),
  );

  const stageRecord = await createRecord(lin.id, {
    evalPhase: 'STAGE_8W',
    stabilityPass: true,
    npcCm: 7,
    beeryVmiRaw: beeryScoreResult.body.totalRawScore,
    tvps4RawScores: tvpsRawInput,
    demRaw: demRawInput,
    classroomAdaptationPass: true,
  });
  const stageMeta = JSON.parse(stageRecord.body.assessmentMetaJson);
  check(
    'STAGE_8W 记录落盘 evalPhase 与确认后的 Beery 原始分',
    stageRecord.status === 201 &&
      stageRecord.body.evalPhase === 'STAGE_8W' &&
      stageRecord.body.beeryVmiRaw === 12 &&
      stageRecord.body.beeryVmiStd === beeryExpected.standardScore &&
      stageMeta.raw?.beeryVmiRaw === 12,
    JSON.stringify({
      status: stageRecord.status,
      phase: stageRecord.body?.evalPhase,
      raw: stageRecord.body?.beeryVmiRaw,
      std: stageRecord.body?.beeryVmiStd,
      expectedStd: beeryExpected.standardScore,
      metaRaw: stageMeta.raw,
    }),
  );
  check(
    'STAGE_8W 记录保存 TVPS-4 七项与 DEM 原始输入',
    stageMeta.raw?.tvps4RawScores?.DIS === tvpsRawInput.DIS &&
      stageMeta.raw?.tvps4RawScores?.CLO === tvpsRawInput.CLO &&
      stageMeta.raw?.demRaw?.testAVerticalSec === demRawInput.testAVerticalSec &&
      stageMeta.raw?.demRaw?.omissionErrors === demRawInput.omissionErrors &&
      stageRecord.body.tvps4Std === tvpsExpected.overallStandardScore &&
      stageRecord.body.demNormTier === demExpected.behaviorType,
    JSON.stringify({
      tvps4Std: stageRecord.body?.tvps4Std,
      expectedTvps: tvpsExpected.overallStandardScore,
      demTier: stageRecord.body?.demNormTier,
      expectedDem: demExpected.behaviorType,
    }),
  );

  const recordsAfterStage = await call(`/assessments/${lin.id}/records`);
  check(
    '评估记录按阶段分组：BASELINE 13 条 + STAGE_8W 1 条',
    recordsAfterStage.status === 200 &&
      recordsAfterStage.body.total === 14 &&
      recordsAfterStage.body.groups.BASELINE.length === 13 &&
      recordsAfterStage.body.groups.STAGE_8W.length === 1 &&
      recordsAfterStage.body.groups.STAGE_8W[0].evalPhase === 'STAGE_8W',
    JSON.stringify({
      total: recordsAfterStage.body?.total,
      baseline: recordsAfterStage.body?.groups?.BASELINE?.length,
      stage: recordsAfterStage.body?.groups?.STAGE_8W?.length,
    }),
  );

  const stageFiltered = await call(
    `/assessments/${lin.id}/records?evalPhase=STAGE_8W`,
  );
  check(
    '按 evalPhase 过滤只返回 STAGE_8W 记录',
    stageFiltered.status === 200 &&
      stageFiltered.body.total === 1 &&
      stageFiltered.body.records.every(
        (item) => item.evalPhase === 'STAGE_8W',
      ),
    JSON.stringify({
      total: stageFiltered.body?.total,
      phases: stageFiltered.body?.records?.map((item) => item.evalPhase),
    }),
  );

  const stageReport = await call(
    `/assessments/${stageRecord.body.id}/generate-report`,
    { method: 'POST' },
  );
  const stageReportPage = await fetch(
    `${ORIGIN}${stageReport.body.reportFileUrl}`,
  );
  const stageReportHtml = await stageReportPage.text();
  check(
    'STAGE_8W HTML 报告可访问且标注评估阶段',
    stageReport.status === 201 &&
      stageReport.body.format === 'html' &&
      stageReportPage.status === 200 &&
      stageReportHtml.includes('STAGE_8W') &&
      stageReportHtml.includes(linDetail.body.name),
    JSON.stringify({
      status: stageReport.status,
      format: stageReport.body?.format,
      page: stageReportPage.status,
    }),
  );

  // 清理本段使用的 R2 会话，避免影响后续用例。
  await scaleCall(lin.id, 'BASELINE', phaseSession, { reset: true });
  await scaleCall(lin.id, 'STAGE_8W', phaseSession, { reset: true });
  await scaleCall(lin.id, 'STAGE_8W', beeryConfirmSession, { reset: true });

  const report = await call(`/assessments/${l2.body.id}/generate-report`, {
    method: 'POST',
  });
  check(
    '生成报告返回 reportFileUrl',
    report.status === 201 &&
      typeof report.body.reportFileUrl === 'string' &&
      report.body.reportFileUrl.endsWith('.html'),
    JSON.stringify(report.body),
  );

  const reportPage = await fetch(`${ORIGIN}${report.body.reportFileUrl}`);
  const reportHtml = await reportPage.text();
  check(
    '报告页面可访问且包含学生姓名',
    reportPage.status === 200 && reportHtml.includes('林小宇'),
    `status=${reportPage.status}`,
  );
  check(
    '报告包含评估结论与临床瓶颈分析',
    reportHtml.includes('评估结论与训练处方') &&
      reportHtml.includes('临床瓶颈分析'),
    '报告缺少评估结论段落',
  );

  const audit = await call('/audit-logs?action=UPDATE_ASSESSMENT&pageSize=50');
  check(
    '评估记录写入 audit_logs',
    audit.status === 200 && audit.body.logs.length >= 6,
    `logs=${audit.body?.logs?.length}`,
  );

  if (failures.length > 0) {
    console.error(`\nTask 3 验收失败：${failures.length} 项`);
    process.exitCode = 1;
    return;
  }

  console.log('\nTask 3 ALL CHECKS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
