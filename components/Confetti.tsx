import React, { useEffect, useState } from 'react';

const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<Array<{id: number, left: number, color: string, duration: number}>>([]);

  useEffect(() => {
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 3 + 2,
    }));
    setParticles(newParticles);

    // Cleanup after animation
    const timer = setTimeout(() => setParticles([]), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
