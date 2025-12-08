use reqwest;
use scraper::{Html, Selector};
use html2md;

/// 从 URL 获取网页并转换为 Markdown
pub async fn fetch_and_convert_to_markdown(url: &str) -> Result<String, String> {
    // 创建 HTTP 客户端
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;

    // 发送 GET 请求
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    // 检查响应状态
    if !response.status().is_success() {
        return Err(format!("HTTP 错误: {}", response.status()));
    }

    // 获取 HTML 内容
    let html_content = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    // 清理 HTML（移除脚本、样式等）
    let cleaned_html = clean_html(&html_content);

    // 转换为 Markdown
    let markdown = html2md::parse_html(&cleaned_html);

    Ok(markdown)
}

/// 将 HTML 字符串转换为 Markdown
pub fn html_to_markdown(html: &str) -> String {
    let cleaned_html = clean_html(html);
    html2md::parse_html(&cleaned_html)
}

/// 清理 HTML，移除脚本、样式等不需要的标签
fn clean_html(html: &str) -> String {
    let document = Html::parse_document(html);
    
    // 选择 body 标签
    let body_selector = Selector::parse("body").unwrap();
    
    if let Some(body) = document.select(&body_selector).next() {
        let mut cleaned = body.html();
        
        // 移除脚本标签
        cleaned = remove_tags(&cleaned, "script");
        // 移除样式标签
        cleaned = remove_tags(&cleaned, "style");
        // 移除 noscript 标签
        cleaned = remove_tags(&cleaned, "noscript");
        
        cleaned
    } else {
        // 如果没有 body 标签，直接清理整个文档
        let mut cleaned = html.to_string();
        cleaned = remove_tags(&cleaned, "script");
        cleaned = remove_tags(&cleaned, "style");
        cleaned = remove_tags(&cleaned, "noscript");
        cleaned
    }
}

/// 移除指定的 HTML 标签及其内容
fn remove_tags(html: &str, tag: &str) -> String {
    let document = Html::parse_document(html);
    let selector = Selector::parse(tag).unwrap();
    
    let mut result = html.to_string();
    
    for element in document.select(&selector) {
        let element_html = element.html();
        result = result.replace(&element_html, "");
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_html_to_markdown() {
        let html = r#"
            <html>
                <head>
                    <script>console.log('test');</script>
                    <style>body { color: red; }</style>
                </head>
                <body>
                    <h1>Hello World</h1>
                    <p>This is a <strong>test</strong>.</p>
                </body>
            </html>
        "#;
        
        let markdown = html_to_markdown(html);
        assert!(markdown.contains("Hello World"));
        assert!(markdown.contains("test"));
        assert!(!markdown.contains("console.log"));
    }
}
