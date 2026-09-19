"use client";

import { useState } from "react";
import {
  HOMEPAGE_BEATS,
  HOMEPAGE_RANGE,
  HOMEPAGE_RUNWAY,
  frameForHomepageProgress,
} from "@/config/sections";
import { ScrollStage } from "@/components/ScrollEngine";
import FrameCanvas from "@/components/FrameCanvas";
import ScrollCue from "@/components/ScrollCue";
import HomeCaption from "./HomeCaption";
import SectionNav from "./SectionNav";

/**
 * The homepage as one continuous scroll.
 *
 * A single `ScrollStage` covers every frame from the first captioned stop to
 * the last (see `HOMEPAGE_RANGE` in `config/sections.ts`), pinned once for the
 * whole reel instead of once per section. The three captions it used to cut
 * between are just siblings inside that one pin now, each fading in and out on
 * its own slice of the reel's progress — so there is one canvas, one loader,
 * and no hard cut where a section used to hand off to the next.
 */
export default function SinglePage() {
  const [ready, setReady] = useState(false);

  return (
    <div className="singlePageContainer">
      <ScrollStage
        id="home-reel"
        className="chapter"
        range={HOMEPAGE_RANGE}
        mapFrame={frameForHomepageProgress}
        style={{ height: `${HOMEPAGE_RUNWAY}vh` }}
      >
        {/* Outside the pin: `.chapter__pin` gets `perspective` for the
            captions' 3D tilt below, and a `position: fixed` descendant of a
            `perspective` ancestor would be fixed to that ancestor's box
            instead of the viewport. */}
        <SectionNav />

        <div className={`chapter__pin${ready ? " is-ready" : ""}`}>
          <FrameCanvas className="chapter__canvas" onReady={setReady} />
          <div className="chapter__scrim" aria-hidden="true" />

          {HOMEPAGE_BEATS.map((beat) => (
            <HomeCaption key={beat.id} beat={beat} />
          ))}

          <ScrollCue ready={ready} />
        </div>
      </ScrollStage>
    </div>
  );
}
