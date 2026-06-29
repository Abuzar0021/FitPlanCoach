# FitPlanCoach — Launch & Deployment Runbook

Everything an operator needs to take this build to production. Each step is
grounded in the current code; file references are given so you can verify.

The product is an **Android-first** fitness app. The website drives installs and
hosts marketing/legal/blog content. **Memberships are sold only through Google
Play Billing inside the Android app** — never on the web.

---

## 1. Environment variables

**Client (build-time, `VITE_` prefix — safe to expose):**

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_PLAY_STORE_URL` | Play listing URL, e.g. `https://play.google.com/store/apps/details?id=com.fitplancoach.app`. Until set, "Get it on Google Play" buttons stay dormant (see `src/lib/app-config.ts`). |

**Server (secret — never exposed to the client):**

| Var | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for server functions (`src/integrations/supabase/client.server.ts`) |
| `SUPABASE_PUBLISHABLE_KEY` | Anon key (server-side reads) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full service-account JSON **or** the pair below |
| `GOOGLE_PLAY_SA_EMAIL` + `GOOGLE_PLAY_SA_PRIVATE_KEY` | Service-account email + private key (alt to the JSON) |
| `LOVABLE_API_KEY`, `LOVABLE_SEND_URL` | Transactional email (auth/welcome emails) |

> Billing **fails closed**: if the Google Play service account isn't configured,
> purchase verification refuses to grant Pro (`src/lib/billing.functions.ts`).

---

## 2. Database (Supabase)

### Apply pending migrations
Run these (Supabase SQL editor or `supabase db push`). They are fail-safe — the
app degrades gracefully until applied, but features stay inactive:

- `supabase/migrations/20260628120000_feature_requests.sql` — feedback board
- `supabase/migrations/20260629120000_blog.sql` — blog
- `supabase/migrations/20260629140000_media_library.sql` — media bucket + table

### Grant yourself admin / owner
Admin/blog/media/analytics screens require the `admin` or `owner` role. Find your
`auth.users` id, then:

```sql
insert into public.user_roles (user_id, role) values ('<your-user-uuid>', 'admin');
```

(The first owner can also be claimed via the owner-bootstrap function added in
`20260623231217_*.sql`.)

### Storage buckets
- `avatars` — user profile images (existing)
- `media` — editorial images, created by the media-library migration (public read, staff write)

---

## 3. CMS configuration (Admin → Settings)

All of these are editable in-app, no redeploy needed (stored in `app_settings`):

- **Support email** — surfaces in the footer, support center, and contact page.
- **Social links** — Instagram / X / Facebook / TikTok / YouTube (empty = hidden).
- **Announcement bar** — enable + message + optional link (top of marketing site).
- **Analytics & tracking** — GA4 Measurement ID and Microsoft Clarity ID (see §5).

---

## 4. SEO & Search Console

- `robots.txt` and `sitemap.xml` are live. The sitemap **auto-includes published
  blog posts** (`src/routes/sitemap[.]xml.ts`).
- Every public page has canonical + Open Graph tags; blog posts emit `BlogPosting`
  JSON-LD; the homepage emits Organization / WebSite / SoftwareApplication.
- **Google Search Console**: verify the domain (DNS TXT record or the GSC HTML
  file method is most reliable — the verification `<meta>` is *not* auto-injected),
  then submit `https://<domain>/sitemap.xml`.

---

## 5. Analytics

1. Create a **GA4** property → copy its Measurement ID (`G-XXXXXXXXXX`).
2. Create a **Microsoft Clarity** project → copy its project ID.
3. Paste both into **Admin → Settings → Analytics & tracking**.

`src/components/SiteScripts.tsx` injects each vendor's snippet at runtime **only
when its ID is set** — nothing loads otherwise. The in-app owner dashboard
(**Admin → Analytics**) reads first-party `analytics_events` and works regardless.

---

## 6. Google Play Billing

**Package name:** `com.fitplancoach.app`

**Subscription products to create in Play Console** (IDs must match exactly —
`src/lib/billing.ts` `PLAY_PRODUCTS` and `src/lib/billing.functions.ts`
`PRODUCT_INTERVALS`):

- `fitplancoach_pro_monthly`
- `fitplancoach_pro_annual`

**Service account (server verification):**
1. In Google Cloud, create a service account with access to the Play Developer API.
2. Grant it permissions in Play Console (Users & permissions → financial/subscription read).
3. Provide its credentials via `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (or the
   `GOOGLE_PLAY_SA_EMAIL` + `GOOGLE_PLAY_SA_PRIVATE_KEY` pair).

The server mints a JWT, calls `androidpublisher` to verify the purchase token,
writes the entitlement to `subscriptions`, and acknowledges the purchase. It
never trusts the client.

**Remaining native code task** (requires the Android wrapper): wire the Play
Billing plugin into the client seam. See the `TODO (Android build)` in
`src/lib/billing.ts` `startProPurchase()` — it already knows the product IDs and
calls `verifyAndroidPurchase(purchaseToken, productId)` once the plugin returns a
token. This is the only billing code left; everything server-side is done.

---

## 7. Android release (Phase 17)

1. Wrap the web app (Capacitor recommended; `appId = com.fitplancoach.app`).
2. Set `VITE_PLAY_STORE_URL` in the production build.
3. Complete the Play Billing plugin wiring from §6.
4. Generate an upload keystore; configure signing.
5. Internal testing track → closed testing → production rollout.
6. Verify: purchase monthly + annual, restore purchases, cancellation reflects in-app.

App metadata lives in `src/lib/app-config.ts` (`APP_VERSION`,
`ANDROID_VERSION_CODE`, `ANDROID_MIN_VERSION`) — bump per release.

---

## 8. Pre-launch QA checklist

- [ ] Sign up → onboarding (incl. country) → first plan generates
- [ ] Dashboard, meals, workouts, progress render with real data
- [ ] Membership gating: free user sees locked advanced analytics + upgrade path
- [ ] Support ticket create + reply; feedback submit + vote
- [ ] Admin: blog publish → appears at `/blog` + in sitemap; media upload + pick as blog cover
- [ ] Admin: analytics dashboard loads; settings save and reflect on the site
- [ ] Legal pages (Terms/Privacy/Refunds) render with the new typography
- [ ] Keyboard-only nav + visible focus; reduced-motion respected
- [ ] All "support" / billing copy references Google Play (no PayPal/QRIS)

---

## 9. Backups, monitoring, logging

- Enable **Supabase automated backups** (PITR if available).
- Error reporting is wired via `src/lib/lovable-error-reporting.ts` (root error
  boundary in `src/routes/__root.tsx`). Confirm errors are captured post-deploy.
- Monitor the **Admin → Analytics** funnel and Clarity session recordings after launch.

---

## 10. Go-live checklist

- [ ] Env vars set (client + server) in production
- [ ] 3 migrations applied; admin role granted
- [ ] CMS configured (support email, socials, GA4, Clarity)
- [ ] Search Console verified + sitemap submitted
- [ ] Play Console: products created, service account connected, billing verified end-to-end
- [ ] Android build signed, tested on internal track, promoted to production
- [ ] Backups + error monitoring confirmed
- [ ] Final QA pass green
