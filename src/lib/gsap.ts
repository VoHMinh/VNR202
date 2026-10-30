"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, CustomEase, DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin, SplitText);
  CustomEase.create("ink", "0.22, 1, 0.36, 1");
}

export { gsap, useGSAP, SplitText };
