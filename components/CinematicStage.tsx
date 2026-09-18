"use client";

import { useState } from "react";
import { useScrollEngine } from "./ScrollEngine";
import FrameCanvas from "./FrameCanvas";
import SceneText from "./SceneText";
import StoryLayer from "./StoryLayer";
import Navbar from "./Navbar";
import WhatsAppButton from "./WhatsAppButton";

/**
 * The whole site: one tall runway with a pinned stage inside it.
 *
 * Scrolling the runway is ordinary native scrolling — nothing is intercepted or
 * hijacked. The pinned stage simply redraws itself as the runway passes.
 */
export default function CinematicStage() {
  const { stageRef } = useScrollEngine();
  const [ready, setReady] = useState(false);

  return (
    <div
      id="top"
      ref={stageRef}
      className={`stage${ready ? " is-ready" : ""}`}
    >
      <div className="stage__pin">
        <FrameCanvas onReady={setReady} />
        <div className="stage__scrim" aria-hidden="true" />
        <SceneText ready={ready} />
        <Navbar />
        <StoryLayer />
        <WhatsAppButton />
      </div>
    </div>
  );
}
