import { serwist } from "@serwist/next/config";

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Landing images are for online first visits, not the offline app shell.
  globIgnores: ["public/landing/**"],
});
