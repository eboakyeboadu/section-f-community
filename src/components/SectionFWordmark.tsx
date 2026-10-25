import React from 'react';

interface SectionFWordmarkProps {
  className?: string;
  size?: number;
}

export const SectionFWordmark: React.FC<SectionFWordmarkProps> = ({
  className = "",
  size
}) => {
  const style = size ? { fontSize: `${size * 0.45}px` } : undefined;

  return (
    <div
      className={`flex items-center justify-center select-none ${className}`}
      style={style}
      aria-label="Section F"
    >
      <span
        className="font-serif font-bold tracking-wide text-white"
        style={{ fontSize: size ? `${size * 0.45}px` : '1.25rem', lineHeight: 1.1 }}
      >
        Section&nbsp;F
      </span>
    </div>
  );
};
