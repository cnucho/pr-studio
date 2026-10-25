export type ProductionOutputProfile = {
  name: "hd-landscape" | "hd-vertical";
  width: number;
  height: number;
  frameRate: number;
  videoCodec: "h264";
  audioCodec: "aac";
  allowedContainers: string[];
};

export const HD_LANDSCAPE_PROFILE: ProductionOutputProfile = {
  name: "hd-landscape",
  width: 1920,
  height: 1080,
  frameRate: 30,
  videoCodec: "h264",
  audioCodec: "aac",
  allowedContainers: ["mp4", "mov"],
};

export const HD_VERTICAL_PROFILE: ProductionOutputProfile = {
  ...HD_LANDSCAPE_PROFILE,
  name: "hd-vertical",
  width: 1080,
  height: 1920,
};

export function productionProfileForDimensions(width: number, height: number) {
  if (width === 1920 && height === 1080) return HD_LANDSCAPE_PROFILE;
  if (width === 1080 && height === 1920) return HD_VERTICAL_PROFILE;
  throw new Error(`Unsupported production output dimensions: ${width}x${height}`);
}
