"use client";

import { useState } from "react";

export function PostShareButton({ title }: { title: string }) {
  const [notice, setNotice] = useState("");

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Post link copied.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Post link copied.");
      } catch {
        setNotice("Unable to share this post. Copy its address from your browser.");
      }
    }
  }

  return <><button className="admin-secondary-button" type="button" onClick={share}>Share post</button>{notice && <span role="status">{notice}</span>}</>;
}
