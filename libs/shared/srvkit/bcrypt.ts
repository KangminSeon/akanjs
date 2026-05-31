export const hashPassword = async (password: string) => {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: process.env.SALT_ROUNDS ? parseInt(process.env.SALT_ROUNDS) : 11,
  });
};

export const isPasswordMatch = async (password: string, hash: string) => {
  try {
    return await Bun.password.verify(password, hash, "bcrypt");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("InvalidEncoding")) throw error;
    return password === hash;
  }
};
