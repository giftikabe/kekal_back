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