import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest (excluded from the auth proxy). Lets phones install the app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Astra Team Hub",
    short_name: "Astra Hub",
    description: "Private team communications for Astra",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
