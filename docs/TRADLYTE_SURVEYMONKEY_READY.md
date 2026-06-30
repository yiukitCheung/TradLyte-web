# TradLyte Validation Survey — Ready to Field (SurveyMonkey build)

> Copy each question block into SurveyMonkey as-is. Each block lists the **SM question
> type**, exact **wording**, **answer choices**, whether it's **required**, and the
> **page/skip/disqualify logic**. Organized into Pages because SurveyMonkey's skip logic
> and Disqualification work at the page/answer level.
>
> **Plan note:** Skip Logic, Question/Answer randomization, and **Random Assignment**
> (needed for the cleanest price test) require a **paid SurveyMonkey plan
> (Advantage/Premier)**. The survey below works on a Standard plan too — fallbacks are
> marked. Turn ON: *Survey-wide → Randomize/Sort → randomize answer order* for attitudinal
> questions (P1, P2, T1, T2), and a progress bar.

---

## Survey title
**"How self-directed investors actually make decisions"**
*(Neutral title on purpose — do NOT put "TradLyte" or "purpose-driven investing" in the
title or intro; it primes positive answers. Reveal the concept only on Page 5.)*

## Intro text (Page 1, no question)
> Thanks for helping. This is a 4–5 minute, anonymous survey about how everyday investors
> research, decide, and reflect on their own investments. There are no right answers — we
> just want how you actually do it. You can skip any question you'd rather not answer.

---

# PAGE 2 — Screener

### Q1 *(Multiple Choice, single answer, required)*
**Do you personally pick and manage your own stock or ETF investments — not only a
robo-advisor or a financial advisor who does it for you?**
- Yes, I actively manage my own investments
- Sometimes / a little
- No — a robo-advisor or advisor manages it for me
- I don't invest in stocks or ETFs

> **Logic:**
> - "No — a robo/advisor…" → skip to **Q2** (then disqualify after Q2)
> - "I don't invest…" → **Disqualify** (show: *"Thanks! This study is for people who
>   invest in stocks/ETFs."*)
> - Yes / Sometimes → skip to **Q3**

### Q2 *(Multiple Choice, single — only shown to "robo/advisor manages it" path)*
**If you had tools that made it easier and less stressful, would you want to manage more of
your own investing?**
- Yes, I'd want to
- No, I prefer it managed for me
- Not sure

> **Logic:** After Q2 → **Disqualify** with thank-you. *(We capture this to size the
> "would-be self-directed" pool, but they're not the core respondent.)*

### Q3 *(Multiple Choice, single, required)*
**How long have you been investing?**
- Less than 1 year
- 1–3 years
- 3–10 years
- More than 10 years

### Q4 *(Multiple Choice, single, required)*
**How often do you typically check or trade your investments?**
- Multiple times a day
- About once a day
- A few times a week
- A few times a month
- Rarely

### Q5 *(Multiple Choice, single, required)*
**Where do you live?**
- United States
- Canada
- Other

### Q6 *(Multiple Choice, single, required)*
**Your age:**
- 18–24 / 25–34 / 35–44 / 45–54 / 55+

---

# PAGE 3 — How you invest today *(problem validation — concept still hidden)*

### Q7 *(Matrix / Rating Scale, required)*
**In the past 12 months, how often have you…**
Columns: **Never · Rarely · Sometimes · Often · Very often**
Rows *(turn ON row randomization)*:
- Sold an investment out of fear and later regretted it
- Bought something because it was hyped or I had FOMO
- Felt overwhelmed by too much information or too many opinions
- Lost track of *why* you originally bought a holding
- Made a trade you couldn't calmly explain afterward
- Traded or tinkered more than you meant to

### Q8 *(Multiple Choice, multiple answer — "select up to 2", required)*
**When an investing decision goes wrong for you, what's usually behind it?**
- Emotion or impulse
- Too much conflicting information
- No clear plan going in
- I forgot my own original reasoning
- Following the crowd
- Just bad luck / the market
- I don't really make investing mistakes

### Q9 *(Rating Scale, 1–5, required)*
**How much does improving your investing *discipline and decision-making* matter to you
right now?** (1 = Not at all, 5 = Extremely)

---

# PAGE 4 — What you use and pay for today *(the most predictive section)*

### Q10 *(Multiple Choice, multiple answer, required)*
**Which of these do you currently use for investing? (Select all that apply)**
- My brokerage's built-in research/screening tools
- TradingView or similar charting tools
- A trading journal (e.g., Edgewonk, TraderSync, TradesViz, Tradervue, TradeZella)
- Newsletters, signals, or paid Discords/communities
- A spreadsheet I built myself
- A notes app or paper journal for investing
- None of these

### Q11 *(Multiple Choice, single, required)*
**Do you currently pay for any investing tool, app, newsletter, or data service?**
- Yes
- No

> **Logic:** "No" → skip to **Q13**. "Yes" → **Q12**.

### Q12 *(Multiple Choice, single, required on this path) + open follow-up*
**About how much do you spend per month, total, on investing tools/apps/newsletters?**
- Under $10 / $10–25 / $25–50 / $50–100 / Over $100

*(Add an optional Comment box below: "Which ones? (optional)")*

### Q13 *(Multiple Choice, single, required)*
**Have you ever tried keeping an investing journal or a regular reflection habit?**
- Never tried
- Tried, but it didn't stick
- I do it occasionally
- I do it consistently

> **Logic:** "Tried, but it didn't stick" → show **Q13a**. Otherwise skip to Page 5.

### Q13a *(Open-ended, single textbox, optional)*
**What made you stop?**

---

# PAGE 5 — The concept *(reveal here, once)*

### Concept text (no question — put it in a Text/Image block)
> **Imagine an app called TradLyte — a calm investing companion. It is *not* a brokerage;
> it never places trades for you. Instead it helps you:**
> - **Tie each holding to your real-life "why" and goals**
> - **Reflect on your decisions with short prompts tied to what you actually did that day**
> - **Remember *why* you regretted a past trade — right when you're about to make a
>   similar one**
> - **Track your gains from *your own* entry price, not the crowd's**
> - **Test simple strategies in plain English — no code, no jargon**

### Q14 *(Rating Scale, 1–5, required)*
**Overall, how appealing is this to you?** (1 = Not at all, 5 = Extremely)

### Q15 *(Rating Scale, 1–5, required)*
**How different is this from tools you already use?** (1 = Not at all different,
5 = Very different)

### Q16 *(Multiple Choice, single, required)*
**Which ONE of these would be the most valuable to you?**
- Tying holdings to my goals / "why"
- Daily reflection prompts tied to my trades
- Being reminded of past regrets before repeating them
- Tracking from my own entry price (less FOMO)
- Plain-English strategy testing / backtesting
- None of these would be valuable to me

### Q17 *(Multiple Choice, single, required)*
**And which ONE would you be *least* likely to use?**
*(Same six options as Q16.)*

### Q18 *(Multiple Choice, single, required)*
**If you could only have one kind of investing app, which would you choose?**
- One that helps me reflect and decide better, while I stay fully in control
- One that just tells me what to buy and sell (signals)
- One that manages my investments automatically for me (AI / robo)
- One that just gives me better charts and data

---

# PAGE 6 — Pricing *(use a real method, not "would you pay?")*

### Van Westendorp — Q19–Q22 *(four separate Single Textbox / numeric questions, required)*
Set each as a **Single Textbox** with **numeric validation** (whole dollars), prefix "$",
suffix "/month". Keep them on one page, in this order:

- **Q19.** At what monthly price would TradLyte be **so expensive** you would not consider
  it?
- **Q20.** At what monthly price would it start to feel **expensive, but you'd still
  consider** it?
- **Q21.** At what monthly price would it feel like a **good deal**?
- **Q22.** At what monthly price would it be **so cheap** you'd question its quality?

> Analysis later: plot the four cumulative curves; the acceptable band sits between the
> "too cheap × good deal" and "expensive × too expensive" intersections.

### Gabor-Granger — Q23 *(purchase-intent at an assigned price)*

**Best version (paid plan): use Random Assignment** to send each respondent ONE of four
price variants of Q23, then merge in analysis.

**Q23 *(Multiple Choice, single, required)***
**If TradLyte cost **$[PRICE]/month**, how likely would you be to subscribe within the next
month?**
- Definitely would
- Probably would
- Might or might not
- Probably not
- Definitely not

> **Random Assignment** prices: **$4.99 / $8.99 / $12.99 / $19.99** (equal allocation).
> **Standard-plan fallback (no Random Assignment):** show Q23 once at **$8.99/month** only.
> Do NOT show a descending price ladder — it anchors and inflates. One price is cleaner
> than a biased ladder.
> Scoring later: count only **"Definitely would"** as real demand; halve "Probably would";
> ignore the rest.

### Q24 *(Multiple Choice, single, required)*
**Would you use a free version with some limits?**
- Yes, I'd start with a free version
- No, I'd only use it if it proved itself first
- I wouldn't use it either way

### Q25 *(Open-ended, optional)*
**What would make a free version worth upgrading to paid for you?**

---

# PAGE 7 — Trust & barriers

### Q26 *(Multiple Choice, multiple answer, required — randomize answers)*
**What would make you hesitate to try TradLyte? (Select all that apply)**
- I wouldn't trust an unknown app with my financial information
- I don't want to connect my brokerage or enter holdings manually
- I don't think I need it
- I already have tools that do this
- The cost
- It seems like too much effort to keep up the habit
- Nothing — I'd give it a try

### Q27 *(Multiple Choice, multiple answer — randomize answers)*
**What would make you trust it more? (Select all that apply)**
- It never connects to my brokerage account
- It comes from a brand I already know
- Strong, clear privacy guarantees
- It's free to start
- People I know use it
- It's backed or endorsed by a recognized financial body

### Q28 *(Open-ended, single textbox, optional — high-value)*
**If you'd like early access when TradLyte launches, leave your email. (Optional — we won't
spam you.)**

> Treat the **email opt-in rate** as a mini behavioral signal: a real email with no
> incentive beats any rating-scale answer. Track it as a KPI.

---

## SurveyMonkey setup checklist
- [ ] **Collector:** use a **Web Link** collector so you can post it to Reddit/Discord/X
  and the panel. Create **separate collectors per channel** (e.g., "Reddit", "Panel",
  "X") so you can compare data quality by source in Analyze → Filter by Collector.
- [ ] **Disqualification:** Q1 ("I don't invest") and after Q2 → enable
  *Question Logic → Disqualify Respondent* with a custom thank-you message.
- [ ] **Skip logic:** Q1, Q11, Q13 as specified above.
- [ ] **Randomize answers** on Q7 (rows), Q8, Q26, Q27.
- [ ] **Random Assignment** on Q23 (paid plans) — 4 price blocks, equal split.
- [ ] **Required:** all screeners + core questions; leave open-ends and email optional.
- [ ] **Progress bar ON**, one section per page (matches the page breaks above).
- [ ] **Pilot with 5 people first** to catch confusing wording before you spend on the panel.

## Target & interpretation (carry over from the test plan)
- **n ≥ 150 qualified** (after screen-outs). Field to strangers + a paid panel — not your
  own audience — or the WTP numbers will be inflated.
- In **Analyze**, cross-tab WTP (Q19–Q23) by **Q11 (already pays)** and **Q9 (pain
  intensity)** — that intersection is your real market; the rest is noise.
- **Go/no-go bars** and the **fake-door pricing-page test** (the part that actually proves
  payment) are in `TRADLYTE_VALIDATION_SURVEY.md`. The survey finds direction; the landing
  page proves dollars — run both.
