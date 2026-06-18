'use client';

import React from 'react';
import Image from 'next/image';

interface NoActiveSessionPanelProps {
  message: string;
}

export default function NoActiveSessionPanel({ message }: NoActiveSessionPanelProps) {
  return (
    <div className="h-[400px] signature-card flex flex-col items-center justify-center gap-6">
      <Image
        src="/hackmanite_main_nobg.png"
        alt="Hackmanite"
        width={180}
        height={180}
        style={{ objectFit: 'contain', opacity: 0.15, userSelect: 'none', pointerEvents: 'none' }}
        draggable={false}
      />
      <p className="text-sm text-white/40 font-mono font-medium">{message}</p>
    </div>
  );
}
