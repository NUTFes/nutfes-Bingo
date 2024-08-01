import { useEffect, useRef } from "react";
import Matter from "matter-js";

const images = [
  "/ReactionIcon/angry.png",
  "/ReactionIcon/cracker.png",
  "/ReactionIcon/crap.png",
  "/ReactionIcon/good.png",
  "/ReactionIcon/heart.png",
  "/ReactionIcon/peace.png",
  "/ReactionIcon/sad.png",
  "/ReactionIcon/skull.png",
  "/ReactionIcon/smile.png",
  "/ReactionIcon/surprise.png",
];

const ScreenPage = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);

  useEffect(() => {
    if (!scene.current) {
      return;
    }

    const { Engine, Render, Runner, Bodies, Composite } = Matter;

    const engine = Engine.create();

    render.current = Render.create({
      element: scene.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: "#f0f0f0",
      },
    });

    const ground = Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight,
      window.innerWidth + 10,
      10,
      { isStatic: true, render: { visible: false } },
    );

    const rightWall = Bodies.rectangle(
      window.innerWidth,
      window.innerHeight / 2,
      1,
      window.innerHeight,
      { isStatic: true, render: { visible: false } },
    );

    const leftWall = Bodies.rectangle(
      0,
      window.innerHeight / 2,
      1,
      window.innerHeight,
      { isStatic: true, render: { visible: false } },
    );

    Composite.add(engine.world, [ground, leftWall, rightWall]);
    Render.run(render.current);

    const runner = Runner.create();
    Runner.run(runner, engine);

    const addRandomCircle = () => {
      const x = Math.random() * window.innerWidth;
      const image = images[Math.floor(Math.random() * images.length)];
      const circle = Bodies.circle(x, 0, 70, {
        restitution: 0.8,
        render: {
          sprite: {
            texture: image,
            xScale: 0.2,
            yScale: 0.2,
          },
        },
      });

      Composite.add(engine.world, circle);

      setTimeout(() => {
        Composite.remove(engine.world, circle);
      }, 5000);
    };

    const interval = setInterval(addRandomCircle, 500);

    return () => {
      clearInterval(interval);

      if (render.current) {
        Matter.Render.stop(render.current);
      }
      Matter.Composite.clear(engine.world, true);
      Matter.Engine.clear(engine);
      if (render.current && render.current.canvas) {
        render.current.canvas.remove();
        render.current.textures = {};
      }
    };
  }, []);

  return (
    <div>
      <div ref={scene} />
      <style jsx>{`
        div {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100vw;
          height: 100vh;
        }
        canvas {
          border: 1px solid #000;
        }
      `}</style>
    </div>
  );
};

export default ScreenPage;
