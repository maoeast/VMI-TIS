import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditActor } from './audit-log.service';

/**
 * 请求级审计上下文：
 * 领域服务（红区熔断、回执审核、课堂记分、晋级等）不直接持有 Request，
 * 通过 AsyncLocalStorage 读取当前操作者，避免审计日志退化为“系统”。
 */
const storage = new AsyncLocalStorage<AuditActor>();

export function runWithAuditActor<T>(actor: AuditActor, callback: () => T): T {
  return storage.run(actor, callback);
}

export function getAuditActor(): AuditActor | undefined {
  return storage.getStore();
}
