-- On-page SEO fix: prepend a direct, snippet-friendly definition to the
-- "Progressive Overload Explained" article. Live Search Console data shows
-- real impressions for "what is progressive overload", "define progressive
-- overload", and "progressive overload principle" — but the article opened
-- with a narrative hook instead of a direct answer, which hurts both
-- featured-snippet eligibility and how clearly the page matches those
-- specific queries. Safe to re-run: the guard clause skips posts that
-- already have this exact opening line, so re-pasting is a no-op.
UPDATE public.blog_posts
SET content_html = $html$<p><strong>Progressive overload is the gradual, deliberate increase of stress placed on your muscles over time</strong> — through more weight, more reps, more sets, or better range of motion and control — and it's the single mechanism that actually drives ongoing strength and muscle growth. Without it, your body has no reason to keep adapting.</p>$html$ || content_html
WHERE slug = 'progressive-overload-explained'
  AND content_html NOT LIKE '%Progressive overload is the gradual, deliberate increase%';
