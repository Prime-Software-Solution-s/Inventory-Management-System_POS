import { useEffect, useRef } from 'react';
import { renderBarcodeSvg } from '../../utils/barcode';

const BarcodePreview = ({
  value,
  label,
  caption,
  compact = false,
  showLabel = true,
  showValue = true,
}) => {
  const svgRef = useRef(null);
  const accessibleLabel = label || caption || value || 'barcode';

  useEffect(() => {
    renderBarcodeSvg(svgRef.current, value, {
      compact,
      lineColor:
        typeof window !== 'undefined'
          ? window.getComputedStyle(svgRef.current?.parentElement || svgRef.current).color
          : undefined,
    });
  }, [compact, value]);

  return (
    <div className={`barcode-card ${compact ? 'barcode-card-compact' : ''}`}>
      <svg ref={svgRef} aria-label={`Barcode for ${accessibleLabel}`} />
      {showLabel ? <strong>{label}</strong> : null}
      {showValue ? <span>{value}</span> : null}
      {caption ? <small>{caption}</small> : null}
    </div>
  );
};

export { BarcodePreview };
