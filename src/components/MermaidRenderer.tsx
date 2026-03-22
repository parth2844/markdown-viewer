import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  code: string;
  theme: 'dark' | 'light';
}

mermaid.initialize({
  startOnLoad: false,
});

export function MermaidRenderer({ code, theme }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      theme: theme === 'dark' ? 'dark' : 'default',
      startOnLoad: false,
    });
    
    let isMounted = true;
    
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.round(Math.random() * 10000000)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (e) {
        console.error('Mermaid render error', e);
        if (isMounted) {
          setSvg(`<div class="error" style="color: red; padding: 1rem;">Failed to render Mermaid diagram: ${(e as Error).message}</div>`);
        }
      }
    };
    
    renderDiagram();
    
    return () => {
      isMounted = false;
    };
  }, [code, theme]);

  return (
    <div 
      className="mermaid-block no-print" 
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}
