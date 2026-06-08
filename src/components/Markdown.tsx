import React from "react";

// 依存なしの簡易Markdownレンダラ（見出し / 箇条書き / 太字 / 段落に対応）
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: number) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} className="my-2 list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flushList(idx);
      blocks.push(
        <h3 key={idx} className="mt-3 mb-1 font-semibold text-gray-800">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushList(idx);
      blocks.push(
        <h2 key={idx} className="mt-4 mb-2 text-lg font-bold text-brand-700">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (/^[-*] /.test(line)) {
      list.push(line.slice(2));
    } else if (line === "") {
      flushList(idx);
    } else {
      flushList(idx);
      blocks.push(
        <p key={idx} className="my-1 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList(lines.length);

  return <div className="text-gray-700">{blocks}</div>;
}
