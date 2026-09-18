"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Initializes AOS (Animate On Scroll) library for cinematic text & element animations.
 */
export default function AOSInit() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-out-cubic",
      once: false,
      mirror: true,
    });
    document.body.setAttribute("data-aos-easing", "ease-out-cubic");
    return () => {
      document.body.removeAttribute("data-aos-easing");
    };
  }, []);

  return null;
}

