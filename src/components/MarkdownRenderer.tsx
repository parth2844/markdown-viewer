import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { MermaidRenderer } from './MermaidRenderer';
import './MarkdownRenderer.css';

const CodeBlock = ({ children, language, theme, rest }: any) => {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <button 
        className="code-copy-btn" 
        onClick={handleCopy}
        title="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <SyntaxHighlighter
        {...rest}
        PreTag="div"
        children={codeString}
        language={language}
        style={theme === 'dark' ? nord : vs}
      />
    </div>
  );
};

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
              <CodeBlock language={language} theme={theme} rest={rest}>
                {children}
              </CodeBlock>
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
