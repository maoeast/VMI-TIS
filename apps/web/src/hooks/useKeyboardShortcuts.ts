import { useEffect } from 'react';

interface ShortcutHandlers {
  enabled?: boolean;
  onCorrect: () => void;
  onIncorrect: () => void;
  onAdjustPrompt: (direction: 'up' | 'down') => void;
  onNextStage: () => void;
}

/**
 * 课堂记分台盲操快捷键：
 * Space/1 记成功、0 记失败、↑↓ 调提示层级、N 下一环节。
 * 输入框、文本域、下拉框聚焦时不触发。
 */
export function useKeyboardShortcuts({
  enabled = true,
  onCorrect,
  onIncorrect,
  onAdjustPrompt,
  onNextStage,
}: ShortcutHandlers): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
        case '1':
          event.preventDefault();
          onCorrect();
          break;
        case '0':
          event.preventDefault();
          onIncorrect();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onAdjustPrompt('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onAdjustPrompt('down');
          break;
        case 'n':
        case 'N':
          event.preventDefault();
          onNextStage();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onCorrect, onIncorrect, onAdjustPrompt, onNextStage]);
}
