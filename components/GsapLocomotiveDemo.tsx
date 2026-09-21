"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function GsapLocomotiveDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !cardRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="my-12 px-6 max-w-4xl mx-auto"
      data-scroll
      data-scroll-speed="0.1"
    >
      <div
        ref={cardRef}
        className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl text-center"
      >
        <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold tracking-wider uppercase mb-3">
          Powered by Locomotive Scroll & GSAP
        </span>
        <h3 className="text-2xl font-bold text-white mb-2">
          Smooth Parallax & ScrollTrigger Animations
        </h3>
        <p className="text-white/70 text-sm max-w-lg mx-auto">
          This component demonstrates GSAP ScrollTrigger working synchronously
          with Locomotive Scroll v5 smooth scrolling and parallax effects.
        </p>
      </div>
    </div>
  );
}
