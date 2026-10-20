import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  AssessmentCardChangePayload,
  AssessmentCardType,
  PadTrialCompletedPayload,
  SwitchPadTaskPayload,
  SwitchStudentPayload,
} from '@vmi-tis/shared-types';
import { Server, Socket } from 'socket.io';

type SocketRole = 'therapist' | 'student' | 'parent';
const ALLOWED_ROLES: SocketRole[] = ['therapist', 'student', 'parent'];
const DEFAULT_SOCKET_TOKEN = 'vmi-tis-dev-token';
const ASSESSMENT_CARD_TYPES: AssessmentCardType[] = ['beery', 'tvps4', 'dem'];

/**
 * 课堂实时通道：
 * - 教师端投屏切换学生 Pad 任务（SWITCH_PAD_TASK）
 * - 教师端跨窗口选学生同步（SWITCH_STUDENT）
 * - 教师端评估题卡出示 / 翻题 / 收回（ASSESSMENT_CARD_CHANGE）
 * - Pad 回合完成回传治疗师（PAD_TRIAL_COMPLETED）
 * - 五段式环节变更广播（SESSION_STAGE_CHANGED）
 *
 * 连接必须携带 SOCKET_TOKEN；角色与学生归属在服务端绑定，
 * 逐事件校验发送方角色，避免任意客户端冒充教师或 Pad。
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class SessionGateway {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    const expectedToken = process.env.SOCKET_TOKEN ?? DEFAULT_SOCKET_TOKEN;
    const token = String(client.handshake.auth?.token ?? '');

    if (token !== expectedToken) {
      client.disconnect(true);
      return;
    }

    const role = String(
      client.handshake.query.role ?? 'therapist',
    ) as SocketRole;

    if (!ALLOWED_ROLES.includes(role)) {
      client.disconnect(true);
      return;
    }

    const studentId = String(client.handshake.query.studentId ?? '');

    client.data.role = role;
    client.data.studentId = studentId;
    client.join(`role:${role}`);

    // 教师端不加入具体学生房间，避免与自己发出的投屏事件重复；
    // 学生/家长只能加入自己绑定的学生房间。
    if (studentId && role !== 'therapist') {
      client.join(`student:${studentId}`);
    }
  }

  @SubscribeMessage('SWITCH_PAD_TASK')
  handleSwitchPadTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SwitchPadTaskPayload,
  ) {
    if (client.data.role !== 'therapist') {
      return { ok: false, error: 'forbidden' };
    }
    if (!payload || typeof payload.studentId !== 'string' || !payload.studentId) {
      return { ok: false, error: 'invalid_payload' };
    }

    this.server
      .to(`student:${payload.studentId}`)
      .emit('SWITCH_PAD_TASK', payload);
    this.server.to('role:therapist').emit('SWITCH_PAD_TASK', payload);
    return { ok: true };
  }

  @SubscribeMessage('SWITCH_STUDENT')
  handleSwitchStudent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SwitchStudentPayload,
  ) {
    if (client.data.role !== 'therapist') {
      return { ok: false, error: 'forbidden' };
    }
    if (
      !payload ||
      typeof payload.studentId !== 'string' ||
      !payload.studentId.trim()
    ) {
      return { ok: false, error: 'invalid_payload' };
    }

    // 学生 socket 连接时按「当时」的学生加入 student:<id>；要切到的新学生
    // 还没换房，按目标房间发会收不到，所以广播 role:student 由学生端自行跟随。
    this.server.to('role:student').emit('SWITCH_STUDENT', payload);
    return { ok: true };
  }

  @SubscribeMessage('ASSESSMENT_CARD_CHANGE')
  handleAssessmentCardChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AssessmentCardChangePayload,
  ) {
    if (client.data.role !== 'therapist') {
      return { ok: false, error: 'forbidden' };
    }
    if (
      !payload ||
      typeof payload.studentId !== 'string' ||
      !payload.studentId.trim()
    ) {
      return { ok: false, error: 'invalid_payload' };
    }
    if (payload.action !== 'show' && payload.action !== 'hide') {
      return { ok: false, error: 'invalid_payload' };
    }
    if (
      payload.action === 'show' &&
      !ASSESSMENT_CARD_TYPES.includes(payload.cardType as AssessmentCardType)
    ) {
      return { ok: false, error: 'invalid_payload' };
    }

    // 与 SWITCH_STUDENT 同理：学生 socket 按连接时的学生入房，不按目标
    // student:<id> 发；学生端按 payload.studentId 自行过滤。未知 studentId
    // 不查存在性——广播照发，学生端过滤后无人显示。
    this.server.to('role:student').emit('ASSESSMENT_CARD_CHANGE', payload);
    return { ok: true };
  }

  @SubscribeMessage('PAD_TRIAL_COMPLETED')
  handlePadTrialCompleted(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PadTrialCompletedPayload,
  ) {
    if (client.data.role !== 'student') {
      return { ok: false, error: 'forbidden' };
    }
    if (
      !payload ||
      typeof payload.studentId !== 'string' ||
      payload.studentId !== client.data.studentId
    ) {
      return { ok: false, error: 'invalid_payload' };
    }

    this.server.to('role:therapist').emit('PAD_TRIAL_COMPLETED', payload);
    this.server
      .to(`student:${payload.studentId}`)
      .emit('PAD_TRIAL_COMPLETED', payload);
    return { ok: true };
  }

  @OnEvent('session.stage.changed')
  handleStageChanged(payload: {
    sessionId: string;
    studentId: string;
    stage: number;
  }): void {
    this.server.to('role:therapist').emit('SESSION_STAGE_CHANGED', payload);
    this.server
      .to(`student:${payload.studentId}`)
      .emit('SESSION_STAGE_CHANGED', payload);
  }

  @OnEvent('session.trial.recorded')
  handleTrialRecorded(payload: unknown): void {
    this.server.to('role:therapist').emit('SESSION_TRIAL_RECORDED', payload);
  }

  @OnEvent('session.finished')
  handleSessionFinished(payload: unknown): void {
    this.server.to('role:therapist').emit('SESSION_FINISHED', payload);
  }
}
