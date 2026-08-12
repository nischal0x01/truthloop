/**
 * RichTextEditor — Tiptap-based rich text editor for discussions.
 * Supports bold, italic, bullet lists, links, and image embedding.
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useRef, useState } from 'react';
import { Link2, ImageIcon, Loader2, X } from 'lucide-react';

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  onImageUpload?: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Write something…',
  maxLength = 2000,
  onImageUpload,
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg border-2 border-black' },
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

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      editor?.chain().focus().setImage({ src: data.url }).run();
      onImageUpload?.(data.url);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [editor, onImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  }, [handleImageUpload]);

  const handleAddLink = useCallback(() => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const handleRemoveLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) return null;

  const charCount = editor.storage.characterCount?.characters?.() ?? editor.getText().length;

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

        {/* Link */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowLinkInput(!showLinkInput)}
            active={editor.isActive('link') || showLinkInput}
            disabled={disabled}
            title="Add Link"
          >
            <Link2 size={14} aria-hidden="true" />
          </ToolbarButton>

          {showLinkInput && (
            <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1 rounded-lg border-2 border-black bg-card p-2 shadow-hard">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="rounded border-2 border-black px-2 py-1 text-label-small outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLink();
                  if (e.key === 'Escape') setShowLinkInput(false);
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="rounded border-2 border-black bg-accent px-2 py-1 text-label-small font-semibold shadow-sm hover:bg-accent/90"
              >
                Add
              </button>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="rounded border-2 border-black bg-danger px-2 py-1 text-label-small font-semibold text-white shadow-sm hover:bg-danger/90"
                  title="Remove link"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Image Upload */}
        <div className="relative">
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            title="Upload Image"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <ImageIcon size={14} aria-hidden="true" />
            )}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[11px] tabular-nums ${charCount > maxLength ? 'font-semibold text-danger' : 'text-muted-foreground'}`}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose-custom px-3 py-2.5 min-h-[100px] max-h-[400px] overflow-y-auto"
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
        .ProseMirror a {
          color: #ff90e8;
          text-decoration: underline;
        }
        .ProseMirror img {
          max-width: 100%;
          border-radius: 4px;
          border: 2px solid #000;
          margin: 0.5em 0;
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
