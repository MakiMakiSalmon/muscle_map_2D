import { http, HttpResponse } from "msw";
import { MUSCLE_IDS } from "@/types/domain";
import type { CurrentFatigueMap } from "@/types/domain";

function makeDefaultFatigueMap(): CurrentFatigueMap {
  const now = new Date(0).toISOString();
  return Object.fromEntries(
    MUSCLE_IDS.map((id) => [
      id,
      { savedValue: 0, currentValue: 0, recordedAt: now, recoveryHoursRemaining: 0 },
    ]),
  ) as CurrentFatigueMap;
}

// msw/node では path-only パターンが任意オリジンにマッチする。
// http://localhost/... 形式はジョブ環境によってマッチしないことがある。
export const handlers = [
  // sanity.test.ts は fetch('http://localhost/_health') で呼ぶため full URL が必要
  http.get("http://localhost/_health", () => HttpResponse.text("ok")),

  http.get("/api/fatigue/current", () =>
    HttpResponse.json({ data: makeDefaultFatigueMap() }),
  ),

  http.post("/api/fatigue", () =>
    HttpResponse.json(
      {
        snapshot: {
          id: "snap1",
          muscleId: "chest",
          value: 50,
          recordedAt: new Date().toISOString(),
          source: "manual",
          workoutSessionId: null,
        },
      },
      { status: 201 },
    ),
  ),

  http.put("/api/fatigue/reset", () =>
    HttpResponse.json({ resetAt: new Date().toISOString() }),
  ),

  http.get("/api/fatigue/history", () =>
    HttpResponse.json({ history: [] }),
  ),

  http.get("/api/exercises", () =>
    HttpResponse.json({ exercises: [] }),
  ),

  http.post("/api/workout", () =>
    HttpResponse.json(
      {
        session: {
          id: "session1",
          performedAt: new Date().toISOString(),
          exercises: [],
        },
        fatigueImpacts: {},
      },
      { status: 201 },
    ),
  ),

  http.get("/api/workout/history", () =>
    HttpResponse.json({ sessions: [], nextCursor: null }),
  ),
];
