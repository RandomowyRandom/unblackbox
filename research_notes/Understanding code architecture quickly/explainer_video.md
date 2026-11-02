# What makes educational/explanatory videos and animations effective for technical and programming concepts

Evidence labels used on every bullet:
[EMP] = peer-reviewed empirical study or meta-analysis, numbers checked against the primary paper or its abstract.
[EMP-2nd] = peer-reviewed work, but the specific numbers came from a secondary summary (clearinghouse, press release, citing paper); verify before quoting as final.
[CRAFT] = creator practice or stated principle (interviews, talks, judging criteria, viewer observation). Not evidence of learning.
[VENDOR] = vendor/marketing material, not peer-reviewed.
Popularity (views, subscribers) is treated as a weak signal of engagement, not learning.

## 1. Instructional video research: length, pacing, narration rate, segmenting, signaling, seductive details, instructor presence, generative activity

### Takeaway
The strongest multimedia-design levers are signaling, segmenting (short, meaningful, learner-pausable chunks), coherence (cut seductive details), and generative prompts; shorter videos (median engagement caps at about 6 minutes) and enthusiastic, fairly fast narration hold attention, while an on-screen instructor face adds little or nothing to learning. Most "length" and "speaking rate" evidence is engagement (watch-time) data from MOOCs, not learning outcomes.

### Cited Findings

Length, production style, speaking rate (Guo, Kim & Rubin 2014, L@S)
- [EMP] Dataset: 6,902,358 video-watching sessions, 862 videos, 127,839 students, four Fall-2012 edX courses (MIT 6.00x intro CS/programming, Harvard PH207x, Berkeley CS188.1x, MIT 3.091x). Engagement = time watched and whether students attempted the following problem. Retrospective log study, not a controlled experiment, math/science courses only. — [Guo, Kim & Rubin 2014 PDF](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Video length was "by far the most significant indicator of engagement": median engagement time was at most 6 minutes regardless of total length; students often watched less than half of videos longer than 9 minutes; for 0-3 minute videos, 75% of sessions lasted over three quarters of the video. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Share of sessions followed by a problem attempt fell with length across five length buckets: 56%, 48%, 43%, 41%, 31%. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Khan-style tablet-drawing tutorials got 1.5x to 2x the engagement of PowerPoint slides and code screencasts (slides and code screencasts were grouped together); 40% vs 31% of sessions were followed by a problem attempt (chi-square p << 0.001). Recommendation: introduce motion and continuous visual flow, with extemporaneous speaking. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Talking head interspersed with slides was more engaging than slides alone; the 6.00x instructor filmed at an office desk (tight frame, eye contact, "personal" feel) beat a high-budget TV-studio production. Authors suggest picture-in-picture may beat repeated hard switching. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Speaking rate ranged 48-254 wpm (mean 156, SD 31). Within a length bucket, engagement rose up to 2x with speaking rate; for 6-12 min videos, the middle bucket (145-165 wpm) was least engaging. Authors were able to follow even the 254 wpm videos because the same content was on slides. They treat wpm as a surface proxy for enthusiasm and warn that speeding up an unenthusiastic speaker may not help. The common 160 wpm recommendation dates from 1967 and was for live lectures. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] edX producers edit out "umm", filler words and pauses because video viewers can pause themselves; paper recommends editing them out. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Pre-production (planning for the video format rather than chopping classroom lectures) was what producers believed mattered most; natural comparison: 55% vs 41% problem-attempt rate for a planned vs chopped lecture course. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)
- [EMP] Tutorials (procedural how-to) were watched for only 2-3 minutes on average regardless of length and were re-watched more than lectures; recommendation: support skimming and re-watching with bookmarks or visual signposts (e.g., big transition text) for tutorials, and optimise first-watch flow for lectures. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)

In-video dropouts and interaction peaks (Kim, Guo, Seaton et al. 2014, L@S)
- [EMP-2nd] Second-by-second data from the same 862 edX videos: dropout higher for longer videos, re-watch sessions and tutorials; in an 80-video sample, 61% of interaction peaks coincided with a visual transition (e.g., slide to classroom view, handwriting to software screencast). Design implications: informative titles, avoid abrupt visual transitions, one-click access to tutorial steps. — [Kim et al. 2014 PDF](https://iis.seas.harvard.edu/papers/kim14video.pdf); [MIT DSpace record](https://dspace.mit.edu/handle/1721.1/90413)

Overall video effect and design meta-meta-analysis
- [EMP-2nd] Noetel et al. 2021 (Review of Educational Research; 105 randomised studies, 7,776 university students): replacing other teaching with video g = 0.28; adding video to existing teaching g = 0.80. — [ACU Inspire summary](https://inspire.acu.edu.au/articles/video-based-learning)
- [EMP] Noetel et al. 2022 overview of reviews (29 reviews, 1,189 studies, 78,177 participants): 11 design principles had significant positive meta-analytic effects on learning, 5 improved cognitive-load management. Largest effects: captioning second-language videos, temporal/spatial contiguity, signaling. Also robust: modality, animation, coherence, anthropomorphics, segmentation, personalization, pedagogical agents, verbal redundancy. Good design mattered more for complex material and for system-paced media (like video/lectures) than self-paced media. — [ACU Research Bank record](https://acuresearchbank.acu.edu.au/item/8zqy4/multimedia-design-for-learning-an-overview-of-reviews-with-meta-meta-analysis); [ERIC record](https://searchworks.jioinstitute.edu.in/articles/eric__EJ1338120)

Brame 2016 synthesis (CBE Life Sciences Education)
- [EMP-2nd] Brame's essay organises video design around three elements: manage cognitive load, maximise engagement, promote active learning. Concrete practices: signaling, segmenting, weeding (remove music, busy backgrounds, extraneous material), matching modality (audio and visual channels complement rather than duplicate); pair video with guiding questions, interactive elements or homework. — [Brame 2016, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5132380/); [UBC summary](https://blogs.ubc.ca/videolearninghub/?p=568); [Penn State HAX summary](https://lab.hax.psu.edu/design-guidelines-and-principles)
- [EMP-2nd] A secondary summary of Brame reports median engagement of about 50% for 9-12 minute videos and about 20% for 12-40 minute videos, and a target of 6-9 minutes or less. — [UC Merced summary PDF](https://teach.ucmerced.edu/sites/crte.ucmerced.edu/files/documents/effective_videos_brame_summary.pdf)

Segmenting and learner pacing
- [EMP] Rey et al. 2019 meta-analysis (Educational Psychology Review 31:389-419): 56 studies, 88 pairwise comparisons; significant small-to-medium segmenting effects on retention and transfer; learners with higher prior knowledge benefited more (retention). Segmenting = meaningful, coherent, learner-paced segments instead of a continuous stream. — [MPI record](https://is.mpg.de/publications/rey2018segmenting)
- [EMP-2nd] A secondary summary reports the segmenting effect was not altered by giving learners more processing time, self-pacing, rewatching or free navigation, suggesting the designer's chunking/structuring itself carries much of the benefit. — [IFP summary](https://ifp.nyu.edu/?p=1391107)
- [EMP] Fiorella & Mayer 2018 commentary on the Computers in Human Behavior special issue: two features that improved learning from video were learner-paced segments and filming demonstrations from first- vs third-person perspective. — [ECR Hub](https://ecrhub.org/publications/what-works-and-doesnt-work-instructional-video)
- [EMP] Contrary moderator: Berney & Bétrancourt's animation meta-analysis found system-paced animations (g = 0.309) outperformed learner-paced ones (see section 3). Pacing control is not a guaranteed win. — [Berney & Bétrancourt EARLI 2016](https://tecfa.unige.ch/perso/sandra/pdf/Earli2016_berney_betrancourt_FINAL.pdf)

Playback speed
- [EMP-2nd] Murphy et al. 2022 (Applied Cognitive Psychology 36:69-82): minimal comprehension cost going from 1x to 1.5x or 2x, decline beyond 2x, for immediate and delayed tests; students wrongly believed slower was better. Topics were Roman history and real-estate appraisal; authors caution results may differ with complexity, speech rate and audiovisual overlap. — [UMPI CTL summary](https://www.umpi.edu/ctl/?p=5084); [New Atlas](https://newatlas.com/science/watching-videos-double-speed-learning-study-comprehension)

Signaling / cueing
- [EMP-2nd] Schneider, Beege, Nebel & Rey 2018 (Educational Research Review 23:1-24): 103 studies, 12,201 participants; signaling improved retention g = 0.53, transfer g = 0.33, and reduced cognitive load g = 0.25. Moderators examined include signal type, mode, domain, prior knowledge and pacing. — [TUM Clearinghouse summary](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2018/12/CHU_KR-22_-Schneider_2017_Lernmaterial_Hervorhebungen.pdf); [citing paper, Cognitive Processing 2020](https://link.springer.com/content/pdf/10.1007/s10339-020-01002-5.pdf)
- [EMP] Alpizar, Adesope & Wong 2020 (ETR&D 68:2095-2119): 44 effect sizes, 29 studies, 2,726 participants, d = 0.38; benefits clearer in higher-quality studies that used pretests and controlled for prior knowledge. — [WSU record](https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/A-meta-analysis-of-signaling-principle-in/99900601052901842)
- [EMP-2nd] Richter, Scheiter & Eitel 2016: r = 0.17 for signaling text-picture relations, moderated by prior knowledge (benefit mainly for low prior knowledge). — [Cognitive Processing 2020 citing paper](https://link.springer.com/content/pdf/10.1007/s10339-020-01002-5.pdf)

Seductive details (coherence)
- [EMP-2nd] Rey 2012 (Educational Research Review 7:216-237): 39 effects; medium negative effects on recall and transfer; visual seductive details most harmful. — [ACU Inspire](https://inspire.acu.edu.au/articles/seductive-details)
- [EMP-2nd] Sundararajan & Adesope 2020 (Educational Psychology Review 32:707-734): 68 effects, 58 studies, g = -0.33; harm larger when learners cannot control pace (system-paced, i.e., video), when details are frequent, and when details share the core content's media format. — [ACU Inspire](https://inspire.acu.edu.au/articles/seductive-details); [WSU news](https://news.wsu.edu/2020/03/19/seductive-details-inhibit-learning/)
- [EMP] Mayer, Fiorella & Stull 2020 list adding "interesting but extraneous video" as the one way not to use instructional video. — [ECR Hub](https://ecrhub.org/publications/five-ways-increase-effectiveness-instructional-video)

Video-specific principles (Mayer, Fiorella & Stull 2020, ETR&D 68:837-852)
- [EMP] Five evidence-backed principles: dynamic drawing (instructor draws graphics while explaining, same script and graphics as static control), gaze guidance (instructor shifts gaze between audience and board), generative activity (prompts to summarise or explain), perspective (first-person filming of demonstrations), subtitles (for second-language speech). — [ECR Hub](https://ecrhub.org/publications/five-ways-increase-effectiveness-instructional-video)
- [EMP-2nd] Fiorella and colleagues (2019) studied instructor-generated drawings and learner-generated explanations in video lessons as generative supports. — [ECR Hub search listing](https://ecrhub.org/publications/what-works-and-doesnt-work-instructional-video)

Instructor presence (face on screen)
- [EMP] Alemdag 2022 meta-analysis (20 experiments): on-screen instructor had no significant effect on learning or social presence, but significantly raised cognitive load and motivation. — [METU record](https://avesis.metu.edu.tr/yayin/8df0f0a3-6154-4f4b-9333-5108f1e4b1f1/effects-of-instructor-present-videos-on-learning-cognitive-load-motivation-and-social-presence-a-meta-analysis)
- [EMP] Henderson & Schroeder 2021 systematic review (12 studies): no consistent learning benefit of an on-screen instructor, nor convincing evidence for removing one. — [DOAJ](https://doaj.org/article/8153054b2828456987b7c3be15d2895d)
- [EMP] Beege, Schroeder, Domagk, Rey & Schneider meta-analysis series (35 studies, 6,339 participants): small significant positive effect on retention, none on transfer, gains in social presence, affect and motivation. — [Deutsche Digitale Bibliothek record](https://www.deutsche-digitale-bibliothek.de/item/PBOMPA7MBJFP5UZOZIZ5TTKBWQG7UUP3)

### Inferences
- Engagement findings (Guo, Kim) and learning findings (meta-analyses) point the same way on chunking: short, planned, single-purpose segments. A code explainer should target segments well under 6 minutes, with chapter markers so tutorials can be skimmed and re-watched.
- Code screencasts were among the least engaging formats in Guo et al.; the "Khan-style" advantage plausibly comes from continuous motion that tracks the narration (a form of signaling). An automated generator can approximate this by progressively revealing and highlighting code in sync with speech rather than showing a static editor.
- Because video is system-paced, coherence matters more than in text: seductive-detail harm is larger when learners cannot control pace.
- On-screen faces/avatars buy motivation at the price of cognitive load, with at most a small retention gain; they are optional, not a learning lever.

### Gaps
- Guo et al. measured engagement, not learning; no controlled study found here establishes an optimal length for programming explainers specifically.
- Exact effect sizes for Rey 2019 segmenting and for Brame's length figures came from abstracts or secondary summaries.
- I did not locate Fiorella & Mayer's generative-learning video studies' effect sizes (e.g., self-explanation prompts in video) in primary form.

## 2. Narration voice: human vs TTS vs AI-generated video (2017-2026)

### Takeaway
The classic voice principle (human beats machine voice) holds against old, robotic TTS but mostly vanishes with modern neural TTS: several experiments since 2017 find learning parity, with occasional human advantages on immediate tests or attention. AI-generated videos (synthetic voice, sometimes avatars) generally produce equal test performance but lower enjoyment, credibility and social presence; voice character matters (a "cute" synthetic voice hurt learning).

### Cited Findings
- [EMP] Voice principle as originally stated: people learn better from a human voice than a computer voice. — [OSU Multimedia Learning page](https://u.osu.edu/multimedialearning/multimedia-learning-principles/11-the-voice-principle)
- [EMP-2nd] Craig & Schroeder 2017: a modern TTS engine produced better transfer than an older engine and was rated similar to a human voice for learning and credibility. — [ReadSpeaker summary, VENDOR-hosted](https://0-www-readspeaker-com.midhudsonlibraries.org/blog/elearning-voice)
- [EMP] Craig & Schroeder 2019 (Computers & Education): animations narrated by an older engine, a modern engine or a human; modern-engine learners did not differ from human-voice learners on perceptions, learning outcomes or cognitive efficiency; authors conclude software may now be credible for narration. — [ERIC EJ1225297](https://searchworks.jioinstitute.edu.in/articles/eric__EJ1225297)
- [EMP] Dinçer 2022 (Journal of Pedagogical Research): no significant difference between modern machine voices and human voices. — [DOAJ](https://doaj.org/article/a14435a205f54240bdd0b0db2fa06f91)
- [EMP] Voice-effect study (ERIC EJ1341358): traditional synthesized voice differed significantly from human voice on learning, modern synthesized voice did not. — [ERIC full text](https://files.eric.ed.gov/fulltext/EJ1341358.pdf)
- [EMP] 2022 study of an enthusiastic Amazon Alexa TTS voice: enthusiastic delivery did not improve retention or transfer over a neutral TTS voice. — [Education and Information Technologies 2022](https://link.springer.com/content/pdf/10.1007/s10639-022-11255-6.pdf)
- [EMP] "Cute Computer-Synthesized Voice Hinders Learning Performance in Instructional Videos" (Journal of Experimental Education, vol. 94 no. 4): voice persona choice can hurt learning. — [Taylor & Francis](https://www.tandfonline.com/doi/full/10.1080/00220973.2024.2446169)
- [EMP-2nd] 2026 2x2 experiment (130 participants; real vs AI-generated instructor x human vs synthetic voice), Education and Information Technologies: no direct effects of instructor or voice type on motivation or knowledge retention (perceived human-likeness was the studied mediator). Note: one search summary attributed a higher learning outcome to the AI condition in a 130-person 2x2 study; I could not resolve this conflict without full text. — [Springer](https://link.springer.com/article/10.1007/s10639-026-14085-y); [ResearchGate](https://www.researchgate.net/publication/408417996_Real_versus_AI-generated_instructors_and_human_versus_synthetic_voices_in_educational_videos_Impacts_on_perceived_human-likeness_motivation_and_knowledge_retention)
- [EMP] Netland, von Dzengelevski, Tesch & Kwasnitschka 2025 (Computers & Education 224): 447 participants, four AI-generated vs human-made management-course videos; human-made rated slightly but significantly better for learning experience; no significant exam difference; AI videos took hours vs days to make. — [x-mol abstract](https://x-mol.com/paper/1857628113137397760); [Media & Learning author summary](https://media-and-learning.eu/subject/artificial-intelligence/when-ai-took-over-my-teaching-videos-students-enjoyed-them-less-but-learned-the-same/)
- [EMP-2nd] Xu 2025 (British Journal of Educational Technology): AI-generated instructional videos yielded better retention in English word learning with lower cognitive load, but lower social presence. — [BJET](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.13530)
- [EMP-2nd] IRRODL study: AI-generated instructors produced the same performance as human instructors but lower video engagement; some learners reported discomfort. — [IRRODL](https://www.irrodl.org/index.php/irrodl/article/view/7815/6135)
- [EMP-2nd] 500-participant adult-learner study of an AI-generated synthetic video: no significant differences in recall or recognition between conditions. — [arXiv 2412.10384](https://arxiv.org/pdf/2412.10384)
- [EMP-2nd] 2025 eye-tracking study (Internet and Higher Education) argues AI-generated instructors become more effective with human-like behaviour and dynamic visual cues. — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1096751625000430)
- [EMP-2nd] 2026 review of synthetic media in multilingual MOOCs flags impersonation/deepfake-tutor ethics alongside pedagogical benefits. — [arXiv 2602.18457](https://arxiv.org/pdf/2602.18457)
- [VENDOR] TechSmith reports high-quality AI voices gave the best retention while low-quality, clearly synthetic voices distracted. — [TechSmith blog](https://www.techsmith.com/blog/ai-voices-avatars-in-training-videos/)
- [CRAFT, unverified] Secondary summaries claim Fireship's creator cloned his own voice and uses AI in writing/editing; I could not find the primary statement. — [rosetta.to Fireship interviews](https://rosetta.to/u/fireship/topic/interviews)

### Inferences
- A modern neural TTS voice is an acceptable default narrator for an automated generator; the failure mode to avoid is a robotic or gimmicky ("cute") persona, not synthesis per se.
- Since AI videos match learning but lose on enjoyment/social presence, spend effort on script quality, enthusiasm-like prosody and conversational wording rather than on avatars.

### Gaps
- No study found on TTS narration specifically for programming/code content, nor on long-term (weeks) retention with modern neural voices beyond single studies.
- A reported 2025 Dylman et al. finding (human speech advantage immediately, none after one week) surfaced only in a search summary; not verified.

## 3. Animation vs static graphics; transient information

### Takeaway
Animation beats static pictures on average by a small amount (d = 0.37 in 2007, g = 0.23 in a larger 2016 update), with big gains for representational (not decorative) animation, realistic depictions and procedural-motor skills, and smaller gains for abstract/formal-notation content like code. Animation fails when it is too fast or complex to perceive, when it carries transient information learners must hold in memory, or when it is merely decorative.

### Cited Findings
- [EMP] Tversky, Morrison & Bétrancourt 2002 (IJHCS 57:247-262): effective graphics follow the Congruence Principle (structure and content of the graphic match the concept) and the Apprehension Principle (readily and accurately perceived and conceived). Animations often violate apprehension by being too complex or fast. Many reported animation advantages came from non-equivalent comparisons (animation carried more information or interactivity than the static version). Animation may help for real-time reorientations in time and space; judicious interactivity (pause, replay, control) may offset drawbacks. — [Tversky et al. 2002 PDF](https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf)
- [EMP] Höffler & Leutner 2007 (Learning and Instruction 17:722-738): 26 studies, 76 comparisons (1973-2003), overall d = 0.37. Larger effects for representational vs decorational animation (d = 0.40, CI 0.26-0.53), highly realistic e.g. video-based animation (d = 0.76, CI 0.39-1.13), and procedural-motor knowledge (d = 1.06, CI 0.72-1.40). — [Leibniz-IPN abstract](https://www.leibniz-ipn.de/en/research/publications/instructional-animation-versus-static-pictures-a-meta-analysis)
- [EMP] Berney & Bétrancourt 2016 (Computers & Education 101; EARLI conference version): 61 experiments, 140 comparisons, N = 7,036, overall g = 0.226 (CI 0.12-0.33), high heterogeneity (I² = 78). System-paced animations (no pace control) g = 0.309 outperformed learner-paced variants. Iconic representations (realistic/schematic pictures) g = 0.245 outperformed abstract representations (analytic pictures, formal notation, symbols, charts, diagrams, graphs). 10% of comparisons favoured static graphics. — [Berney & Bétrancourt EARLI 2016 PDF](https://tecfa.unige.ch/perso/sandra/pdf/Earli2016_berney_betrancourt_FINAL.pdf)
- [EMP-2nd] A 2021 Instructional Science paper notes three meta-analyses show limited advantage for animation overall, while a Ploetzner et al. 2020 re-analysis finds animation considerably more effective once displayed content specifics are taken into account. — [Instructional Science 2021](https://link.springer.com/content/pdf/10.1007/s11251-021-09541-w.pdf)
- [EMP] Ayres & Paas 2007: transience is a load problem; when earlier information disappears, learners must hold it in working memory while processing new input; remedies include pause control and splitting into smaller parts. — [Ayres & Paas 2007 PDF (EPFL-hosted)](https://studio.courseware.epfl.ch/assets/courseware/v1/61858f819cd4b08668b0f41c1fabd34c/asset-v1:EPFL+DEMO+2020+type@asset+block/ZA.pdf)
- [EMP-2nd] Leahy & Sweller 2011 (Applied Cognitive Psychology 25(6)): the modality advantage (narration + visuals over on-screen text + visuals) held for short explanatory text but reversed for long text, because long spoken passages are transient; shortening text restored the modality effect. — [catalogue record](https://vufind-test.katalog.k.utb.cz/SummonRecord/FETCH-LOGICAL-c4267-512e9f40717fc33f2c96b01b3071a731c8969b0e81f7436659ebf97a8c66c0653); [Instructional Science 2016 citing paper](https://doi.org/10.1007/s11251-015-9362-9)
- [EMP] Heer & Robertson 2007 (IEEE TVCG/InfoVis): two controlled experiments; animated transitions between data-graphic states significantly improved graphical perception of change via object constancy; simple staging helped, axis rescaling hurt, keeping landmarks helped; warn that morphing an object into an unrelated one misleads. — [UW IDL](https://idl.uw.edu/papers/animated-transitions); [paper PDF](https://vis.berkeley.edu/papers/animated_transitions/2007-AnimatedTransitions-InfoVis.pdf); [lecture deck summary](https://docs.google.com/presentation/d/1FLMfwpuvij3UzZhDeSJ0hRMqVTjNOPWMAtkpMbcJVbc/htmlpresent)

### Inferences
- Code is "formal notation", the category where Berney & Bétrancourt saw the smallest animation advantage. Animating the code text itself is unlikely to teach much; animation should depict what code does (state changes, data-structure mutation, control flow, data moving between modules), i.e., representational animation of a dynamic process.
- Code morphing between versions (diff animation) is an animated transition in the Heer & Robertson sense: it should preserve object constancy (unchanged lines stay put), stage complex changes (delete, then move, then insert), and never morph unrelated tokens into each other.
- To fight transience, keep the code on screen as a persistent static anchor while narration and highlights move over it; keep each spoken chunk short.

### Gaps
- No controlled study found that measures learning from animated code diffs/morphs versus static side-by-side diffs (see section 4).
- Höffler & Leutner's moderator values are from an older, smaller base; I did not verify Castro-Alonso et al. 2019 (reported g = 0.23) at source.

## 4. Algorithm and program visualization; live coding; code-focused video

### Takeaway
For algorithm/program visualization, how learners engage matters more than visual fidelity: passive viewing yields weak or null effects, while prediction, responding, changing inputs and constructing correlate with significant results. Live coding performed passively is roughly equivalent to static code examples; Python Tutor style step-through of runtime state is widely used and liked, but rigorous learning evidence is thin.

### Cited Findings
- [EMP] Hundhausen, Douglas & Stasko 2002 (JVLC 13:259-290): meta-study of 24 experimental studies; most significant finding: "how students use AV technology has a greater impact on effectiveness" than what it shows; cognitive constructivism had the highest predictive success. — [Academia.edu copy](https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness); [Bohrium abstract](https://www.bohrium.com/paper-details/a-meta-study-of-algorithm-visualization-effectiveness/812454576836837378-12577)
- [EMP-2nd] Over 40% of the 24 studies found no significant results; engaging activities listed include prediction and programming exercises. — [Saarland lecture slides](https://www.rw.cdl.uni-saarland.de/people/diehl/private/SoftVisVorles/slides/07_SV_EducationEvaluation.pdf)
- [EMP] Naps et al. 2002 ITiCSE working group report proposed an engagement taxonomy grounded in Bloom: No viewing, Viewing (watch, control playback), Responding (answer questions about the visualization), Changing (modify inputs), Constructing (build one's own visualization), Presenting (explain it to an audience). Hypothesis: learning increases with engagement level. Later work found most AVs stay at the Viewing level (Shaffer et al. 2010); Myller et al. extended it to 10 levels; Sorva et al. proposed a two-dimensional version separating engagement from content ownership. — [TU Darmstadt PVW paper](https://fileserver.tk.informatik.tu-darmstadt.de/Publications/2006/pvwTrees.pdf); [report citation](https://www.bibsonomy.org/bibtex/2b8476cca1616cd9a2a2594a99e1482e4/aho); [IJPCE](https://www.ijpce.org/index.php/IJPCE/article/download/66/76)
- [EMP] Sorva, Karavirta & Malmi 2013 (ACM TOCE 13(4), 64 pages): program-visualization systems for beginners are mostly short-lived prototypes supporting user-controlled viewing; evaluations mostly support PV in intro courses but are insufficient for nuanced conclusions on engagement. — [Bohrium abstract](https://www.bohrium.com/paper-details/a-review-of-generic-program-visualization-systems-for-introductory-programming-education/813182631830093825-4304); [dblp](https://dblp.uni-trier.de/rec/journals/jeric/SorvaKM13.html)
- [EMP] Guo 2013 Online Python Tutor (SIGCSE): browser-based step forward/backward through execution showing runtime state (frames, objects, pointers); over 200,000 users by early 2013, used in CS1 at about a dozen universities, embedded in three digital textbooks (about 16,000 monthly viewers). Evidence is usage, not controlled learning outcomes. — [Guo 2013 PDF](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf); [Google Research](https://research.google/pubs/online-python-tutor-embeddable-web-based-program-visualization-for-cs-education/)
- [EMP-2nd] Later Python Tutor evaluations are small: a data-structures lab study with 53 students (students found it helpful) and a BINUS case study (fairly effective for several sub-tasks). — [core.ac.uk](https://core.ac.uk/download/295172143.pdf); [BINUS CommIT](https://journal.binus.ac.id/index.php/commit/article/view/3704)
- [EMP-2nd] Live coding: Rubin 2013 concluded live coding is as good as, if not better than, static code examples (controlled for instructor). Soosai Raj et al. 2020 (ACE, C++) found minimal effects, slightly better programming process but lower assessment scores; a Python CS1 replication found no significant differences in incremental development, debugging or productivity; SIGCSE 2025 "Live But Not Active" found basic passive live coding is not different enough from static examples to affect learning. — [Wisconsin PDF](https://pages.cs.wisc.edu/~gerald/papers/LiveCoding.pdf); [dblp Raj 2020](https://dblp.org/rec/conf/ace/RajGZRWHP20); [SIGCSE 2025](https://sigcse2025.sigcse.org/details/sigcse-ts-2025-Papers/4/Live-But-Not-Active-Minimal-Effect-with-Passive-Live-Coding)
- [EMP] Developer screencasts: MacLeod, Storey & Bergen (ICPC 2015; EMSE 2017 extension analysing 20 YouTube screencasts, 10 creator interviews, 7 YouTube vs 7 RailsCasts): developers use screencasts to demonstrate design patterns, explain data structures etc.; creators prepare by organising thoughts, and some edit to improve quality. — [UVic DSpace](https://dspace.library.uvic.ca/items/bb291798-ca16-4ee4-bab5-eb02dba1bb70); [EMSE 2017 DOI](https://unpaywall.org/10.1007%2Fs10664-017-9501-9)
- [EMP-2nd] Animated code presentation for novices (Spinelli, Pandey & Oney, PX/18): eye-tracking of three code-animation styles during summarisation and error-correction tasks; initial results suggest animating a single textual code representation may affect novices' attention in later tasks; specific winner not stated in the abstract. — [PX/18 page](https://2018.programming-conference.org/event/px-2018-papers-attention-patterns-for-code-animations)
- [EMP-2nd] Commit animation (ICSME 2024, USI): proposes interactive animated visualizations of commits because text diffs are "cumbersome"; evaluation details not retrieved. — [USI PDF](https://www.inf.usi.ch/faculty/lanza/PUBS/P/Arme2024a.pdf)
- [EMP] In Guo et al. 2014, code screencasts were grouped with slides as less engaging than Khan-style drawing. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)

### Inferences
- A non-interactive video sits at the "Viewing" level, the weakest rung. The cheapest upgrade available to a video is "Responding": pause-and-predict prompts ("what is x after this loop?", "which module handles this request?") before revealing the answer.
- Python Tutor's core idea (show the runtime state that code text hides: frames, references, heap) is the representational content most worth animating in a code explainer.
- "Live coding" style typing animation alone should not be expected to beat a prepared, progressively revealed listing.

### Gaps
- No controlled study found comparing animated code morphing (e.g., CodeAesthetic/Keynote "magic move" style) against static diffs for comprehension.
- No study found on architecture-level code explainer videos (module/dependency walkthroughs), the generator's likely target.

## 5. Craft analysis of successful technical explainers

### Takeaway
Creators converge on: content and topic choice over production polish, motivation in the first seconds, concrete examples before abstraction, one tightly scoped idea per piece, animation only where it mirrors the underlying logic, and simple frames that make each change followable. These are practitioner claims, consistent with but not proof of the research above.

### Cited Findings
3Blue1Brown (Grant Sanderson)
- [CRAFT] SoME announcement advice (secondary transcript summary): just start; go concrete to abstract (let examples and patterns precede formal definitions, the reverse of textbooks); content is king, production quality secondary; pick specific/niche topics; pick a genre (distanced explainer, discovery journalism, worked examples, inspirational demo) and do not copy another genre's style; do not rush math ("fire hose" delivery); motivate definitions so learners feel they could have discovered them; invest in sound quality; use animation to clarify, not decorate. — [rosetta.to SoME announcement summary](https://rosetta.to/u/3blue1brown/make-math-videos-summer-of-math-exposition-announcement)
- [CRAFT] SoME1 judging criteria: clarity (explain jargon, empathy for newcomers), motivation (clear within the first 30 seconds why the audience should care), novelty, memorability (an "aha" moment), substance clear within a 5-10 minute view. — [3Blue1Brown SoME1 blog](https://www.3blue1brown.com/blog/some1)
- [CRAFT] On the Lex Fridman podcast, Sanderson emphasises concrete examples and visualisations before abstract formulas, letting the brain pattern-match first. — [Lex Fridman #64 summary](https://rosetta.to/u/lexfridman/grant-sanderson-3blue1brown-and-the-beauty-of-mathematics-lex-fridman-podcast-64); [lexfridman.com](https://lexfridman.com/grant-sanderson/)
- [CRAFT] Sanderson animates with Manim, his own programmatic Python animation library, and discusses it in his FAQ. — [3Blue1Brown FAQ](https://www.3blue1brown.com/faq/)
- [CRAFT] Stanford talk framed his approach as engaging with math through stories and visuals. — [Stanford Daily 2020](https://www.stanforddaily.com/2020/01/24/3blue1brown-creator-grant-sanderson-15-talks-engaging-with-math-using-stories-and-visuals)

Fireship (Jeff Delaney)
- [CRAFT] "X in 100 Seconds" format: compress a topic that would take about 30 minutes into 100 seconds. — [Honeypot "Meet Jeff Delaney"](https://cult.honeypot.io/originals/meet-jeff-delaney-fireship); [Medium interview](https://medium.com/illumination-curated/interview-with-jeff-delaney-from-youtubes-500k-fireship-channel-for-programmers-7d0d57eb8a1)
- [CRAFT, secondary] Stated ingredients: educational/useful content, storytelling, humour; avoid copying others; he does not show his face (finds it distracting) and uses graphics instead. — [rosetta.to Fireship interviews](https://rosetta.to/u/fireship/topic/interviews)
- [CRAFT] Subscriber counts conflict across sources (500k+ in an older Medium interview, about 4 million in a later profile); popularity is a weak learning signal. — [Medium](https://medium.com/illumination-curated/interview-with-jeff-delaney-from-youtubes-500k-fireship-channel-for-programmers-7d0d57eb8a1); [creatordb](https://creatordb.app/creatorstats/fireship_dev/)

CodeAesthetic
- [CRAFT] Channel about software design and clean code; viewers single out the animation and note each frame is simple enough to follow code changes as they happen. Listed at about 417K subscribers (possibly stale). — [favoree listing](https://www.favoree.io/channel/codeaesthetic-660d7e0119f63de25e7cd904)
- [CRAFT] Example: "Why You Shouldn't Nest Your Code", 8:29 long, published 6 Dec 2022, framed around being a "never nester". — [TheTVDB episode list](https://thetvdb.com/series/codeaesthetic/allseasons/official); [mirror listing](https://yt.dorper.me/v/yt/CFRhGnuXG-4)
- [CRAFT] Production details (tooling, workflow) are only in paywalled behind-the-scenes content; no interview found. — [codeaesthetic.io](https://codeaesthetic.io/)

Computerphile (Brady Haran / Sean Riley)
- [CRAFT] Format: casual interview with an expert; most videos directed and produced by Sean Riley. — [Wikiwand: Brady Haran](https://www.wikiwand.com/en/articles/Brady_Haran)
- [CRAFT] Guest account (2026 blog): hand-drawn, handwritten explanations on lined paper are the channel's signature; guest rehearsed on paper aloud two or three times; interviewers act as a well-prepared "straight man". Single guest's impression. — [xania.org blog](https://m.xania.org/202605/walking-the-dog)

Ben Eater
- [CRAFT] Built the simplest computer architecture he could from a digital-electronics textbook; videos are effectively a build log. — [The Amp Hour #444](https://theamphour.com/444-an-interview-with-ben-eater/)
- [CRAFT] Viewer observations: one module per video, separate videos on underlying electronics, one breadboard per function for visual clarity, step the clock manually so each part can be watched working. — [hackaday.io project discussion](https://hackaday.io/project/26350); [Hackaday 2017](https://hackaday.com/2017/04/10/8-bit-breadboard-computer-is-up-to-8-hours)

Interactive/explorable explanations
- [CRAFT] Bret Victor, "Explorable Explanations" (2011): active reading via reactive documents (reader changes the author's assumptions and sees consequences), explorable examples, contextual information; author must expose the model behind the argument. — [worrydream.com](https://worrydream.com/ExplorableExplanations/)
- [CRAFT] Nicky Case: explorables teach something and are more interactive than a one-right-answer quiz; design notes attribute "end with a sandbox" to Case's Sight and Light. — [Red Blob Games citing explorabl.es FAQ](https://redblobgames.com/x/2306-educ432); [community gist](https://gist.github.com/electronicwhisper/d86bc7fdd75eae7eba6c); [Case blog](https://blog.ncase.me/explorable-explanations)
- [CRAFT] Bartosz Ciechanowski: readers drag and rotate models while reading; articles build a mental model incrementally (e.g., cameras: from a simple photon bucket to pinhole to lens system). — [Status-Q](https://statusq.org/archives/2022/06/28/)

Tooling
- [CRAFT] Motion Canvas: TypeScript library using generators to script animations, with a real-time preview editor; has a Code node whose text can be replaced wholesale or by range as an animated transition (third-party description of API). — [Motion Canvas docs](https://motioncanvas.io/docs); [third-party skill page](https://skills.cat/skills/apoorvlathey/motion-canvas-skills)

### Inferences
- Shared pattern across 3Blue1Brown, Fireship and Ben Eater: one tightly scoped question per video, a motivating problem up front, and a build-up from a minimal concrete case. This aligns with segmenting, coherence and pre-production findings.
- Fireship's humour and fast pace are a deliberate trade against the seductive-details evidence; for a learning-focused generator, humour should be brief and on-topic.
- Unverified observation (no source found): CodeAesthetic videos appear to use a dark minimal palette, problem-first framing and token-level code morphing; treat as a hypothesis to check by watching, not as evidence.

### Gaps
- No primary interview/talk found for CodeAesthetic, Primer (Justin Helps), Josh W Comeau, or Bartosz Ciechanowski describing their methods.
- No reliable words-per-minute measurements of these channels found.
- Views/learning relationship for these channels is unmeasured.

## 6. Narrative structure: problem-first, concrete-first, conversational style, curiosity

### Takeaway
Problem-solving before instruction (productive failure) has a moderate meta-analytic advantage for conceptual learning in older learners; conversational ("you/we") wording has a small-to-medium benefit that may shrink in longer lessons and failed in at least one recent replication; creators independently prescribe "motivate in the first 30 seconds" and "concrete before abstract".

### Cited Findings
- [EMP] Sinha & Kapur 2021 (Review of Educational Research): 53 studies, 166 comparisons; problem solving before instruction beat instruction-first, g = 0.36 (CI 0.20-0.51), rising to g = 0.37-0.58 with high fidelity to productive-failure design; bias-corrected estimate g = 0.87; younger learners (grades 2-5) and domain-general skills favoured instruction first. — [x-mol listing](https://www.x-mol.com/paper/1406031499744456704)
- [EMP] A 2021 ETH working-paper meta-analysis (118 comparisons, 33 articles) was more conservative: problem-solving-first vs sensemaking alternatives non-significant (g = 0.22). — [ETH Research Collection](https://www.research-collection.ethz.ch/entities/publication/087241d3-ca0e-469e-a7f3-df9c122e2585)
- [EMP-2nd] Ginns, Martin & Marsh 2013 (Educational Psychology Review 25:445-472) personalization meta-analysis: medium positive effect on transfer, small on retention, lower perceived difficulty; effects weaker for longer treatments (over about 35 minutes). — [Almeida et al. 2024 citing paper](https://madoc.bib.uni-mannheim.de/67483/1/Computer%20Assisted%20Learning%20-%202024%20-%20Almeida%20-%20More%20personal%20but%20not%20better%20The%20personalization%20effect%20in%20learning%20neutral.pdf); [WSU record](https://researchers.westernsydney.edu.au/en/publications/designing-instructional-text-in-a-conversational-style-a-meta-ana/)
- [EMP] Almeida et al. 2024 (Journal of Computer Assisted Learning), titled "More personal but not better", reports the personalization effect did not improve learning for neutral content. — [Mannheim repository PDF](https://madoc.bib.uni-mannheim.de/67483/1/Computer%20Assisted%20Learning%20-%202024%20-%20Almeida%20-%20More%20personal%20but%20not%20better%20The%20personalization%20effect%20in%20learning%20neutral.pdf)
- [EMP] Noetel et al. 2022 list personalization among principles with robust positive effects. — [ACU Research Bank](https://acuresearchbank.acu.edu.au/item/8zqy4/multimedia-design-for-learning-an-overview-of-reviews-with-meta-meta-analysis)
- [CRAFT] Sanderson: motivate definitions so they feel discoverable ("invent it yourself"); concrete before abstract; SoME criteria demand motivation within 30 seconds and an "aha" moment. — [rosetta.to SoME summary](https://rosetta.to/u/3blue1brown/make-math-videos-summer-of-math-exposition-announcement); [SoME1 blog](https://www.3blue1brown.com/blog/some1)
- [CRAFT] Fireship names storytelling as a core ingredient. — [rosetta.to](https://rosetta.to/u/fireship/topic/interviews)
- [CRAFT] Nicky Case principle (third-party attribution): start with my question, end with their questions. — [skills.sh page](https://skills.sh/third774/dotfiles/explorable-explanations)
- [EMP] Guo et al.: Khan-style instructors seemed "on the same level" as the student rather than lecturing; personal, one-on-one feel tied to higher engagement. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)

### Inferences
- A code explainer can implement problem-first cheaply: open with a concrete failing scenario, bug, or question about the code ("where does this request go?"), let the viewer predict, then explain the design that resolves it.
- Use second-person, conversational narration by default, but do not expect large gains from wording alone.

### Gaps
- Curiosity-gap research (e.g., Loewenstein's information-gap theory) and the "Feynman technique" were not searched in primary form; no cited evidence here.
- No empirical study found on narrative arc (problem, tension, resolution) in programming videos specifically.

## 7. Accessibility and retention: captions, on-screen text redundancy, contrast

### Takeaway
Captions help comprehension and memory broadly (strongest evidence for second-language viewers), and they are an accessibility baseline; but large blocks of on-screen text that duplicate narration verbatim tend to impair learning in visual multimedia, whereas brief labels and keywords help. Visual contrast for text has a concrete standard (WCAG 4.5:1).

### Cited Findings
- [EMP] Gernsbacher 2015 (Policy Insights from the Behavioral and Brain Sciences) cites more than 100 empirical studies that captions improve comprehension of, attention to, and memory for video, especially for non-native speakers, reading learners, and deaf or hard-of-hearing viewers. — [Gernsbacher 2015 PDF](https://successforkidswithhearingloss.com/wp-content/uploads/2020/04/Video-Captions-Benefit-Everyone_2015.pdf)
- [EMP-2nd] Critique: many cited studies involve foreign-language captions, non-neurotypical learners or self-report; caution for complex, high-load material. — [Learning and the Brain blog](https://www.learningandthebrain.com/blog/video-captions-benefit-everyone-an-investigation/)
- [EMP] Noetel et al. 2022: captioning second-language videos had among the largest effects; Mayer et al. 2020 subtitle principle applies to L2 narration. — [ACU Research Bank](https://acuresearchbank.acu.edu.au/item/8zqy4/multimedia-design-for-learning-an-overview-of-reviews-with-meta-meta-analysis); [ECR Hub](https://ecrhub.org/publications/five-ways-increase-effectiveness-instructional-video)
- [EMP] Adesope & Nesbit 2012 (Journal of Educational Psychology 104:250-263): spoken-plus-written presentation beat spoken-only; spoken-plus-written did not differ from written-only overall. — [WSU record](https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/Verbal-Redundancy-in-Multimedia-Learning-Environments/99900601157101842)
- [EMP] Yue, Bjork & Bjork 2013: exact correspondence between on-screen text and narration generally impairs learning, while brief on-screen labels can help. — [Yue, Bjork & Bjork 2013 PDF](https://sites.lifesci.ucla.edu/psych-bjorklab/wp-content/uploads/sites/13/2016/07/YueBjorkBjork2013_redundancy.pdf)
- [EMP] Leahy & Sweller: long narrated passages are transient and can reverse the modality advantage (see section 3). — [Instructional Science 2016](https://doi.org/10.1007/s11251-015-9362-9)
- [EMP] WCAG 2.1 success criterion 1.4.3 requires a contrast ratio of at least 4.5:1 for normal text (3:1 for large text). — [W3C Understanding 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [EMP] Guo et al. measured speaking rate from time-coded subtitles available on all edX videos, showing captions also enable analytics such as wpm checks. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)

### Inferences
- Ship toggleable closed captions (sidecar file) always; keep burned-in on-screen text to short labels, identifiers and keywords, never full narration sentences.
- On a code screen, the code is the visual; narration should explain intent and behaviour, not read the code aloud token by token (reading would be verbatim redundancy).

### Gaps
- I did not retrieve the moderator showing whether Adesope & Nesbit's spoken-plus-written benefit disappears when pictures/animation are present; secondary claims to that effect were not verified.
- No study found on syntax-highlight colour schemes, font size for code in video, or captions over code regions.

## 8. Authoring rules for an automated code-explainer video generator (derived)

### Takeaway
Rules below are inferences from sections 1-7. Each rule names its strongest support; [EMP] rules rest on learning or engagement data, [CRAFT] rules on practitioner consensus only.

### Cited Findings
- Evidence anchors (see sections above): segment length and pre-production ([Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf)); segmenting ([Rey et al. 2019](https://is.mpg.de/publications/rey2018segmenting)); signaling ([Schneider et al. 2018 summary](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2018/12/CHU_KR-22_-Schneider_2017_Lernmaterial_Hervorhebungen.pdf)); seductive details ([ACU Inspire](https://inspire.acu.edu.au/articles/seductive-details)); animation moderators ([Berney & Bétrancourt](https://tecfa.unige.ch/perso/sandra/pdf/Earli2016_berney_betrancourt_FINAL.pdf); [Höffler & Leutner](https://www.leibniz-ipn.de/en/research/publications/instructional-animation-versus-static-pictures-a-meta-analysis)); animated transitions ([Heer & Robertson](https://idl.uw.edu/papers/animated-transitions)); engagement over viewing ([Hundhausen et al.](https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness)); voice ([Craig & Schroeder 2019](https://searchworks.jioinstitute.edu.in/articles/eric__EJ1225297); [Netland et al. 2025](https://x-mol.com/paper/1857628113137397760)); redundancy ([Yue, Bjork & Bjork 2013](https://sites.lifesci.ucla.edu/psych-bjorklab/wp-content/uploads/sites/13/2016/07/YueBjorkBjork2013_redundancy.pdf)); problem-first ([Sinha & Kapur 2021](https://www.x-mol.com/paper/1406031499744456704)); concrete-first and 30-second motivation ([SoME1](https://www.3blue1brown.com/blog/some1)).

### Inferences
- R1 [EMP] One question per video; each segment under about 6 minutes, total ideally under 10; split larger architecture tours into a playlist of short episodes. (Guo; Rey; Brame)
- R2 [EMP] Plan the script before rendering: an explicit outline of concepts and transitions is the generator's "pre-production" and was the largest perceived driver of engagement. (Guo)
- R3 [CRAFT+EMP] Open within the first 30 seconds with a concrete problem or question about the code (a request to trace, a bug, a design tension); optionally ask the viewer to predict before explaining. (SoME1; Sinha & Kapur; Naps "responding")
- R4 [CRAFT] Concrete before abstract: run one specific input through the code before naming the pattern or architecture. (Sanderson)
- R5 [EMP] Signal relentlessly: highlight the exact line/region/module being narrated at the moment it is mentioned; dim the rest. (Schneider; Alpizar; Guo motion-tracks-speech)
- R6 [EMP] Animate behaviour, not text: use animation for runtime state, data flow, call sequences and structural change; keep code itself mostly static as a persistent anchor, since animated formal notation gains least. (Berney & Bétrancourt; Höffler & Leutner representational; Tversky congruence)
- R7 [EMP] Code morphs/diffs: preserve object constancy (unchanged lines never move or flicker), stage complex edits (remove, then shift, then insert), avoid axis-like reflows of the whole file, never morph unrelated tokens into each other. (Heer & Robertson)
- R8 [EMP] Control transience: keep spoken chunks short between visual beats; insert brief holds after key reveals; avoid abrupt full-screen cuts; mark transitions with titles. (Ayres & Paas; Leahy & Sweller; Kim et al.)
- R9 [EMP] Cut seductive details: no unrelated stock footage, memes or background music under explanation; humour only if brief and on-topic. (Rey; Sundararajan & Adesope; Brame weeding)
- R10 [EMP] Add generative/"responding" beats: one or two pause-and-predict prompts per segment ("what prints?", "which service handles this?") followed by the reveal; end with a short summary prompt. (Hundhausen; Naps; Mayer et al. generative activity)
- R11 [EMP] Narration: modern neural TTS is acceptable; avoid robotic or "cute" personas; aim for energetic prosody and conversational second-person wording; remove filler and dead air. A default around 150-180 wpm is a reasonable inference (Guo found faster, enthusiastic speech more engaging up to 254 wpm when visuals carried the content; Sanderson warns against rushing dense material); slow down for dense code segments and rely on viewer speed controls. (Guo; Craig & Schroeder; Murphy; cute-voice study)
- R12 [EMP] No avatar/talking head by default; it adds cognitive load with at most a small retention gain. (Alemdag; Beege et al.; Fireship craft)
- R13 [EMP] Do not read code or on-screen text verbatim; on-screen words limited to short labels and identifiers; narration explains intent. (Yue, Bjork & Bjork; Mayer redundancy)
- R14 [EMP] Always emit closed captions (toggleable sidecar) and chapter markers for skimming and rewatching; ensure code text contrast of at least 4.5:1 and large enough type. (Gernsbacher; Guo tutorials; WCAG 1.4.3)
- R15 [EMP] Keep the visual style minimal and consistent (one palette, consistent positions for recurring elements) so changes are the salient signal. (Brame weeding; Heer landmarks; CodeAesthetic viewer reports, CRAFT)

### Gaps
- R6, R7 and R15 extrapolate from data-graphics and general animation research; no direct study of animated code-change explainers was found, so these should be A/B tested (e.g., comprehension quiz after static diff vs staged morph).
- The wpm default in R11 is an inference, not a measured optimum for code content.
