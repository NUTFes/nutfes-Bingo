// "Header"ディレクトリ内の"index.ts"ファイルをデフォルトエクスポートする。
// "Header"ディレクトリ全体をインポートし、内部のモジュールにアクセスできるようにする。
// デフォルトエクスポートを再エクスポートする目的は、モジュールを使うときのimport文をシンプルにするため。
export {default as Header} from "./Header"
export {default as Modal} from "./Modal"
export {default as BingoResult} from "./BingoResult"
