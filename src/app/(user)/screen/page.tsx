"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";
import {
  mapNumberRow,
  mapReachLogRow,
  type BingoNumber,
  type ReachLog,
} from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logRealtimeChannelError } from "@/lib/supabase/realtime";
import {
  NumberCardLarge,
  NumberCardList,
  ReachCount,
} from "@/components/user/common";
import styles from "./screen.module.css";
import Image from "next/image";

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

type BingoNumbers = BingoNumber[];

const supabase = createSupabaseBrowserClient();

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

const Page = () => {
  const scene = useRef<HTMLDivElement>(null);
  const render = useRef<Matter.Render | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const latestCreatedAtRef = useRef<string>(new Date().toISOString());
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);
  const [latestReachLog, setLatestReachLog] = useState<ReachLog | null>(null);
  const displayBingoNumbers = getDisplayBingoNumbers(bingoNumbers);

  const fetchNumbers = useCallback(async () => {
    const { data, error } = await supabase
      .from("numbers")
      .select("id, number, created_at, updated_at")
      .order("id", { ascending: true });
    if (!error && data) {
      setBingoNumbers(data.map(mapNumberRow));
    }
  }, []);

  const fetchLatestReachLog = useCallback(async () => {
    const { data, error } = await supabase
      .from("reach_logs")
      .select("id, status, created_at, reach_num")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data && data[0]) {
      setLatestReachLog(mapReachLogRow(data[0]));
    }
  }, []);

  const fetchLatestStampCursor = useCallback(async () => {
    const { data, error } = await supabase
      .from("stamp_triggers")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data && data[0]?.created_at) {
      latestCreatedAtRef.current = data[0].created_at;
    }
  }, []);

  // スタンプをMatter.jsで降らせる処理
  const addCircleById = useCallback((key: string) => {
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
  }, []);

  const pollNewStamps = useCallback(async () => {
    const { data, error } = await supabase
      .from("stamp_triggers")
      .select("name, created_at")
      .gt("created_at", latestCreatedAtRef.current)
      .order("created_at", { ascending: true })
      .limit(20);
    if (error || !data || data.length === 0) return;
    data.forEach((row) => {
      if (!row?.name) return;
      addCircleById(row.name);
      if (row.created_at) {
        latestCreatedAtRef.current = row.created_at;
      }
    });
  }, [addCircleById]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchNumbers();
    fetchLatestReachLog();
    fetchLatestStampCursor();

    const numbersChannel = supabase
      .channel("numbers-changes-screen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "numbers" },
        () => {
          fetchNumbers();
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          logRealtimeChannelError("numbers-screen", err);
        }
      });

    const reachChannel = supabase
      .channel("reach-logs-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reach_logs" },
        (payload) => {
          const row = payload.new as {
            id: number;
            status: boolean;
            created_at: string;
            reach_num: number;
          };
          setLatestReachLog(mapReachLogRow(row));
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          logRealtimeChannelError("reach-logs", err);
        }
      });

    const stampChannel = supabase
      .channel("stamp-triggers-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stamp_triggers" },
        (payload) => {
          const row = payload.new as {
            name: string;
            created_at: string | null;
          };
          const createdAt = row.created_at || new Date().toISOString();
          addCircleById(row.name);
          if (new Date(createdAt) > new Date(latestCreatedAtRef.current)) {
            latestCreatedAtRef.current = createdAt;
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          logRealtimeChannelError("stamp-triggers", err);
        }
      });

    const intervalId = window.setInterval(() => {
      void pollNewStamps();
    }, 2000);

    return () => {
      supabase.removeChannel(numbersChannel);
      supabase.removeChannel(reachChannel);
      supabase.removeChannel(stampChannel);
      window.clearInterval(intervalId);
    };
  }, [
    fetchNumbers,
    fetchLatestReachLog,
    fetchLatestStampCursor,
    pollNewStamps,
    addCircleById,
  ]);

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
        <Image
          src="/logo_bingo.svg"
          alt="Bingo Logo"
          width={320}
          height={120}
          className={styles.logo}
          priority
        />
        <div className={styles.flex}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <div className={styles.column}>
            <NumberCardList screen bingoNumber={displayBingoNumbers.list} />
            <ReachCount count={latestReachLog?.reachNum || 0} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
