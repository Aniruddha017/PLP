import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export const MarkdownRenderer = ({ content, className = '' }) => {
  if (!content) return null;

  return (
    <div className={`markdown-content text-xs sm:text-[13.5px] leading-relaxed text-zinc-700 space-y-2.5 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="font-display font-bold text-base sm:text-lg text-zinc-900 mt-3 mb-1" {...props} />,
          h2: ({ node, ...props }) => <h2 className="font-display font-bold text-sm sm:text-base text-zinc-900 mt-2.5 mb-1" {...props} />,
          h3: ({ node, ...props }) => <h3 className="font-display font-semibold text-xs sm:text-sm text-zinc-900 mt-2 mb-0.5" {...props} />,
          p: ({ node, ...props }) => <p className="leading-relaxed text-zinc-700 mb-2" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-zinc-900" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-zinc-800" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-outside pl-4 space-y-1 my-1.5" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-outside pl-4 space-y-1 my-1.5" {...props} />,
          li: ({ node, ...props }) => <li className="text-zinc-700 leading-normal" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-zinc-400 pl-3 py-1 my-2 italic text-zinc-600 bg-zinc-50/50 rounded-r" {...props} />
          ),
          code: ({ node, inline, className: codeClass, children, ...props }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/80 font-mono text-[11.5px] text-zinc-900 font-semibold" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="my-2.5 rounded-xl border border-zinc-200/90 bg-zinc-900 text-zinc-100 p-3 overflow-x-auto font-mono text-xs shadow-2xs">
                <code {...props}>{children}</code>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
