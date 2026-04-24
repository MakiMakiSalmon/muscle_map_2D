describe("test infrastructure sanity", () => {
  it("Vitest + TypeScript が動作する", () => {
    expect(1 + 1).toBe(2);
  });

  it("MSW がネットワーク層でリクエストをインターセプトできる", async () => {
    const res = await fetch("http://localhost/_health");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
