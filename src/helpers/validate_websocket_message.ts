export function validateWebsocketMessage(data: unknown): string[] {
  const parsedData = JSON.parse(data as string);

  if ("photoLinks" in parsedData && Array.isArray(parsedData.photoLinks)) {
    if (
      parsedData.photoLinks.every(
        (x: unknown): x is string => typeof x === "string",
      )
    ) {
      return parsedData.photoLinks;
    }
  }
  return [];
}
