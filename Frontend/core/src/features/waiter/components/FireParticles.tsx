import React, { useMemo } from 'react';
import '../styles/Gamification.css';

interface FireParticlesProps {
  count: number;
}

export const FireParticles: React.FC<FireParticlesProps> = ({ count }) => {
  // Generamos muchas más partículas para que se vea intenso
  const displayCount = count * 8;

  const particles = useMemo(() => {
    return Array.from({ length: displayCount }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // Posición horizontal aleatoria
      animationDuration: 1.5 + Math.random() * 2.5, // Duración más rápida (1.5s - 4s)
      animationDelay: Math.random() * 5, 
      size: 6 + Math.random() * 10, // Tamaño más grande (6px - 16px)
      opacity: 0.6 + Math.random() * 0.4, // Más opacos (0.6 - 1.0)

    }));
  }, [displayCount]);

  if (count === 0) return null;

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="fire-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.animationDuration}s`,
            animationDelay: `-${p.animationDelay}s`, // Delay negativo para que la animación ya esté en curso al renderizar
            opacity: p.opacity,
          }}
        />
      ))}
    </>
  );
};
