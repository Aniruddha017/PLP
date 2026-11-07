import { useState, useRef, useEffect } from 'react';
import Logo from '../Logo';
import { conversationService } from '../../services/conversationService';
import {
  User,
  TrendUp,
  Stack,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  CircleNotch,
  Sparkle,
} from '../icons';

export const ChatView = ({
  conversation,
  messages = [],
  isThinking = false,
}) => {
  const [feedbackState, setFeedbackState] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const handleCopy = (id, text) => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleFeedback = (messageId, type) => {
    const current = feedbackState[messageId];
    const nextVal = current === type ? null : type;
    setFeedbackState((prev) => ({ ...prev, [messageId]: nextVal }));

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    if (isUuid) {
      conversationService.saveFeedback(messageId, nextVal);
    }
  };

  // If no conversation exists
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-white">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-4 shadow-2xs">
          <Sparkle size={26} weight="fill" />
        </div>
        <h3 className="font-display font-bold text-lg text-zinc-900">Welcome to AI Tutor</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5 leading-relaxed">
          Select a topic from the sidebar or click <strong className="text-zinc-800 font-semibold">+ New Chat</strong> to begin exploring concepts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 text-left">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* If this conversation has 0 messages yet */}
        {messages.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center select-none">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-medium text-zinc-600 mb-3">
              <span>{conversation.subject || 'General'}</span>
              <span>•</span>
              <span>{conversation.topic || conversation.title}</span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-zinc-900 tracking-tight">
              {conversation.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-md mt-2 leading-relaxed">
              Ask any question, state an equation, or ask for a first-principles Socratic breakdown below.
            </p>
          </div>
        )}

        {/* Chronological Message Thread from Database */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const msgTime = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now';

          if (isUser) {
            return (
              <div key={msg.id || index} className="flex items-start gap-2.5 sm:gap-3 text-left pt-2">
                <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 shadow-2xs">
                  <User size={15} weight="bold" />
                </div>
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 px-4 py-2.5 sm:py-3 shadow-2xs">
                  <p className="font-sans text-xs sm:text-[13px] font-medium leading-relaxed text-zinc-800 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <span className="shrink-0 text-[10px] sm:text-[11px] text-zinc-500 self-end sm:self-auto select-none">
                    {msgTime}
                  </span>
                </div>
              </div>
            );
          }

          // Assistant Response
          const cards = Array.isArray(msg.cards) ? msg.cards : [];
          const keyInsight = msg.key_insight;
          const currentFeedback = feedbackState[msg.id] ?? msg.feedback;

          return (
            <div key={msg.id || index} className="space-y-4 pt-2">
              {/* Tutor Lockup */}
              <div className="flex items-center gap-2.5">
                <Logo dark className="h-7 w-7 !rounded-lg shrink-0" />
                <span className="font-display font-bold text-xs sm:text-sm text-zinc-900">AI Tutor</span>
                <span className="rounded-full bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">
                  Concept Explanation
                </span>
              </div>

              {/* Response Text */}
              <div className="pl-0 sm:pl-9 font-sans text-xs sm:text-[13.5px] leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {msg.content}
              </div>

              {/* Dynamic Comparison Cards */}
              {cards.length > 0 && (
                <div className="pl-0 sm:pl-9 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {cards.map((card, cIdx) => (
                    <div
                      key={cIdx}
                      className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 shadow-2xs">
                          {cIdx === 0 ? <TrendUp size={15} weight="bold" /> : <Stack size={15} weight="bold" />}
                        </span>
                        <span className="font-semibold text-xs text-zinc-900">{card.title}</span>
                      </div>
                      {(card.formula || card.formulaText) && (
                        <div className="my-3 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-3 py-3.5 text-center overflow-x-auto font-mono text-sm font-semibold text-zinc-900">
                          {card.formula || card.formulaText}
                        </div>
                      )}
                      {card.description && (
                        <p className="text-[11px] leading-relaxed text-zinc-500">{card.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Key Insight */}
              {keyInsight && (
                <div className="ml-0 sm:ml-9 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200/70 text-zinc-800 shadow-2xs">
                      <Lightbulb size={14} weight="bold" />
                    </span>
                    <span className="font-bold text-xs text-zinc-900">Key Insight</span>
                  </div>
                  <p className="text-[11.5px] sm:text-xs leading-relaxed text-zinc-600 pl-8">
                    {keyInsight}
                  </p>
                </div>
              )}

              {/* Action Bar */}
              <div className="pl-0 sm:pl-9 flex items-center gap-2 pt-1 text-zinc-400 select-none">
                <button
                  type="button"
                  onClick={() => handleFeedback(msg.id || index, 'up')}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer ${
                    currentFeedback === 'up' ? 'text-black bg-zinc-100' : 'hover:text-zinc-800'
                  }`}
                  title="Helpful explanation"
                >
                  <ThumbsUp size={15} weight={currentFeedback === 'up' ? 'fill' : 'regular'} />
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(msg.id || index, 'down')}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer ${
                    currentFeedback === 'down' ? 'text-black bg-zinc-100' : 'hover:text-zinc-800'
                  }`}
                  title="Needs improvement"
                >
                  <ThumbsDown size={15} weight={currentFeedback === 'down' ? 'fill' : 'regular'} />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(msg.id || index, msg.content)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
                  title="Copy explanation"
                >
                  {copiedId === (msg.id || index) ? <Check size={15} className="text-black" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          );
        })}

        {/* Thinking State */}
        {isThinking && (
          <div className="flex items-center gap-3 pl-0 sm:pl-9 py-2 text-zinc-500 text-xs">
            <CircleNotch size={16} className="animate-spin text-zinc-700" />
            <span>AI Tutor is analyzing your question...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export const ConsoleChatView = ChatView;
export default ChatView;
