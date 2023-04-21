export const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${secondsStr}`;
}

export function cutoff(
  str: string,
  maxLength: number,
  endingChar = '.',
  endingCharCount = 3
): string {
  if (endingChar.length !== 1) throw new Error('endingChar must be a single character');
  if (maxLength <= 0) throw new Error('maxLength must be greater than 0');
  if (!Number.isInteger(maxLength)) throw new Error('maxLength must be an integer');

  if (str.length <= maxLength) return str;

  return str.slice(0, maxLength - endingCharCount) + endingChar.repeat(endingCharCount);
}

export const bold = (str: string): string => `{bold}${str}{/bold}`;
