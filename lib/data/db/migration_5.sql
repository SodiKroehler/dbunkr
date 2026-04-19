
 
ALTER TABLE stubs
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES stubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_links TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS official_score INTEGER NOT NULL DEFAULT 0
    CONSTRAINT stubs_official_score_check CHECK (official_score >= 0 AND official_score <= 100);
 
CREATE INDEX IF NOT EXISTS stubs_parent_idx ON stubs USING BTREE (parent_id);
 
TRUNCATE TABLE stubs RESTART IDENTITY CASCADE;
 

INSERT INTO stubs (slug, rq, blurb, status, related_links, official_score,
                   left_truth, right_truth, center_truth, close_votes, importance_level)
VALUES

-- ----------------------------------------------------------------
-- COVID_1 — PANTS ON FIRE
-- ----------------------------------------------------------------
(
  'covid-russia-autopsy-who-law',
  'Did Russian doctors performing autopsies on COVID-19 patients violate a WHO law, and does this prove COVID-19 is caused by bacteria?',
  'A viral social media post claimed that Russia was the first country to autopsy COVID-19 victims, that doing so violated a WHO prohibition, and that the findings proved the disease is caused by bacteria rather than a virus. Every element of this claim is false.

COVID-19 is caused by SARS-CoV-2, a virus — a fact confirmed by every major public health authority and by the basic biology of the pathogen. The WHO not only does not ban autopsies of COVID-19 patients, it published detailed guidelines in September 2020 for how to perform them safely, covering protective equipment and ventilation requirements. The first published COVID-19 autopsy appeared in a Chinese medical journal in February 2020, months before the social media post circulated. U.S. hospitals were conducting autopsies throughout 2020, and findings from those autopsies directly shaped treatment protocols.

The claim about bacteria appears to derive from a separate, long-running category of COVID misinformation suggesting the pandemic was caused or exacerbated by bacterial co-infections. While bacterial pneumonia can complicate severe COVID-19 cases, it is a secondary complication, not the underlying cause. PolitiFact rated this Pants on Fire.',
  'seeded',
  ARRAY[
    'https://www.politifact.com/factchecks/2021/apr/09/instagram-posts/covid-19-caused-virus-and-autopsies-covid-19-patie/',
    'https://web.archive.org/web/20210409142314/https://www.instagram.com/p/CNTYh_ng9aB/'
  ],
  2,
  0, 0, 0, 0, 0
),

-- ----------------------------------------------------------------
-- FLAT_EARTH_1 — PANTS ON FIRE (parent of flat-earth-2)
-- ----------------------------------------------------------------
(
  'flat-earth-sun-firmament',
  'Is the sun local and under a firmament dome, as claimed by flat-earth proponents?',
  'A Facebook post claimed the sun is not 93 million miles away but is instead "local" and positioned beneath a dome-like firmament, as described in certain biblical interpretations. This is false by every known method of measurement.

The Earth-sun distance has been independently verified through multiple methods since the 19th century, most precisely through radar ranging — scientists transmit a radar signal to a nearby planet, measure the round-trip travel time, and use that to calibrate the entire solar system''s geometry. Earth''s distance from the sun varies between approximately 91.4 and 94.5 million miles depending on orbital position, with an average near 93 million. The Earth itself is an oblate spheroid, confirmed by satellite imagery, circumnavigation, and the physics of gravity acting on planetary-scale masses.

The firmament dome model originates from a literal reading of certain Old Testament passages and is not supported by any physical evidence. Flat-earth proponents have not produced a consistent, testable model that accounts for observed phenomena including eclipses, the behavior of ship hulls disappearing over the horizon, time zones, or the visibility of different constellations from different hemispheres. PolitiFact rated this Pants on Fire.',
  'seeded',
  ARRAY[
    'https://www.politifact.com/factchecks/2022/sep/14/viral-image/sun-about-93-million-miles-away-earth-though-unfou/',
    'https://oceanservice.noaa.gov/facts/earth-round.html',
    'https://archive.ph/QCrVj'
  ],
  2,
  0, 0, 0, 0, 0
),

-- ----------------------------------------------------------------
-- MINIMUM_WAGE_1 — TRUE
-- ----------------------------------------------------------------
(
  'federal-minimum-wage-decade-no-increase',
  'Has the federal minimum wage gone more than a decade without an increase, and has it been over 50 years since it kept pace with inflation?',
  'Wisconsin Lt. Gov. Mandela Barnes claimed in 2021 that the federal minimum wage had not increased in over a decade and had not kept pace with inflation for over 50 years. Both parts are accurate.

The federal minimum wage has been $7.25 per hour since 2009, when the final phase of the Fair Minimum Wage Act of 2007 took effect. It has not been raised since, making Barnes'' "over a decade" claim straightforwardly true. On the inflation side, the minimum wage and inflation-adjusted wages rose together through the 1940s-60s, peaked in 1968, and then diverged sharply. By 2021, the inflation-adjusted value of the minimum wage had fallen roughly 31% from its 1968 peak, according to the Economic Policy Institute.

PolitiFact noted that the claim is specifically about nominal wage increases (not purchasing power), but both the factual record and the broader context fully support Barnes'' framing. The Congressional Research Service''s own data visualizations confirm the divergence point. Rated True.',
  'seeded',
  ARRAY[
    'https://www.politifact.com/factchecks/2021/jun/19/mandela-barnes/yes-its-been-decades-minimum-wage-kept-inflation-a/',
    'https://www.dol.gov/general/topic/wages/minimumwage'
  ],
  95,
  0, 0, 0, 0, 0
),

-- ----------------------------------------------------------------
-- GUNS_1 — MOSTLY TRUE
-- ----------------------------------------------------------------
(
  'waiting-periods-gun-suicide-reduction',
  'Have states that implemented gun purchase waiting periods seen significant decreases in suicides?',
  'Sen. Doug Jones claimed in a 2018 Senate floor speech that states implementing waiting periods for gun purchases had seen significant reductions in suicides. The claim is well-supported by the best available research, with minor caveats.

The most cited study on this question, published in 2017 and co-authored by researchers at Harvard Business School, analyzed every change to waiting period laws in the U.S. between 1970 and 2014 and compared them to CDC gun death data. It found waiting periods were associated with a 7–11% reduction in gun suicides, equivalent to roughly 22–35 fewer gun suicides per year in the average state. The proposed mechanism is a "cooling off" period: requiring a delay between purchasing and receiving a firearm gives time for suicidal impulses — which are often acute and transient — to subside.

The caveats are real but modest. One expert noted the study''s statistical significance depended on the regression model used, and one of the paper''s own co-authors described the suicide findings as preliminary, calling for further research. Jones'' phrasing ("significant decreases") is directionally accurate and consistent with the lead researcher''s own assessment. Rated Mostly True.',
  'seeded',
  ARRAY[
    'https://www.politifact.com/factchecks/2018/mar/24/doug-jones/yes-waiting-periods-gun-purchases-have-been-linked/',
    'https://www.cdc.gov/nchs/data/nvsr/nvsr66/nvsr66_06.pdf'
  ],
  75,
  0, 0, 0, 0, 0
),

-- ----------------------------------------------------------------
-- CLIMATE_1 — MOSTLY FALSE
-- ----------------------------------------------------------------
(
  'ev-battery-co2-eight-years',
  'Does manufacturing the battery for an electric vehicle produce as much CO2 as running a petrol car for eight years?',
  'A viral Facebook cartoon claimed that manufacturing a single electric vehicle battery produces CO2 equivalent to driving a gasoline car for eight years, suggesting EVs are no cleaner than conventional vehicles. This significantly overstates battery manufacturing emissions and omits the operational emissions picture entirely.

According to climate scientist Zeke Hausfather, producing a 75 kWh battery — on the larger end for EVs — generates roughly 4,500 kg of CO2 if manufactured at Tesla''s Nevada plant (which uses partial solar power), equivalent to driving a gas sedan for about 1.4 years. If produced in Asia with a coal-heavy grid, emissions rise to around 7,500 kg — still equivalent to roughly 2.4 years of driving, not eight. The claim appears to originate from a 2017 Swedish study with a narrower methodology that has since been superseded by more comprehensive analyses.

The framing also ignores that EV battery manufacturing emissions are a one-time upfront cost offset by zero tailpipe emissions over the vehicle''s lifetime. The Union of Concerned Scientists found EVs reduce lifetime greenhouse gas emissions by approximately 50% compared to equivalent gas vehicles, accounting for the electricity source used for charging. As grids decarbonize, the manufacturing footprint will also shrink. Rated Mostly False.',
  'seeded',
  ARRAY[
    'https://www.politifact.com/factchecks/2021/may/11/viral-image/producing-electric-cars-battery-does-not-emit-same/'
  ],
  25,
  0, 0, 0, 0, 0
);


-- ----------------------------------------------------------------
-- FLAT_EARTH_2 — FALSE (child of flat-earth-sun-firmament)
-- Insert separately so we can reference parent
-- ----------------------------------------------------------------
INSERT INTO stubs (slug, rq, blurb, status, related_links, official_score,
                   left_truth, right_truth, center_truth, close_votes, importance_level,
                   parent_id)
VALUES (
  'flat-earth-nyberg-green-screen',
  'Is there video evidence of NASA astronaut Karen Nyberg pretending to be in space in front of a green screen?',
  'A widely shared Instagram video purported to show NASA astronaut Karen Nyberg filming a fake "space" scene in front of a green screen, offered as evidence that space travel is staged. The video does show a green screen setup — but the woman in it is not Karen Nyberg.

The video was created by David Weiss, host of "The Flat Earth Podcast," and his partner Paige Windle as a demonstration of how green screens work, posted to Weiss'' own YouTube and TikTok channels. Weiss himself confirmed this to PolitiFact and noted that someone had taken the clip and falsely attributed it to Nyberg. The woman in the video is called "Paige" on camera. Nyberg''s voice doesn''t match the woman in the clip, and a Turkish fact-checking organization confirmed directly with Nyberg''s representatives that she is not involved.

The irony is that the original video was made by a flat-earther mocking NASA — and was then misattributed, without his permission, to a real NASA astronaut. Weiss himself posted a TikTok correction noting the woman was "NOT Karen Nyberg." PolitiFact rated the claim that the video shows Nyberg pretending to be in space False.',
  'seeded',
  ARRAY[
    'https://www.politifact.com/factchecks/2022/sep/09/instagram-posts/no-isnt-video-nasa-astronaut-pretending-be-space/'
  ],
  5,
  0, 0, 0, 0, 0,
  (SELECT id FROM stubs WHERE slug = 'flat-earth-sun-firmament')
);

ALTER TABLE stubs RENAME COLUMN official_score TO official_truth;

-- Parent: Rand et al. Community Notes finding
INSERT INTO stubs (slug, rq, blurb, status, related_links, official_truth,
                   left_truth, right_truth, center_truth, close_votes, importance_level)
VALUES (
  'republicans-flagged-more-community-notes',
  'Are Republicans flagged more often than Democrats for sharing misinformation on X''s Community Notes?',
  'A study using crowd-sourced assessments from X''s Community Notes program found that 67% more posts by Republicans are flagged as misleading compared to posts by Democrats. Unlike prior research relying on professional fact-checkers, this study used agreement across a politically diverse community of platform users to determine misleadingness — a design that controls for accusations of fact-checker bias.

The authors found no evidence this disparity is a base-rate artifact: Republicans are not meaningfully over-represented among X users in a way that would explain the gap. The findings suggest a genuine partisan asymmetry in misinformation sharing, and further indicate that even if platforms transition away from professional fact-checking toward Community Notes-style systems, Republicans would still be sanctioned at higher rates than Democrats.',
  'seeded',
  ARRAY['https://osf.io/preprints/psyarxiv/vk5yj_v2'],
  85,
  0, 0, 0, 0, 0
);

-- Child: open/biddable extension question
INSERT INTO stubs (slug, rq, blurb, status, related_links, official_truth,
                   left_truth, right_truth, center_truth, close_votes, importance_level,
                   parent_id)
VALUES (
  'republicans-flagged-more-all-platforms',
  'Are Republicans more likely to be flagged for misinformation than Democrats across all major social media platforms?',
  'The Community Notes finding establishes a partisan asymmetry on X, but it is an open question whether this pattern holds across platforms with different moderation architectures, user bases, and content policies. Facebook, Instagram, YouTube, and TikTok use different combinations of algorithmic detection, third-party fact-checkers, and user reporting — each of which may interact differently with partisan content patterns.

This question is currently unresolved. Cross-platform studies face significant data access barriers, and existing research is largely platform-specific. Whether the asymmetry is a property of Republican sharing behavior broadly or is specific to X''s user composition and Community Notes design remains to be determined.',
  'biddable',
  ARRAY['https://osf.io/preprints/psyarxiv/vk5yj_v2'],
  0,
  0, 0, 0, 0, 0,
  (SELECT id FROM stubs WHERE slug = 'republicans-flagged-more-community-notes')
);