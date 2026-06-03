import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #07111f 0%, #0f4c81 100%)",
          color: "#ffffff",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: "-0.08em",
        }}
      >
        PD
      </div>
    ),
    size,
  );
}
