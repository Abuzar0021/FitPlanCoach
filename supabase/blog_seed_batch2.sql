-- Second batch of blog content — run ONCE in Supabase's SQL Editor.
-- Adds 8 original, substantial articles to boost content depth for AdSense
-- review. Safe to re-run: categories/tags use ON CONFLICT DO NOTHING, and
-- posts use ON CONFLICT (slug) DO NOTHING so re-pasting this file is a no-op
-- rather than creating duplicates.

-- Make sure a category exists for these posts.
INSERT INTO public.blog_categories (slug, name, description)
VALUES
  ('training', 'Training', 'Workout programming, technique, and progression.'),
  ('nutrition', 'Nutrition', 'Macros, meal planning, and fueling your training.')
ON CONFLICT (slug) DO NOTHING;

-- Resolve the site owner as the author for all these posts.
DO $$
DECLARE
  v_author_id uuid;
BEGIN
  SELECT id INTO v_author_id FROM auth.users WHERE lower(email) = 'abuzarelahi01@gmail.com' LIMIT 1;
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found for abuzarelahi01@gmail.com — cannot attribute posts.';
  END IF;

  INSERT INTO public.blog_posts (slug, title, excerpt, body, content_html, status, author_id, category_id, published_at, seo_description)
  VALUES
  (
    'beginners-guide-to-strength-training',
    'The Beginner''s Guide to Strength Training: Your First 8 Weeks',
    'Starting strength training can feel overwhelming. Here''s a clear, no-nonsense 8-week plan to build real strength without guesswork.',
    'Starting strength training can feel overwhelming. This guide covers a simple, effective 8-week plan for beginners: full-body training three times a week, the five core lifts worth mastering, how to track progress, and common mistakes to avoid in your first two months.',
    $html$<p>Walking into a gym for the first time — or opening a fitness app and staring at dozens of exercises — can be genuinely overwhelming. The good news: you don't need a complicated program to get strong. You need consistency, a handful of the right exercises, and a plan that gets a little harder each week.</p>

<h2>Why full-body training works best for beginners</h2>
<p>Split routines (chest day, back day, leg day) are popular, but they're not ideal when you're just starting out. As a beginner, your nervous system is still learning how to recruit muscle efficiently — you make faster progress training each major movement pattern more often. A full-body routine three times a week, with a rest day in between, lets you practice the lifts more frequently and recover fully before the next session.</p>

<h2>The five lifts worth mastering first</h2>
<ul>
<li><strong>Squat</strong> — builds leg and core strength, and teaches you to move weight through your whole body.</li>
<li><strong>Deadlift (or Romanian deadlift)</strong> — trains your posterior chain: hamstrings, glutes, and lower back.</li>
<li><strong>Bench press (or push-up)</strong> — the foundation for chest, shoulder, and triceps strength.</li>
<li><strong>Row (barbell, dumbbell, or machine)</strong> — balances out pushing movements and builds a strong back.</li>
<li><strong>Overhead press</strong> — builds shoulder strength and stability that carries over to everything else.</li>
</ul>
<p>You don't need to do all five every session. Rotating them across your three weekly sessions is plenty.</p>

<h2>A simple 8-week structure</h2>
<p><strong>Weeks 1-2:</strong> Focus entirely on form. Use light weight — even just the bar — and get comfortable with the movement pattern before adding load. This isn't wasted time; it's the foundation everything else is built on.</p>
<p><strong>Weeks 3-5:</strong> Start adding small amounts of weight each session (2.5-5kg on upper body lifts, 5-10kg on lower body lifts) as long as your form stays solid. This is called <em>linear progression</em>, and it works remarkably well for beginners.</p>
<p><strong>Weeks 6-8:</strong> Progress will start slowing down slightly — that's normal. If you stall on a lift for two sessions in a row, take a small step back in weight and build back up. Don't chase numbers at the expense of form.</p>

<h2>Common mistakes to avoid</h2>
<p>The biggest mistake new lifters make isn't picking the "wrong" program — it's changing programs every two weeks because progress feels slow. Strength training rewards patience. Stick with a simple plan for the full 8 weeks before judging whether it's working.</p>
<p>The second most common mistake is skipping recovery. Your muscles don't get stronger during the workout — they get stronger during the 48 hours after it, when you're resting and eating enough protein to repair and rebuild. Track your workouts in FitPlanCoach's Workout History to see real progress in your numbers over these 8 weeks, not just how you feel.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'training'),
    now() - interval '12 days',
    'A clear, practical 8-week strength training plan for beginners — the 5 core lifts, a simple weekly structure, and common mistakes to avoid.'
  ),
  (
    'how-many-calories-should-you-eat-to-lose-fat',
    'How Many Calories Should You Actually Eat to Lose Fat?',
    'Calorie targets online vary wildly. Here''s how to calculate a number that actually works for your body and stick to it sustainably.',
    'Fat loss ultimately comes down to a calorie deficit, but the "right" number depends on your body, activity level, and goals. This guide walks through calculating your maintenance calories, choosing a sustainable deficit size, and adjusting over time based on real results.',
    $html$<p>Search "how many calories should I eat to lose weight" and you'll get answers ranging from 1,200 to 2,500 — all claiming to be correct. The truth is there's no single right number; there's a right number <em>for you</em>, based on your body size, activity level, and how aggressively you want to lose fat.</p>

<h2>Step 1: Find your maintenance calories</h2>
<p>Maintenance calories are what keeps your weight stable — no gain, no loss. A quick estimate: multiply your bodyweight in kilograms by roughly 30-33 if you're moderately active (some walking, a few workouts a week). This isn't perfectly precise, but it's a solid starting point. FitPlanCoach calculates a more personalized estimate for you automatically based on your profile, activity level, and goals.</p>

<h2>Step 2: Choose a sustainable deficit</h2>
<p>A pound of fat is roughly 3,500 calories. To lose about 0.5kg (1lb) per week — a pace that's sustainable and preserves muscle — aim for a deficit of around 500 calories per day below maintenance.</p>
<p>Bigger deficits (800-1000+ calories) feel faster on paper, but they're harder to sustain, often lead to muscle loss alongside fat loss, and tend to end in a rebound. Slow and steady genuinely does win here — both for your results and your sanity.</p>

<h2>Step 3: Don't go too low</h2>
<p>Cutting calories drastically low (under 1,200-1,500 for most adults, depending on size) isn't just uncomfortable — it can backfire. Very low intakes make it hard to get enough protein and micronutrients, tank your energy for training, and often lead to bingeing later. A moderate, livable deficit you can maintain for months beats an extreme one you abandon after two weeks.</p>

<h2>Step 4: Track and adjust — don't set and forget</h2>
<p>Your calculated number is a starting estimate, not a guarantee. Track your intake and your weight (ideally a weekly average, since day-to-day weight fluctuates with water and food volume) for 2-3 weeks. If your weight isn't trending down, reduce calories slightly. If it's dropping faster than planned and you're feeling drained, eat a bit more. This is normal — everybody's real-world metabolism differs slightly from the formula.</p>

<h2>What actually matters more than the exact number</h2>
<p>Hitting your calorie target consistently, day after day, matters far more than getting the number perfectly precise. Log your food honestly in FitPlanCoach's food diary, watch your weekly trend rather than obsessing over daily fluctuations, and give any given calorie target at least 2-3 weeks before deciding whether to adjust it.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'nutrition'),
    now() - interval '10 days',
    'How to calculate a sustainable calorie deficit for fat loss, why extreme deficits backfire, and how to adjust your target based on real progress.'
  ),
  (
    'no-equipment-home-workouts-that-work',
    'No-Equipment Home Workouts That Actually Build Muscle',
    'You don''t need a gym membership to get stronger. These bodyweight-focused routines build real muscle using nothing but floor space.',
    'You can build meaningful strength and muscle at home with zero equipment. This guide covers progression strategies for bodyweight training, a sample full-body routine, and how to keep making progress once basic push-ups and squats get easy.',
    $html$<p>"I don't have a gym" is one of the most common reasons people put off training — but it's not actually a barrier. Bodyweight training, done with intention and progression, builds real strength and muscle. Prisoners, gymnasts, and calisthenics athletes build impressive physiques with nothing but their own bodyweight and gravity.</p>

<h2>The key: progression, not just repetition</h2>
<p>The mistake most people make with home workouts is doing the same 20 push-ups and 20 squats forever. Without progression — making the exercise harder over time — your body has no reason to adapt further. The fix is progressing through harder variations as easier ones become manageable.</p>

<h2>A sample full-body routine (3x per week)</h2>
<ul>
<li><strong>Squats:</strong> Bodyweight squats → Bulgarian split squats → single-leg pistol squat progressions</li>
<li><strong>Push:</strong> Knee push-ups → standard push-ups → decline push-ups (feet elevated) → archer push-ups</li>
<li><strong>Pull:</strong> Doorframe rows (using a sturdy door edge or towel) → if you have any bar to hang from, even a playground bar, add pull-up progressions</li>
<li><strong>Core:</strong> Plank holds, progressing to longer duration → then to harder variations like plank shoulder taps</li>
<li><strong>Hip hinge:</strong> Glute bridges → single-leg glute bridges → Nordic curl progressions (advanced)</li>
</ul>
<p>Aim for 3-4 sets of each, working to a point where the last 2-3 reps feel genuinely challenging with good form.</p>

<h2>What if a variation feels too easy?</h2>
<p>Slow down the tempo — a 3-second lowering phase makes any bodyweight exercise noticeably harder. You can also add pauses at the hardest point of the movement (like a 2-second pause at the bottom of a push-up), or simply add more total reps/sets before progressing to the next variation.</p>

<h2>What if it feels too hard?</h2>
<p>Regress to an easier version rather than grinding through bad form. Knee push-ups instead of full push-ups, or holding a doorframe for balance during single-leg work, are both completely legitimate ways to build toward the harder variation.</p>

<h2>Don't skip recovery just because there's no barbell</h2>
<p>Bodyweight training still creates real muscle fatigue and micro-damage that needs recovery. Give muscle groups at least 48 hours before training them intensely again, eat enough protein, and get consistent sleep — the same recovery rules apply whether you're using a barbell or just your own bodyweight.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'training'),
    now() - interval '8 days',
    'Build real strength and muscle at home with zero equipment — a progression-based bodyweight routine that keeps working as you get stronger.'
  ),
  (
    'how-much-protein-do-you-actually-need',
    'How Much Protein Do You Actually Need? (It''s Probably Less Than Instagram Says)',
    'Protein advice online ranges from "1g per pound of bodyweight" to borderline obsessive. Here''s what the actual research supports.',
    'Protein needs depend heavily on your goals, activity level, and current muscle mass. This guide breaks down realistic protein targets for muscle gain, fat loss, and general health, and explains why more isn''t always better past a certain point.',
    $html$<p>Scroll through fitness content for five minutes and you'll see wildly different protein advice — from "1 gram per pound of bodyweight, non-negotiable" to more relaxed general health guidelines. So what does the evidence actually support?</p>

<h2>The baseline: general health</h2>
<p>For someone who isn't training intensely, roughly 0.8-1.0g of protein per kilogram of bodyweight per day covers basic needs. That's the floor, not the target for anyone actively training.</p>

<h2>If you're strength training and want to build muscle</h2>
<p>Research on resistance-trained individuals generally supports somewhere in the range of 1.6-2.2g per kilogram of bodyweight per day for maximizing muscle growth. Beyond roughly 2.2g/kg, additional protein doesn't appear to meaningfully accelerate muscle gain for most people — your body can only use so much for muscle repair and growth at once.</p>
<p>In practical terms: a 70kg (154lb) person training regularly would target somewhere around 110-155g of protein per day. That's genuinely achievable through food without needing to obsess over every gram.</p>

<h2>If you're in a calorie deficit (cutting)</h2>
<p>This is actually when protein matters <em>most</em>. When you're eating less overall, higher protein intake — often toward the upper end of that 1.6-2.2g/kg range, sometimes slightly beyond — helps preserve muscle mass while you lose fat. Protein is also the most satiating macronutrient, meaning it helps you feel full on fewer calories, which makes the whole deficit easier to sustain.</p>

<h2>Do you need protein powder?</h2>
<p>No — protein powder is a convenience tool, not a requirement. If you can hit your target through whole foods (chicken, fish, eggs, dairy, legumes, tofu), that works just as well. Powder is useful when you're short on time or struggling to hit your number through meals alone, not because it's inherently superior.</p>

<h2>Practical takeaway</h2>
<p>Rather than chasing an extreme number, aim for roughly 1.6-2.0g per kilogram of bodyweight if you're training regularly, spread across 3-4 meals a day for better absorption and satiety. Log your meals in FitPlanCoach to see exactly where your protein actually lands each day — most people are surprised by how close they already are, or how small an adjustment gets them there.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'nutrition'),
    now() - interval '6 days',
    'How much protein you actually need for muscle gain, fat loss, and general health — based on research, not Instagram myths.'
  ),
  (
    'progressive-overload-explained',
    'Progressive Overload Explained: The One Principle Behind All Strength Gains',
    'If you''re not getting stronger, the most likely reason is a missing piece: progressive overload. Here''s exactly what it means and how to apply it.',
    'Progressive overload — gradually increasing the demands on your muscles over time — is the fundamental driver of strength and muscle growth. This article explains the different ways to apply it beyond just adding weight, and how to know when to progress.',
    $html$<p>If there's one principle that explains why some people keep getting stronger year after year while others plateau after month two, it's progressive overload: gradually increasing the demand placed on your muscles over time. Without it, your body has no reason to keep adapting — it's already capable of handling what you're asking of it.</p>

<h2>It's not just about adding weight</h2>
<p>Most people think progressive overload only means "add more weight to the bar." That's one way, but there are several others, and mixing them keeps your training fresh:</p>
<ul>
<li><strong>More weight:</strong> the most straightforward method — lift heavier than last time.</li>
<li><strong>More reps:</strong> same weight, more repetitions per set.</li>
<li><strong>More sets:</strong> increasing total training volume for a muscle group.</li>
<li><strong>Better form / range of motion:</strong> a deeper squat or a slower, more controlled rep is genuinely harder than a shallow, rushed one, even at the same weight.</li>
<li><strong>Less rest between sets:</strong> doing the same work in less recovery time increases the challenge.</li>
<li><strong>Slower tempo:</strong> a controlled 3-4 second lowering phase increases time under tension.</li>
</ul>

<h2>How fast should you progress?</h2>
<p>This is where a lot of people go wrong in both directions. Progressing too aggressively (adding weight every single session regardless of how it felt) leads to broken form and plateaus from accumulated fatigue. Progressing too conservatively (staying at the same weight for months "to be safe") leaves gains on the table.</p>
<p>A reasonable approach for beginners: if you complete all planned reps with good form, add a small amount of weight or a rep next session. If you miss reps or form breaks down, repeat the same weight until you succeed cleanly, then progress.</p>

<h2>Why tracking matters more than memory</h2>
<p>You genuinely cannot reliably remember what weight and reps you did for every exercise three weeks ago — and without that reference point, you can't tell if you're actually progressing or just going through the motions. This is exactly why logging your sets, reps, and weight (FitPlanCoach's Workout History does this automatically) matters: it turns "I think I'm getting stronger" into an actual, visible trend line.</p>

<h2>What plateaus really mean</h2>
<p>A genuine plateau — several weeks with zero progress despite consistent training — usually points to one of a few things: insufficient recovery (sleep, stress, or not enough food), a program that's stopped applying real overload, or simply needing a deload week (a planned lighter week) to let accumulated fatigue clear. It's rarely a sign you need a completely different program.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'training'),
    now() - interval '4 days',
    'Progressive overload is the single most important principle behind strength and muscle gains. Here''s what it actually means and how to apply it correctly.'
  ),
  (
    'meal-prep-guide-for-busy-people',
    'The Realistic Meal Prep Guide for People Who Don''t Have Time to Meal Prep',
    'Meal prep doesn''t have to mean 4 hours in the kitchen every Sunday. Here''s a simpler system that actually survives a busy week.',
    'Traditional meal prep advice assumes hours of free time you may not have. This guide offers a more realistic, lower-effort system for eating consistently well even on a packed schedule.',
    $html$<p>A lot of meal prep advice assumes you have a free Sunday afternoon, a stocked kitchen, and the energy to cook six different dishes in one sitting. If your actual week doesn't look like that, here's a more realistic approach that still works.</p>

<h2>Start with repetition, not variety</h2>
<p>You don't need a different meal every day. Picking 2-3 solid meals and rotating them across the week dramatically cuts prep time, and it's genuinely fine — most people eat a fairly repetitive diet even when they're not trying to. Save variety for the meals you actually enjoy cooking or eating out.</p>

<h2>Batch the protein, not the whole meal</h2>
<p>Instead of assembling 10 complete identical meals (which gets boring fast), batch-cook a large amount of a protein source — grilled chicken, ground turkey, baked tofu, a tray of eggs — early in the week. Then pair it with whatever vegetables and carbs you have on hand each day. This gives you flexibility without daily cooking time.</p>

<h2>Use your freezer as a tool, not an afterthought</h2>
<p>Cooked rice, cooked grains, and pre-portioned cooked protein all freeze and reheat well. Cooking a double batch of anything and freezing half means a future busy night already has a meal waiting — no decision fatigue required.</p>

<h2>Keep a short list of "emergency" real-food options</h2>
<p>Meal prep sometimes falls through — that's normal, not a failure. Having a short list of fast, reasonably healthy backups (a rotisserie chicken plus a bagged salad, canned tuna and crackers, eggs and toast) means a chaotic day doesn't have to turn into a takeout habit.</p>

<h2>Log as you go, not perfectly in advance</h2>
<p>You don't need to plan every meal down to the gram before the week starts. Logging meals in FitPlanCoach as you actually eat them — including the realistic, occasionally imperfect ones — gives you a far more honest and useful picture than a meal plan that only works on paper.</p>

<h2>The real goal: consistency over perfection</h2>
<p>A simple system you'll actually follow every week beats an elaborate one you abandon after two. Start with just batching one protein source this week and see how much easier the rest of your meals become.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'nutrition'),
    now() - interval '2 days',
    'A realistic, lower-effort meal prep system for busy schedules — batch protein, use your freezer strategically, and stay consistent without hours of Sunday cooking.'
  ),
  (
    'common-beginner-gym-mistakes',
    '7 Common Beginner Gym Mistakes (and How to Fix Them)',
    'Everyone makes these mistakes when they''re new to the gym. Recognizing them early saves months of slow or frustrating progress.',
    'From skipping warm-ups to program-hopping every few weeks, these seven common beginner mistakes quietly slow down progress. Here''s how to recognize and fix each one.',
    $html$<p>Nearly everyone makes some version of these mistakes when they're new to training. None of them are catastrophic, but fixing them early saves months of slower, more frustrating progress.</p>

<h2>1. Program-hopping</h2>
<p>Switching to a new program every 1-2 weeks because "this one isn't working yet" is probably the single biggest saboteur of beginner progress. Strength adaptations take weeks to show up clearly. Give any reasonable program at least 6-8 weeks before judging it.</p>

<h2>2. Skipping warm-up sets</h2>
<p>Jumping straight to your working weight — especially on squats, deadlifts, and bench press — increases injury risk and often means your first "real" set has worse form than it should. Two or three lighter warm-up sets, building up to your working weight, take a few extra minutes and meaningfully protect your joints and your form.</p>

<h2>3. Chasing soreness as a progress marker</h2>
<p>Feeling sore doesn't mean a workout "worked," and feeling less sore over time doesn't mean you're regressing — it often just means your body has adapted to that particular stimulus. Track actual numbers (weight, reps, sets) instead of relying on how sore you feel the next day.</p>

<h2>4. Ignoring nutrition entirely</h2>
<p>Training hard while eating however you happened to eat before starting the gym is one of the most common ways people stall out. You don't need a perfect diet, but under-eating protein or wildly inconsistent calories will blunt your results regardless of how good your training program is.</p>

<h2>5. Doing too much, too soon</h2>
<p>Going from zero training to six intense sessions a week in your first month is a common way to burn out or get injured within a few weeks. Building up gradually — say, three sessions a week for the first month — lets your body adapt to the new stress without overwhelming your recovery capacity.</p>

<h2>6. Comparing your week 1 to someone else's year 3</h2>
<p>Social media makes this almost unavoidable, but comparing your early results to someone who's been training for years is a fast way to feel discouraged over completely normal early progress. Compare your current numbers to your own numbers from a month ago instead.</p>

<h2>7. Not tracking anything</h2>
<p>Without any record of your workouts or nutrition, it's genuinely hard to know whether you're actually progressing or just repeating the same effort week after week. Logging your workouts and meals — even loosely — turns vague impressions into a real, trackable trend.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'training'),
    now() - interval '1 days',
    'The 7 most common mistakes beginners make in the gym, and simple fixes for each one — from program-hopping to skipping warm-ups.'
  ),
  (
    'water-intake-and-performance',
    'Does Water Intake Actually Affect Your Workouts? Here''s What Matters',
    'Hydration advice ranges from "8 glasses a day" to elaborate electrolyte protocols. Here''s a practical, evidence-based approach.',
    'Hydration genuinely affects strength, endurance, and recovery — but the "8 glasses a day" rule is an oversimplification. This guide covers practical hydration targets based on bodyweight and activity level.',
    $html$<p>"Drink 8 glasses of water a day" is one of the most repeated pieces of health advice — and also one of the least personalized. Your actual hydration needs depend heavily on your bodyweight, activity level, climate, and how much you sweat, not a flat number that applies to everyone equally.</p>

<h2>Why hydration actually matters for training</h2>
<p>Even mild dehydration — as little as 2% of bodyweight lost through fluids — has been shown to measurably reduce strength output, endurance, and concentration during exercise. You don't need to be severely dehydrated to feel the effects; a workout that feels harder than it should is sometimes simply a hydration issue.</p>

<h2>A more practical target than "8 glasses"</h2>
<p>A reasonable baseline is roughly 30-35ml of water per kilogram of bodyweight per day, adjusted upward on training days or in hot climates. For a 70kg person, that's roughly 2.1-2.5 liters as a baseline — more on a hard training day, especially if you're sweating heavily. FitPlanCoach's water tracker calculates a personalized target based on your bodyweight automatically, rather than using a flat number.</p>

<h2>Do you need electrolytes?</h2>
<p>For most people doing moderate exercise (under an hour, not in extreme heat), plain water is genuinely sufficient. Electrolyte drinks become more relevant for longer endurance sessions (90+ minutes), very hot conditions, or if you're someone who sweats heavily and notices cramping. For a standard gym session, they're a nice-to-have, not a necessity.</p>

<h2>Simple ways to actually hit your target</h2>
<ul>
<li>Keep a water bottle visible on your desk — visibility alone measurably increases how much people drink.</li>
<li>Drink a glass with each meal as a built-in habit trigger rather than relying on remembering.</li>
<li>Log it in FitPlanCoach's water tracker — seeing the running total during the day makes it much easier to notice you're behind before evening rolls around.</li>
</ul>

<h2>Signs you might be under-hydrated</h2>
<p>Dark yellow urine, unusual fatigue, headaches, and workouts that feel harder than they should for the same weights are all reasonably reliable signs. You don't need to obsess over water intake, but paying attention to these signals — especially on hot or high-training-volume days — is worth doing.</p>$html$,
    'published',
    v_author_id,
    (SELECT id FROM public.blog_categories WHERE slug = 'nutrition'),
    now(),
    'How hydration actually affects strength, endurance, and recovery — and a practical, personalized way to calculate your daily water target.'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;
