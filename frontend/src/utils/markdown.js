// Minimal markdown-to-HTML for bold (**text**) and line breaks
export function renderMarkdown(text) {
  if (!text) return null;
  // Replace **bold**
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Replace line breaks
  html = html.replace(/\n/g, '<br/>');
  return html;
}
