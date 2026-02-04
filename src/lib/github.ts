import { Octokit } from 'octokit';

export interface GitHubUser {
    login: string;
    id: number;
    avatar_url: string;
    name: string | null;
}

export interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    date: string;
}

export async function validateToken(token: string): Promise<GitHubUser | null> {
    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.rest.users.getAuthenticated();
        return {
            login: data.login,
            id: data.id,
            avatar_url: data.avatar_url,
            name: data.name,
        };
    } catch {
        return null;
    }
}

export interface RepoInfo {
    owner: string;
    name: string;
    fullName: string;
    private: boolean;
    description: string | null;
}

export async function getUserRepositories(token: string): Promise<RepoInfo[]> {
    try {
        const octokit = new Octokit({ auth: token });
        const repos: RepoInfo[] = [];

        // Fetch all repos the user has access to (owned + collaborator)
        for await (const response of octokit.paginate.iterator(
            octokit.rest.repos.listForAuthenticatedUser,
            { per_page: 100, sort: 'updated' }
        )) {
            for (const repo of response.data) {
                repos.push({
                    owner: repo.owner.login,
                    name: repo.name,
                    fullName: repo.full_name,
                    private: repo.private,
                    description: repo.description,
                });
            }
        }

        return repos;
    } catch (error) {
        console.error('Failed to fetch user repos:', error);
        return [];
    }
}

export async function getRepositoryCommits(
    token: string,
    owner: string,
    repo: string,
    perPage: number = 10
): Promise<CommitInfo[]> {
    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            per_page: perPage,
        });

        return data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.author?.login || commit.commit.author?.name || 'Unknown',
            date: commit.commit.author?.date || new Date().toISOString(),
        }));
    } catch {
        return [];
    }
}

export async function getReadmeContent(
    token: string,
    owner: string,
    repo: string
): Promise<{ content: string; sha: string } | null> {
    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.rest.repos.getReadme({
            owner,
            repo,
        });

        if ('content' in data) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return { content, sha: data.sha };
        }
        return null;
    } catch {
        return null;
    }
}

export async function updateReadme(
    token: string,
    owner: string,
    repo: string,
    content: string,
    _sha: string, // Kept for backwards compatibility but we'll re-fetch
    message: string = 'Auto-commit: minor README update'
): Promise<boolean> {
    try {
        const octokit = new Octokit({ auth: token });

        // Always fetch the latest SHA to avoid conflicts
        const latestReadme = await getReadmeContent(token, owner, repo);
        if (!latestReadme) {
            console.error('Failed to fetch latest README for update');
            return false;
        }

        const encodedContent = Buffer.from(content).toString('base64');

        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: 'README.md',
            message,
            content: encodedContent,
            sha: latestReadme.sha, // Use the freshly fetched SHA
        });

        return true;
    } catch (error) {
        console.error('Failed to update README:', error);
        return false;
    }
}

export async function checkForNewCommits(
    token: string,
    owner: string,
    repo: string,
    lastSha: string | null,
    currentUsername: string
): Promise<{ hasNew: boolean; latestCommit: CommitInfo | null; isFromOther: boolean }> {
    const commits = await getRepositoryCommits(token, owner, repo, 5);

    if (commits.length === 0) {
        return { hasNew: false, latestCommit: null, isFromOther: false };
    }

    const latestCommit = commits[0];

    if (!lastSha) {
        return { hasNew: true, latestCommit, isFromOther: latestCommit.author !== currentUsername };
    }

    if (latestCommit.sha !== lastSha) {
        const isFromOther = latestCommit.author !== currentUsername;
        return { hasNew: true, latestCommit, isFromOther };
    }

    return { hasNew: false, latestCommit, isFromOther: false };
}

export async function performAutoCommit(
    token: string,
    owner: string,
    repo: string
): Promise<{ success: boolean; message: string }> {
    const readme = await getReadmeContent(token, owner, repo);

    if (!readme) {
        return { success: false, message: 'Could not fetch README' };
    }

    // Add a period or update timestamp
    const timestamp = new Date().toISOString();
    let newContent = readme.content;

    // Check if content ends with newline
    if (newContent.endsWith('\n')) {
        newContent = newContent.slice(0, -1) + '.\n';
    } else {
        newContent = newContent + '.';
    }

    // Add hidden timestamp comment
    const timestampComment = `<!-- AutoCommit: ${timestamp} -->`;
    if (!newContent.includes('<!-- AutoCommit:')) {
        newContent = newContent + '\n' + timestampComment;
    } else {
        // Replace existing timestamp
        newContent = newContent.replace(/<!-- AutoCommit: .* -->/, timestampComment);
    }

    const success = await updateReadme(
        token,
        owner,
        repo,
        newContent,
        readme.sha,
        `Auto-commit: ${timestamp}`
    );

    return {
        success,
        message: success ? 'README updated successfully' : 'Failed to update README',
    };
}

export async function getRepoInfo(
    token: string,
    owner: string,
    repo: string
): Promise<{ exists: boolean; name: string; fullName: string } | null> {
    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.rest.repos.get({ owner, repo });
        return {
            exists: true,
            name: data.name,
            fullName: data.full_name,
        };
    } catch {
        return null;
    }
}
