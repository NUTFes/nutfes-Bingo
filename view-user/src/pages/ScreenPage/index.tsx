import { useEffect, useRef } from "react";
import Matter from "matter-js";

const images: { [key: string]: string } = {
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

const ScreenPage = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);
  const engine = useRef<Matter.Engine | null>(null);

  const addCircleById = (key: string) => {
    if (!images[key]) {
      console.warn(`Image with ID ${key} not found`);
      return;
    }

    const x = Math.random() * window.innerWidth;
    const image = images[key];
    const circle = Matter.Bodies.circle(x, 0, 70, {
      restitution: 0.8,
      render: {
        sprite: {
          texture: image,
          xScale: 0.2,
          yScale: 0.2,
        },
      },
    });

    if (engine.current) {
      Matter.Composite.add(engine.current.world, circle);

      setTimeout(() => {
        if (engine.current) {
          Matter.Composite.remove(engine.current.world, circle);
        }
      }, 5000);
    }
  };

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
        background: "#f0f0f0",
      },
    });

    const ground = Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight,
      window.innerWidth + 10,
      20,
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

    Composite.add(engine.current.world, [ground, leftWall, rightWall]);
    Render.run(render.current);

    const runner = Runner.create();
    Runner.run(runner, engine.current);

    return () => {
      if (render.current) {
        Matter.Render.stop(render.current);
      }
      if (engine.current) {
        Matter.Composite.clear(engine.current.world, true);
        Matter.Engine.clear(engine.current);
      }
      if (render.current && render.current.canvas) {
        render.current.canvas.remove();
        render.current.textures = {};
      }
    };
  }, []);

  return (
    <div>
      <section className="button-container">
        <button onClick={() => addCircleById("angry")}>Angry</button>
        <button onClick={() => addCircleById("cracker")}>Cracker</button>
        <button onClick={() => addCircleById("crap")}>Crap</button>
        <button onClick={() => addCircleById("good")}>Good</button>
        <button onClick={() => addCircleById("heart")}>Heart</button>
        <button onClick={() => addCircleById("peace")}>Peace</button>
        <button onClick={() => addCircleById("sad")}>Sad</button>
        <button onClick={() => addCircleById("skull")}>Skull</button>
        <button onClick={() => addCircleById("smile")}>Smile</button>
        <button onClick={() => addCircleById("surprise")}>Surprise</button>
      </section>
      <div ref={scene} />
      <style jsx>{`
        .button-container {
          position: fixed;
          top: 10px;
          left: 10px;
          display: flex;
          flex-direction: row;
          gap: 5px;
        }
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
        button {
          padding: 10px;
        }
      `}</style>
    </div>
  );
};

export default ScreenPage;
