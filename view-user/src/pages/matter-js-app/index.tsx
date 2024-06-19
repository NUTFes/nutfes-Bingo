import { useLayoutEffect, useRef } from "react";
import Matter from "matter-js";

const Home = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);

  useLayoutEffect(() => {
    if (!scene.current) {
      return;
    }

    const { Engine, Render, World, Bodies, Events } = Matter;

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
    World.add(engine.world, [ground]);

    Render.run(render.current);
    Engine.run(engine);

    const images = ["1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg", "5.jpeg", "6.jpeg"];

    const addRandomCircle = () => {
      const x = Math.random() * window.innerWidth;
      const image = images[Math.floor(Math.random() * images.length)];
      const circle = Bodies.circle(x, 0, 30, {
        render: {
          sprite: {
            texture: image,
            xScale: 0.5,
            yScale: 0.5,
          },
        },
      });
      World.add(engine.world, circle);
    };

    const interval = setInterval(addRandomCircle, 2000);

    const handleResize = () => {
      if (render.current) {
        render.current.canvas.width = window.innerWidth;
        render.current.canvas.height = window.innerHeight;
        Render.lookAt(render.current, {
          min: { x: 0, y: 0 },
          max: { x: window.innerWidth, y: window.innerHeight },
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
      if (render.current) {
        Matter.Render.stop(render.current);
      }
      Matter.World.clear(engine.world, true);
      Matter.Engine.clear(engine);
      // biome-ignore lint/complexity/useOptionalChain: <explanation>
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
