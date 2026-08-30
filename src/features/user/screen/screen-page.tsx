"use client";

import Matter from "matter-js";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { getScreenDisplayBingoNumbers } from "./view-model";
import ScreenNumberCardLarge from "./components/ScreenNumberCardLarge/ScreenNumberCardLarge";
import ScreenNumberCardList from "./components/ScreenNumberCardList/ScreenNumberCardList";
import ScreenReachCount from "./components/ScreenReachCount/ScreenReachCount";
import Loading from "@/components/user/Loading";
import { useScreenRealtimeState, useStampStream } from "@/lib/realtime";
import type { StampEvent } from "@/types/bingo/realtime";
import type { StampName } from "@/types/bingo/types";
import styles from "@/styles/user/screen.module.css";

const IMAGES: Record<string, string> = {
  angry: "/ReactionIcon/angry.png",
  cracker: "/ReactionIcon/cracker.png",
  crap: "/ReactionIcon/crap.png",
  good: "/ReactionIcon/good.png",
  heart: "/ReactionIcon/heart.png",
  sad: "/ReactionIcon/sad.png",
  skull: "/ReactionIcon/skull.png",
  smile: "/ReactionIcon/smile.png",
} satisfies Record<StampName, string>;

const MAX_STAMP_BODIES = 56;
const STAMP_TEXTURE_SIZE = 842;
const WALL_THICKNESS = 96;
const WALL_INSET = 48;
const STAMP_LIFETIME_MS = 45000;

export function ScreenPage() {
  const scene = useRef<HTMLDivElement>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const runner = useRef<Matter.Runner | null>(null);
  const boundariesRef = useRef<Matter.Body[] | null>(null);
  if (boundariesRef.current === null) {
    boundariesRef.current = [];
  }
  const boundaries = boundariesRef.current;
  const stampBodiesRef = useRef<Matter.Body[] | null>(null);
  if (stampBodiesRef.current === null) {
    stampBodiesRef.current = [];
  }
  const stampBodies = stampBodiesRef.current;
  const removalTimersRef = useRef<Map<Matter.Body, number> | null>(null);
  if (removalTimersRef.current === null) {
    removalTimersRef.current = new Map();
  }
  const removalTimers = removalTimersRef.current;
  const { numbers: bingoNumbers, latestReachLog, isReady } = useScreenRealtimeState();
  const displayBingoNumbers = useMemo(
    () => getScreenDisplayBingoNumbers(bingoNumbers),
    [bingoNumbers],
  );
  const removeStampBody = useCallback(
    (body: Matter.Body) => {
      const currentEngine = engine.current;
      if (!currentEngine) {
        return;
      }

      const timer = removalTimers.get(body);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        removalTimers.delete(body);
      }

      Matter.Composite.remove(currentEngine.world, body);
      const bodyIndex = stampBodies.indexOf(body);
      if (bodyIndex >= 0) {
        stampBodies.splice(bodyIndex, 1);
      }
    },
    [removalTimers, stampBodies],
  );

  const handleStampInsert = useCallback(
    (stamp: StampEvent) => {
      const texture = IMAGES[stamp.name];
      const currentEngine = engine.current;
      if (!texture || !currentEngine) {
        return;
      }

      const radius = Math.max(32, Math.min(52, window.innerWidth * 0.035));
      const diameter = radius * 2;
      const xRange = Math.max(1, window.innerWidth - (WALL_INSET + radius) * 2);
      const x = WALL_INSET + radius + Math.random() * xRange;
      const circle = Matter.Bodies.circle(x, -radius, radius, {
        density: 0.001,
        friction: 0.08,
        frictionAir: 0.012,
        restitution: 0.28,
        render: {
          sprite: {
            texture,
            xScale: diameter / STAMP_TEXTURE_SIZE,
            yScale: diameter / STAMP_TEXTURE_SIZE,
          },
        },
      });

      Matter.Body.setVelocity(circle, {
        x: (Math.random() - 0.5) * 4,
        y: 1,
      });
      Matter.Body.setAngularVelocity(circle, (Math.random() - 0.5) * 0.16);
      Matter.Composite.add(currentEngine.world, circle);
      stampBodies.push(circle);

      while (stampBodies.length > MAX_STAMP_BODIES) {
        const oldestBody = stampBodies[0];
        if (oldestBody) {
          removeStampBody(oldestBody);
        }
      }

      const timer = window.setTimeout(() => {
        removeStampBody(circle);
      }, STAMP_LIFETIME_MS);
      removalTimers.set(circle, timer);
    },
    [removeStampBody, removalTimers, stampBodies],
  );

  useEffect(() => {
    if (!isReady || !scene.current) {
      return;
    }

    const { Engine, Render, Runner, Bodies, Composite } = Matter;
    const currentEngine = Engine.create({
      enableSleeping: true,
      positionIterations: 4,
      velocityIterations: 4,
    });
    currentEngine.gravity.y = 1;
    currentEngine.gravity.scale = 0.00125;
    engine.current = currentEngine;

    const currentRender = Render.create({
      element: scene.current,
      engine: currentEngine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        wireframes: false,
        background: "transparent",
      },
    });

    const createBoundaries = (width: number, height: number) => [
      Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width, WALL_THICKNESS, {
        isStatic: true,
        label: "stamp-floor",
        render: { visible: false },
      }),
      Bodies.rectangle(WALL_INSET - WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, {
        isStatic: true,
        label: "stamp-left-wall",
        render: { visible: false },
      }),
      Bodies.rectangle(
        width - WALL_INSET + WALL_THICKNESS / 2,
        height / 2,
        WALL_THICKNESS,
        height * 2,
        {
          isStatic: true,
          label: "stamp-right-wall",
          render: { visible: false },
        },
      ),
    ];

    const syncSceneSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      Render.setPixelRatio(currentRender, Math.min(window.devicePixelRatio || 1, 2));
      Render.setSize(currentRender, width, height);
      if (boundaries.length > 0) {
        Composite.remove(currentEngine.world, boundaries);
      }
      boundaries.splice(0, boundaries.length, ...createBoundaries(width, height));
      Composite.add(currentEngine.world, boundaries);
    };

    syncSceneSize();
    window.addEventListener("resize", syncSceneSize, { passive: true });

    Render.run(currentRender);
    runner.current = Runner.create({
      delta: 1000 / 60,
      maxUpdates: 2,
    });
    Runner.run(runner.current, currentEngine);

    return () => {
      window.removeEventListener("resize", syncSceneSize);
      removalTimers.forEach((timer) => window.clearTimeout(timer));
      removalTimers.clear();
      stampBodies.length = 0;
      boundaries.length = 0;
      if (runner.current) {
        Runner.stop(runner.current);
        runner.current = null;
      }
      Render.stop(currentRender);
      Composite.clear(currentEngine.world, false, true);
      Engine.clear(currentEngine);
      currentRender.canvas.remove();
      currentRender.textures = {};
      engine.current = null;
    };
  }, [boundaries, isReady, removalTimers, stampBodies]);

  useStampStream(handleStampInsert);

  if (!isReady) {
    return <Loading />;
  }

  return (
    <>
      <div ref={scene} className={styles.scene} />
      <div className={styles.overlay}>
        <div className={styles.layout}>
          <div className={styles.mainContent}>
            <ScreenNumberCardLarge bingoNumber={displayBingoNumbers.large} />
          </div>
          <div className={styles.sideContent}>
            <ScreenNumberCardList bingoNumber={displayBingoNumbers.list} />
            <ScreenReachCount count={latestReachLog?.reach_num ?? 0} />
          </div>
        </div>
      </div>
    </>
  );
}
