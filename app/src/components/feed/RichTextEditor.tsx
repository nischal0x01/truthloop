/**
 * RichTextEditor — Tiptap-based rich text editor for discussions.
 * Supports bold, italic, bullet lists, links (inline input), and embedded images (base64).
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Link2, ImageIcon } from 'lucide-react';

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Write something…',
  maxLength = 500_000,
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false, // uses the standalone Link extension below
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg border-2 border-black discussion-img' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline hover:text-accent/80' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Focus link input when link popover opens
  useEffect(() => {
    if (linkInputOpen) {
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  }, [linkInputOpen]);

  const handleImageUpload = useCallback(
    (file: File) => {
      if (!editor || !file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        editor.chain().focus().setImage({ src: dataUrl }).run();
        onChange?.(editor.getHTML());
      };
      reader.readAsDataURL(file);
    },
    [editor, onChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
      e.target.value = '';
    },
    [handleImageUpload]
  );

  const handleApplyLink = useCallback(() => {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else {
      const finalUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setLinkUrl('');
    setLinkInputOpen(false);
  }, [editor, linkUrl]);

  const handleRemoveLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
    setLinkUrl('');
    setLinkInputOpen(false);
  }, [editor]);

  if (!editor) return null;

  const charCount = editor.getText().length;

  return (
    <div className={`rounded-lg border-2 border-black bg-card ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-black px-2 py-1.5">
        {/* Bold */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          disabled={disabled}
          title="Bold"
        >
          <span className="font-bold text-sm">B</span>
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          disabled={disabled}
          title="Italic"
        >
          <span className="italic text-sm">I</span>
        </ToolbarButton>

        {/* Bullet List */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          disabled={disabled}
          title="Bullet List"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>

        {/* Link — inline input in toolbar */}
        <div className="relative flex items-center gap-1">
          <ToolbarButton
            onClick={() => {
              if (editor.isActive('link')) {
                // Already has link — open input with existing href
                setLinkUrl(editor.getAttributes('link').href || '');
              }
              setLinkInputOpen(!linkInputOpen);
            }}
            active={editor.isActive('link') || linkInputOpen}
            disabled={disabled}
            title={editor.isActive('link') ? 'Edit Link' : 'Add Link'}
          >
            <Link2 size={14} aria-hidden="true" />
          </ToolbarButton>

          {/* Inline link input */}
          {linkInputOpen && (
            <div className="flex items-center gap-1">
              <input
                ref={linkInputRef}
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="rounded border-2 border-black bg-card px-2 py-1 text-label-small outline-none focus:ring-2 focus:ring-black w-40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleApplyLink(); }
                  if (e.key === 'Escape') { setLinkInputOpen(false); setLinkUrl(''); }
                }}
              />
              <button
                type="button"
                onClick={handleApplyLink}
                className="rounded border-2 border-black bg-accent px-2 py-1 text-label-small font-semibold shadow-sm hover:bg-accent/90"
              >
                OK
              </button>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="rounded border-2 border-black bg-red px-2 py-1 text-label-small font-semibold text-white shadow-sm hover:bg-red/90"
                  title="Remove link"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Image Upload */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Insert Image"
        >
          <ImageIcon size={14} aria-hidden="true" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[11px] tabular-nums ${charCount > maxLength ? 'font-semibold text-red' : 'text-muted-foreground'}`}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent
        ref={editorContainerRef}
        editor={editor}
        className="prose-custom px-3 py-2.5 min-h-24 max-h-96 overflow-y-auto"
      />

      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 80px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b7280;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          list-style: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ul li {
          margin: 0.25em 0;
        }
        .ProseMirror strong {
          font-weight: 700;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror a,
        .ProseMirror .link {
          color: #ff90e8;
          text-decoration: underline;
        }
        .ProseMirror img,
        .ProseMirror .discussion-img {
          max-width: 100%;
          border-radius: 4px;
          border: 2px solid #000;
          margin: 0.5em 0;
          display: block;
        }
      `}</style>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={[
        'grid size-7 place-items-center rounded border-2 border-black transition-all',
        'hover:-translate-y-0.5 hover:shadow-hard-sm',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-accent text-black shadow-hard-sm'
          : 'bg-card hover:bg-muted',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
