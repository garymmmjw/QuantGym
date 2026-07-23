import { useState } from "react";

import { Button } from "../../../design-system/primitives/Button";
import { TextField } from "../../../design-system/primitives/TextField";
import { todoTitleSchema } from "./todo.schema";
import styles from "./TodoDock.module.css";

export type TodoEditorProps = Readonly<{
  disabled?: boolean;
  initialTitle?: string;
  language: "zh-CN" | "en";
  mode?: "create" | "edit";
  onSubmit: (title: string) => boolean | void | Promise<boolean | void>;
}>;

export function TodoEditor({
  disabled = false,
  initialTitle = "",
  language,
  mode = "create",
  onSubmit,
}: TodoEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isChinese = language === "zh-CN";

  return (
    <form
      className={mode === "create" ? styles.createForm : styles.editForm}
      onSubmit={(event) => {
        event.preventDefault();
        const result = todoTitleSchema.safeParse(title);
        if (!result.success) {
          setError(isChinese ? "请输入 1–240 个字符的待办内容" : "Enter a task between 1 and 240 characters");
          return;
        }
        setError("");
        setSubmitting(true);
        void Promise.resolve(onSubmit(result.data))
          .then((accepted) => {
            if (accepted !== false && mode === "create") setTitle("");
          })
          .catch(() => {
            setError(isChinese
              ? "无法安全保留这项更改，请稍后重试"
              : "This change could not be saved safely. Try again.");
          })
          .finally(() => setSubmitting(false));
      }}
    >
      <TextField
        disabled={disabled || submitting}
        error={error}
        label={mode === "create"
          ? (isChinese ? "新增待办" : "New task")
          : (isChinese ? "编辑待办" : "Edit task")}
        maxLength={240}
        onChange={(event) => setTitle(event.currentTarget.value)}
        placeholder={isChinese ? "下一件要完成的事…" : "What will you finish next?"}
        value={title}
        visuallyHideLabel
      />
      <Button disabled={disabled || submitting} isLoading={submitting} size="small" type="submit">
        {mode === "create"
          ? (isChinese ? "添加" : "Add")
          : (isChinese ? "保存" : "Save")}
      </Button>
    </form>
  );
}
