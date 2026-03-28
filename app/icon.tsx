import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default async function Icon() {
  const logoBuffer = await readFile(join(process.cwd(), "new_logo.png"));
  const logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6efe3",
        }}
      >
        <div
          style={{
            width: "88%",
            height: "88%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "120px",
            background: "#f6efe3",
            boxShadow: "0 0 0 3px rgba(122, 94, 63, 0.08)",
          }}
        >
          <img
            src={logoDataUrl}
            alt="Preqly"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
