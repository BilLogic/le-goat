# le goat

A case study of le goat, the PLUS design team's Slack agent, published as an interactive site and an article, with the files posted to Medium, Substack, LinkedIn and Instagram.

## What's where

| Folder | What it holds |
|---|---|
| `index.html`, `data.js`, `media/` | The interactive site, deployed at `/` |
| `article/` | The article, deployed at `/article/` |
| `assets/medium/` | All 16 figures as posted to Medium: GIFs for the motion figures, PNG and JPG for the stills |
| `assets/substack/` | The same 16 figures; the long GIFs re-fit to Substack's limits (about 5.4 MB and 300 frames) |
| `assets/linkedin/` | The 4:5 feed preview, a GIF and a still |
| `assets/instagram/` | The 9:16 Story and Reel preview, an MP4 and a still |
| `pipeline/` | The scripts that record the site and article and render every platform's files |

Masters, raw recordings, article drafts and the motion studies stay local and are gitignored.

## Viewing it locally

From this folder:

```
python3 -m http.server 8765
```

Published with Netlify. There is no build step.

### Microsoft Clarity

Both pages carry a small inline loader for the Clarity project `z91wpluc22`, right after the `<title>`. It runs only on `le-goat.netlify.app`, so local copies and deploy previews never load it, and never in a browser a script drives (`navigator.webdriver`). It waits for the page to load, then the first scroll, tap or key (or 3 s), then an idle moment.

To keep your own visits out of the recordings, open https://le-goat.netlify.app/?clarity=off once in each browser you use. That marks the browser in localStorage and Clarity never loads there again; `?clarity=on` undoes it. The page drops the parameter from the address as it reads it, so a copied link never carries it.

## Re-rendering the platform files

The social previews come from the site's landing section, and the Medium and Substack GIFs come from the article's figures. Setup, platform limits and the steps for each are in [pipeline/README.md](pipeline/README.md). In short, with the repo served on port 8771:

```
node pipeline/social.mjs --video     # record the landing section in each frame
pipeline/social.sh                   # write assets/linkedin/li-feed-4x5.gif and assets/instagram/story-reel-9x16.mp4
pipeline/batch.sh                    # every motion figure as a GIF, fit for each platform, into assets/medium/ and assets/substack/
```
