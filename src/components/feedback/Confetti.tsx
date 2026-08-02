import type { CSSProperties } from 'react'

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 32 }, (_, index) => (
        <i
          key={index}
          style={{
            '--x': `${(index * 37) % 100}vw`,
            '--delay': `${(index % 8) * 0.07}s`,
            '--spin': `${index % 2 ? 540 : -540}deg`,
            '--color': ['#e7c477', '#f46f61', '#54b899', '#f6f0df'][index % 4],
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
