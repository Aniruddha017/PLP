import { useState, useRef, useEffect } from 'react';
import { Plus, PaperPlaneTilt } from '../icons';

export const InputBar = ({ onSendMessage, disabled = false }) => {
  const [inputVal, setInputVal] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputVal]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || disabled) return;
    onSendMessage(inputVal.trim());
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 py-3 sm:px-8 sm:py-4 border-t border-zinc-100 bg-white shrink-0">
      <div className="max-w-4xl mx-auto w-full">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end justify-between rounded-2xl border border-zinc-200/90 bg-white p-1.5 pl-3 sm:pl-3.5 shadow-xs transition-all focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-950/5"
        >
          {/* Text Area with Auto-Grow and Shift+Enter support */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question, enter code, or explore a formula... (Enter to send, Shift+Enter for newline)"
            disabled={disabled}
            className="w-full bg-transparent px-2 py-1.5 text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 outline-none resize-none min-h-[36px] max-h-[120px] leading-relaxed"
          />

          {/* Send Action Button */}
          <button
            type="submit"
            disabled={disabled || !inputVal.trim()}
            title="Send message (Enter)"
            className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-black text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer mb-0.5 ml-1"
          >
            <PaperPlaneTilt size={14} weight="bold" className="-rotate-12 translate-x-px" />
          </button>
        </form>
      </div>
    </div>
  );
};

export const ConsoleInputBar = InputBar;
export default InputBar;

