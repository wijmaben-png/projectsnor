import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PixelImageProps {
  src: string;
  alt: string;
  /** Number of columns/rows in the pixel grid. Higher = finer pixels. */
  cols?: number;
  rows?: number;
  /** Total animation duration in ms */
  duration?: number;
  /** Delay before animation starts in ms */
  startDelay?: number;
  className?: string;
}

/**
 * Renders an image revealed block-by-block in a chunky pixel grid,
 * filling diagonally from top-left to bottom-right.
 * Each tile is a div with a background-image positioned to show its slice
 * of the source image, and animates from opacity 0 → 1 with a stagger
 * proportional to (col + row) so the wave moves along the diagonal.
 */
export const PixelImage = ({
  src,
  alt,
  cols = 18,
  rows = 18,
  duration = 1800,
  startDelay = 250,
  className,
}: PixelImageProps) => {
  const tiles = useMemo(() => {
    const list: { x: number; y: number; delay: number }[] = [];
    const maxDiag = cols + rows - 2;
    // Per-step delay so the last diagonal finishes within `duration`.
    // Each tile fades in over ~one "step" worth of time.
    const stepMs = duration / (maxDiag + 4);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        list.push({ x, y, delay: (x + y) * stepMs });
      }
    }
    return list;
  }, [cols, rows, duration]);

  const tileW = 100 / cols;
  const tileH = 100 / rows;

  return (
    <div
      className={cn("relative", className)}
      role="img"
      aria-label={alt}
    >
      {tiles.map(({ x, y, delay }) => (
        <div
          key={`${x}-${y}`}
          className="absolute pixel-tile"
          style={{
            left: `${x * tileW}%`,
            top: `${y * tileH}%`,
            width: `${tileW}%`,
            height: `${tileH}%`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${cols * 100}% ${rows * 100}%`,
            backgroundPosition: `${(x / (cols - 1)) * 100}% ${(y / (rows - 1)) * 100}%`,
            backgroundRepeat: "no-repeat",
            animationDelay: `${startDelay + delay}ms`,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </div>
  );
};
