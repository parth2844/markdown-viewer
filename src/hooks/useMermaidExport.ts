import { useState, type RefObject } from 'react';

export function useMermaidExport(containerRef: RefObject<HTMLDivElement | null>, theme: 'dark' | 'light') {
  const [copiedPNG, setCopiedPNG] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getSvgElement = (): SVGSVGElement | null => {
    if (!containerRef.current) return null;
    return containerRef.current.querySelector('svg');
  };

  const getHeadingAbove = (): string | null => {
    if (!containerRef.current) return null;
    
    const element = containerRef.current;
    const parentBody = element.closest('.markdown-body');
    if (!parentBody) return null;
    
    const headings = Array.from(parentBody.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    if (headings.length === 0) return null;
    
    let closestHeading: Element | null = null;
    
    for (const heading of headings) {
      const position = element.compareDocumentPosition(heading);
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        closestHeading = heading;
      }
    }
    
    return closestHeading ? closestHeading.textContent : null;
  };

  const getSanitizedFileName = (): string => {
    const heading = getHeadingAbove();
    if (!heading) return 'mermaid-diagram.png';
    
    const sanitized = heading
      .trim()
      .toLowerCase()
      .replace(/[\/\\:\*\?"<>\|.]/g, '') // remove illegal characters and dots
      .replace(/\s+/g, '-')              // replace spaces with hyphens
      .replace(/[^a-z0-9\-_]/g, '-')     // replace any other non-alphanumeric chars with hyphens
      .replace(/-+/g, '-')              // collapse multiple hyphens
      .replace(/^-+|-+$/g, '');          // trim leading/trailing hyphens
      
    return sanitized ? `${sanitized}.png` : 'mermaid-diagram.png';
  };

  const convertSvgToPngBlob = (svgEl: SVGSVGElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const rect = svgEl.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;

        if (!width || !height) {
          const viewBox = svgEl.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.split(/\s+/).map(Number);
            if (parts.length === 4) {
              width = parts[2];
              height = parts[3];
            }
          }
        }

        if (!width) width = 800;
        if (!height) height = 600;

        const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
        svgClone.setAttribute('width', width.toString());
        svgClone.setAttribute('height', height.toString());

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const base64 = window.btoa(unescape(encodeURIComponent(svgString)));
        const url = 'data:image/svg+xml;base64,' + base64;

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const scale = 2; // 2x scale for high resolution
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get 2d canvas context'));
              return;
            }

            // Fill canvas background matching theme
            ctx.fillStyle = theme === 'dark' ? '#2e3440' : '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scale and draw SVG image
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to generate PNG blob'));
              }
            }, 'image/png');
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load SVG image source'));
        };

        img.src = url;
      } catch (e) {
        reject(e);
      }
    });
  };

  const copyPNGToClipboard = async () => {
    const svgEl = getSvgElement();
    if (!svgEl) return;

    try {
      const blob = await convertSvgToPngBlob(svgEl);
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setCopiedPNG(true);
      setTimeout(() => setCopiedPNG(false), 2000);
    } catch (err) {
      console.error('Failed to copy PNG to clipboard:', err);
      alert('Could not copy image to clipboard. Please try using the Download PNG button.');
    }
  };

  const downloadPNG = async () => {
    const svgEl = getSvgElement();
    if (!svgEl) return;

    setDownloading(true);
    try {
      const blob = await convertSvgToPngBlob(svgEl);
      const url = URL.createObjectURL(blob);
      
      const fileName = getSanitizedFileName();
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  return {
    copiedPNG,
    downloading,
    copyPNGToClipboard,
    downloadPNG,
    getHeadingAbove,
  };
}
