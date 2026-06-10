import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Download, Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const { 
    copiedPNG, 
    downloading, 
    copyPNGToClipboard, 
    downloadPNG,
    getHeadingAbove 
  } = useMermaidExport(containerRef, theme);

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

  // Keydown listener for Escape key to close modal
  useEffect(() => {
    if (!isLightboxOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

  const isError = svg.includes('class="error"');

  return (
    <div className="mermaid-block relative group flex flex-col items-center">
      {svg && !isError && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 no-print">
          <button
            onClick={() => setIsLightboxOpen(true)}
            className="px-2 py-1 bg-nord1 dark:bg-nord2 hover:bg-nord3 text-nord6 rounded border border-nord3 cursor-pointer shadow-md flex items-center gap-1 text-xs transition-all duration-150"
            title="Open fullscreen lightbox"
          >
            <Maximize2 size={12} />
            <span>Fullscreen</span>
          </button>
          
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

      {isLightboxOpen && createPortal(
        <div 
          className="fixed inset-0 bg-nord0/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8 no-print"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] bg-nord6 dark:bg-nord0 border border-nord4 dark:border-nord2 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-between animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between border-b border-nord4 dark:border-nord2 pb-3 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-nord3 dark:text-nord4">
                {getHeadingAbove() || 'Diagram Preview'}
              </h3>
              
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-full hover:bg-nord5 dark:hover:bg-nord1 text-nord3 dark:text-nord4 hover:text-nord0 dark:hover:text-nord6 transition-colors duration-150 cursor-pointer"
                title="Close lightbox"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Diagram Content */}
            <div 
              className="w-full flex-1 overflow-auto flex items-center justify-center p-2 [&>svg]:max-w-full [&>svg]:max-h-[60vh] [&>svg]:w-auto [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            
            {/* Modal Footer Actions */}
            <div className="w-full flex items-center justify-end gap-2 border-t border-nord4 dark:border-nord2 pt-3 mt-4">
              <button
                onClick={copyPNGToClipboard}
                className="px-3 py-1.5 bg-nord1 dark:bg-nord2 hover:bg-nord3 text-nord6 rounded border border-nord3 cursor-pointer shadow-md flex items-center gap-1.5 text-xs transition-all duration-150"
              >
                {copiedPNG ? <Check size={14} className="text-nord14" /> : <Copy size={14} />}
                <span>{copiedPNG ? 'Copied PNG' : 'Copy PNG'}</span>
              </button>
              
              <button
                onClick={downloadPNG}
                className="px-3 py-1.5 bg-nord1 dark:bg-nord2 hover:bg-nord3 text-nord6 rounded border border-nord3 cursor-pointer shadow-md flex items-center gap-1.5 text-xs transition-all duration-150"
                disabled={downloading}
              >
                <Download size={14} className={downloading ? 'animate-bounce' : ''} />
                <span>{downloading ? 'Downloading...' : 'Download PNG'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

