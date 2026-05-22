## Team Skills
Shared Claude Code skills are maintained at https://github.com/govtech-bb/team-skills.

**First-time setup** — run this once in PowerShell to install the skills:
```powershell
powershell -ExecutionPolicy Bypass -File setup-team-skills.ps1
```

**To update** when new skills are added to the repo, run the same script again. Restart Claude Code after installing.

---

## Deploy Configuration (configured by /setup-deploy)
- Platform: Netlify
- Production URL: https://st-thomas-queue.netlify.app
- Deploy workflow: auto-deploy on push to main (once GitHub is connected in Netlify dashboard)
- Deploy status command: HTTP health check
- Merge method: merge
- Project type: web app (Next.js 14 App Router)
- Post-deploy health check: https://st-thomas-queue.netlify.app

### Custom deploy hooks
- Pre-merge: none
- Deploy trigger: automatic on push to main
- Deploy status: poll production URL
- Health check: https://st-thomas-queue.netlify.app

### Netlify site
- Site ID: b7ee7e26-88ef-4175-bcc9-1f2c4dc87ee9
- Admin: https://app.netlify.com/projects/st-thomas-queue
- GitHub repo: https://github.com/govtech-bb/st-thomas-sign-in
