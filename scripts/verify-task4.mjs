#!/usr/bin/env node
/**
 * Task 4 验收脚本：IEP、课堂记分台、R3 晋级、R4 护眼硬锁、工作台/作业/分析接口。
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

function post(path, body) {
  return call(path, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body ?? {}),
  });
}

function patch(path, body) {
  return call(path, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(body ?? {}),
  });
}

async function recordTrials(sessionId, material, digital = false) {
  for (let index = 1; index <= 10; index += 1) {
    const result = await post(`/sessions/${sessionId}/trial`, {
      result: index === 10 ? 'fail' : 'pass',
      promptLevel: 1,
      material,
      ...(digital ? { isDigital: true, digitalSeconds: 0 } : {}),
    });
    if (result.status !== 201) {
      return result;
    }
  }
  return { status: 200, body: null };
}

async function main() {
  const students = await call('/students?pageSize=100');
  const target = students.body.items.find(
    (item) => item.studentCode === 'VMI-2026002',
  );
  check('找到陈果果', Boolean(target), 'VMI-2026002 不存在');
  if (!target) {
    process.exitCode = 1;
    return;
  }

  const existingSessions = await call(`/sessions?studentId=${target.id}`);
  const existingHomework = await call(
    `/homework-checkins?studentId=${target.id}`,
  );
  const fresh =
    target.currentLevel === 'L1' &&
    target.promotionStatus === 'IN_PROGRESS' &&
    existingSessions.body.length === 0 &&
    existingHomework.body.length === 0;
  check(
    '测试库为全新状态（陈果果 L1/训练中/无课次/无作业）',
    fresh,
    JSON.stringify({
      level: target.currentLevel,
      promotion: target.promotionStatus,
      sessions: existingSessions.body?.length,
      homework: existingHomework.body?.length,
    }),
  );
  if (!fresh) {
    console.error(
      'Task 4 需要全新测试库；请重建 SQLite 并重新 seed 后运行。',
    );
    process.exitCode = 1;
    return;
  }

  const cards = await call('/sop-cards?level=L1');
  check(
    'L1 操作卡数量为 3',
    cards.status === 200 && cards.body.length === 3,
    `status=${cards.status}, count=${cards.body?.length}`,
  );
  const cardA = cards.body[0];
  const cardB = cards.body[1];

  const l4Student = students.body.items.find(
    (item) =>
      item.currentLevel === 'L4' && item.triageStatus === 'GREEN_ACTIVE',
  );
  if (l4Student) {
    const l4Session = await post('/sessions', { studentId: l4Student.id });
    check(
      'L4 学生无专属卡时回退到 L3',
      l4Session.status === 201 && l4Session.body.sopCard?.cardLevel === 'L3',
      JSON.stringify({
        status: l4Session.status,
        cardLevel: l4Session.body?.sopCard?.cardLevel,
      }),
    );
  }

  const iep = await post('/iep-plans', {
    studentId: target.id,
    targetLevel: 'L2',
    weeklyFrequency: 3,
    sessionMinutes: 35,
    digitalLimitMin: 15,
    selectedCards: [cardA.cardCode, cardB.cardCode],
    weeklySchedule: { Mon: ['09:00'], Wed: ['14:00'], Fri: ['09:00'] },
    homeworkFrequency: 5,
  });
  check('创建 IEP 返回 201', iep.status === 201, `status=${iep.status}`);
  check(
    'IEP selectedCardsJson 为 JSON 字符串',
    typeof iep.body.selectedCardsJson === 'string' &&
      JSON.parse(iep.body.selectedCardsJson).length === 2,
    `selectedCardsJson=${iep.body?.selectedCardsJson}`,
  );

  const homework = await post('/homework-checkins', {
    studentId: target.id,
    taskName: '找袜子（家庭泛化）',
    durationMin: 10,
  });
  check('创建家庭作业返回 201', homework.status === 201, `status=${homework.status}`);

  const videoForm = new FormData();
  videoForm.append(
    'file',
    new Blob(['fake mp4'], { type: 'video/mp4' }),
    'checkin.mp4',
  );
  const videoUpload = await call(
    `/homework-checkins/${homework.body.id}/video`,
    { method: 'POST', body: videoForm },
  );
  check(
    '家长视频上传返回 /api/uploads URL',
    videoUpload.status === 201 &&
      typeof videoUpload.body.videoUrl === 'string' &&
      videoUpload.body.videoUrl.startsWith('/api/uploads/'),
    JSON.stringify(videoUpload),
  );

  const checkin = await post(`/homework-checkins/${homework.body.id}/checkin`, {
    videoUrl: videoUpload.body.videoUrl ?? '/uploads/demo-checkin.mp4',
    videoDurationSec: 42,
    parentNote: '今天独立完成了找袜子任务',
  });
  check('家长打卡返回 COMPLETED', checkin.body.status === 'COMPLETED', JSON.stringify(checkin.body));

  const sessionA = await post('/sessions', {
    studentId: target.id,
    sopCardId: cardA.id,
  });
  const sessionB = await post('/sessions', {
    studentId: target.id,
    sopCardId: cardB.id,
  });
  const sessionC = await post('/sessions', {
    studentId: target.id,
    sopCardId: cardA.id,
  });
  check(
    '创建 3 次课堂训练',
    sessionA.status === 201 && sessionB.status === 201 && sessionC.status === 201,
    JSON.stringify({
      a: sessionA.status,
      b: sessionB.status,
      c: sessionC.status,
    }),
  );

  await recordTrials(sessionA.body.id, '材料A');
  await recordTrials(sessionB.body.id, '材料B');
  await recordTrials(sessionC.body.id, '材料A');

  const finishA = await post(`/sessions/${sessionA.body.id}/finish`, {});
  const finishB = await post(`/sessions/${sessionB.body.id}/finish`, {});
  const finishC = await post(`/sessions/${sessionC.body.id}/finish`, {});
  check(
    '三次课正确率均为 0.9',
    finishA.body.session.accuracyRate === 0.9 &&
      finishB.body.session.accuracyRate === 0.9 &&
      finishC.body.session.accuracyRate === 0.9,
    JSON.stringify({
      a: finishA.body?.session?.accuracyRate,
      b: finishB.body?.session?.accuracyRate,
      c: finishC.body?.session?.accuracyRate,
    }),
  );
  check(
    '第 3 次结课触发 PROMOTION_READY',
    finishC.body.promotion?.canPromote === true,
    JSON.stringify(finishC.body?.promotion),
  );

  const promotion = await call(`/promotions/${target.id}/check`);
  check(
    '晋级检查返回 canPromote=true + 2 种材料 + 1 次打卡',
    promotion.body.canPromote === true &&
      promotion.body.materialCount === 2 &&
      promotion.body.homeCheckinCount === 1,
    JSON.stringify(promotion.body),
  );

  const studentBefore = await call(`/students/${target.id}`);
  check(
    '学生 promotionStatus=PROMOTION_READY',
    studentBefore.body.promotionStatus === 'PROMOTION_READY',
    `promotionStatus=${studentBefore.body.promotionStatus}`,
  );

  const approved = await post(`/promotions/${target.id}/approve`, {
    approvedBy: '周敏 (OT)',
  });
  check(
    '晋级审批后 L1 → L2 且回到 IN_PROGRESS',
    approved.body.currentLevel === 'L2' &&
      approved.body.promotionStatus === 'IN_PROGRESS',
    JSON.stringify(approved.body),
  );

  const recheck = await call(`/promotions/${target.id}/check`);
  check(
    '审批后同一批课次不能再次晋级',
    recheck.body.canPromote === false,
    JSON.stringify(recheck.body),
  );

  const digitalSession = await post('/sessions', {
    studentId: target.id,
    sopCardId: cardA.id,
  });
  const digitalTrial = await post(`/sessions/${digitalSession.body.id}/trial`, {
    result: 'pass',
    promptLevel: 1,
    material: '数字游戏',
    isDigital: true,
    digitalSeconds: 900,
  });
  check(
    '数字训练累计 900 秒后剩余额度为 0',
    digitalTrial.status === 201 &&
      digitalTrial.body.remainingQuotaSec === 0,
    JSON.stringify({
      status: digitalTrial.status,
      remaining: digitalTrial.body?.remainingQuotaSec,
    }),
  );

  const blockedTrial = await post(`/sessions/${digitalSession.body.id}/trial`, {
    result: 'pass',
    promptLevel: 1,
    isDigital: true,
  });
  check(
    '超额后数字 Trial 返回 403 + remainingQuotaSec=0',
    blockedTrial.status === 403 && blockedTrial.body.remainingQuotaSec === 0,
    JSON.stringify({ status: blockedTrial.status, body: blockedTrial.body }),
  );

  const blockedStart = await post(
    `/sessions/${digitalSession.body.id}/digital-start`,
    {},
  );
  check(
    '超额后 digital-start 被护眼守卫拦截',
    blockedStart.status === 403,
    `status=${blockedStart.status}`,
  );

  const edgeSession = await post('/sessions', {
    studentId: target.id,
    sopCardId: cardA.id,
  });
  const edge899 = await post(`/sessions/${edgeSession.body.id}/trial`, {
    result: 'pass',
    promptLevel: 1,
    isDigital: true,
    digitalSeconds: 899,
  });
  check(
    '899 秒数字 Trial 允许',
    edge899.status === 201 && edge899.body.digitalDurationSec === 899,
    JSON.stringify({ status: edge899.status, body: edge899.body }),
  );
  const edge901 = await post(`/sessions/${edgeSession.body.id}/trial`, {
    result: 'pass',
    promptLevel: 1,
    isDigital: true,
    digitalSeconds: 2,
  });
  check(
    '899 秒后再加 2 秒被 403 拦截',
    edge901.status === 403,
    JSON.stringify({ status: edge901.status, body: edge901.body }),
  );
  const edgeAfter = await call(`/sessions/${edgeSession.body.id}`);
  check(
    '899+2 被拦截后累计仍为 899 秒',
    edgeAfter.body.digitalDurationSec === 899,
    `digitalDurationSec=${edgeAfter.body.digitalDurationSec}`,
  );

  const badReset = await post(
    `/sessions/${digitalSession.body.id}/digital-reset`,
    { authorizationCode: '0000' },
  );
  check(
    '错误教师授权码不能重置额度',
    badReset.status === 403,
    `status=${badReset.status}`,
  );

  const goodReset = await post(
    `/sessions/${digitalSession.body.id}/digital-reset`,
    { authorizationCode: '0808' },
  );
  check(
    '教师授权码可重置额度为 900 秒',
    goodReset.status === 201 && goodReset.body.remainingQuotaSec === 900,
    JSON.stringify({ status: goodReset.status, body: goodReset.body }),
  );

  const stage = await patch(`/sessions/${digitalSession.body.id}/stage`, {
    stage: 4,
  });
  check(
    '五段式环节切换到 Stage 4',
    stage.status === 200 && stage.body.currentStage === 4,
    JSON.stringify({ status: stage.status, stage: stage.body?.currentStage }),
  );

  const workbench = await call('/workbench/summary');
  check(
    '工作台汇总返回结构完整',
    workbench.status === 200 &&
      typeof workbench.body.activeStudentsCount === 'number' &&
      typeof workbench.body.levelDistribution?.L0 === 'number',
    JSON.stringify(workbench.body).slice(0, 200),
  );

  const overview = await call('/analytics/overview');
  check(
    '分析总览返回学生数与最近课次',
    overview.status === 200 &&
      overview.body.totalStudents === 6 &&
      overview.body.recentSessions.length >= 3,
    JSON.stringify({ total: overview.body?.totalStudents, recent: overview.body?.recentSessions?.length }),
  );

  const studentAnalytics = await call(`/analytics/student/${target.id}`);
  check(
    '学生分析返回 3 次课趋势与定级历史',
    studentAnalytics.status === 200 &&
      studentAnalytics.body.accuracyTrend.length === 3 &&
      studentAnalytics.body.levelHistory.length >= 0,
    JSON.stringify({
      trend: studentAnalytics.body?.accuracyTrend?.length,
      levels: studentAnalytics.body?.levelHistory?.length,
    }),
  );

  const replied = await post(`/homework-checkins/${homework.body.id}/reply`, {
    teacherReply: '完成得很好，继续巩固。',
  });
  check(
    '教师点评写入 teacherReply',
    replied.body.teacherReply?.includes('完成得很好'),
    JSON.stringify(replied.body),
  );

  const message = await post(
    `/homework-checkins/${homework.body.id}/parent-message`,
    { message: '今天孩子主动说想再练一次。' },
  );
  check(
    '家长留言写入 parentNote',
    message.body.parentNote?.includes('再练一次'),
    JSON.stringify(message.body),
  );

  const clean = await post('/homework-checkins/clean-expired-videos', {});
  check(
    '过期视频清理接口可执行',
    clean.status === 201 && typeof clean.body.scanned === 'number',
    JSON.stringify(clean.body),
  );

  const audit = await call('/audit-logs?pageSize=200');
  const actions = new Set((audit.body.logs ?? []).map((log) => log.action));
  for (const action of [
    'CREATE_IEP',
    'CREATE_SESSION',
    'FINISH_SESSION',
    'UPDATE_STAGE',
    'RECORD_TRIAL',
    'APPROVE_PROMOTION',
    'CREATE_HOMEWORK',
    'SUBMIT_CHECKIN',
    'REPLY_CHECKIN',
  ]) {
    check(
      `审计日志包含 ${action}`,
      actions.has(action),
      `actions=${[...actions].join(',')}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\nTask 4 验收失败：${failures.length} 项`);
    process.exitCode = 1;
    return;
  }

  console.log('\nTask 4 ALL CHECKS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
