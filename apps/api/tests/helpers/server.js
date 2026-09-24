import app from "../../src/app.js";

// Starts the Express app on an ephemeral port so tests never collide with a
// running dev server. Returns the base URL and a close function.
export async function startTestServer() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
