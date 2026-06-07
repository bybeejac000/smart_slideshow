import { protocol } from "electron";

export function registerProtocols() {
  protocol.registerFileProtocol("media", (request, callback) => {
    const filePath = request.url.replace("media://", "");
    callback({ path: filePath });
  });
}

export function registerSchemesAsPrivileged() {
  protocol.registerSchemesAsPrivileged([
    { scheme: "media", privileges: { bypassCSP: true } },
  ]);
}
