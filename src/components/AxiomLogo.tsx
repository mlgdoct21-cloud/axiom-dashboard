'use client';

export default function AxiomLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        flexShrink: 0,
      }}
    >
      A
    </div>
  );
}
