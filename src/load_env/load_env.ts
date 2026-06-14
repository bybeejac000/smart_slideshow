export const inMemPicAmt = parseInt(
  (await window.getEnvVar("IN_MEM_PIC_AMT")) || "10",
  10,
);
