# Madhanraj C — Developer portfolio

A responsive portfolio with a React and Vite frontend in [FE](FE/) and a Spring Boot REST API on Java 21 in [BE](BE/). Each directory builds independently. The frontend renders its bundled portfolio immediately and refreshes it from the API when available.

## Run locally on Windows

Install Node.js 24, Java 21 and Maven. From the repository root, start the backend in PowerShell.

```powershell
Set-Location BE
mvn.cmd spring-boot:run
```

From the repository root in a second PowerShell window, start the frontend.

```powershell
Set-Location FE
npm.cmd ci
npm.cmd run dev
```

Visit [the portfolio](http://localhost:5173), [the portfolio API](http://localhost:8080/api/portfolio), or [the health endpoint](http://localhost:8080/api/health). Vite proxies requests under `/api` to Spring Boot in development.

## Build release artifacts

```powershell
npm.cmd --prefix FE ci
npm.cmd --prefix FE run build
mvn.cmd -f BE/pom.xml package
```

Vite generates `FE/dist/` and Maven creates `BE/target/portfolio-api.jar`. A production frontend without `VITE_API_URL` uses the bundled portfolio content.

## Update portfolio content

Edit the [backend portfolio data](BE/src/main/resources/portfolio.json) to update work, experience, skills, or contact details. Copy it into the frontend before committing so the first render includes the updated content.

```powershell
Copy-Item -LiteralPath BE/src/main/resources/portfolio.json -Destination FE/src/content/portfolio.json -Force
```

## Deploy both services on Render’s free tier

1. In the [Render dashboard](https://dashboard.render.com/), connect GitHub and choose **New → Web Service**. Select **Madhanrajcoder/Resumehost** on the `main` branch. Set the runtime to **Docker**, the instance type to **Free**, and the root directory to `BE`. The Dockerfile path is `./Dockerfile` and the Docker build context is `.` relative to that root. Set the health check path to `/api/health`. Deploy and copy the backend’s HTTPS URL. Confirm its `/api/health` returns `{"status":"UP"}`. [Docker setup](https://render.com/docs/docker) · [Health checks](https://render.com/docs/health-checks)

2. In Render choose **New → Static Site** and select the same repository. Set the root directory to `FE`. Use `npm ci && npm run build` as the build command and `dist` as the publish directory. Set `VITE_API_URL` to the backend’s HTTPS URL, for example `https://your-portfolio-api.onrender.com`. Deploy and copy the static site’s HTTPS URL. [Static site setup](https://render.com/docs/static-sites)

3. In the backend service’s **Environment** settings, set `FRONTEND_ORIGIN` to the static site’s HTTPS origin, for example `https://your-portfolio.onrender.com`. Enter the origin without a trailing slash or page path. Save and redeploy the backend so the browser can read the API response.

4. Open the static site and check the browser’s Network tab. The request to the backend’s `/api/portfolio` should return HTTP 200. The static site’s HTTPS URL is the one to share with recruiters.

Render’s free backend sleeps after 15 idle minutes and may take about a minute to wake. The static site remains available and displays the bundled content while the API starts. Both services share the workspace’s included bandwidth and build minutes. [Render free-tier details](https://render.com/docs/free)

## Enable shared game scores with Neon

Run `neon deploy` from the linked repository root to refresh the Postgres connection variables in the ignored `.env.local` or `.env` file. Build and start the backend from the repository root, then start the frontend in a second terminal. [Neon environment variables](https://neon.com/docs/cli/env)

```powershell
mvn.cmd -f BE/pom.xml package
npm.cmd run start:backend
```

```powershell
npm.cmd --prefix FE run dev
```

To activate shared scores on your hosted site, set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in the **backend** service’s **Environment** page on Render and choose **Save and deploy**. Use the pooled URL for `DATABASE_URL` and the direct URL for `DATABASE_URL_UNPOOLED`. Spring Boot uses the PostgreSQL JDBC driver and applies Flyway migrations on startup using the direct connection. [Neon connection pooling](https://neon.com/docs/connect/connection-pooling) · [Render environment settings](https://render.com/docs/configure-environment-variables)

Open **Games → Quick Math → View leaderboard** and create a test player. Use the player’s key on a second browser to confirm its saved scores follow it. The backend also supports the existing `GAMES_DATABASE_URL`, `GAMES_DATABASE_USERNAME`, and `GAMES_DATABASE_PASSWORD` settings for a separately configured JDBC connection.

Memory Match, Reaction Time, and Quick Math each rank the best score per player. Players explicitly share scores earned during their visit. The leaderboard uses browser-reported results for casual play. Local gameplay and browser scores are available when the database is unavailable.

## Hero artwork

[hero-knot.jpg](FE/public/hero-knot.jpg) was generated with the built-in imagegen tool.

<details>
<summary>Generation prompt</summary>

> Asset for the right side of a premium dark developer portfolio website, square 1:1 crop. Create a single sculptural three dimensional trefoil knot, a thick wide ribbon folded and looped into three continuous intertwined lobes with distinct angular bevels, made of brushed gunmetal and polished liquid chrome. A controlled vivid electric mint-green (#aaf9ba) rim light on the upper left surfaces and glints of deep teal, with rich black shadows and fine polished metal texture. Only the knot dominates the frame. Compose center with full silhouette and generous 12% breathing room on each side, softly angled at three quarters, luminous near the center and naturally fading into perfectly uniform near-black #0b0e0c at all four corners. Exceptional editorial CGI product photography, premium industrial design, subtle directional studio lighting, smooth material and high contrast. No ground or horizon, no surrounding shapes, no extra particles, no text, no frames, no watermark. The negative space should remain near black so the art blends with a dark webpage background.

</details>
