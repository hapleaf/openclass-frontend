"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Props {
  value: string;
  onChange: (html: string, textLength: number) => void;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
}

const BTN: React.CSSProperties = {
  background: "none",
  border: "1px solid #e2ded6",
  borderRadius: 6,
  padding: "0.25rem 0.55rem",
  fontSize: "0.78rem",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  color: "#3a4140",
  lineHeight: 1,
  transition: "all 0.15s",
};

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN,
  background: "#1d6b3c",
  borderColor: "#1d6b3c",
  color: "#fff",
};

export default function RichTextEditor({ value, onChange, maxLength = 5000, minLength = 250, placeholder }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    onUpdate({ editor }) {
      const text = editor.getText();
      if (maxLength && text.length > maxLength) return;
      onChange(editor.getHTML(), text.length);
    },
  });

  if (!editor) return null;

  const textLen = editor.getText().length;
  const atMax = textLen >= maxLength;
  const belowMin = textLen < minLength;

  function btn(label: string, action: () => void, active: boolean, title?: string) {
    return (
      <button
        type="button"
        title={title ?? label}
        onMouseDown={e => { e.preventDefault(); action(); }}
        style={active ? BTN_ACTIVE : BTN}
      >
        {label}
      </button>
    );
  }

  return (
    <div style={{ border: "1.5px solid #d0ccc5", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.3rem", padding: "0.55rem 0.75rem",
        borderBottom: "1px solid #e2ded6", background: "#faf9f7",
      }}>
        {btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "Bold")}
        {btn("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "Italic")}
        {btn("S̶", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"), "Strikethrough")}
        <div style={{ width: 1, background: "#e2ded6", margin: "0 0.2rem" }} />
        {btn("H1", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {btn("H2", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
        <div style={{ width: 1, background: "#e2ded6", margin: "0 0.2rem" }} />
        {btn("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {btn("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        <div style={{ width: 1, background: "#e2ded6", margin: "0 0.2rem" }} />
        {btn("❝", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), "Blockquote")}
        {btn("—", () => editor.chain().focus().setHorizontalRule().run(), false, "Divider")}
        <div style={{ width: 1, background: "#e2ded6", margin: "0 0.2rem" }} />
        {btn("↩", () => editor.chain().focus().undo().run(), false, "Undo")}
        {btn("↪", () => editor.chain().focus().redo().run(), false, "Redo")}
      </div>

      {/* Editor area */}
      <div style={{ position: "relative" }}>
        {editor.isEmpty && (
          <div style={{
            position: "absolute", top: "0.85rem", left: "1rem",
            color: "#a0a8a2", fontSize: "0.88rem", pointerEvents: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {placeholder ?? "Write a detailed description…"}
          </div>
        )}
        <EditorContent
          editor={editor}
          style={{ minHeight: 180, padding: "0.75rem 1rem", outline: "none", fontSize: "0.9rem", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", color: "#1a1f1c" }}
        />
      </div>

      {/* Footer: char count */}
      <div style={{
        padding: "0.35rem 0.9rem",
        borderTop: "1px solid #e2ded6",
        background: "#faf9f7",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.72rem",
        color: belowMin ? "#c0392b" : atMax ? "#c0392b" : "#6b7a72",
      }}>
        <span>{belowMin ? `${minLength - textLen} more characters needed` : atMax ? "Character limit reached" : ""}</span>
        <span>{textLen.toLocaleString()} / {maxLength.toLocaleString()}</span>
      </div>

      {/* TipTap editor prose styles injected inline via global style tag */}
      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror h2 { font-size: 1.15rem; font-weight: 700; margin: 0.75rem 0 0.35rem; color: #0f1410; font-family: 'Fraunces', Georgia, serif; }
        .ProseMirror h3 { font-size: 1rem; font-weight: 700; margin: 0.6rem 0 0.25rem; color: #0f1410; font-family: 'Fraunces', Georgia, serif; }
        .ProseMirror p { margin: 0 0 0.5rem; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.4rem; margin: 0.35rem 0 0.5rem; }
        .ProseMirror li { margin-bottom: 0.2rem; }
        .ProseMirror blockquote { border-left: 3px solid #1d6b3c; margin: 0.5rem 0; padding: 0.3rem 0.9rem; color: #4a5e50; font-style: italic; }
        .ProseMirror hr { border: none; border-top: 1px solid #e2ded6; margin: 0.75rem 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror s { text-decoration: line-through; }
      `}</style>
    </div>
  );
}
