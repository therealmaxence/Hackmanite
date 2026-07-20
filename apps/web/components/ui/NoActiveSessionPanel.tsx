'use client';
import Image from 'next/image';

export default function NoActiveSessionPanel({ message }: { message: string }) {
  return (
    <div className="h-[400px] signature-card flex flex-col items-center justify-center gap-6">
      <Image
        src="/hackmanite_main_nobg.png" alt="Hackmanite" width={180} height={180} draggable={false}
        style={{ objectFit: 'contain', opacity: 0.15, userSelect: 'none', pointerEvents: 'none' }}
      />
      <p className="text-sm text-white/40 font-mono font-medium">{message}</p>
    </div>
  );
}
