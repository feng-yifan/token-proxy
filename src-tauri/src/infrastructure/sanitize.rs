/// 去除 ANSI 转义序列和控制字符，保留制表符、换行、回车
pub fn sanitize_input(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        // ANSI 转义序列: ESC [ ... 字母
        if c == '\x1b' {
            // 跳过 ESC
            if chars.peek() == Some(&'[') {
                chars.next(); // 跳过 [
                // 跳过转义序列参数和结尾字母
                while let Some(&c) = chars.peek() {
                    chars.next();
                    if c.is_ascii_alphabetic() {
                        break;
                    }
                }
            } else {
                // 非 CSI 的 ESC，直接跳过
            }
        } else if c.is_control_char() && c != '\t' && c != '\n' && c != '\r' {
            // 跳过其他控制字符，但保留 \t \n \r
        } else {
            result.push(c);
        }
    }

    result
}

trait IsControlChar {
    fn is_control_char(&self) -> bool;
}

impl IsControlChar for char {
    fn is_control_char(&self) -> bool {
        // C0 控制字符 (0x00-0x1F 除了 \t \n \r) 和 DEL (0x7F)
        matches!(self, '\x00'..='\x08' | '\x0b' | '\x0c' | '\x0e'..='\x1f' | '\x7f')
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_ansi() {
        assert_eq!(sanitize_input("hello\x1b[1mworld"), "helloworld");
        assert_eq!(sanitize_input("\x1b[31mred\x1b[0m"), "red");
    }

    #[test]
    fn test_sanitize_control_chars() {
        assert_eq!(sanitize_input("hello\x00world"), "helloworld");
        assert_eq!(sanitize_input("line1\nline2\rline3"), "line1\nline2\rline3");
        assert_eq!(sanitize_input("tabs\there"), "tabs\there");
    }

    #[test]
    fn test_sanitize_model_suffix() {
        // [1m 是合法字符，不应被移除
        assert_eq!(sanitize_input("claude-opus-4-7[1m]"), "claude-opus-4-7[1m]");
    }
}
