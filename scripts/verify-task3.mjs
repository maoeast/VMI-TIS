#!/usr/bin/env node
/**
 * Task 3 验收脚本：R2 连续 3 题 0 分中止、L0–L5 自动分级、评估记录分组、报告生成。
 */
const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';
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

  const afterReset = await submitScore(lin.id, 0);
  check(
    '中止后计数已清空，再次 0 分不立即中止',
    afterReset.body.shouldTerminate === false,
    `shouldTerminate=${afterReset.body.shouldTerminate}`,
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

  const l5 = await createRecord(lin.id, {
    stabilityPass: true,
    npcCm: 7,
    tvps4Std: 85,
    beeryVmiStd: 85,
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

  const studentAfter = await call(`/students/${lin.id}`);
  check(
    '自动定级回写学生 currentLevel',
    studentAfter.body.currentLevel === 'L5',
    `currentLevel=${studentAfter.body.currentLevel}`,
  );

  const records = await call(`/assessments/${lin.id}/records`);
  check(
    '评估记录按 evalPhase 分组返回',
    records.status === 200 &&
      records.body.total === 6 &&
      records.body.groups.BASELINE.length === 6,
    `status=${records.status}, total=${records.body?.total}`,
  );

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

  const reportPage = await fetch(
    `http://localhost:3000${report.body.reportFileUrl}`,
  );
  const reportHtml = await reportPage.text();
  check(
    '报告页面可访问且包含学生姓名',
    reportPage.status === 200 && reportHtml.includes('林小宇'),
    `status=${reportPage.status}`,
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
