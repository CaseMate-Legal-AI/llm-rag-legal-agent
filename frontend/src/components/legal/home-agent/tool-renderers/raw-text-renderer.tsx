import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  text: string;
}

export function RawTextRenderer({ text }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
      prose-headings:text-base prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1
      prose-p:my-1 prose-li:my-0.5
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
