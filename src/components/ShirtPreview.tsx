import { useEffect, useRef, useState } from "react";
import blackFront from "@/assets/shirt-black-front.png";
import blackBack from "@/assets/shirt-black-back.png";
import whiteFront from "@/assets/shirt-white-front.png";
import whiteBack from "@/assets/shirt-white-back.png";

const SHIRTS = [
  { color: "black", label: "Zwart", front: blackFront, back: blackBack },
  { color: "white", label: "Wit", front: whiteFront, back: whiteBack },
] as const;

const FLIP_BACK_MS = 2500;

export const ShirtPreview = () => {
  const [activeBack, setActiveBack] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const showBack = (color: string) => {
    clearTimer();
    setActiveBack(color);
    timeoutRef.current = window.setTimeout(() => {
      setActiveBack((curr) => (curr === color ? null : curr));
      timeoutRef.current = null;
    }, FLIP_BACK_MS);
  };

  const showFront = (color: string) => {
    clearTimer();
    setActiveBack((curr) => (curr === color ? null : curr));
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md">
      {SHIRTS.map((s) => {
        const isBack = activeBack === s.color;
        return (
          <div
            key={s.color}
            className="flex flex-col items-center"
            onMouseEnter={() => showBack(s.color)}
            onMouseLeave={() => showFront(s.color)}
            onClick={() => (isBack ? showFront(s.color) : showBack(s.color))}
          >
            <div className="relative w-full aspect-square border border-foreground bg-background overflow-hidden cursor-pointer select-none">
              <img
                src={s.front}
                alt={`${s.label} shirt voorkant`}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  isBack ? "opacity-0" : "opacity-100"
                }`}
                loading="lazy"
                draggable={false}
              />
              <img
                src={s.back}
                alt={`${s.label} shirt achterkant`}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  isBack ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
                draggable={false}
              />
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
};
