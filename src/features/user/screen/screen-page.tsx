"use client";

import Matter from "matter-js";
import { useEffect, useMemo, useRef } from "react";

import { getScreenDisplayBingoNumbers } from "./view-model";
import { NumberCardLarge, NumberCardList, ReachCount } from "@/components/user";
import { subscribeStampTriggers, useLatestReachLog, useNumbers } from "@/lib/realtime";
import type { NumberRow, ReachLogRow } from "@/types/bingo/types";
import styles from "@/styles/user/screen.module.css";

interface ScreenPageProps {
  initialNumbers: NumberRow[];
  initialReachLog: ReachLogRow | null;
}

const IMAGES: Record<string, string> = {
  angry: "/ReactionIcon/angry.png",
  cracker: "/ReactionIcon/cracker.png",
  crap: "/ReactionIcon/crap.png",
  good: "/ReactionIcon/good.png",
  heart: "/ReactionIcon/heart.png",
  peace: "/ReactionIcon/peace.png",
  sad: "/ReactionIcon/sad.png",
  skull: "/ReactionIcon/skull.png",
  smile: "/ReactionIcon/smile.png",
  surprise: "/ReactionIcon/surprise.png",
};

export function ScreenPage({ initialNumbers, initialReachLog }: ScreenPageProps) {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const runner = useRef<Matter.Runner | null>(null);
  const bingoNumbers = useNumbers(initialNumbers);
  const latestReachLog = useLatestReachLog(initialReachLog);
  const displayBingoNumbers = useMemo(
    () => getScreenDisplayBingoNumbers(bingoNumbers),
    [bingoNumbers],
  );

  useEffect(() => {
    if (!scene.current) {
      return;
    }

    const { Engine, Render, Runner, Bodies, Composite } = Matter;
    engine.current = Engine.create();
    render.current = Render.create({
      element: scene.current,
      engine: engine.current,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: "transparent",
      },
    });

    const rightWall = Bodies.rectangle(
      window.innerWidth,
      window.innerHeight / 2,
      1,
      window.innerHeight,
      {
        isStatic: true,
        render: { visible: false },
      },
    );
    const leftWall = Bodies.rectangle(0, window.innerHeight / 2, 1, window.innerHeight, {
      isStatic: true,
      render: { visible: false },
    });

    Composite.add(engine.current.world, [leftWall, rightWall]);
    Render.run(render.current);

    runner.current = Runner.create();
    Runner.run(runner.current, engine.current);

    return () => {
      if (runner.current) {
        Matter.Runner.stop(runner.current);
        runner.current = null;
      }
      if (render.current) {
        Matter.Render.stop(render.current);
      }
      if (engine.current) {
        Matter.Composite.clear(engine.current.world, true);
        Matter.Engine.clear(engine.current);
      }
      if (render.current?.canvas) {
        render.current.canvas.remove();
        render.current.textures = {};
      }
      render.current = null;
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    const teardown = subscribeStampTriggers((stamp) => {
      const texture = IMAGES[stamp.name];
      if (!texture || !engine.current) {
        return;
      }

      const x = Math.random() * window.innerWidth;
      const circle = Matter.Bodies.circle(x, 0, 35, {
        restitution: 0.8,
        render: {
          sprite: {
            texture,
            xScale: 0.1,
            yScale: 0.1,
          },
        },
      });

      Matter.Composite.add(engine.current.world, circle);

      window.setTimeout(() => {
        if (engine.current) {
          Matter.Composite.remove(engine.current.world, circle);
        }
      }, 5000);
    });

    return teardown;
  }, []);

  return (
    <>
      <div ref={scene} className={styles.scene} />
      <div className={styles.overlay}>
        <div className={styles.flex}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <div className={styles.column}>
            <NumberCardList screen bingoNumber={displayBingoNumbers.list} />
            <ReachCount count={latestReachLog?.reach_num ?? 0} />
          </div>
        </div>
      </div>
    </>
  );
}
