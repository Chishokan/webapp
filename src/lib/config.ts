// アプリ全体の設定値。環境変数があればそちらを優先する。

// おはよう勉強会の Zoom 参加 URL
export const ZOOM_URL =
  process.env.NEXT_PUBLIC_ZOOM_URL ||
  "https://us06web.zoom.us/j/8031421632?pwd=YVRmWU9IT0pRa1N4Q0Q5SmZOYkJ0dz09";
