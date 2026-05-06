/**
 * 去除 ANSI 转义序列和控制字符，保留制表符、换行、回车
 */
export function sanitizeInput(s: string): string {
  let result = '';
  const chars = [...s];
  let i = 0;

  while (i < chars.length) {
    const c = chars[i];

    // ANSI 转义序列: ESC [ ... 字母
    if (c === '\x1b') {
      if (chars[i + 1] === '[') {
        i += 2; // 跳过 ESC [
        while (i < chars.length) {
          const cc = chars[i];
          i++;
          if (/[a-zA-Z]/.test(cc)) {
            break; // 结尾字母
          }
        }
      } else {
        // 非 CSI 的 ESC，跳过
        i++;
      }
    } else if (isControlChar(c) && c !== '\t' && c !== '\n' && c !== '\r') {
      // 跳过其他控制字符，但保留 \t \n \r
      i++;
    } else {
      result += c;
      i++;
    }
  }

  return result;
}

function isControlChar(c: string): boolean {
  const code = c.charCodeAt(0);
  // C0 控制字符 (0x00-0x1F 除了 \t \n \r) 和 DEL (0x7F)
  return (code >= 0x00 && code <= 0x08) || code === 0x0b || code === 0x0c ||
    (code >= 0x0e && code <= 0x1f) || code === 0x7f;
}
