import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 70,
          fontWeight: 700,
          letterSpacing: "-0.08em",
          borderRadius: 36,
        }}
      >
        PD
      </div>
    ),
    size,
  );
}
