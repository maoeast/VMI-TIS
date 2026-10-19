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
