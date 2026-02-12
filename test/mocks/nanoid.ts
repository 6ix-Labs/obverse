// Mock for nanoid to avoid ESM issues in Jest
export const nanoid = (size?: number): string => {
  const length = size || 21;
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const customAlphabet =
  (alphabet: string, defaultSize: number) =>
  (size?: number): string => {
    const length = size || defaultSize;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
  };
