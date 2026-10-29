import { useEffect, useRef, useState } from "react";
import longsleeveWhiteFront from "@/assets/longsleeve-white-front.png.asset.json";
import longsleeveWhiteBack from "@/assets/longsleeve-white-back.png.asset.json";
import longsleeveBlackFront from "@/assets/longsleeve-black-front-correct.png.asset.json";
import longsleeveBlackBack from "@/assets/longsleeve-black-back-correct.png.asset.json";
import walkingBlackBack from "@/assets/walkinteeachterkantzwart.webp.asset.json";
import walkingWhiteBack from "@/assets/projectsnorwalkingteewitachterkant.png.asset.json";
import capFront from "@/assets/voorkantpet-2.png.asset.json";
import capOgBack from "@/assets/acherkantpethoofdbone-2.png.asset.json";
import psBoneFront from "@/assets/voorkantpetpsbone.png.asset.json";
import psBoneSide from "@/assets/zijkantpetpsbone.png.asset.json";
import psBlackFront from "@/assets/voorkantzwartps.png.asset.json";
import psBlackSide from "@/assets/zijkantpet2ps_zwart.png.asset.json";

const SHIRTS = [
  { color: "longsleeve-walking-black", label: "Snorrig Walking Tee - zwart", front: longsleeveBlackFront.url, back: walkingBlackBack.url, backLabel: "achterkant" },
  { color: "longsleeve-walking-white", label: "Snorrig Walking Tee - wit", front: longsleeveWhiteFront.url, back: walkingWhiteBack.url, backLabel: "achterkant" },
  { color: "longsleeve-white", label: "Snorrig hart - wit", front: longsleeveWhiteFront.url, back: longsleeveWhiteBack.url, backLabel: "achterkant" },
  { color: "longsleeve-black", label: "Snorrig Hart - zwart", front: longsleeveBlackFront.url, back: longsleeveBlackBack.url, backLabel: "achterkant" },
  { color: "cap", label: "Pet OG", front: capFront.url, back: capOgBack.url, backLabel: "achterkant" },
  { color: "cap-ps-bone", label: "Pet PS - bone", front: psBoneFront.url, back: psBoneSide.url, backLabel: "zijkant" },
  { color: "cap-ps-black", label: "PET PS - ZWART", front: psBlackFront.url, back: psBlackSide.url, backLabel: "zijkant" },
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
            onPointerEnter={(e) => e.pointerType === "mouse" && showBack(s.color)}
            onPointerLeave={(e) => e.pointerType === "mouse" && showFront(s.color)}
            onClick={() => (isBack ? showFront(s.color) : showBack(s.color))}
          >
            <div className="relative w-full aspect-square border border-foreground bg-background overflow-hidden cursor-pointer select-none">
              <img
                src={s.front}
                    alt={`${s.label} voorkant`}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${s.color.startsWith("longsleeve-") ? "scale-[1.32]" : ""} ${
                  isBack ? "opacity-0" : "opacity-100"
                }`}
                loading="lazy"
                draggable={false}
              />
              <img
                src={s.back}
                    alt={`${s.label} ${s.backLabel}`}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${s.color.startsWith("longsleeve-") ? "scale-[1.32]" : ""} ${
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
