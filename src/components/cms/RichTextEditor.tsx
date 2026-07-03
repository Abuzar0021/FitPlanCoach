// The website CMS's rich-text article editor. Built on Tiptap, configured to
// cover every format the production spec calls for (H1-H6, bold/italic/
// underline, lists, tables, images, YouTube video embeds, links,
// blockquotes, code blocks, and callouts), plus a paste handler that turns
// plain-text Markdown (the common ChatGPT/Claude "copy as text" output)
// into real rich content instead of literal "## " characters — see
// markdown-paste.ts. Emits sanitized HTML via onChange.
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code2,
  Table2,
  ImagePlus,
  Youtube as YoutubeIcon,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Lightbulb,
  Info,
  TriangleAlert,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { listMedia, uploadMedia, type MediaAsset } from "@/lib/media";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { Callout, type CalloutVariant } from "./callout-extension";
import { looksLikeMarkdown, markdownToHtml } from "./markdown-paste";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

const CALLOUT_VARIANTS: { variant: CalloutVariant; label: string; icon: typeof Info }[] = [
  { variant: "info", label: "Info", icon: Info },
  { variant: "tip", label: "Tip", icon: Lightbulb },
  { variant: "warning", label: "Warning", icon: TriangleAlert },
  { variant: "success", label: "Success", icon: CheckCircle2 },
];

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`size-8 inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ImagePickerDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInsert: (url: string, alt: string) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && assets === null)
      listMedia()
        .then(setAssets)
        .catch(() => setAssets([]));
  }, [open, assets]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const a = await uploadMedia(file);
      setAssets((prev) => [a, ...(prev ?? [])]);
      onInsert(a.url, a.alt ?? "");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">Pick an image or upload a new one.</p>
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
        {assets === null ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            No media yet. Upload your first image.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto">
            {assets.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => {
                  onInsert(a.url, a.alt ?? "");
                  onOpenChange(false);
                }}
                className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-border-strong"
              >
                <img
                  src={a.url}
                  alt={a.alt ?? ""}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [imageOpen, setImageOpen] = useState(false);
  const [calloutMenuOpen, setCalloutMenuOpen] = useState(false);

  const blockValue = HEADING_LEVELS.find((l) => editor.isActive("heading", { level: l }))
    ? String(HEADING_LEVELS.find((l) => editor.isActive("heading", { level: l })))
    : "p";

  function setBlock(v: string) {
    if (v === "p") editor.chain().focus().setParagraph().run();
    else
      editor
        .chain()
        .focus()
        .toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 | 5 | 6 })
        .run();
  }

  function addLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function addYoutube() {
    const url = window.prompt("YouTube video URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url.trim() });
  }

  function insertImage(url: string, alt: string) {
    editor.chain().focus().setImage({ src: url, alt }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1.5 rounded-t-xl">
      <select
        aria-label="Block type"
        value={blockValue}
        onChange={(e) => setBlock(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium mr-1"
      >
        <option value="p">Paragraph</option>
        {HEADING_LEVELS.map((l) => (
          <option key={l} value={l}>
            Heading {l}
          </option>
        ))}
      </select>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="size-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={addLink}>
        <LinkIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Insert image" onClick={() => setImageOpen(true)}>
        <ImagePlus className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Insert YouTube video" onClick={addYoutube}>
        <YoutubeIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Insert table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <Table2 className="size-4" />
      </ToolbarButton>

      <div className="relative">
        <ToolbarButton
          label="Insert callout"
          active={editor.isActive("callout")}
          onClick={() => setCalloutMenuOpen((v) => !v)}
        >
          <Lightbulb className="size-4" />
        </ToolbarButton>
        {calloutMenuOpen && (
          <div className="absolute z-20 top-9 left-0 surface-card p-1 flex flex-col gap-0.5 w-36">
            {CALLOUT_VARIANTS.map(({ variant, label, icon: Icon }) => (
              <button
                key={variant}
                type="button"
                onClick={() => {
                  editor.chain().focus().setCallout(variant).run();
                  setCalloutMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted text-left"
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="size-4" />
      </ToolbarButton>

      <ImagePickerDialog open={imageOpen} onOpenChange={setImageOpen} onInsert={insertImage} />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your article, or paste one generated with ChatGPT / Claude…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  // handlePaste is captured once by Tiptap's editorProps at construction; use
  // a ref so it always calls into the live editor instance.
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
      Callout,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none dark:prose-invert focus:outline-none min-h-[320px] px-4 py-3",
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html");
        if (html && html.trim()) return false; // let Tiptap's default HTML paste handling run
        const text = event.clipboardData?.getData("text/plain");
        if (text && looksLikeMarkdown(text)) {
          event.preventDefault();
          editorRef.current?.commands.insertContent(sanitizeArticleHtml(markdownToHtml(text)));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChange(sanitizeArticleHtml(e.getHTML())),
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Keep the editor's content in sync when `value` changes from outside
  // (e.g. loading a different article, or an external "reset" action)
  // without fighting the user's own typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (
      value !== current &&
      document.activeElement &&
      !editor.view.dom.contains(document.activeElement)
    ) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
