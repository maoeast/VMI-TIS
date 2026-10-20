#!/usr/bin/env node
/**
 * Task 6 验收脚本：Socket.io 实时通道（教师投屏、Pad 回传、五段式广播）。
 */
import { io } from 'socket.io-client';

const ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3000';
const ACTOR_HEADERS = {
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

function connect(role, studentId) {
  return new Promise((resolve, reject) => {
    const socket = io(ORIGIN, {
      transports: ['websocket', 'polling'],
      auth: {
        token: process.env.SOCKET_TOKEN ?? 'vmi-tis-dev-token',
      },
      query: { role, studentId },
      timeout: 5000,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => reject(error));
  });
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`等待 ${event} 超时`)),
      timeoutMs,
    );
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** 发送事件并等待服务端 ack；服务端处理器返回值即 ack。 */
function emitWithAck(socket, event, payload, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`等待 ${event} ack 超时`)),
      timeoutMs,
    );
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const studentsResponse = await fetch(
    `${ORIGIN}/api/students?pageSize=10`,
    { headers: ACTOR_HEADERS },
  );
  const students = await studentsResponse.json();
  const student = students.items.find((item) => item.name === '周子墨') ?? students.items[0];
  check('找到测试学生', Boolean(student), '学生列表为空');

  const therapist = await connect('therapist', '');
  const studentSocket = await connect('student', student.id);
  check('教师端与学生端 Socket 均连接成功', therapist.connected && studentSocket.connected, '连接失败');

  const switchPromise = waitFor(studentSocket, 'SWITCH_PAD_TASK');
  therapist.emit('SWITCH_PAD_TASK', {
    event: 'SWITCH_PAD_TASK',
    studentId: student.id,
    gameMode: 'star',
    difficulty: { speed: 1, trajectory: 'sine', promptFade: 'slow' },
    remainingEyeQuotaSec: 880,
  });
  const switchPayload = await switchPromise;
  check(
    'Pad 收到教师投屏 SWITCH_PAD_TASK',
    switchPayload.gameMode === 'star' &&
      switchPayload.remainingEyeQuotaSec === 880,
    JSON.stringify(switchPayload),
  );

  const trialPromise = waitFor(therapist, 'PAD_TRIAL_COMPLETED');
  studentSocket.emit('PAD_TRIAL_COMPLETED', {
    event: 'PAD_TRIAL_COMPLETED',
    studentId: student.id,
    gameMode: 'bubble',
    accuracyRate: 0.9,
    avgReactionTimeMs: 1100,
    smoothPursuitGain: 0.86,
  });
  const trialPayload = await trialPromise;
  check(
    '教师端收到 Pad 回合回传 PAD_TRIAL_COMPLETED',
    trialPayload.accuracyRate === 0.9 && trialPayload.gameMode === 'bubble',
    JSON.stringify(trialPayload),
  );

  const anonymous = io(ORIGIN, {
    transports: ['websocket', 'polling'],
    query: { role: 'therapist' },
    reconnection: false,
    timeout: 2000,
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  check('无 token 连接被拒绝', !anonymous.connected, '匿名连接仍然存活');
  anonymous.disconnect();

  let forbiddenSwitchReceived = false;
  therapist.on('SWITCH_PAD_TASK', () => {
    forbiddenSwitchReceived = true;
  });
  studentSocket.emit('SWITCH_PAD_TASK', {
    event: 'SWITCH_PAD_TASK',
    studentId: student.id,
    gameMode: 'bubble',
    difficulty: { speed: 1, trajectory: 'sine', promptFade: 'slow' },
    remainingEyeQuotaSec: 900,
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  check(
    '学生端不能冒充教师切换任务',
    forbiddenSwitchReceived === false,
    '学生端发出的 SWITCH_PAD_TASK 被广播',
  );

  // ---- SWITCH_STUDENT：跨窗口选学生同步 ----
  const switchStudentPromise = waitFor(studentSocket, 'SWITCH_STUDENT');
  const switchStudentAck = await emitWithAck(therapist, 'SWITCH_STUDENT', {
    event: 'SWITCH_STUDENT',
    studentId: student.id,
  }).catch((error) => ({ transportError: String(error) }));
  const switchStudentPayload = await switchStudentPromise;
  check(
    '教师端 SWITCH_STUDENT 返回 ok',
    switchStudentAck?.ok === true,
    JSON.stringify(switchStudentAck),
  );
  check(
    '学生端收到教师选学生 SWITCH_STUDENT',
    switchStudentPayload.studentId === student.id,
    JSON.stringify(switchStudentPayload),
  );

  // 房间语义：学生 socket 仍在旧学生房间，教师选别的学生也必须送达，
  // 证明服务端广播的是 role:student，而不是目标 student:<id>。
  const otherStudent = students.items.find((item) => item.id !== student.id);
  if (otherStudent) {
    const otherPromise = waitFor(studentSocket, 'SWITCH_STUDENT');
    await emitWithAck(therapist, 'SWITCH_STUDENT', {
      event: 'SWITCH_STUDENT',
      studentId: otherStudent.id,
    });
    const otherPayload = await otherPromise;
    check(
      '学生端在旧学生房间也能收到对其他学生的切换（role:student 广播）',
      otherPayload.studentId === otherStudent.id,
      JSON.stringify(otherPayload),
    );
  }

  let studentSwitchBroadcast = false;
  const spyStudentSwitch = () => {
    studentSwitchBroadcast = true;
  };
  studentSocket.on('SWITCH_STUDENT', spyStudentSwitch);
  const forbiddenSwitchStudentAck = await emitWithAck(
    studentSocket,
    'SWITCH_STUDENT',
    { event: 'SWITCH_STUDENT', studentId: student.id },
  ).catch((error) => ({ transportError: String(error) }));
  await sleep(400);
  studentSocket.off('SWITCH_STUDENT', spyStudentSwitch);
  check(
    '学生端发 SWITCH_STUDENT 返回 forbidden',
    forbiddenSwitchStudentAck?.ok === false &&
      forbiddenSwitchStudentAck?.error === 'forbidden',
    JSON.stringify(forbiddenSwitchStudentAck),
  );
  check(
    '学生端冒充教师的 SWITCH_STUDENT 未被广播',
    studentSwitchBroadcast === false,
    '学生端发出的 SWITCH_STUDENT 被广播',
  );

  const emptyStudentAck = await emitWithAck(therapist, 'SWITCH_STUDENT', {
    event: 'SWITCH_STUDENT',
    studentId: '',
  }).catch((error) => ({ transportError: String(error) }));
  check(
    '空 studentId 返回 invalid_payload',
    emptyStudentAck?.ok === false &&
      emptyStudentAck?.error === 'invalid_payload',
    JSON.stringify(emptyStudentAck),
  );

  // ---- ASSESSMENT_CARD_CHANGE：评估双屏出示 ----
  const beeryCardPromise = waitFor(studentSocket, 'ASSESSMENT_CARD_CHANGE');
  const beeryCardAck = await emitWithAck(therapist, 'ASSESSMENT_CARD_CHANGE', {
    event: 'ASSESSMENT_CARD_CHANGE',
    studentId: student.id,
    action: 'show',
    cardType: 'beery',
    beeryItemNumber: 7,
  }).catch((error) => ({ transportError: String(error) }));
  const beeryCardPayload = await beeryCardPromise;
  check(
    '教师端 ASSESSMENT_CARD_CHANGE(Beery) 返回 ok',
    beeryCardAck?.ok === true,
    JSON.stringify(beeryCardAck),
  );
  check(
    '学生端收到 Beery 题卡 show（题号跟随）',
    beeryCardPayload.action === 'show' &&
      beeryCardPayload.cardType === 'beery' &&
      beeryCardPayload.beeryItemNumber === 7,
    JSON.stringify(beeryCardPayload),
  );

  const tvpsCardPromise = waitFor(studentSocket, 'ASSESSMENT_CARD_CHANGE');
  await emitWithAck(therapist, 'ASSESSMENT_CARD_CHANGE', {
    event: 'ASSESSMENT_CARD_CHANGE',
    studentId: student.id,
    action: 'show',
    cardType: 'tvps4',
    tvpsSubtestCode: 'MEM',
    tvpsItemIndex: 0,
    tvpsPhase: 'target',
    tvpsRemaining: 5,
  }).catch((error) => ({ transportError: String(error) }));
  const tvpsCardPayload = await tvpsCardPromise;
  check(
    '学生端收到 TVPS-4 题卡 show（子测验/阶段/剩余秒）',
    tvpsCardPayload.action === 'show' &&
      tvpsCardPayload.cardType === 'tvps4' &&
      tvpsCardPayload.tvpsSubtestCode === 'MEM' &&
      tvpsCardPayload.tvpsPhase === 'target' &&
      tvpsCardPayload.tvpsRemaining === 5,
    JSON.stringify(tvpsCardPayload),
  );

  const demCardPromise = waitFor(studentSocket, 'ASSESSMENT_CARD_CHANGE');
  await emitWithAck(therapist, 'ASSESSMENT_CARD_CHANGE', {
    event: 'ASSESSMENT_CARD_CHANGE',
    studentId: student.id,
    action: 'show',
    cardType: 'dem',
    demTest: 'C',
  }).catch((error) => ({ transportError: String(error) }));
  const demCardPayload = await demCardPromise;
  check(
    '学生端收到 DEM 矩阵 show（Test C）',
    demCardPayload.action === 'show' &&
      demCardPayload.cardType === 'dem' &&
      demCardPayload.demTest === 'C',
    JSON.stringify(demCardPayload),
  );

  const hideCardPromise = waitFor(studentSocket, 'ASSESSMENT_CARD_CHANGE');
  const hideCardAck = await emitWithAck(therapist, 'ASSESSMENT_CARD_CHANGE', {
    event: 'ASSESSMENT_CARD_CHANGE',
    studentId: student.id,
    action: 'hide',
    cardType: null,
  }).catch((error) => ({ transportError: String(error) }));
  const hideCardPayload = await hideCardPromise;
  check(
    '教师端收回评估卡返回 ok 且学生端收到 hide',
    hideCardAck?.ok === true && hideCardPayload.action === 'hide',
    JSON.stringify({ ack: hideCardAck, payload: hideCardPayload }),
  );

  let studentCardBroadcast = false;
  const spyStudentCard = () => {
    studentCardBroadcast = true;
  };
  studentSocket.on('ASSESSMENT_CARD_CHANGE', spyStudentCard);
  const forbiddenCardAck = await emitWithAck(
    studentSocket,
    'ASSESSMENT_CARD_CHANGE',
    {
      event: 'ASSESSMENT_CARD_CHANGE',
      studentId: student.id,
      action: 'show',
      cardType: 'beery',
      beeryItemNumber: 1,
    },
  ).catch((error) => ({ transportError: String(error) }));
  await sleep(400);
  studentSocket.off('ASSESSMENT_CARD_CHANGE', spyStudentCard);
  check(
    '学生端发 ASSESSMENT_CARD_CHANGE 返回 forbidden',
    forbiddenCardAck?.ok === false && forbiddenCardAck?.error === 'forbidden',
    JSON.stringify(forbiddenCardAck),
  );
  check(
    '学生端冒充教师的评估卡出示未被广播',
    studentCardBroadcast === false,
    '学生端发出的 ASSESSMENT_CARD_CHANGE 被广播',
  );

  const emptyCardAck = await emitWithAck(therapist, 'ASSESSMENT_CARD_CHANGE', {
    event: 'ASSESSMENT_CARD_CHANGE',
    studentId: '',
    action: 'show',
    cardType: 'beery',
    beeryItemNumber: 1,
  }).catch((error) => ({ transportError: String(error) }));
  check(
    '评估卡空 studentId 返回 invalid_payload',
    emptyCardAck?.ok === false && emptyCardAck?.error === 'invalid_payload',
    JSON.stringify(emptyCardAck),
  );

  // 未知 studentId 不查存在性：服务端照发，学生端按 studentId 自行过滤。
  const unknownStudentId = '00000000-0000-0000-0000-0000000000aa';
  const unknownCardPromise = waitFor(studentSocket, 'ASSESSMENT_CARD_CHANGE');
  const unknownCardAck = await emitWithAck(therapist, 'ASSESSMENT_CARD_CHANGE', {
    event: 'ASSESSMENT_CARD_CHANGE',
    studentId: unknownStudentId,
    action: 'show',
    cardType: 'beery',
    beeryItemNumber: 2,
  }).catch((error) => ({ transportError: String(error) }));
  const unknownCardPayload = await unknownCardPromise;
  check(
    '未知 studentId 的评估卡照发到 role:student（学生端自行过滤）',
    unknownCardAck?.ok === true &&
      unknownCardPayload.studentId === unknownStudentId,
    JSON.stringify({ ack: unknownCardAck, payload: unknownCardPayload }),
  );

  let forgedTrialReceived = false;
  therapist.on('PAD_TRIAL_COMPLETED', () => {
    forgedTrialReceived = true;
  });
  studentSocket.emit('PAD_TRIAL_COMPLETED', {
    event: 'PAD_TRIAL_COMPLETED',
    studentId: '00000000-0000-0000-0000-000000000000',
    gameMode: 'bubble',
    accuracyRate: 1,
    avgReactionTimeMs: 900,
    smoothPursuitGain: 1,
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  check(
    '学生端不能伪造他人 Pad 回传',
    forgedTrialReceived === false,
    '伪造 PAD_TRIAL_COMPLETED 被广播',
  );

  const sessionsResponse = await fetch(
    `${ORIGIN}/api/sessions?studentId=${student.id}`,
    { headers: ACTOR_HEADERS },
  );
  const sessions = await sessionsResponse.json();
  let activeSession = sessions.find((session) => !session.isFinished);

  if (!activeSession) {
    const createdResponse = await fetch(`${ORIGIN}/api/sessions`, {
      method: 'POST',
      headers: { ...ACTOR_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: student.id }),
    });
    activeSession = await createdResponse.json();
  }

  check(
    '存在进行中的课次（无则自动创建）',
    Boolean(activeSession?.id),
    '没有进行中的课次',
  );

  if (activeSession?.id) {
    const stagePromise = waitFor(studentSocket, 'SESSION_STAGE_CHANGED');
    const patchResponse = await fetch(
      `${ORIGIN}/api/sessions/${activeSession.id}/stage`,
      {
        method: 'PATCH',
        headers: { ...ACTOR_HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify({ stage: 3 }),
      },
    );
    check('PATCH 五段式环节返回 200', patchResponse.status === 200, `status=${patchResponse.status}`);
    const stagePayload = await stagePromise;
    check(
      'Pad 收到 SESSION_STAGE_CHANGED 且 stage=3',
      stagePayload.stage === 3,
      JSON.stringify(stagePayload),
    );
  }

  therapist.disconnect();
  studentSocket.disconnect();

  if (failures.length > 0) {
    console.error(`\nTask 6 实时通道验收失败：${failures.length} 项`);
    process.exitCode = 1;
    return;
  }

  console.log('\nTask 6 实时通道 ALL CHECKS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
