import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Slideshow from "./Slideshow";

const photos = await window.photoHelper.getList();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Slideshow photos={photos} />
  </StrictMode>,
);
