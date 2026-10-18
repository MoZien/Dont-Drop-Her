# Separate GitHub and Render deployment

Do not edit or reconnect the existing Toge-Game / HIPPO DUO repository or Render services.

## Current service

The game is published at https://dont-drop-her.onrender.com from https://github.com/MoZien/Dont-Drop-Her. The independent Render service is `srv-db72orc9v7es73a9kurg` in My Workspace. See `VERIFICATION.md` for actual release checks and the GitHub installation access needed for automatic updates.

## GitHub

The intended new repository is `MoZien/Dont-Drop-Her`. Creating repositories and pushing files requires GitHub authentication with repository creation and contents-write permission, plus permission to create a workflow file. A connected read/PR-only integration is insufficient for these operations.

With the official GitHub CLI, run from this project directory:

```sh
gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow
gh auth setup-git
git init -b main
git add .
git commit -m "Build complete two-player cooperative adventure"
gh repo create MoZien/Dont-Drop-Her --public --source=. --remote=origin --push
```

If the checkout is already initialized and committed, skip `git init`, `git add`, and `git commit`. Do not recreate an existing repository. If `MoZien/Dont-Drop-Her` already exists, inspect its contents before choosing a different repository or attaching an origin.

On Windows, a portable official `gh.exe` can be used without a global installation. The local release preparation may place it at `artifacts/tools/gh/bin/gh.exe`. This ignored tools directory is not part of the released game or repository.

Do not paste access tokens into a chat or commit them. Complete the device/browser login yourself. The CLI stores credentials in the configured credential store.

## Render

After the new repository exists:

1. In Render's **My Workspace**, create **New → Web Service** or **New → Blueprint**.
2. Select **MoZien/Dont-Drop-Her**. If the GitHub installation restricts repository access, grant Render access specifically to this new repository.
3. Choose branch `main`, runtime **Node**, region **Frankfurt**, and plan **Free**.
4. Set build command to `npm ci --include=dev && npm run build`.
5. Set start command to `npm start`.
6. Set `NODE_ENV=production` and `NODE_VERSION=24`. Let Render supply `PORT`.
7. Configure health check `/health`, one instance, and automatic deployment on main-branch commits.
8. Deploy and wait for the deploy status to become **Live**. Use the literal URL Render returns. A guessed `onrender.com` URL is not evidence of deployment.

The checked-in `render.yaml` captures these settings for a Blueprint. The native Render create-service tool can configure the same build/start commands, plan, region, env, and branch. If the tool does not expose health checks, set `/health` in the dashboard after creation. A public repository can also be deployed by its Git URL if the GitHub picker is not available.

HTTPS and WebSockets terminate at Render. Express and Socket.IO share one HTTP listener. The frontend connects to its page origin and does not need a separate Socket.IO domain or CORS wildcard. Both polling and WebSocket transport are supported. Do not add multiple instances; in-memory games require one authoritative process.

## Verify the actual public release

```sh
git rev-parse HEAD
curl https://ACTUAL-SERVICE.onrender.com/health
GAME_URL=https://ACTUAL-SERVICE.onrender.com npm run test:e2e
node scripts/verify-campaign.mjs https://ACTUAL-SERVICE.onrender.com
```

On PowerShell:

```powershell
$env:GAME_URL = 'https://ACTUAL-SERVICE.onrender.com'
npm run test:e2e
Remove-Item Env:GAME_URL
```

Check the following:

- `/health` returns 200 and its `commit` matches the pushed main commit / Render deploy.
- The 3D menu renders without a fallback or console error.
- Two independent browser contexts create/join a room, ready up, move both characters, see the same health, pause, and detect a disconnect.
- Checkpoints, shattering, and all five chapter transitions work; the server input-only campaign test covers course reachability, while final public hands-on testing covers hosting/network conditions.
- The finale shows the private note only to the two room members.
- On two actual iPhones on different networks, test multi-touch, safe areas, audio unlock, reconnection, and performance.

The automated public browser run checks two independent contexts on the test host. It is not a claim that two cellular networks or physical iPhones were tested.

## Deployment status

Read `VERIFICATION.md` for the latest recorded evidence. An uncreated GitHub repository or a deploy that has not reached Live must be reported explicitly, along with the missing authentication or permission. Local playability alone is not a public release.

Official references: [Node/Express deployment](https://render.com/docs/deploy-node-express-app), [WebSockets](https://render.com/docs/websocket), [Blueprint specification](https://render.com/docs/blueprint-spec), [health checks](https://render.com/docs/health-checks).
