import { useEffect, useRef } from "react";
import Matter from "matter-js";

const Home = () => {
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
      window.innerHeight - 30,
      window.innerWidth + 10,
      60,
      { isStatic: true },
    );

    const rightWall = Bodies.rectangle(
      window.innerWidth,
      window.innerHeight / 2,
      10,
      window.innerHeight,
      { isStatic: true },
    );

    const leftWall = Bodies.rectangle(
      0,
      window.innerHeight / 2,
      10,
      window.innerHeight,
      { isStatic: true },
    );

    Composite.add(engine.world, [ground, leftWall, rightWall]);
    Render.run(render.current);

    const runner = Runner.create();
    Runner.run(runner, engine);

    const images = ["1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg", "5.jpeg", "6.jpeg"];

    const addRandomCircle = () => {
      const x = Math.random() * window.innerWidth;
      const image = images[Math.floor(Math.random() * images.length)];
      const circle = Bodies.circle(x, 0, 70, {
        restitution: 0.8,
        render: {
          sprite: {
            texture: image,
            xScale: 0.5,
            yScale: 0.5,
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

export default Home;
