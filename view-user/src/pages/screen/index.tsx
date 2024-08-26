import type { NextPage } from "next";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Matter from "matter-js";
import { useSubscription } from "@apollo/client";
import {
  SubscriotionStampTriggersDocument,
  SubscribeListNumbersDocument,
} from "@/type/graphql";
import type {
  SubscriotionStampTriggersSubscription,
  SubscribeListNumbersSubscription,
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

const Page: NextPage = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const [bingoNumbers, setBingoNumbers] = useState<
    SubscribeListNumbersSubscription["numbers"]
  >([]);
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);

  const { data: numbers } = useSubscription(SubscribeListNumbersDocument);
  const { data: triggers } =
    useSubscription<SubscriotionStampTriggersSubscription>(
      SubscriotionStampTriggersDocument,
    );

  //subscriptionを行うためのuseEffect
  useEffect(() => {
    if (numbers) {
      setBingoNumbers(numbers.numbers);
    }
  }, [numbers]);

  // 画像を降らせる
  useEffect(() => {
    triggers?.stampTriggers
      .filter(
        (stamp: SubscriotionStampTriggersSubscription["stampTriggers"][0]) =>
          stamp.trigger,
      )
      .forEach(
        (stamp: SubscriotionStampTriggersSubscription["stampTriggers"][0]) =>
          addCircleById(stamp.name),
      ); // フィルタしたものに対してaddCircleByIdを実行
  }, [triggers?.stampTriggers]);

  // 番号の表示 indexからもらった
  // todo 同じ関数ならいい感じにしたいね
  const defaultBingoNumber = {
    number: 0,
    id: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const copiedArray = [...bingoNumbers];
  const sortCopiedArray = [...bingoNumbers];
  const firstBingoNumber = copiedArray.pop() ?? defaultBingoNumber;
  const sortFirstBingoNumber =
    sortCopiedArray.sort((a, b) => a.number - b.number).shift() ??
    defaultBingoNumber;

  const displayBingoNumbers = isSortedAscending
    ? { large: firstBingoNumber, list: copiedArray.reverse() }
    : { large: sortFirstBingoNumber, list: sortCopiedArray.slice(1) };

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
    <div className={styles.container}>
      <div ref={scene} className={styles.scene} />
      <div className={styles.overlay}>
        <Image src="/Bingo_logo.png" alt="logo" width={300} height={300} />
        <div className={styles.flex}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <div className={styles.column}>
            <NumberCardList screen bingoNumber={displayBingoNumbers.list} />
            {/* todo countはAPIとつなぎ込み */}
            <ReachCount count={0} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
