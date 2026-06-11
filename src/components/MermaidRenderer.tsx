import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Download, Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useMermaidExport } from '../hooks/useMermaidExport';
import './MermaidRenderer.css';

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
    <div className="mermaid-wrapper">
      {svg && !isError && (
        <div className="mermaid-toolbar no-print">
          <button
            onClick={() => setIsLightboxOpen(true)}
            className="mermaid-btn"
            title="Open fullscreen lightbox"
          >
            <Maximize2 size={12} />
            <span>Fullscreen</span>
          </button>
          
          <button
            onClick={copyPNGToClipboard}
            className="mermaid-btn"
            title="Copy as PNG to clipboard"
          >
            {copiedPNG ? <Check size={12} className="text-nord14" /> : <Copy size={12} />}
            <span>{copiedPNG ? 'Copied PNG' : 'Copy PNG'}</span>
          </button>
          
          <button
            onClick={downloadPNG}
            className="mermaid-btn"
            title="Download PNG image file"
            disabled={downloading}
          >
            <Download size={12} className={downloading ? 'animate-bounce' : ''} />
            <span>{downloading ? 'Downloading...' : 'Download PNG'}</span>
          </button>
        </div>
      )}
      
      <div 
        className="mermaid-block" 
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }} 
      />

      {isLightboxOpen && createPortal(
        <div 
          className="mermaid-lightbox-backdrop no-print"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="mermaid-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mermaid-modal-header">
              <h3 className="mermaid-modal-title">
                {getHeadingAbove() || 'Diagram Preview'}
              </h3>
              
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="mermaid-modal-close"
                title="Close lightbox"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Diagram Content */}
            <div 
              className="mermaid-modal-body"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            
            {/* Modal Footer Actions */}
            <div className="mermaid-modal-footer">
              <button
                onClick={copyPNGToClipboard}
                className="mermaid-btn"
              >
                {copiedPNG ? <Check size={14} className="text-nord14" /> : <Copy size={14} />}
                <span>{copiedPNG ? 'Copied PNG' : 'Copy PNG'}</span>
              </button>
              
              <button
                onClick={downloadPNG}
                className="mermaid-btn"
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

