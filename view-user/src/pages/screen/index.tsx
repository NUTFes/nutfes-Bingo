import type { NextPage } from "next";
import { useState, useEffect, useRef } from "react";
import Matter from "matter-js";
import { useSubscription } from "@apollo/client";
import {
  SubscribeListNumbersDocument,
  SubscribeCreatedStampTriggerDocument,
  SubscribeOneLatestReachLogDocument,
  type SubscribeListNumbersSubscription,
  type SubscribeCreatedStampTriggerSubscription,
  type SubscribeOneLatestReachLogSubscription,
} from "@/types/graphql";
import {
  NumberCardLarge,
  NumberCardList,
  ReachCount,
} from "@/components/common";
import styles from "./screen.module.css";
import BingoLogo from "public/logo_bingo.svg";

// 画像のパスを管理
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

type Stamp = {
  id: number;
  name: string;
  createdAt?: string;
};

type BingoNumbers = SubscribeListNumbersSubscription["numbers"];

const sortedBingoNumbers = (bingoNumbers: BingoNumbers) => {
  return [...bingoNumbers].sort((a, b) => a.id - b.id);
};

// 最後に追加されたビンゴ番号（最新の番号）を取得
const getLastBingoNumber = (bingoNumbers: BingoNumbers) => {
  const sortedNumbers = sortedBingoNumbers(bingoNumbers);
  return sortedNumbers[sortedNumbers.length - 1];
};

// ビンゴ番号を表示する関数
const getDisplayBingoNumbers = (bingoNumbers: BingoNumbers) => {
  const sortedNumbers = sortedBingoNumbers(bingoNumbers);
  const lastBingoNumber = getLastBingoNumber(bingoNumbers);

  return {
    large: lastBingoNumber,
    list: sortedNumbers.slice(0, -1).reverse(),
  };
};

const Page: NextPage = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const [latestCreatedAt, setLatestCreatedAt] = useState<string>(
    new Date().toISOString(),
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

  // Bingo番号リストのサブスクリプション
  const { data: numbers } = useSubscription(SubscribeListNumbersDocument);
  // スタンプトリガーのサブスクリプション
  const { data: triggers } =
    useSubscription<SubscribeCreatedStampTriggerSubscription>(
      SubscribeCreatedStampTriggerDocument,
      {
        variables: { createdAt: latestCreatedAt },
      },
    );
  // リーチログのサブスクリプション
  const { data: reachLog } =
    useSubscription<SubscribeOneLatestReachLogSubscription>(
      SubscribeOneLatestReachLogDocument,
    );

  useEffect(() => {
    const stamps = triggers?.stampTriggers;
    if (stamps?.length) {
      stamps.forEach((stamp: Stamp) => {
        addCircleById(stamp.name);
      });

      const latestStamp = stamps.reduce((latest, stamp) => {
        return new Date(stamp.createdAt) > new Date(latest.createdAt)
          ? stamp
          : latest;
      }, stamps[0]);

      if (new Date(latestStamp.createdAt) > new Date(latestCreatedAt)) {
        setLatestCreatedAt(latestStamp.createdAt);
      }
    }
  }, [triggers, latestCreatedAt]);

  // ビンゴ番号のuseEffect
  useEffect(() => {
    if (numbers) {
      setBingoNumbers(numbers.numbers);
    }
  }, [numbers]);

  // スタンプをMatter.jsで降らせる処理
  const addCircleById = (key: string) => {
    if (!images[key]) {
      console.warn(`Image with ID ${key} not found`);
      return;
    }

    const x = Math.random() * window.innerWidth;
    const image = images[key];
    const circle = Matter.Bodies.circle(x, 0, 35, {
      restitution: 0.8,
      render: {
        sprite: {
          texture: image,
          xScale: 0.1,
          yScale: 0.1,
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

  // Matter.jsのエンジン設定とシーンの初期化
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
      { isStatic: true, render: { visible: false } },
    );

    const leftWall = Bodies.rectangle(
      0,
      window.innerHeight / 2,
      1,
      window.innerHeight,
      { isStatic: true, render: { visible: false } },
    );

    Composite.add(engine.current.world, [leftWall, rightWall]);
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
        <BingoLogo className={styles.logo} />
        <div className={styles.flex}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <div className={styles.column}>
            <NumberCardList screen bingoNumber={displayBingoNumbers.list} />
            <ReachCount count={reachLog?.reachLogs[0]?.reachNum || 0} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
