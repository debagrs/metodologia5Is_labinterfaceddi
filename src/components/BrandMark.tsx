import React from 'react';

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
  priority?: boolean;
}

export default function BrandMark({
  className = '',
  compact = false,
  priority = false,
}: BrandMarkProps) {
  return (
    <img
      src={compact ? '/logo-5is-58x50.png' : '/logo-5is.svg'}
      alt="Metodologia 5I’s"
      width={compact ? 58 : 272}
      height={compact ? 50 : 133}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`block object-contain ${className}`}
    />
  );
}
