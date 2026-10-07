# oasis hub — static starter (name-agnostic)

1. Site name lives in ONE place: `site.js` → `SITE_NAME`. Change it, done.
2. Push this folder to a GitHub repo (e.g. `oasis`).
3. Cloudflare Pages → Create → Pages → Connect Git → pick repo.
4. Build settings: Framework = None, Build command = (empty), Output = `/`.
5. Try project name `oasis` first → you get `oasis.pages.dev`.
6. If taken, try `oasis-tools`, then `oasis-hub` — no code change needed.
7. Add a tool = duplicate `template-tool/` → rename `for-[business]/`.
8. Add one entry to `builds.json` (`business`, `problem`, `link`, `status`).
9. Status is `live` | `building` | `quiet`; `proof` is optional https URL.
10. All links are relative, so any `*.pages.dev` name just works. No backend.
