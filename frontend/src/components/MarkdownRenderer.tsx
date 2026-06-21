'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none prose-neutral ${className}`}>
      <style jsx global>{`
        .prose {
          color: var(--color-neutral-9);
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: var(--color-neutral-10);
          font-family: var(--font-serif);
          font-weight: 500;
        }
        .prose h1 { font-size: 1.5em; margin-top: 1.2em; margin-bottom: 0.6em; }
        .prose h2 { font-size: 1.3em; margin-top: 1.1em; margin-bottom: 0.5em; }
        .prose h3 { font-size: 1.15em; margin-top: 1em; margin-bottom: 0.4em; }
        .prose p { margin-bottom: 0.8em; line-height: 1.6; }
        .prose ul, .prose ol { margin-bottom: 0.8em; padding-left: 1.5em; }
        .prose li { margin-bottom: 0.25em; }
        .prose code {
          background: var(--color-neutral-2);
          padding: 0.15em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
          font-family: var(--font-mono);
          color: var(--color-accent);
        }
        .prose pre {
          background: var(--color-neutral-9);
          color: var(--color-neutral-2);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin-bottom: 0.8em;
        }
        .prose pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
        .prose blockquote {
          border-left: 3px solid var(--color-accent);
          padding-left: 1em;
          margin-left: 0;
          color: var(--color-neutral-7);
        }
        .prose a {
          color: var(--color-accent);
          text-decoration: underline;
        }
        .prose a:hover {
          color: var(--color-accent-light);
        }
        .prose table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 0.8em;
        }
        .prose th, .prose td {
          border: 1px solid var(--color-neutral-4);
          padding: 0.5em 0.75em;
          text-align: left;
        }
        .prose th {
          background: var(--color-neutral-2);
          font-weight: 500;
        }
        .prose img {
          max-width: 100%;
          border-radius: 6px;
        }
        .prose hr {
          border: none;
          border-top: 1px solid var(--color-neutral-4);
          margin: 1.5em 0;
        }
        .prose strong {
          color: var(--color-neutral-10);
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
});
