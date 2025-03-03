"use server";

import type { InitialState } from "./page";

export const createPost = async (preData: InitialState, formData: FormData) => {
  const title = formData.get("title");
  const content = formData.get("content");

  if (
    !title ||
    !content ||
    typeof title !== "string" ||
    typeof content !== "string"
  ) {
    return { message: "Title and content are required" };
  }

  const res = await fetch("https://api.vercel.app/posts", {
    method: "POST",
    body: JSON.stringify({ title, content }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    return { message: "Failed to create post" };
  }

  return { message: "Post created successfully" };
};
