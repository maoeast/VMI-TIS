import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  AssessmentCardChangePayload,
  PadTrialCompletedPayload,
  SwitchPadTaskPayload,
  SwitchStudentPayload,
} from '@vmi-tis/shared-types';

interface WebSocketOptions {
  role?: 'therapist' | 'student' | 'parent';
  studentId?: string | null;
  onSwitchPadTask?: (payload: SwitchPadTaskPayload) => void;
  onSwitchStudent?: (payload: SwitchStudentPayload) => void;
  onAssessmentCardChange?: (payload: AssessmentCardChangePayload) => void;
  onPadTrialCompleted?: (payload: PadTrialCompletedPayload) => void;
  onStageChanged?: (payload: {
    sessionId: string;
    studentId: string;
    stage: number;
  }) => void;
}

/**
 * Socket.io 客户端。transports 同时启用 websocket 与 polling，
 * 医院内网拦截 WebSocket 时自动降级为 HTTP Long-Polling。
 *
 * 回调通过 ref 读取，避免父组件每次渲染都重建连接。
 */
export function useWebSocket(options: WebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      auth: {
        token:
          (import.meta.env.VITE_SOCKET_TOKEN as string | undefined) ??
          'vmi-tis-dev-token',
      },
      query: {
        role: options.role ?? 'therapist',
        studentId: options.studentId ?? '',
      },
    });

    socketRef.current = socket;

    socket.on('SWITCH_PAD_TASK', (payload: SwitchPadTaskPayload) => {
      optionsRef.current.onSwitchPadTask?.(payload);
    });
    socket.on('SWITCH_STUDENT', (payload: SwitchStudentPayload) => {
      optionsRef.current.onSwitchStudent?.(payload);
    });
    socket.on(
      'ASSESSMENT_CARD_CHANGE',
      (payload: AssessmentCardChangePayload) => {
        optionsRef.current.onAssessmentCardChange?.(payload);
      },
    );
    socket.on('PAD_TRIAL_COMPLETED', (payload: PadTrialCompletedPayload) => {
      optionsRef.current.onPadTrialCompleted?.(payload);
    });
    socket.on(
      'SESSION_STAGE_CHANGED',
      (payload: { sessionId: string; studentId: string; stage: number }) => {
        optionsRef.current.onStageChanged?.(payload);
      },
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.role, options.studentId]);

  // 连接句柄放进 ref，emit 函数因此保持稳定，可安全写入 store 而不触发重连/重渲染。
  const emitSwitchStudent = useCallback((payload: SwitchStudentPayload) => {
    socketRef.current?.emit('SWITCH_STUDENT', payload);
  }, []);

  const emitAssessmentCardChange = useCallback(
    (payload: AssessmentCardChangePayload) => {
      socketRef.current?.emit('ASSESSMENT_CARD_CHANGE', payload);
    },
    [],
  );

  return {
    emitSwitchPadTask: (payload: SwitchPadTaskPayload) => {
      socketRef.current?.emit('SWITCH_PAD_TASK', payload);
    },
    emitPadTrialCompleted: (payload: PadTrialCompletedPayload) => {
      socketRef.current?.emit('PAD_TRIAL_COMPLETED', payload);
    },
    emitSwitchStudent,
    emitAssessmentCardChange,
  };
}
