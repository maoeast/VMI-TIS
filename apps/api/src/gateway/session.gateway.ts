import { OnEvent } from '@nestjs/event-emitter';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  PadTrialCompletedPayload,
  SwitchPadTaskPayload,
} from '@vmi-tis/shared-types';
import { Server, Socket } from 'socket.io';

/**
 * 课堂实时通道：
 * - 教师端投屏切换学生 Pad 任务（SWITCH_PAD_TASK）
 * - Pad 回合完成回传治疗师（PAD_TRIAL_COMPLETED）
 * - 五段式环节变更广播（SESSION_STAGE_CHANGED）
 *
 * 同时启用 websocket 与 polling，医院内网拦截 WebSocket 时自动降级。
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class SessionGateway {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    const role = String(client.handshake.query.role ?? 'therapist');
    const studentId = String(client.handshake.query.studentId ?? '');

    client.join(`role:${role}`);
    if (studentId) {
      client.join(`student:${studentId}`);
    }
  }

  @SubscribeMessage('SWITCH_PAD_TASK')
  handleSwitchPadTask(@MessageBody() payload: SwitchPadTaskPayload) {
    if (payload.studentId) {
      this.server
        .to(`student:${payload.studentId}`)
        .emit('SWITCH_PAD_TASK', payload);
    }
    this.server.to('role:therapist').emit('SWITCH_PAD_TASK', payload);
    return { ok: true };
  }

  @SubscribeMessage('PAD_TRIAL_COMPLETED')
  handlePadTrialCompleted(@MessageBody() payload: PadTrialCompletedPayload) {
    this.server.to('role:therapist').emit('PAD_TRIAL_COMPLETED', payload);
    if (payload.studentId) {
      this.server
        .to(`student:${payload.studentId}`)
        .emit('PAD_TRIAL_COMPLETED', payload);
    }
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
