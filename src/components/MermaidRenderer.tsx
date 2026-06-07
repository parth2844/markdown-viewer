import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Download } from 'lucide-react';
import { useMermaidExport } from '../hooks/useMermaidExport';

interface MermaidRendererProps {
  code: string;
  theme: 'dark' | 'light';
}

mermaid.initialize({
  startOnLoad: false,
  flowchart: { htmlLabels: false },
});

export function MermaidRenderer({ code, theme }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  
  const { copiedPNG, downloading, copyPNGToClipboard, downloadPNG } = useMermaidExport(containerRef, theme);

  useEffect(() => {
    mermaid.initialize({
      theme: theme === 'dark' ? 'dark' : 'default',
      startOnLoad: false,
      flowchart: { htmlLabels: false },
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

  const isError = svg.includes('class="error"');

  return (
    <div className="mermaid-block relative group flex flex-col items-center">
      {svg && !isError && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 no-print">
          <button
            onClick={copyPNGToClipboard}
            className="px-2 py-1 bg-nord1 dark:bg-nord2 hover:bg-nord3 text-nord6 rounded border border-nord3 cursor-pointer shadow-md flex items-center gap-1 text-xs transition-all duration-150"
            title="Copy as PNG to clipboard"
          >
            {copiedPNG ? <Check size={12} className="text-nord14" /> : <Copy size={12} />}
            <span>{copiedPNG ? 'Copied PNG' : 'Copy PNG'}</span>
          </button>
          
          <button
            onClick={downloadPNG}
            className="px-2 py-1 bg-nord1 dark:bg-nord2 hover:bg-nord3 text-nord6 rounded border border-nord3 cursor-pointer shadow-md flex items-center gap-1 text-xs transition-all duration-150"
            title="Download PNG image file"
            disabled={downloading}
          >
            <Download size={12} className={downloading ? 'animate-bounce' : ''} />
            <span>{downloading ? 'Downloading...' : 'Download PNG'}</span>
          </button>
        </div>
      )}
      
      <div 
        className="w-full overflow-x-auto flex justify-center" 
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  );
}

