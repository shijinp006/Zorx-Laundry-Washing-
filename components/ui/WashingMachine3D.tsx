"use client";

import { motion } from "motion/react";

export default function WashingMachine3D() {
  return (
    <div className="washer3dContainer">
      <div className="washer3d">
        {/* Outer body frame */}
        <div className="washer3d__body">
          {/* Top control panel */}
          <div className="washer3d__panel">
            <div className="washer3d__knob">
              <div className="washer3d__knobDot" />
            </div>
            <div className="washer3d__display">
              <span className="washer3d__status">WASHING</span>
              <span className="washer3d__timer">00:24</span>
            </div>
            <div className="washer3d__buttons">
              <span className="washer3d__btn washer3d__btn--active" />
              <span className="washer3d__btn" />
            </div>
          </div>

          {/* Main door & glass drum */}
          <div className="washer3d__doorRing">
            <div className="washer3d__doorGlass">
              {/* Rotating inner drum */}
              <div className="washer3d__drum">
                <div className="washer3d__baffle washer3d__baffle--1" />
                <div className="washer3d__baffle washer3d__baffle--2" />
                <div className="washer3d__baffle washer3d__baffle--3" />
                {/* Clothes tumbling inside */}
                <div className="washer3d__clothes washer3d__clothes--blue" />
                <div className="washer3d__clothes washer3d__clothes--white" />
                <div className="washer3d__clothes washer3d__clothes--cyan" />
              </div>

              {/* Water wash spin effect */}
              <div className="washer3d__water" />
              <div className="washer3d__bubble washer3d__bubble--1" />
              <div className="washer3d__bubble washer3d__bubble--2" />
              <div className="washer3d__bubble washer3d__bubble--3" />
              <div className="washer3d__bubble washer3d__bubble--4" />
            </div>
          </div>

          {/* Bottom drawer line & feet */}
          <div className="washer3d__bottomDrawer" />
        </div>
      </div>
    </div>
  );
}
