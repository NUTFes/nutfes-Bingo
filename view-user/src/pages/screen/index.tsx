import type { NextPage } from "next";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Matter from "matter-js";
import { useSubscription } from "@apollo/client";
import {
  SubscribeListNumbersDocument,
  SubscriptionUpdatedStampTriggerDocument,
} from "@/type/graphql";
import type {
  SubscribeListNumbersSubscription,
  SubscriptionUpdatedStampTriggerSubscription,
} from "@/type/graphql";
import {
  NumberCardLarge,
  NumberCardList,
  ReachCount,
} from "@/components/common";
import styles from "./screen.module.css";

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

type StampState = {
  [id: number]: string;
};

type BingoNumbers = SubscribeListNumbersSubscription["numbers"];

const getFirstBingoNumber = (bingoNumbers: BingoNumbers) =>
  bingoNumbers[bingoNumbers.length - 1];

const getDisplayBingoNumbers = (bingoNumbers: BingoNumbers) => {
  const firstBingoNumber = getFirstBingoNumber(bingoNumbers);
  return { large: firstBingoNumber, list: bingoNumbers.slice(0, -1).reverse() };
};

const Page: NextPage = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(
    "2024-08-29T08:12:00",
  );
  const [bingoNumbers, setBingoNumbers] = useState<
    SubscribeListNumbersSubscription["numbers"]
  >([
    {
      number: 0,
      id: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const displayBingoNumbers = getDisplayBingoNumbers(bingoNumbers);
  const { data: numbers } = useSubscription(SubscribeListNumbersDocument);
  const { data: triggers } =
    useSubscription<SubscriptionUpdatedStampTriggerSubscription>(
      SubscriptionUpdatedStampTriggerDocument,
      {
        variables: { updatedAt: lastUpdatedAt },
      },
    );

  // スタンプの変更を検知し、スタンプを降下させる。
  useEffect(() => {
    if (triggers?.stampTriggers && triggers?.stampTriggers.length > 0) {
      triggers.stampTriggers.forEach((stamp) => {
        addCircleById(stamp.name);
      });
      const latestUpdatedAt = triggers.stampTriggers.reduce(
        (latest, current) => {
          return new Date(current.updatedAt) > new Date(latest)
            ? current.updatedAt
            : latest;
        },
        new Date(0).toISOString(),
      );
      setLastUpdatedAt(latestUpdatedAt);
    }
  }, [triggers]);

  //subscriptionを行うためのuseEffect
  useEffect(() => {
    if (numbers) {
      setBingoNumbers(numbers.numbers);
    }
  }, [numbers]);

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
        background: "transparent",
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
    <>
      <div ref={scene} className={styles.scene} />
      <div className={styles.overlay}>
        <div className={styles.image}>
          <Image src="/Bingo_logo.png" alt="logo" fill />
        </div>
        <div className={styles.flex}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <div className={styles.column}>
            <NumberCardList screen bingoNumber={displayBingoNumbers.list} />
            {/* todo countはAPIとつなぎ込み */}
            <ReachCount count={0} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
