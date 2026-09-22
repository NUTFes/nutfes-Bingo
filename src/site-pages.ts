const ROOT_DESCRIPTION = "技大祭ビンゴ大会の番号表示・景品確認・運営管理を行うアプリケーション";

export const SITE_PAGES = [
  {
    path: "/",
    html: "index.html",
    area: "public",
    title: "ホーム | NUTFes Bingo",
    description: "NUTFes Bingo の抽選番号をリアルタイムで確認できます。",
    noindex: false,
  },
  {
    path: "/prizes",
    html: "prizes/index.html",
    area: "public",
    title: "景品一覧 | NUTFes Bingo",
    description: "NUTFes Bingo の景品一覧と当選状況を確認できます。",
    noindex: false,
  },
  {
    path: "/screen",
    html: "screen/index.html",
    area: "screen",
    title: "スクリーン | NUTFes Bingo",
    description: "NUTFes Bingo の会場向けスクリーン表示ページです。",
    noindex: true,
  },
  {
    path: "/admin",
    html: "admin/index.html",
    area: "admin",
    title: "NUTFes Bingo",
    description: ROOT_DESCRIPTION,
    noindex: true,
  },
  {
    path: "/admin/prizes",
    html: "admin/prizes/index.html",
    area: "admin",
    title: "NUTFes Bingo",
    description: ROOT_DESCRIPTION,
    noindex: true,
  },
  {
    path: "/admin/prizes/new",
    html: "admin/prizes/new/index.html",
    area: "admin",
    title: "NUTFes Bingo",
    description: ROOT_DESCRIPTION,
    noindex: true,
  },
] as const;

export type SiteArea = (typeof SITE_PAGES)[number]["area"];
