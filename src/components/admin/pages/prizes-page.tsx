"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";

import {
  deletePrize,
  deletePrizeImage,
  togglePrizeWon,
  updatePrize,
  uploadPrizeImage,
} from "@/lib/bingo/client";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Button, Header, PrizeResult } from "@/components/admin/common";
import styles from "@/styles/admin/prizes.module.css";

interface AdminPrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
}

export function AdminPrizesPage({ initialPrizes }: AdminPrizesPageProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [bingoPrize, setBingoPrize] = useState<PrizeWithImageUrl[]>(initialPrizes);
  const [searchText, setSearchText] = useState("");

  const searchResults = searchText
    ? bingoPrize.filter((prize) => prize.name_jp.toLowerCase().includes(searchText.toLowerCase()))
    : [];

  const handleSearch = () => {
    if (!searchRef.current || searchResults.length === 0) {
      return;
    }

    const firstResultElement = document.getElementById(`prize-${searchResults[0].id}`);
    firstResultElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className={styles.container}>
      <ToastContainer position="top-center" />
      <Header user="Admin">
        <div className={styles.main}>
          <Button size="m" shape="circle" onClick={() => router.push("/admin")}>
            <div className={styles.buttonContents}>番号入力</div>
          </Button>
        </div>
      </Header>
      <div className={styles.title}>
        <div className={styles.title_button}>
          <input
            ref={searchRef}
            className={styles.search_box}
            type="text"
            placeholder="検索..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <button type="button" className={styles.search_button} onClick={handleSearch}>
            検索
          </button>
        </div>
      </div>
      <PrizeResult
        prizeResult={searchText !== "" && searchResults.length > 0 ? searchResults : bingoPrize}
        setBingoPrize={setBingoPrize}
        showOverlay={true}
        showToggle={true}
        onToggle={(id, isWon) => togglePrizeWon(id, isWon)}
        onDelete={async (prize) => {
          await deletePrize(prize.id);
          await deletePrizeImage(prize.image_path);
        }}
        onUpdate={async ({ id, nameJp, nameEn, file }) => {
          const currentPrize = bingoPrize.find((prize) => prize.id === id);
          let imagePath = currentPrize?.image_path;
          if (file) {
            const uploadedPath = await uploadPrizeImage(file);
            imagePath = uploadedPath;
            if (currentPrize?.image_path) {
              await deletePrizeImage(currentPrize.image_path);
            }
          }
          return updatePrize({ id, nameJp, nameEn, imagePath });
        }}
      />
    </div>
  );
}
