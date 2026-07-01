# Move to your own FREE Supabase (off Lovable) — keeps everything working

Goal: stop paying Lovable, fully own your backend, fix login. You keep Supabase
(it's free for your size) — you just move from Lovable's project to your own.

Time: ~20–30 min. No credit card. No code rewrite.

---

## 1. Create your own free Supabase project
1. Go to **https://supabase.com** → **Start your project** → sign up (GitHub or
   email). This is YOUR account, separate from Lovable.
2. **New project** → name it `fitplancoach` → set a strong **database password**
   (save it) → pick the region closest to your users → **Create** (Free plan).
3. Wait ~2 min for it to provision.

## 2. Create the database (one paste)
1. In your new project: left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/full_schema.sql` from this repo, copy **everything**, paste it
   into the editor, click **Run**.
3. It should say "Success". (If a line errors, copy the error and send it to
   Claude — it's a 1-line fix.)

## 3. Create the two storage buckets
Left sidebar → **Storage** → **New bucket**:
- name `avatars`, **Public** → Create
- name `media`, **Public** → Create

## 4. Configure Auth (now that you own the dashboard)
**Authentication → URL Configuration:**
- **Site URL:** `https://fitplancoach.com`
- **Redirect URLs:** add `https://fitplancoach.com/**`

**Authentication → Sign In / Providers → Email:**
- Turn **OFF** "Confirm email" (so signup works instantly — no email needed).

## 5. Copy your 3 keys
**Project Settings → API:**
- **Project URL** (e.g. `https://abcd1234.supabase.co`)
- **anon / publishable** key
- **service_role / secret** key (keep private)

## 6. Put the new keys on your server
On the VPS:
```bash
cd ~/FitPlanCoach
nano .env.docker
```
Set these to the NEW values (same anon key goes in both VITE_ and the server one):
```
VITE_SUPABASE_URL=https://YOURNEW.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_URL=https://YOURNEW.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role/secret key>
```
Save (Ctrl+O, Enter, Ctrl+X).

## 7. Rebuild + deploy
```bash
git pull
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d
bash verify.sh
```

## 8. Test + become admin
1. Go to `https://fitplancoach.com/auth` → **sign up** with your email → you land
   on the dashboard. ✅ Login fixed.
2. Make yourself admin: in Supabase → **SQL Editor**, run (use your email):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```
3. Reload the site — you now have the **/admin** console.

## 9. Add starter content (so plans generate)
Your new database starts empty, so the meal/workout catalogs have no data yet.
Add foods, exercises, and workout templates in **/admin** (Foods, Exercises,
Workouts), or ask Claude for a `seed.sql` starter pack to paste into the SQL
Editor.

---

## Why this is the right call
- **Free:** Supabase's free tier covers a launching app (500 MB DB, 50k monthly
  users, auth, storage).
- **You own it:** full dashboard access — no Lovable, no monthly fee, you control
  auth/email/data.
- **No rewrite:** the app is built on Supabase; this just repoints it at a project
  you control. Switching to a different backend would mean rebuilding everything.
