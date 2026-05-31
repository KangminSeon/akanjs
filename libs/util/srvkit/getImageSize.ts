import sharp from "sharp";

export const getImageSize = async (filePathOrBuffer: string | Buffer): Promise<[number, number]> => {
  try {
    const input =
      typeof filePathOrBuffer === "string" ? await Bun.file(filePathOrBuffer).arrayBuffer() : filePathOrBuffer;
    const { width, height } = await sharp(input).metadata();
    return [width ?? 0, height ?? 0];
  } catch {
    return [0, 0];
  }
};
