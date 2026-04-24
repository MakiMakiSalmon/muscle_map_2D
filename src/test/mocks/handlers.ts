import { http, HttpResponse } from "msw";

export const handlers = [
  // 各 API ルートの実装に合わせて Step 3 以降で追加していく。
  // 空配列で起動し、テストごとに server.use(...) で追加するパターンでも可。
  http.get("http://localhost/_health", () => HttpResponse.text("ok")),
];
