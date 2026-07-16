'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownView({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to preview yet. Switch to Edit and start writing.
      </p>
    )
  }

  return (
    <div className="text-sm leading-relaxed text-foreground/90 [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-2xl font-semibold text-foreground text-balance">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-3 text-xl font-semibold text-foreground text-balance">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-relaxed text-pretty">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-5 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-5 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-success underline decoration-success/40 underline-offset-2 hover:decoration-success"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-border pl-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = (className ?? '').includes('language-')
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-[0.8rem] text-foreground/90">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em] text-foreground">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-4">{children}</pre>,
          hr: () => <hr className="my-6 border-border" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-left">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
