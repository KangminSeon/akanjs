/** Returns true when the value matches the email format accepted by Akan forms. */
export const isEmail = (email?: string | null) => !!email && /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,8})+$/.test(email);
