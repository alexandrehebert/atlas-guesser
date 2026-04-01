'use client';

export default function GameBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-85"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 14% 14%, rgba(251, 191, 36, 0.18), transparent 30%)',
          'radial-gradient(circle at 84% 18%, rgba(56, 189, 248, 0.16), transparent 28%)',
          'radial-gradient(circle at 52% 82%, rgba(244, 114, 182, 0.10), transparent 30%)',
        ].join(','),
      }}
    />
  );
}
