import { useState } from "react";
import blackFront from "@/assets/shirt-black-front.png";
import blackBack from "@/assets/shirt-black-back.png";
import whiteFront from "@/assets/shirt-white-front.png";
import whiteBack from "@/assets/shirt-white-back.png";

const SHIRTS = [
  { color: "black", label: "Zwart", front: blackFront, back: blackBack },
  { color: "white", label: "Wit", front: whiteFront, back: whiteBack },
] as const;

export const ShirtPreview = () => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md">
      {SHIRTS.map((s) => {
        const showBack = hovered === s.color;
        return (
          <div
            key={s.color}
            className="flex flex-col items-center"
            onMouseEnter={() => setHovered(s.color)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="relative w-full aspect-square border border-foreground bg-background overflow-hidden">
              <img
                src={s.front}
                alt={`${s.label} shirt voorkant`}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  showBack ? "opacity-0" : "opacity-100"
                }`}
                loading="lazy"
              />
              <img
                src={s.back}
                alt={`${s.label} shirt achterkant`}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  showBack ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
};
