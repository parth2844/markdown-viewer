
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidRenderer } from './MermaidRenderer';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  theme: 'light' | 'dark';
}

export function MarkdownRenderer({ content, theme }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body ${theme}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props: any) {
            const {children, className, node, ref, ...rest} = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (language === 'mermaid') {
              return <MermaidRenderer code={String(children).replace(/\n$/, '')} theme={theme} />;
            }
            
            return match ? (
              <SyntaxHighlighter
                {...rest}
                PreTag="div"
                children={String(children).replace(/\n$/, '')}
                language={language}
                style={theme === 'dark' ? vscDarkPlus : vs}
              />
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
