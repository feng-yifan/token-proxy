/**
 * 从 unknown 类型的错误中提取可读的错误消息字符串
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return String(error);
}
