# Gurugram Weather Dashboard

## Deploy to Vercel (free)

1. Create a free GitHub account if you don't have one, and create a new empty repository.
2. Push this folder's contents to that repository:
   ```
   git init
   git add .
   git commit -m "Initial dashboard"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. Go to vercel.com and sign in (GitHub login works directly).
4. Click "Add New Project", select your repository.
5. Vercel should auto-detect this as a Vite project. If asked:
   - Build command: `npm run build`
   - Output directory: `dist`
6. Click Deploy. You'll get a live `.vercel.app` URL.

Note: I have not personally re-verified Vercel's exact current UI wording for these steps —
if a label looks different, look for the equivalent (e.g. "Import Project" instead of
"Add New Project").

## Updating your data

Export your Google Sheet as CSV (File → Share → Publish to web, or Download → CSV) and
upload it via the "Upload CSV" button on the live site to refresh the charts.
