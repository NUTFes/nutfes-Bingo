import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ja-JP" prefix="og:http://ogp.me/ns#">
      <Head>
      <title>Bingo</title>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="nutfes-Bingo" />
        <meta property="og:title" content="nutfes-Bingo / 技大祭ビンゴアプリ | 技大祭実行委員会" />
        <meta property="og:url" content="https://bingo.nutfes.net/" />
        <meta name="description" content="技大祭のフィナーレを飾るビンゴ大会専用のアプリです。" />
        <meta property="og:description" content="長岡技術科学大学‐技大祭のフィナーレを飾るビンゴ大会専用のアプリです。" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:image" content="https://bingo.nutfes.net/opengraph-image.png" />
        <meta name="theme-color" content="#07033eff"></meta>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap"
          rel="stylesheet"
        ></link>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
