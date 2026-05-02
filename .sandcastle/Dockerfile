FROM node:24-bookworm

# Install system dependencies.
# `unzip` is required by the bun installer below.
# `ripgrep` (`rg`) is a much faster grep that Claude/Codex agents prefer for
# code search; without it they fall back to slower scans or skip grepping.
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  ripgrep \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Install Codex CLI globally as root so the binary lands at /usr/local/bin/codex
# (on the default PATH). Must run before `USER agent` switches away from root.
RUN npm install -g @openai/codex

# Codex invokes commands via `bash -lc '...'` (login shell). Login shells
# source /etc/profile, which RESETS $PATH from the Dockerfile-level
# `ENV PATH` — dropping /home/agent/.bun/bin and /home/agent/.local/bin.
# Re-add them via /etc/profile.d so login shells see bun, bunx, and claude.
RUN echo 'export PATH="/home/agent/.bun/bin:/home/agent/.local/bin:$PATH"' \
  > /etc/profile.d/sandcastle-agent-path.sh \
  && chmod 644 /etc/profile.d/sandcastle-agent-path.sh

# Rename the base image's "node" user (UID 1000) to "agent".
# This keeps UID 1000 so that --userns=keep-id (Podman) and
# --user 1000:1000 (Docker) map to the correct home directory owner.
RUN usermod -d /home/agent -m -l agent node
USER agent

# Install bun — the project's package manager (see package.json `packageManager`
# and `bun.lock`). Agents must use `bun install` and `bun run …`, never npm.
RUN curl -fsSL https://bun.sh/install | bash

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add bun and Claude to PATH
ENV PATH="/home/agent/.bun/bin:/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

# Pre-create the bind-mount target for ~/.codex so Docker doesn't have to
# auto-create it as root at runtime.
RUN mkdir -p /home/agent/.codex

# Sandcastle's docker provider launches the container with `--user <host-uid>:<host-gid>`
# (e.g. 501:20 on macOS), but /home/agent is owned by UID 1000 (the renamed `node`
# user). Without this chmod the runtime user can't create ~/.gitconfig and Sandcastle's
# `git config --global --add safe.directory ...` lifecycle step fails. The container is
# isolated, so a permissive home dir is fine here.
RUN chmod -R a+rwX /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
