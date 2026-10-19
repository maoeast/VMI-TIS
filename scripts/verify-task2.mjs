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
