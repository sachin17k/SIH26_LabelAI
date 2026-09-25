import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye } from 'lucide-react';
import { ComplianceFinding } from '../../types';

interface BoundingBox {
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] %
  label: string;
  category: string;
  status: string;
  severity: string;
  confidence: number;
}

interface CanvasEvidenceViewerProps {
  imageUrl: string;
  findings: ComplianceFinding[];
  selectedFindingId?: number | null;
  onSelectFinding?: (findingId: number) => void;
}

export const CanvasEvidenceViewer: React.FC<CanvasEvidenceViewerProps> = ({
  imageUrl,
  findings,
  selectedFindingId,
  onSelectFinding
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
      draw();
    };
  }, [imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      draw();
    }
  }, [scale, findings, selectedFindingId, imageLoaded]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    // Draw background package image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw bounding boxes for findings
    findings.forEach((f) => {
      if (!f.bounding_box) return;
      const [ymin, xmin, ymax, xmax] = f.bounding_box;

      const x = (xmin / 100) * canvas.width;
      const y = (ymin / 100) * canvas.height;
      const w = ((xmax - xmin) / 100) * canvas.width;
      const h = ((ymax - ymin) / 100) * canvas.height;

      const isSelected = selectedFindingId === f.id;

      // Determine color
      let strokeColor = '#16a34a'; // Green (default)
      let fillColor = 'rgba(22, 163, 74, 0.15)';
      
      if (f.severity === 'CRITICAL' || f.category === 'MISSING_DECLARATION') {
        strokeColor = '#dc2626'; // Red
        fillColor = 'rgba(220, 38, 38, 0.2)';
      } else if (f.severity === 'MAJOR' || f.category === 'INVALID_UNIT' || f.category === 'MRP_ISSUE') {
        strokeColor = '#ca8a04'; // Amber/Yellow
        fillColor = 'rgba(202, 138, 4, 0.2)';
      }

      if (isSelected) {
        strokeColor = '#2563eb'; // Blue highlight for selected
        fillColor = 'rgba(37, 99, 235, 0.3)';
      }

      ctx.save();
      ctx.lineWidth = isSelected ? 4 : 2.5;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;

      // Draw box rectangle
      ctx.strokeRect(x, y, w, h);
      ctx.fillRect(x, y, w, h);

      // Draw label pill
      ctx.fillStyle = strokeColor;
      const label = `${f.requirement.split('-')[0].trim()}: ${f.category}`;
      ctx.font = 'bold 12px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, Math.max(0, y - 22), textWidth + 12, 22);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 6, Math.max(14, y - 6));
      ctx.restore();
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelectFinding) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check which bounding box was clicked
    for (const f of findings) {
      if (!f.bounding_box) continue;
      const [ymin, xmin, ymax, xmax] = f.bounding_box;
      const x = (xmin / 100) * canvas.width;
      const y = (ymin / 100) * canvas.height;
      const w = ((xmax - xmin) / 100) * canvas.width;
      const h = ((ymax - ymin) / 100) * canvas.height;

      if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + h) {
        onSelectFinding(f.id);
        break;
      }
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-slate-300">
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <Eye className="w-4 h-4 text-sky-400" />
          <span>Interactive Visual Evidence Inspector</span>
          <span className="text-slate-500 font-normal">| Click box to view statutory rule</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale(Math.max(0.4, scale - 0.15))}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-1 text-slate-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(2.0, scale + 0.15))}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(0.7)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative overflow-auto max-h-[620px] p-4 flex items-center justify-center bg-slate-950/50 custom-scrollbar">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="rounded shadow-2xl cursor-crosshair max-w-full transition-all duration-75"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 text-xs border-t border-slate-800/80">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            <span className="text-slate-300">Compliant</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
            <span className="text-slate-300">Warning / Review Required</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />
            <span className="text-slate-300">Statutory Violation</span>
          </span>
        </div>
        <span className="text-slate-500 text-[11px]">
          PaddleOCR Spatial Coordinate Engine
        </span>
      </div>

    </div>
  );
};
