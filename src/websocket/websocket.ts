export async function createWebSocket() {
  const host = await window.getEnvVar("GO_LISTEN_HOST");
  const port = await window.getEnvVar("GO_LISTEN_PORT");

  const ws = new WebSocket(`ws://${host}:${port}/injectPictures`);

  ws.onerror = (err) => {
    console.error("error:", err);
  };

  return ws;
}

export default createWebSocket;
