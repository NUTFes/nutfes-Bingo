import Matter from "matter-js";
import { useCallback, useEffect, useRef } from "react";

import type { ReactionName } from "../shared/protocol";
import { useBingoSocket } from "./use-bingo-socket";
import { useReactionScreens } from "./use-reactions";

const IMAGE_BY_REACTION: Record<ReactionName, string> = {
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

export function ScreenView() {
  const realtime = useBingoSocket();
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);

  const addReaction = useCallback((name: ReactionName) => {
    const engine = engineRef.current;
    if (!engine) return;
    const radius = Math.max(28, Math.min(50, innerWidth * 0.035));
    const body = Matter.Bodies.circle(
      radius + Math.random() * Math.max(1, innerWidth - radius * 2),
      -radius,
      radius,
      {
        restitution: 0.35,
        frictionAir: 0.012,
        render: {
          sprite: {
            texture: IMAGE_BY_REACTION[name],
            xScale: (radius * 2) / 842,
            yScale: (radius * 2) / 842,
          },
        },
      },
    );
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);
    Matter.Composite.add(engine.world, body);
    bodiesRef.current.push(body);
    while (bodiesRef.current.length > 56) {
      const oldest = bodiesRef.current.shift();
      if (oldest) Matter.Composite.remove(engine.world, oldest);
    }
    window.setTimeout(() => {
      const index = bodiesRef.current.indexOf(body);
      if (index >= 0) bodiesRef.current.splice(index, 1);
      if (engineRef.current) Matter.Composite.remove(engineRef.current.world, body);
    }, 45_000);
  }, []);

  const reactionsConnected = useReactionScreens(addReaction);

  useEffect(() => {
    if (!sceneRef.current) return;
    const engine = Matter.Engine.create({
      enableSleeping: true,
      positionIterations: 4,
      velocityIterations: 4,
    });
    engine.gravity.scale = 0.00125;
    engineRef.current = engine;
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: innerWidth,
        height: innerHeight,
        pixelRatio: Math.min(devicePixelRatio || 1, 2),
        wireframes: false,
        background: "transparent",
      },
    });
    const runner = Matter.Runner.create({ delta: 1000 / 60, maxUpdates: 2 });
    let walls: Matter.Body[] = [];
    const resize = () => {
      Matter.Render.setSize(render, innerWidth, innerHeight);
      Matter.Composite.remove(engine.world, walls);
      walls = [
        Matter.Bodies.rectangle(innerWidth / 2, innerHeight + 48, innerWidth, 96, {
          isStatic: true,
          render: { visible: false },
        }),
        Matter.Bodies.rectangle(-48, innerHeight / 2, 96, innerHeight * 2, {
          isStatic: true,
          render: { visible: false },
        }),
        Matter.Bodies.rectangle(innerWidth + 48, innerHeight / 2, 96, innerHeight * 2, {
          isStatic: true,
          render: { visible: false },
        }),
      ];
      Matter.Composite.add(engine.world, walls);
    };
    resize();
    addEventListener("resize", resize, { passive: true });
    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);
    return () => {
      removeEventListener("resize", resize);
      Matter.Runner.stop(runner);
      Matter.Render.stop(render);
      Matter.Composite.clear(engine.world, false, true);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      engineRef.current = null;
      bodiesRef.current = [];
    };
  }, []);

  const snapshot = realtime.snapshot;
  return (
    <main className="screen-shell">
      <div className="physics-layer" ref={sceneRef} />
      <div className="screen-content">
        <section className="screen-latest">
          <span>LATEST</span>
          <strong>{snapshot?.latestNumber ?? "–"}</strong>
        </section>
        <section className="screen-side">
          <div className="screen-numbers">
            {snapshot?.numbers
              .slice(0, -1)
              .toReversed()
              .map((item) => (
                <span key={item.id}>{item.number}</span>
              ))}
          </div>
          <div className="screen-reach">
            <span>REACH</span>
            <strong>{snapshot?.reachCount ?? 0}</strong>
          </div>
        </section>
      </div>
      <div className="screen-status">
        <span className={realtime.status === "online" ? "status-dot online" : "status-dot"} /> Bingo
        <span className={reactionsConnected ? "status-dot online" : "status-dot"} /> Reactions
      </div>
    </main>
  );
}
