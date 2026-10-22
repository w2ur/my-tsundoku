import type { MetadataRoute } from "next";
import seed from "../../scripts/screenshot-seed.json";

// The seed file owns the screenshot descriptions, so a recapture keeps them.
const label = (file: string) => seed.screenshots.find((s) => s.file === file)!.label;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "My Tsundoku",
    short_name: "My Tsundoku",
    description: "Your personal book collection, beautifully organized",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "fr",
    background_color: "#FAF8F5",
    theme_color: "#2D4A3E",
    categories: ["books", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/screenshot-board.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: label("screenshot-board.png"),
      },
      {
        src: "/screenshots/screenshot-add.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: label("screenshot-add.png"),
      },
    ],
    shortcuts: [
      {
        name: "Add a book",
        short_name: "Add",
        description: "Search or scan a book to add to your collection",
        url: "/add",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Scan barcode",
        short_name: "Scan",
        description: "Scan a book ISBN barcode",
        url: "/add/scan",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    share_target: {
      action: "/share-target",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
