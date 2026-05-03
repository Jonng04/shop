<script setup lang="ts">
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";

const model = defineModel<string>({ default: "" });

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    disabled?: boolean;
    minHeight?: number;
  }>(),
  {
    placeholder: "Nhập nội dung...",
    disabled: false,
    minHeight: 160,
  },
);

const editor = import.meta.client
  ? useEditor({
      content: model.value || "",
      editable: !props.disabled,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [2, 3],
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
          },
        }),
        Placeholder.configure({
          placeholder: props.placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
      ],
      editorProps: {
        attributes: {
          class: "rich-editor-content prose prose-sm max-w-none focus:outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        model.value = editor.getHTML();
      },
    })
  : ref();

watch(
  () => props.disabled,
  (disabled) => {
    editor.value?.setEditable(!disabled);
  },
);

watch(
  () => model.value,
  (next) => {
    const instance = editor.value;
    if (!instance) return;

    const current = instance.getHTML();
    if ((next || "") !== current) {
      instance.commands.setContent(next || "", false);
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

const setLink = () => {
  const instance = editor.value;
  if (!instance) return;

  const currentHref = instance.getAttributes("link").href as string | undefined;
  const url = window.prompt("Nhập URL", currentHref || "https://");
  if (url === null) return;

  if (!url.trim()) {
    instance.chain().focus().unsetLink().run();
    return;
  }

  instance.chain().focus().setLink({ href: url.trim() }).run();
};

const btnClass = (active = false) =>
  [
    "inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-all",
    active
      ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
      : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800",
  ].join(" ");

const groupClass =
  "flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 px-1 py-1 dark:border-slate-700 dark:bg-slate-800/80";

const dividerClass = "h-6 w-px bg-slate-200 dark:bg-slate-700";
</script>

<template>
  <div class="relative overflow-visible">
    <div
      class="flex flex-wrap items-center gap-2 rounded-t-[10px] border border-b-0 border-slate-200 bg-slate-50/80 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/60"
    >
      <div :class="groupClass">
        <UiTooltip text="Đoạn văn">
          <button
            type="button"
            :class="btnClass(editor?.isActive('paragraph'))"
            :disabled="props.disabled"
            aria-label="Đoạn văn"
            @click="editor?.chain().focus().setParagraph().run()"
          >
            <Icon name="lucide:pilcrow" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Tiêu đề 2">
          <button
            type="button"
            :class="btnClass(editor?.isActive('heading', { level: 2 }))"
            :disabled="props.disabled"
            aria-label="Tiêu đề 2"
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          >
            <Icon name="lucide:heading-2" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Tiêu đề 3">
          <button
            type="button"
            :class="btnClass(editor?.isActive('heading', { level: 3 }))"
            :disabled="props.disabled"
            aria-label="Tiêu đề 3"
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
          >
            <Icon name="lucide:heading-3" size="16" />
          </button>
        </UiTooltip>
      </div>

      <span :class="dividerClass"></span>

      <div :class="groupClass">
        <UiTooltip text="In đậm">
          <button
            type="button"
            :class="btnClass(editor?.isActive('bold'))"
            :disabled="props.disabled"
            aria-label="In đậm"
            @click="editor?.chain().focus().toggleBold().run()"
          >
            <Icon name="lucide:bold" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="In nghiêng">
          <button
            type="button"
            :class="btnClass(editor?.isActive('italic'))"
            :disabled="props.disabled"
            aria-label="In nghiêng"
            @click="editor?.chain().focus().toggleItalic().run()"
          >
            <Icon name="lucide:italic" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Gạch chân">
          <button
            type="button"
            :class="btnClass(editor?.isActive('underline'))"
            :disabled="props.disabled"
            aria-label="Gạch chân"
            @click="editor?.chain().focus().toggleUnderline().run()"
          >
            <Icon name="lucide:underline" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Gạch ngang">
          <button
            type="button"
            :class="btnClass(editor?.isActive('strike'))"
            :disabled="props.disabled"
            aria-label="Gạch ngang"
            @click="editor?.chain().focus().toggleStrike().run()"
          >
            <Icon name="lucide:strikethrough" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Mã nội dòng">
          <button
            type="button"
            :class="btnClass(editor?.isActive('code'))"
            :disabled="props.disabled"
            aria-label="Mã nội dòng"
            @click="editor?.chain().focus().toggleCode().run()"
          >
            <Icon name="lucide:code-2" size="16" />
          </button>
        </UiTooltip>
      </div>

      <span :class="dividerClass"></span>

      <div :class="groupClass">
        <UiTooltip text="Danh sách chấm">
          <button
            type="button"
            :class="btnClass(editor?.isActive('bulletList'))"
            :disabled="props.disabled"
            aria-label="Danh sách chấm"
            @click="editor?.chain().focus().toggleBulletList().run()"
          >
            <Icon name="lucide:list" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Danh sách số">
          <button
            type="button"
            :class="btnClass(editor?.isActive('orderedList'))"
            :disabled="props.disabled"
            aria-label="Danh sách số"
            @click="editor?.chain().focus().toggleOrderedList().run()"
          >
            <Icon name="lucide:list-ordered" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Trích dẫn">
          <button
            type="button"
            :class="btnClass(editor?.isActive('blockquote'))"
            :disabled="props.disabled"
            aria-label="Trích dẫn"
            @click="editor?.chain().focus().toggleBlockquote().run()"
          >
            <Icon name="lucide:quote" size="16" />
          </button>
        </UiTooltip>
      </div>

      <span :class="dividerClass"></span>

      <div :class="groupClass">
        <UiTooltip text="Chèn liên kết">
          <button
            type="button"
            :class="btnClass(editor?.isActive('link'))"
            :disabled="props.disabled"
            aria-label="Chèn liên kết"
            @click="setLink"
          >
            <Icon name="lucide:link-2" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Đường kẻ ngang">
          <button
            type="button"
            :class="btnClass(false)"
            :disabled="props.disabled"
            aria-label="Đường kẻ ngang"
            @click="editor?.chain().focus().setHorizontalRule().run()"
          >
            <Icon name="lucide:minus" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Xóa định dạng">
          <button
            type="button"
            :class="btnClass(false)"
            :disabled="props.disabled"
            aria-label="Xóa định dạng"
            @click="editor?.chain().focus().unsetAllMarks().clearNodes().run()"
          >
            <Icon name="lucide:eraser" size="16" />
          </button>
        </UiTooltip>
      </div>

      <div class="ml-auto" :class="groupClass">
        <UiTooltip text="Hoàn tác">
          <button
            type="button"
            :class="btnClass(false)"
            :disabled="props.disabled || !editor?.can().undo()"
            aria-label="Hoàn tác"
            @click="editor?.chain().focus().undo().run()"
          >
            <Icon name="lucide:undo-2" size="16" />
          </button>
        </UiTooltip>

        <UiTooltip text="Làm lại">
          <button
            type="button"
            :class="btnClass(false)"
            :disabled="props.disabled || !editor?.can().redo()"
            aria-label="Làm lại"
            @click="editor?.chain().focus().redo().run()"
          >
            <Icon name="lucide:redo-2" size="16" />
          </button>
        </UiTooltip>
      </div>
    </div>

    <div class="overflow-hidden rounded-b-[10px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div
        class="bg-white dark:bg-slate-900"
        :style="{ minHeight: `${props.minHeight}px`, '--rt-min-h': `${props.minHeight}px` }"
      >
        <EditorContent :editor="editor" />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.rich-editor-content) {
  min-height: var(--rt-min-h);
  box-sizing: border-box;
  padding: 14px 16px;
  color: #334155;
  line-height: 1.6;
}

.dark :deep(.rich-editor-content) {
  color: #e2e8f0;
}

:deep(.rich-editor-content h2) {
  margin: 0.8em 0 0.35em;
  font-size: 1.1rem;
  font-weight: 600;
}

:deep(.rich-editor-content h3) {
  margin: 0.7em 0 0.3em;
  font-size: 1rem;
  font-weight: 600;
}

:deep(.rich-editor-content ul),
:deep(.rich-editor-content ol) {
  margin: 0.5em 0;
  padding-left: 1.2em;
}

:deep(.rich-editor-content blockquote) {
  margin: 0.65em 0;
  border-left: 3px solid rgba(6, 95, 70, 0.35);
  padding-left: 0.75em;
  color: #475569;
}

.dark :deep(.rich-editor-content blockquote) {
  color: #cbd5e1;
}

:deep(.rich-editor-content p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #94a3b8;
  pointer-events: none;
  float: left;
  height: 0;
}
</style>
