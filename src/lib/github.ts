export async function commitFileToFrontend(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  commitMessage: string
): Promise<{ success: boolean; commit_url?: string; error?: string }> {
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Check if file exists to get SHA
  let sha: string | undefined;
  try {
    const existing = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (existing.ok) {
      const data: any = await existing.json();
      sha = data.sha;
    }
  } catch { /* file does not exist yet */ }

  // Commit the file
  const body: any = {
    message: commitMessage,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    return { success: false, error: err.message || `GitHub API error ${res.status}` };
  }

  const result: any = await res.json();
  return { success: true, commit_url: result.commit?.html_url };
}

/**
 * NEW: reads a file's current content back from the frontend repo.
 * Used when an admin opens an already-published component/page for
 * editing — since we never store code in Postgres anymore, GitHub is the
 * only place the current source exists, so we fetch it fresh every time.
 * Returns null if the file doesn't exist (e.g. a draft that was never
 * published, or the DB record is stale).
 */
export async function getFileFromFrontend(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<{ content: string; sha: string } | null> {
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const res = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (!res.ok) return null;

  const data: any = await res.json();
  if (!data?.content) return null;

  // GitHub returns base64 content, sometimes with embedded newlines.
  const content = decodeURIComponent(
    escape(atob(data.content.replace(/\n/g, "")))
  );
  return { content, sha: data.sha };
}

/**
 * Deletes a file from the frontend repo. Used when a draft component is
 * discarded after having been published at least once, or when a page is
 * deleted and its generated page file should go with it.
 */
export async function deleteFileFromFrontend(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${undefined}`, // caller must set token below
  };
  // (kept simple/explicit rather than clever — build headers with the real token)
  const realHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  void headers;

  const existing = await fetch(`${apiBase}?ref=${branch}`, { headers: realHeaders });
  if (!existing.ok) return { success: true }; // already gone, nothing to do
  const data: any = await existing.json();

  const res = await fetch(apiBase, {
    method: "DELETE",
    headers: realHeaders,
    body: JSON.stringify({ message: commitMessage, sha: data.sha, branch }),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    return { success: false, error: err.message || `GitHub API error ${res.status}` };
  }
  return { success: true };
}
