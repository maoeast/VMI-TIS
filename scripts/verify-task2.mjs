#!/usr/bin/env node
/**
 * Task 2 验收脚本：学生档案 CRUD、筛选、Excel 导入、R1 红区熔断、审计日志。
 * 用法：先启动 API（可用测试库），再运行 node scripts/verify-task2.mjs
 */
const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';

const ACTOR_HEADERS = {
  'content-type': 'application/json',
  'x-user-id': 'therapist_zhou_min',
  'x-user-name': encodeURIComponent('周敏'),
  'x-user-role': 'OT',
};

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

async function main() {
  const health = await call('/health');
  check('GET /api/health 返回 200', health.status === 200, `status=${health.status}`);

  const initial = await call('/students?pageSize=100');
  check(
    '初始学生数为 6',
    initial.status === 200 && initial.body.total === 6,
    `total=${initial.body?.total}`,
  );

  const created = await call('/students', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({
      name: '测试新生',
      gender: '男',
      birthDate: '2019-05-01',
      schoolScene: '测试资源教室',
      primaryTherapistId: 'therapist_test',
      parentPhone: '13800000000',
      chiefComplaint: '运行验收脚本创建',
    }),
  });
  check('POST /api/students 返回 201', created.status === 201, `status=${created.status}`);
  check(
    '自动生成 VMI-2026xxx 学号',
    typeof created.body?.studentCode === 'string' &&
      /^VMI-2026\d{3}$/.test(created.body.studentCode),
    `studentCode=${created.body?.studentCode}`,
  );
  check(
    '默认层级 L0 / 待初筛 / 训练中',
    created.body?.currentLevel === 'L0' &&
      created.body?.triageStatus === 'PENDING_SCREENING' &&
      created.body?.promotionStatus === 'IN_PROGRESS',
    JSON.stringify({
      level: created.body?.currentLevel,
      triage: created.body?.triageStatus,
      promotion: created.body?.promotionStatus,
    }),
  );

  const createAudit = await call(
    `/audit-logs?action=CREATE_STUDENT&targetId=${created.body.id}`,
  );
  check(
    '创建学生自动写入 audit_logs',
    createAudit.status === 200 && createAudit.body.logs.length >= 1,
    `logs=${createAudit.body?.logs?.length}`,
  );

  const createLog = createAudit.body.logs?.[0];
  const createPayload =
    typeof createLog?.changesAfterJson === 'string'
      ? createLog.changesAfterJson
      : JSON.stringify(createLog?.changesAfterJson ?? {});
  check(
    '审计快照不包含姓名/电话/主诉',
    !createPayload.includes('测试新生') &&
      !createPayload.includes('13800000000') &&
      !createPayload.includes('运行验收脚本创建'),
    createPayload.slice(0, 200),
  );

  const filtered = await call('/students?level=L2&triageStatus=GREEN_ACTIVE');
  check(
    '按 level + triageStatus 筛选命中林小宇',
    filtered.status === 200 &&
      filtered.body.items.some((item) => item.studentCode === 'VMI-2026001'),
    `items=${filtered.body?.items?.map((item) => item.studentCode).join(',')}`,
  );

  const all = await call('/students?pageSize=100');
  const zhang = all.body.items.find((item) => item.studentCode === 'VMI-2026003');
  const lin = all.body.items.find((item) => item.studentCode === 'VMI-2026001');

  const redTriage = await call('/assessments/triage', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({
      studentId: zhang.id,
      behaviorItems: [
        { item: '屈光参差（左右眼度数差异）', score: 2.5 },
        { item: '交替遮盖试验见眼球明显移动', score: 1 },
      ],
      redZoneItems: [],
    }),
  });
  check(
    '红区初筛返回 isRedZone=true 且生成转介单',
    redTriage.status === 201 &&
      redTriage.body.isRedZone === true &&
      /^REF-\d{8}-\d{2}$/.test(redTriage.body.referralCode),
    JSON.stringify(redTriage.body),
  );

  const zhangAfterTriage = await call(`/students/${zhang.id}`);
  check(
    '红区学生状态变为 RED_ZONE_LOCKED',
    zhangAfterTriage.body.triageStatus === 'RED_ZONE_LOCKED',
    `triageStatus=${zhangAfterTriage.body.triageStatus}`,
  );

  const statusBypass = await call(`/students/${zhang.id}`, {
    method: 'PATCH',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ triageStatus: 'GREEN_ACTIVE' }),
  });
  const afterBypass = await call(`/students/${zhang.id}`);
  check(
    '通用 PATCH 不能修改 triageStatus',
    statusBypass.status === 200 &&
      afterBypass.body.triageStatus === 'RED_ZONE_LOCKED',
    `status=${statusBypass.status}, triage=${afterBypass.body?.triageStatus}`,
  );

  const emptyTriage = await call('/assessments/triage', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: zhang.id, behaviorItems: [] }),
  });
  check(
    '未闭环红区不能被空初筛解锁',
    emptyTriage.status === 409,
    `status=${emptyTriage.status}, body=${JSON.stringify(emptyTriage.body)}`,
  );

  const earlyAudit = await call('/assessments/referral-audit', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({
      referralId: redTriage.body.id,
      auditStatus: 'APPROVED',
      auditedBy: '陈明 (视光师)',
    }),
  });
  check(
    '未上传回执不能直接审核通过',
    earlyAudit.status === 400,
    `status=${earlyAudit.status}`,
  );

  const redSession = await call('/sessions', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: zhang.id }),
  });
  check(
    '红区学生创建课次返回 403',
    redSession.status === 403,
    `status=${redSession.status}, body=${JSON.stringify(redSession.body)}`,
  );

  const pendingSession = await call('/sessions', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: created.body.id }),
  });
  check(
    '待初筛学生创建课次返回 403 + TRIAGE_PENDING',
    pendingSession.status === 403 &&
      pendingSession.body.code === 'TRIAGE_PENDING',
    `status=${pendingSession.status}, body=${JSON.stringify(pendingSession.body)}`,
  );

  const pendingSchedule = await call('/schedules', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: created.body.id }),
  });
  check(
    '待初筛学生排课返回 403 + TRIAGE_PENDING',
    pendingSchedule.status === 403 &&
      pendingSchedule.body.code === 'TRIAGE_PENDING',
    `status=${pendingSchedule.status}, body=${JSON.stringify(pendingSchedule.body)}`,
  );

  const blocked = await call('/schedules', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: zhang.id }),
  });
  check(
    '红区学生排课返回 403 + RED_ZONE_LOCKED',
    blocked.status === 403 && blocked.body.code === 'RED_ZONE_LOCKED',
    `status=${blocked.status}, body=${JSON.stringify(blocked.body)}`,
  );

  const uploaded = await call('/assessments/referral-upload', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({
      referralId: redTriage.body.id,
      hospitalName: '测试妇幼保健院',
      hospitalDiagnosis: '屈光参差伴外隐斜',
      receiptFileUrl: '/uploads/receipt-test.pdf',
    }),
  });
  check('上传眼科回执返回 201', uploaded.status === 201, `status=${uploaded.status}`);

  const zhangUploaded = await call(`/students/${zhang.id}`);
  check(
    '上传回执后状态变为 REFERRAL_UPLOADED',
    zhangUploaded.body.triageStatus === 'REFERRAL_UPLOADED',
    `triageStatus=${zhangUploaded.body.triageStatus}`,
  );

  const audited = await call('/assessments/referral-audit', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({
      referralId: redTriage.body.id,
      auditStatus: 'APPROVED',
      auditedBy: '陈明 (视光师)',
      hospitalDiagnosis: '已散瞳验光并戴镜矫正',
    }),
  });
  check('审核通过回执返回 201', audited.status === 201, `status=${audited.status}`);

  const zhangUnlocked = await call(`/students/${zhang.id}`);
  check(
    '审核通过后状态变为 GREEN_ACTIVE',
    zhangUnlocked.body.triageStatus === 'GREEN_ACTIVE',
    `triageStatus=${zhangUnlocked.body.triageStatus}`,
  );

  const allowed = await call('/schedules', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: zhang.id }),
  });
  check(
    '绿区学生排课前置校验通过',
    allowed.status === 201 && allowed.body.allowed === true,
    `status=${allowed.status}, body=${JSON.stringify(allowed.body)}`,
  );

  const greenTriage = await call('/assessments/triage', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({
      studentId: lin.id,
      behaviorItems: [{ item: '抄写跳字漏行', score: 1 }],
      redZoneItems: [],
    }),
  });
  check(
    '无红区项初筛返回 isRedZone=false',
    greenTriage.status === 201 && greenTriage.body.isRedZone === false,
    JSON.stringify(greenTriage.body),
  );

  const csvRows = ['姓名,年龄,班级场景,初始层级,视光与评估基线'];
  for (let index = 1; index <= 50; index += 1) {
    csvRows.push(
      `批量学生${index},${6 + (index % 6)}岁${index % 12}个月,批量导入班,L${index % 6},批量导入基线${index}`,
    );
  }
  const csv = `\uFEFF${csvRows.join('\n')}`;
  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'students.csv');

  const importStartedAt = Date.now();
  const imported = await call('/students/import-excel', {
    method: 'POST',
    body: form,
  });
  const importDurationMs = Date.now() - importStartedAt;

  check(
    'Excel/CSV 批量导入 50 名成功',
    imported.status === 201 &&
      imported.body.imported === 50 &&
      imported.body.failed === 0,
    `status=${imported.status}, body=${JSON.stringify(imported.body)}`,
  );
  check(
    '批量导入 50 名耗时 < 5 秒',
    importDurationMs < 5000,
    `duration=${importDurationMs}ms`,
  );

  const afterImport = await call('/students?pageSize=200');
  check(
    '导入后学生总数 = 57',
    afterImport.body.total === 57,
    `total=${afterImport.body.total}`,
  );

  // ===== 红区结构化编码通道（R1 加固）=====
  // 种子 label 的特征片段：用来确认转介单取自种子字典，而不是旧文本规则标签。
  const SEED_LABEL_KEYWORDS = {
    RED_01: '裸眼视力显著低于同龄标准',
    RED_02: '显斜视',
    RED_03: '弱视危险因素',
  };

  async function createTriageStudent(name) {
    const response = await call('/students', {
      method: 'POST',
      headers: ACTOR_HEADERS,
      body: JSON.stringify({
        name,
        gender: '男',
        birthDate: '2019-05-01',
        schoolScene: '测试资源教室',
        primaryTherapistId: 'therapist_test',
        parentPhone: '13800000000',
        chiefComplaint: '红区结构化编码验收',
      }),
    });
    check(`${name} 建档成功`, response.status === 201, `status=${response.status}`);
    return response.body;
  }

  async function submitTriagePayload(student, payload) {
    const response = await call('/assessments/triage', {
      method: 'POST',
      headers: ACTOR_HEADERS,
      body: JSON.stringify({ studentId: student.id, ...payload }),
    });
    let labels = null;
    try {
      labels = JSON.parse(response.body?.redZoneItemsJson ?? 'null');
    } catch {
      labels = null;
    }
    return { response, labels };
  }

  const hasSeedLabel = (labels, code) =>
    Array.isArray(labels) &&
    labels.some((label) => label.includes(SEED_LABEL_KEYWORDS[code]));

  // 正例 P1：仅结构化编码命中。
  const p1Student = await createTriageStudent('编码正例一');
  const p1 = await submitTriagePayload(p1Student, {
    behaviorItems: [],
    redZoneCodes: ['RED_01'],
  });
  check(
    'P1 仅 RED_01 编码 → 红区且转介单为种子 label',
    p1.response.status === 201 &&
      p1.response.body.isRedZone === true &&
      Array.isArray(p1.labels) &&
      p1.labels.length === 1 &&
      p1.labels.every((label) => typeof label === 'string') &&
      hasSeedLabel(p1.labels, 'RED_01'),
    `status=${p1.response.status}, labels=${JSON.stringify(p1.labels)}`,
  );

  // 正例 P2：多条编码。
  const p2Student = await createTriageStudent('编码正例二');
  const p2 = await submitTriagePayload(p2Student, {
    behaviorItems: [],
    redZoneCodes: ['RED_01', 'RED_03'],
  });
  check(
    'P2 RED_01 + RED_03 → 两条种子 label',
    p2.response.status === 201 &&
      p2.response.body.isRedZone === true &&
      Array.isArray(p2.labels) &&
      p2.labels.length === 2 &&
      hasSeedLabel(p2.labels, 'RED_01') &&
      hasSeedLabel(p2.labels, 'RED_03'),
    `status=${p2.response.status}, labels=${JSON.stringify(p2.labels)}`,
  );

  // 正例 P3：编码 + 文本并集去重（文本同样指向 RED_01，另命中 RED_02）。
  const p3Student = await createTriageStudent('编码正例三');
  const p3 = await submitTriagePayload(p3Student, {
    behaviorItems: [
      { item: '屈光参差（左右眼度数差异）', score: 2.5 },
      { item: '交替遮盖试验见眼球明显移动', score: 1 },
    ],
    redZoneCodes: ['RED_01'],
  });
  const p3Red01Count = Array.isArray(p3.labels)
    ? p3.labels.filter((label) => label.includes(SEED_LABEL_KEYWORDS.RED_01))
        .length
    : 0;
  check(
    'P3 编码 + 文本 → 并集去重（RED_01 一条，加 RED_02）',
    p3.response.status === 201 &&
      p3.response.body.isRedZone === true &&
      Array.isArray(p3.labels) &&
      p3.labels.length === 2 &&
      p3Red01Count === 1 &&
      hasSeedLabel(p3.labels, 'RED_02'),
    `labels=${JSON.stringify(p3.labels)}`,
  );

  // 正例 P4：旧客户端不传 redZoneCodes，文本路径仍生效。
  const p4Student = await createTriageStudent('编码正例四');
  const p4 = await submitTriagePayload(p4Student, {
    behaviorItems: [{ item: '裸眼视力低于同龄标准', score: 1 }],
    redZoneItems: [],
  });
  check(
    'P4 旧文本路径（不传 redZoneCodes）仍判红区',
    p4.response.status === 201 &&
      p4.response.body.isRedZone === true &&
      hasSeedLabel(p4.labels, 'RED_01'),
    `status=${p4.response.status}, labels=${JSON.stringify(p4.labels)}`,
  );

  // 正例 P5：绿区初筛。
  const p5Student = await createTriageStudent('编码正例五');
  const p5 = await submitTriagePayload(p5Student, {
    behaviorItems: [{ item: '抄写跳字漏行', score: 1 }],
    redZoneCodes: [],
  });
  const p5After = await call(`/students/${p5Student.id}`);
  check(
    'P5 绿区初筛（无编码、无红区文本）→ GREEN_ACTIVE',
    p5.response.status === 201 &&
      p5.response.body.isRedZone === false &&
      p5After.body.triageStatus === 'GREEN_ACTIVE',
    `status=${p5.response.status}, triage=${p5After.body?.triageStatus}`,
  );

  // 反例 N1：未知编码 fail-closed，且不落任何状态变更。
  const n1Student = await createTriageStudent('编码反例一');
  const n1 = await submitTriagePayload(n1Student, {
    behaviorItems: [],
    redZoneCodes: ['RED_99'],
  });
  const n1After = await call(`/students/${n1Student.id}`);
  check(
    'N1 未知编码 RED_99 → 400 且状态未变',
    n1.response.status === 400 &&
      n1After.body.triageStatus === 'PENDING_SCREENING',
    `status=${n1.response.status}, triage=${n1After.body?.triageStatus}`,
  );

  // 反例 N2：重复编码去重。
  const n2Student = await createTriageStudent('编码反例二');
  const n2 = await submitTriagePayload(n2Student, {
    behaviorItems: [],
    redZoneCodes: ['RED_01', 'RED_01'],
  });
  check(
    'N2 重复编码 → 去重为一条',
    n2.response.status === 201 &&
      n2.response.body.isRedZone === true &&
      Array.isArray(n2.labels) &&
      n2.labels.length === 1 &&
      hasSeedLabel(n2.labels, 'RED_01'),
    `labels=${JSON.stringify(n2.labels)}`,
  );

  // 反例 N3：编码锁定的未闭环红区不能被空初筛解锁。
  const n3 = await submitTriagePayload(p1Student, { behaviorItems: [] });
  check(
    'N3 编码锁定后空初筛不能解锁 → 409',
    n3.response.status === 409,
    `status=${n3.response.status}, body=${JSON.stringify(n3.response.body)}`,
  );

  // 反例 N4：通用 PATCH 改不了 triageStatus。
  const n4Patch = await call(`/students/${p1Student.id}`, {
    method: 'PATCH',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ triageStatus: 'GREEN_ACTIVE' }),
  });
  const n4After = await call(`/students/${p1Student.id}`);
  check(
    'N4 通用 PATCH 不能改 triageStatus（编码锁定）',
    n4Patch.status === 200 &&
      n4After.body.triageStatus === 'RED_ZONE_LOCKED',
    `status=${n4Patch.status}, triage=${n4After.body?.triageStatus}`,
  );

  // 反例 N5：编码红区学生排课被拦。
  const n5 = await call('/schedules', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: p1Student.id }),
  });
  check(
    'N5 编码红区学生排课 → 403 RED_ZONE_LOCKED',
    n5.status === 403 && n5.body.code === 'RED_ZONE_LOCKED',
    `status=${n5.status}, body=${JSON.stringify(n5.body)}`,
  );

  // 反例 N6：编码红区学生开课被拦。
  const n6 = await call('/sessions', {
    method: 'POST',
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ studentId: p1Student.id }),
  });
  check(
    'N6 编码红区学生开课 → 403 RED_ZONE_LOCKED',
    n6.status === 403 && n6.body.code === 'RED_ZONE_LOCKED',
    `status=${n6.status}, body=${JSON.stringify(n6.body)}`,
  );

  // 反例 N7：编码命中而文本 score=0，仍判红区。
  const n7Student = await createTriageStudent('编码反例三');
  const n7 = await submitTriagePayload(n7Student, {
    behaviorItems: [{ item: '屈光参差', score: 0 }],
    redZoneCodes: ['RED_01'],
  });
  check(
    'N7 编码命中但文本 score=0 → 仍判红区',
    n7.response.status === 201 &&
      n7.response.body.isRedZone === true &&
      hasSeedLabel(n7.labels, 'RED_01'),
    `status=${n7.response.status}, labels=${JSON.stringify(n7.labels)}`,
  );

  // 正例 P6：审计快照只存编码标识，不存行为项原文。
  const p6Audit = await call(
    `/audit-logs?action=RED_ZONE_LOCK&targetId=${p3Student.id}`,
  );
  const p6Log = p6Audit.body?.logs?.[0];
  const p6Payload =
    typeof p6Log?.changesAfterJson === 'string'
      ? p6Log.changesAfterJson
      : JSON.stringify(p6Log?.changesAfterJson ?? {});
  check(
    'P6 审计 changesAfter 只存 redZoneCodes，不含行为项原文',
    p6Audit.status === 200 &&
      (p6Audit.body?.logs?.length ?? 0) >= 1 &&
      p6Payload.includes('redZoneCodes') &&
      p6Payload.includes('RED_01') &&
      p6Payload.includes('RED_02') &&
      !p6Payload.includes('屈光参差（左右眼度数差异）'),
    p6Payload.slice(0, 300),
  );

  const auditPage = await call('/audit-logs?pageSize=100');
  const actions = new Set((auditPage.body.logs ?? []).map((log) => log.action));
  for (const action of [
    'CREATE_STUDENT',
    'IMPORT_EXCEL',
    'RED_ZONE_LOCK',
    'UPLOAD_REFERRAL',
    'UNLOCK_RED_ZONE',
  ]) {
    check(
      `审计日志包含 ${action}`,
      actions.has(action),
      `actions=${[...actions].join(',')}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\nTask 2 验收失败：${failures.length} 项`);
    process.exitCode = 1;
    return;
  }

  console.log('\nTask 2 ALL CHECKS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
