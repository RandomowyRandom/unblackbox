# Learning science of fast, durable understanding of complex abstract ideas (applied to short technical explainer videos)

Verification legend. Untagged bullets were checked this session against a fetched page or a search-index abstract/snippet at the linked URL. Bullets tagged [bg] come from my background knowledge of a well-known paper. Each has a DOI or citation, but I did not re-fetch its text this session, so check exact numbers before quoting them. Effect sizes are Cohen's d or Hedges' g unless noted. Lab effects from a single research group (especially Mayer's lab medians) run much larger than independent meta-analytic or field estimates. See Q8.

## Q1. Cognitive Load Theory: intrinsic/extraneous/germane load, element interactivity, worked examples, split-attention, redundancy, expertise reversal. What does it predict for explaining a complex system to a novice vs an experienced developer?

### Takeaway
CLT predicts that novices need high guidance: worked examples, integrated text and graphics, no redundant or decorative material, and short audio segments. These help most when the material has high element interactivity, which a software architecture explanation almost always has. For experienced developers the same supports become redundant and can hurt (expertise reversal), so they do better with less guidance, faster pacing, and problem-first or generation tasks. "Germane load" as a separate load type is contested. Treat it as "working memory spent on intrinsic content," not as a third additive quantity.

### Cited Findings
CLT framework and load types
- The canonical 20-year update is Sweller, van Merriënboer & Paas (2019), "Cognitive Architecture and Instructional Design: 20 Years Later," Educational Psychology Review 31(2):261–292. Its keywords are worked examples, split-attention, expertise and element interactivity. It reflects on the evolution of CLT since the 1998 paper. — [Maastricht repository](https://cris.maastrichtuniversity.nl/en/publications/cognitive-architecture-and-instructional-design-20years-later/); [index record](https://scinapse.io/papers/2913144876)
- [bg] Core CLT architecture: working memory is severely limited in capacity and duration for novel information but effectively unlimited for organized information retrieved from long-term memory. Schemas held in LTM function as single elements in WM. Most knowledge is acquired by "borrowing" from other people (the borrowing-and-reorganizing principle), and novel information is processed under the "narrow limits of change" principle. — [Sweller, van Merriënboer & Paas 2019](https://cris.maastrichtuniversity.nl/en/publications/cognitive-architecture-and-instructional-design-20years-later/)
- [bg] Origin: Sweller (1988) argued that means-ends problem solving imposes a heavy load that interferes with schema acquisition. This is the root of the worked-example effect. — [Sweller 1988, Cognitive Science, doi:10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4)
- Germane load debate: Kalyuga (2011) argued that "in its traditional treatment, germane load is essentially indistinguishable from intrinsic load," so the concept may be redundant. He proposed a dual intrinsic/extraneous typology, with intrinsic load defined relative to learning goals. Germane load could keep a role only if redefined as the WM resources devoted to dealing with intrinsic load. — [Kalyuga 2011, EPR, doi:10.1007/s10648-010-9150-7](https://link.springer.com/doi/10.1007/s10648-010-9150-7)
- de Jong (2010) criticized CLT's conceptual clarity and its measurement of the three load types. A Mayer commentary in the same issue notes the questions raised about "the clarity of the definitions and measures of intrinsic, extraneous, and germane cognitive load." — [de Jong 2010, Instructional Science](https://link.springer.com/article/10.1007/s11251-009-9113-x); [PDF](https://ris.utwente.nl/ws/files/6597420/Jong10cognitive.pdf)
- A 2020 confirmatory factor analysis (Jiang & Kalyuga, per search index) reported that load ratings support a two-factor (intrinsic/extraneous) model. — [TQMP 16(3):216](https://www.tqmp.org/RegularArticles/vol16-3/p216/p216.pdf)

Element interactivity, worked examples vs generation
- Chen, Kalyuga & Sweller (2015), J. Educational Psychology 107(3):689–704, argue that element interactivity reconciles the worked-example effect with the generation effect. "The worked example effect occurs for complex, high-element interactivity materials that impose a heavy working memory load whereas the generation effect is applicable for low-element" interactivity materials. Experiment 1 found a worked-example effect for high-interactivity materials and a generation effect for low-interactivity materials. — [Loughborough repository](https://repository.lboro.ac.uk/articles/journal_contribution/The_worked_example_effect_the_generation_effect_and_element_interactivity/12053721)
- Chen, Kalyuga & Sweller (2016), Learning and Instruction 45:20–30, tested high-school trigonometry. On an immediate test, high guidance (worked-example effect) helped novices, while more knowledgeable learners showed a generation effect. This is an expertise reversal within one study. — [Loughborough repository](https://repository.lboro.ac.uk/articles/journal_contribution/Relations_between_the_worked_example_and_generation_effects_on_immediate_and_delayed_tests/12052686)
- Barbieri et al. (2023), "A Meta-analysis of the Worked Examples Effect on Mathematics Performance," EPR 35, article 11. Using robust variance estimation, it found a medium effect, g = 0.48 (p = .01), from elementary to postsecondary. Adding self-explanation prompts to worked examples moderated the effect negatively compared with worked examples without prompts. Correct-only examples beat incorrect-only examples and correct+incorrect mixes. — [Springer PDF](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf); [Kent State record](https://oaks.kent.edu/hcri/meta-analysis-worked-examples-effect-mathematics-performance)
- [bg] Fading worked examples (backward fading: removing the last solution steps first, so learners gradually complete more) supports the transition from examples to problem solving. — [Renkl & Atkinson 2003, Educational Psychologist, doi:10.1207/S15326985EP3801_3](https://doi.org/10.1207/S15326985EP3801_3)
- [bg] Kirschner, Sweller & Clark (2006) argued that minimal-guidance instruction (discovery, problem-based, inquiry) is less effective and efficient for novices than guidance designed for human cognitive architecture. — [Kirschner, Sweller & Clark 2006, Educational Psychologist, doi:10.1207/s15326985ep4102_1](https://doi.org/10.1207/s15326985ep4102_1)

Expertise reversal
- Kalyuga, Ayres, Chandler & Sweller (2003), "The Expertise Reversal Effect," Educational Psychologist 38(1):23–31, is a narrative review, not a meta-analysis. It defines the effect as instructional techniques "that are highly effective with inexperienced learners can lose their effectiveness and even have negative consequences when used with more experienced learners." Later reviews include Kalyuga (2007, EPR) and Kalyuga, Rikers & Paas (2012, EPR). — [UOW record](https://ro.uow.edu.au/edupapers/136); [overview](https://en.wikipedia.org/wiki/Expertise_reversal_effect)
- I found no formal meta-analysis pooling expertise-reversal effects. — [search result summary of UOW/UNSW records](https://unsworks.unsw.edu.au/entities/publication/2222917b-75b2-411f-b259-8a79dff5a22f/full)

Split-attention, redundancy, modality, transient information
- [bg] Split-attention: when learners must mentally integrate physically or temporally separated sources (for example a diagram plus separate text), learning suffers relative to integrated formats. A meta-analysis (Schroeder & Cenkci 2018, EPR) reported roughly g = 0.63 for integrated formats. — [Schroeder & Cenkci 2018, doi:10.1007/s10648-018-9435-9](https://doi.org/10.1007/s10648-018-9435-9)
- [bg] Ginns (2006) meta-analysed spatial and temporal contiguity together and found medium-to-large benefits for integrated presentation. — [Ginns 2006, Learning and Instruction, doi:10.1016/j.learninstruc.2006.10.001](https://doi.org/10.1016/j.learninstruc.2006.10.001)
- [bg] Modality: Ginns (2005) meta-analysed 43 experiments and found d ≈ 0.72 for diagram+narration over diagram+on-screen text. Effects were larger for system-paced material and high element interactivity. — [Ginns 2005, Learning and Instruction, doi:10.1016/j.learninstruc.2005.07.001](https://doi.org/10.1016/j.learninstruc.2005.07.001)
- Transient information effect: Leahy & Sweller (2011), Applied Cognitive Psychology 25(6):943–951. Later work describes it as showing a modality effect for short explanatory text but a reverse modality effect for lengthy text. The proposed reason is that transitory auditory text was "too long to be processed easily in working memory compared to more permanent written information." A 2016 Instructional Science follow-up found that longer audio was inferior to equivalent longer visual text, and that the audio-visual advantage returned once auditory segments were made shorter still. Note that one abstract snippet also mentions "reinstatement of the modality effect," so check the exact pattern in the full text. — [Leahy & Sweller 2011 record](https://zendy.io/title/10.1002/acp.1787); [Macquarie record](https://researchers.mq.edu.au/en/publications/cognitive-load-theory-and-the-effects-of-transient-information-on/); [Leahy & Sweller 2016](https://doi.org/10.1007/s11251-015-9362-9)

### Inferences
- A codebase architecture explanation has very high element interactivity. A request path through controller, service, repository, cache and queue cannot be understood one element at a time. For a novice viewer CLT therefore predicts that the following beat discovery-style or "here's the whole diagram" presentations:
  - a worked walk-through of one concrete request through the system,
  - narration synchronized with a highlighted diagram or code (modality plus contiguity),
  - pre-trained component names,
  - removal of everything not on the critical path.
- For an experienced developer the same material has lower effective element interactivity, because existing schemas ("this is a CQRS read model," "standard middleware chain") chunk it. CLT and the Chen 2016 result predict that these viewers benefit more from a compressed overview, a quick contrast with patterns they know, or a prediction or generation prompt. Step-by-step narration of familiar parts is redundant for them and may actively hurt.
- Transient audio is the main CLT risk specific to video. Long narrated sentences about abstract relationships should be broken up, and key terms or relations should persist on screen as short labels. Under Mayer's redundancy principle, avoid full-sentence captions that duplicate the narration.
- The Barbieri moderator suggests caution about stacking self-explanation prompts on top of worked examples for novices in a fast medium. Prompts may add load rather than help. This conflicts somewhat with Bisra 2018 (Q5) and is unresolved.

### Gaps
- I found no meta-analysis of worked examples specifically in programming or software design. Barbieri 2023 covers mathematics only.
- I found no published meta-analytic estimate of the expertise reversal effect size.
- I found no experimental work testing CLT predictions specifically for software-architecture explanations, as opposed to procedures like trigonometry or app building.

## Q2. Schema formation and chunking: how experts chunk, and how instruction can hand learners ready-made chunks

### Takeaway
Working memory holds roughly 3 to 5 chunks (Cowan), not 7±2. Expertise largely consists of large, meaningful chunks and plans stored in long-term memory, which shrink the effective element count. In programming, experts chunk code by function and "plans," not by syntax, and their advantage disappears for scrambled or plan-violating code. Instruction can hand learners chunks directly by naming and labeling subgoals or components (subgoal labels, pre-training). This is one of the better-replicated interventions in computing education.

### Cited Findings
- [bg] Miller (1956) "The magical number seven, plus or minus two" introduced the idea that recoding into chunks increases effective capacity. — [Miller 1956, Psychological Review, doi:10.1037/h0043158](https://doi.org/10.1037/h0043158)
- Cowan (2001), Behavioral and Brain Sciences, argued that Miller's seven was a rough estimate and rhetorical device. When rehearsal and recoding into larger chunks are blocked, the core short-term memory capacity limit is about four chunks. Cowan links this limit to the focus of attention, and Miller's own emphasis was on chunking to increase effective storage. — [PubMed 11515286](https://pubmed.ncbi.nlm.nih.gov/11515286/); [full text PDF](https://memory.psych.missouri.edu/assets/doc/articles/2001/cowan-bbs-2001.pdf); [Cambridge](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/magical-number-4-in-shortterm-memory-a-reconsideration-of-mental-storage-capacity/44023F1147D4A1D44BDC0AD226838496)
- [bg] Chase & Simon (1973): chess masters reconstructed briefly shown game positions far better than weaker players, but the advantage largely vanished for random piece placements. Expertise is stored meaningful chunks, not superior raw memory. — [Chase & Simon 1973, Cognitive Psychology, doi:10.1016/0010-0285(73)90004-2](https://doi.org/10.1016/0010-0285(73)90004-2)
- McKeithen, Reitman, Rueter & Hirtle (1981), Cognitive Psychology 13(3):307–325. Expert programmers' chunks of key programming concepts are organized by programming function, while "beginner programmers' organizations show a rich variety of common-language associations to these programming concepts." Chunk structure was inferred from recall orders. Semantically complex programs are harder to encode and chunk. — [Deep Blue record](https://deepblue.lib.umich.edu/items/1d548813-cc8c-4d00-bc3b-ef1cbd11ed0d); [academia.edu copy](https://www.academia.edu/341973/Knowledge_Organization_and_Skill_Differences_In_Computer_Programmers_1)
- [bg] In McKeithen et al. (1981), experts recalled normal ALGOL programs much better than novices, but the expert advantage shrank sharply for scrambled programs. This replicates Chase & Simon for code. — [Deep Blue record](https://deepblue.lib.umich.edu/items/1d548813-cc8c-4d00-bc3b-ef1cbd11ed0d)
- Adelson (1981): experts recalled code in a functionally organized, hierarchical way, while novices organized it by syntax. This detail comes from a secondary summary table. — [secondary appendix](https://www.cs.unb.ca/~lbidlak1/ExtendedOnlineAppendix.pdf)
- Soloway & Ehrlich (1984), "Empirical Studies of Programming Knowledge," proposed that experts use (a) programming plans, "generic program fragments that represent stereotypic action sequences," and (b) rules of programming discourse governing how plans compose. Novices, intermediates and advanced programmers filled in blanked-out critical lines. — [O'Reilly reprint](https://www.oreilly.com/library/view/readings-in-artificial/9780934613125/xhtml/B9780934613125500422.xhtml)
- [bg] Soloway & Ehrlich also found that the expert advantage largely disappeared when programs violated discourse rules ("unplan-like" code). — [same reprint](https://www.oreilly.com/library/view/readings-in-artificial/9780934613125/xhtml/B9780934613125500422.xhtml)
- Subgoal labels (Margulieux, Catrambone, Guzdial):
  - The 2012 study applied subgoal-labeled worked examples to programming (App Inventor) for the first time and found better performance on novel app-building tasks. — [escholarship PDF](https://escholarship.org/content/qt170185bh/qt170185bh.pdf)
  - Margulieux & Catrambone (2016, Learning and Instruction) put labels in both expository text and worked examples, which led to better novel problem solving. Text labels helped learners articulate the procedure, example labels helped them apply it, and the effects were not simply additive. — [GSU ScholarWorks](https://scholarworks.gsu.edu/items/80aa2cc7-cce3-4d9f-8b7c-c6e21bd3cb58); [BL record](https://eld.bl.uk/catalog/100031120336_0x000001)
  - A 2015 paper found that labeled worked examples worked about equally well across domains, while labeled procedural instructions mattered most for more complex procedures. — [escholarship PDF](https://escholarship.org/content/qt1d80v8hm/qt1d80v8hm.pdf?t=op9xqa)
  - Margulieux, Morrison & Decker (2019) built subgoal-labeled worked examples for five CS1 concepts, using cognitive task analysis to identify the subgoals. — [NSF PAR](https://par.nsf.gov/servlets/purl/10171487)
- [bg] Schema induction: Gick & Holyoak (1983) found that comparing two analogous stories led learners to induce an abstract schema that transferred. One story rarely did. — [Gick & Holyoak 1983, Cognitive Psychology, doi:10.1016/0010-0285(83)90002-6](https://doi.org/10.1016/0010-0285(83)90002-6)

### Inferences
- An explainer can hand viewers expert-style chunks by naming a small number of functional components (about 3 to 5 at any level of the diagram) and labeling them by role, not by file or class name. Examples: "the thing that decides who you are," "the thing that remembers results." A subgoal-style label at each step ("1. authenticate, 2. load state, 3. apply change, 4. persist, 5. notify") mirrors the Margulieux results.
- The McKeithen finding that novices cluster by everyday-language associations suggests that novices will misgroup concepts by surface names. "Handler" and "controller" sound similar, so novices may see them as the same thing. Explicit functional grouping and contrast are needed.
- Hierarchical chunking makes a system at a 4-chunk limit communicable: show 4 boxes, zoom into one and show its 3 to 4 internals, then zoom back out. Showing 12 boxes at once does not fit the limit.
- Expert advantage depends on code being "plan-like." So for experts the fastest explanation names the known pattern ("this is a standard outbox pattern, except...") and spends its time on the deviations.

### Gaps
- I found no direct study measuring how quickly named-chunk or subgoal pre-training transfers to understanding an unfamiliar codebase's architecture, as opposed to writing small programs.
- I did not retrieve effect sizes for subgoal-label studies. The summaries above are directional.

## Q3. Dual coding (Paivio) and Mayer's Cognitive Theory of Multimedia Learning: every principle, with typical effect sizes and boundary conditions

### Takeaway
Mayer's CTML assumes dual channels (verbal and pictorial), limited capacity, and active processing (select, organize, integrate). It sorts design principles into those that reduce extraneous processing, manage essential processing, and foster generative processing. Mayer's own median effect sizes are large (d ≈ 0.4 to 1.7). Independent meta-analyses are consistently smaller (g ≈ 0.3 to 0.6). Most principles are strongest for low-prior-knowledge learners, complex material and fast system-paced presentation, which is exactly the "novice watching a narrated code video" case. Several weaken or reverse for experts.

### Cited Findings
Theory
- [bg] Dual coding theory (Paivio): verbal and nonverbal (imagery) systems are separate but interconnected, and referentially connected dual codes improve recall. Clark & Paivio (1991) summarized its educational implications. — [Clark & Paivio 1991, EPR, doi:10.1007/BF01320076](https://doi.org/10.1007/BF01320076)
- [bg] CTML assumptions: dual channels, limited capacity, and active processing (selecting relevant words and images, organizing each into a coherent verbal and a coherent pictorial model, and integrating them with each other and prior knowledge). Three processing demands follow: extraneous (caused by poor design, to be reduced), essential (caused by inherent complexity, to be managed), and generative (making sense, to be fostered). — [Mayer 2024, "The Past, Present, and Future of the Cognitive Theory of Multimedia Learning," EPR, doi:10.1007/s10648-023-09842-1](https://link.springer.com/article/10.1007/s10648-023-09842-1)
- In his 2024 reflection Mayer called for research identifying boundary conditions (moderators) of the design principles. — [NSF PAR meta-analysis abstract referencing it](https://par.nsf.gov/biblio/10637927)

Principle list with Mayer's median effect sizes (Mayer 2017, "Using multimedia for e-learning," J. Computer Assisted Learning, doi:10.1111/jcal.12197). The numbers are medians across Mayer-lab experimental comparisons. — [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/jcal.12197); [index page with values](https://synapsesocial.com/papers/W2625051696)

Reduce extraneous processing
- Coherence: exclude extraneous words, pictures, sounds and music. Mayer 2017 median d = 0.70. The Cambridge Handbook chapter (Mayer & Fiorella) reports support in 23 of 23 tests with median d = 0.86. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696); [Cambridge Handbook ch. 12](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/CD5B7AE1279A9AB81F8EEBB53DBEC86E)
- Signaling (cueing): highlight essential material and its organization (headings, arrows, highlighting, spoken emphasis). Mayer 2017 median d = 0.46. Independent meta-analysis, Schneider, Beege, Nebel & Rey (2018), Educational Research Review 23:1–24: g = 0.53 for retention (139 comparisons) and g = 0.33 for transfer (70 comparisons). — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696); [QIC-WD umbrella summary citing Schneider et al. 2018](https://www.qic-wd.org/sites/default/files/Umbrella%20Summary%20-%20Signaling%20in%20Training%20111021.pdf)
  - Boundary: Richter, Scheiter & Eitel (2016) found signaling effects on transfer/comprehension moderated by prior knowledge, favoring low-prior-knowledge learners. Other reviews call the prior-knowledge results inconsistent across meta-analyses. — [QIC-WD summary](https://qic-wd.org/node/672)
  - A search snippet attributed "22 of 22 tests, d = 1.10" to signaling in the Cambridge chapter. That conflicts with my background knowledge, under which those numbers belong to spatial contiguity, so I treat it as unreliable. — [Cambridge Handbook ch. 12](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/CD5B7AE1279A9AB81F8EEBB53DBEC86E)
- Redundancy: graphics + narration beats graphics + narration + identical on-screen printed text. Mayer 2017 median d = 0.87. A systematic review cites Mayer as reporting 13 of 13 supporting studies. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696); [Smart Learning Environments 2022 systematic review](https://link.springer.com/article/10.1186/s40561-022-00200-2)
  - [bg] Boundary conditions Mayer lists: the effect weakens or reverses when on-screen text is short key words placed next to the relevant graphic, when there are no graphics, when the pace is slow or learner-controlled, or for non-native-language learners. — [Mayer 2024](https://link.springer.com/article/10.1007/s10648-023-09842-1)
- Spatial contiguity: place words near the corresponding parts of graphics. Mayer 2017 median d = 0.79. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696)
- Temporal contiguity: present narration simultaneously with the corresponding animation, not before or after. Mayer 2017 median d = 1.30. The Cambridge chapter reports support in 9 of 9 tests with median d = 1.22. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696); [Cambridge Handbook ch. 12](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/CD5B7AE1279A9AB81F8EEBB53DBEC86E)

Manage essential processing (covered in the Mayer & Pilegard chapter on segmenting, pre-training and modality) — [Mayer & Pilegard chapter](https://nowcomment.com/documents/246702)
- Segmenting: present a complex lesson in learner-paced segments rather than as a continuous unit. Mayer 2017 median d = 0.70. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696)
  - Independent meta-analysis, Rey et al. (2019), EPR 31(2):389–419: 56 investigations and 88 pairwise comparisons, with small-to-medium effects on retention and transfer. The effects were confirmed for system-paced segmentation as well. — [MPI record](https://is.tuebingen.mpg.de/publications/rey2018segmenting)
  - Surprising moderator: high-prior-knowledge learners benefited more on retention. Proposed mechanisms are that pauses reduce load and that segmentation itself cues the underlying structure. Segmentation also reduced overall cognitive load and increased learning time. — [MPI record](https://is.tuebingen.mpg.de/publications/rey2018segmenting); [scinapse record](https://www.scinapse.io/papers/2906980130)
- Pre-training: give learners the names and characteristics of key concepts before the main lesson. Mayer 2017 median d = 0.46. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696)
- Modality: graphics + spoken words beat graphics + printed words. Mayer 2017 median d = 0.72. A 2022 systematic review found modality the most studied principle in the literature, followed by redundancy, multimedia, signaling and coherence. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696); [Smart Learning Environments 2022](https://link.springer.com/article/10.1186/s40561-022-00200-2)
  - Boundary: the modality effect reverses for long verbal segments (the transient information effect). — [Leahy & Sweller 2011 record](https://zendy.io/title/10.1002/acp.1787)

Foster generative processing
- Multimedia: words + pictures beat words alone. Mayer 2017 median d = 1.67, based on only 5 comparisons. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696)
- Personalization: conversational style (first and second person) beats formal style. Mayer 2017 median d = 0.79. Mayer's 2021 video paper places personalization under "Principles for Fostering Generative Processing." — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696); [Learning Scientists summary of Mayer 2021](https://www.learningscientists.org/blog/2021/7/1-1)
  - [bg] Independent meta-analysis: Ginns, Martin & Marsh (2013, EPR) found smaller effects than Mayer's medians, with personalization helping transfer more than retention and the benefit shrinking with longer lessons. — [doi:10.1007/s10648-013-9228-0](https://doi.org/10.1007/s10648-013-9228-0)
- Voice: narration in a human voice beats a machine voice. Mayer 2017 median d = 0.74. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696)
  - [bg] Boundary: Craig & Schroeder (2017) found a modern text-to-speech engine produced learning comparable to a recorded human voice. The classic voice effect was largely established with old robotic TTS. — [Craig & Schroeder 2017, Computers & Education, doi:10.1016/j.compedu.2017.07.003](https://doi.org/10.1016/j.compedu.2017.07.003)
- Embodiment: on-screen agents or instructors who use humanlike gesture, gaze and movement. Mayer 2017 median d = 0.36. — [Mayer 2017 index](https://synapsesocial.com/papers/W2625051696)
- Image: [bg] adding a static image of the speaker on screen does not reliably improve learning. Mayer reports small or inconsistent effects. — [Mayer 2024](https://link.springer.com/article/10.1007/s10648-023-09842-1)
- Mayer's 2021 JARMAC article "Evidence-Based Principles for How to Design Effective Instructional Videos" (doi:10.1016/j.jarmac.2021.03.007) groups video principles by processing demand. Secondary sources count 14 or 15 principles. — [x-mol record](https://www.x-mol.com/paper/1388220828299059200); [Learning Scientists summary](https://www.learningscientists.org/blog/2021/7/1-1)
- Video-specific principles from a Mayer & Fiorella paper (described in a search summary; most likely Mayer, Fiorella & Stull 2020, ETR&D):
  - dynamic drawing: the instructor draws while explaining,
  - gaze guidance: the instructor looks at the board or diagram being referenced,
  - generative activity: learners summarize or explain,
  - perspective: first-person view of the demonstration,
  - subtitles: for second-language learners,
  - one "how not to" principle: avoid seductive details.
  — [Learning Scientists summary](https://www.learningscientists.org/blog/2021/7/1-1); [bg] [Mayer, Fiorella & Stull 2020, doi:10.1007/s11423-020-09749-6](https://doi.org/10.1007/s11423-020-09749-6)

Independent and recent syntheses
- A meta-analysis of Mayer's research corpus (NSF PAR record, apparently Cromley and colleagues, about 2025) analysed 591 effects with nine moderators, including principle, multimedia type, age and domain. — [NSF PAR biblio 10637927](https://par.nsf.gov/biblio/10637927)
  - The largest significant effects came from removing seductive details, modality, personalization, multimedia, sentence-level coherence and self-explanation. Testing, scaffolding, cueing and embodiment produced medium effects. Text + diagrams gave large, consistent effects across outcome types.
  - A snippet reports an overall multilevel g = 0.37 with a small decline per year. I could not confirm it belongs to the same paper.
- Noetel et al. (2021), "Video Improves Learning in Higher Education: A Systematic Review," Review of Educational Research 91(2):204–236, pooled 105 randomized trials with 7,776 students. Replacing existing teaching with video gave g = 0.28. Adding video to existing teaching gave g = 0.80. The authors caution about experimental and publication bias but conclude video is unlikely to hurt and usually helps. — [AERA release](https://www.aera.net/Newsroom/Video-Improves-Learning-in-Higher-Education-A-Systematic-Review)
- Guo, Kim & Rubin (2014), "How Video Production Affects Student Engagement" (ACM Learning@Scale), analysed 862 videos from 4 edX courses (Fall 2012).
  - It recommends segmenting videos into chunks shorter than 6 minutes, because engagement dropped beyond that.
  - Faster, enthusiastic speakers kept students watching longer.
  - Khan-style hand-drawn tablet tutorials were more engaging than slides or code screencasts.
  - These are engagement (watch-time) measures, not learning outcomes. — [author PDF](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf?_blank); [Rochester copy](https://www.cs.rochester.edu/hci/pubs/pdfs/edX-MOOC-video-production-and-engagement_LAS-2014.pdf)

### Inferences
- For narrated code or architecture video, the highest-leverage principles by evidence and fit are:
  - temporal and spatial contiguity: say it exactly when and where it is highlighted on the diagram or code line,
  - signaling: cursor, highlight and zoom on the line or box being discussed,
  - coherence: no background music, decorative B-roll, or jokes and anecdotes unrelated to the concept,
  - segmenting: short chapters with pauses,
  - pre-training: introduce component names before the flow.
- Showing code as an image while narrating its meaning is modality-consistent. Displaying long prose paragraphs while also narrating them is redundancy-inconsistent. Short labels next to diagram parts are fine and are in fact a redundancy boundary condition.
- Guo's "drawing beats slides and code" finding, together with the dynamic-drawing principle, suggests that diagrams built up progressively (boxes and arrows appearing as narrated) should beat a fully rendered static architecture diagram.
- A high-quality modern TTS voice is likely acceptable for learning (Craig & Schroeder 2017, bg), but conversational, second-person scripting probably still matters (personalization).
- Expect real-world benefits nearer g ≈ 0.3 to 0.5 than Mayer's lab medians. Effects are likely larger for novices than for experienced developers.

### Gaps
- I could not retrieve Mayer's 2020 Multimedia Learning (3rd ed.) table of principles. It updates counts and medians (for example, more multimedia-principle comparisons than the 5 in Mayer 2017), so I cannot report those updated values. The 2017 and Cambridge-chapter numbers conflict for coherence and temporal contiguity, and possibly signaling.
- I found no verified median d for the image principle.
- I found no studies applying CTML principles specifically to code-walkthrough or architecture videos with learning (not engagement) outcomes.

## Q4. Analogy and conceptual change (Gentner), concreteness fading (Fyfe et al.), contrasting cases (Schwartz & Bransford), productive failure, and "what problem does this solve" framing: which accelerate abstract understanding?

### Takeaway
The best-supported accelerators of abstract understanding are:
- comparing two or more cases that share deep structure (case-comparison meta-analysis d = 0.50), with the principle stated after the comparison,
- problem-first sequences that end with explicit instruction (productive failure g = 0.36, larger at high fidelity, reversed for young children and domain-general skills).

Concreteness fading has good theory and supportive primary studies but no pooled effect size and some generalization doubts. A single analogy rarely transfers spontaneously. It works when its relational structure is made explicit, ideally with two analogs or visible source-target alignment. I found no experimental literature under the name "what problem does this solve" framing. Its closest tested relatives are productive failure, prequestions and "a time for telling."

### Cited Findings
Analogy and structure mapping
- [bg] Gentner's structure-mapping theory: an analogy maps relational structure (systems of relations), not object attributes, and learners prefer systematic, interconnected relational mappings. — [Gentner 1983, Cognitive Science, doi:10.1207/s15516709cog0702_3](https://doi.org/10.1207/s15516709cog0702_3)
- [bg] Gick & Holyoak (1980): participants given an analogous story ("fortress") rarely applied it spontaneously to Duncker's radiation problem, but most did when told the story was relevant. Spontaneous analogical transfer is weak. — [Gick & Holyoak 1980, Cognitive Psychology, doi:10.1016/0010-0285(80)90013-4](https://doi.org/10.1016/0010-0285(80)90013-4)
- [bg] Richland, Zur & Holyoak (2007, Science) found that teachers in higher-achieving regions (Hong Kong, Japan) gave more cognitive supports for analogies than US teachers. These included visually presenting source and target together, using gestures that move between them, and using a familiar source. — [doi:10.1126/science.1142103](https://doi.org/10.1126/science.1142103)

Case comparison and contrasting cases
- Alfieri, Nokes-Malach & Schunn (2013), "Learning Through Case Comparisons: A Meta-Analytic Review," Educational Psychologist 48(2):87–113. Across 57 experiments and 336 tests, case comparisons outperformed traditional methods with d = .50, with significant heterogeneity. — [author PDF](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)
  - Of 15 candidate moderators, four mattered: comparison objective, whether a principle was presented, content type, and test lag.
  - Finding only similarities beat finding similarities and differences.
  - Providing the principle after the comparison worked better.
  - Effects were stronger for perceptual content and for immediate tests.
- [bg] Schwartz & Bransford (1998), "A Time for Telling," Cognition and Instruction 16(4):475–522. Students who analyzed contrasting cases and then heard a lecture outperformed students who summarized a text before the lecture, and students who analyzed cases without a lecture, on later prediction tasks. Differentiating cases first creates the "readiness" that makes later telling effective. — [doi:10.1207/s1532690xci1604_4](https://doi.org/10.1207/s1532690xci1604_4)

Concreteness fading
- Fyfe, McNeil, Son & Goldstone (2014), "Concreteness fading in mathematics and science instruction: A systematic review," EPR 26:9–25. Instruction starts with concrete instantiations and progressively moves toward abstract representations. Claimed benefits include helping learners interpret opaque abstract symbols in terms of well-understood concrete objects. — [Indiana PCL page](https://pc.cogs.indiana.edu/?p=885); [Springer commentary in same issue](https://link.springer.com/content/pdf/10.1007/s10648-014-9259-1.pdf)
- McNeil & Fyfe (2012) found that the fading condition gave the best transfer. — [PDF](https://pcl.sitehost.iu.edu/rgoldsto/courses/cogscilearning/McNeilFyfe12.pdf)
- Fyfe, McNeil & Borjas (2015) found better transfer for concreteness fading than for the other conditions in all three experiments. — [BL record](https://eld.bl.uk/catalog/100044912843_0x000001)
- Contrary evidence: an elementary-science study found the concrete-only condition did at least as well as fading on transfer. Kokkonen & Schalk report concreteness fading "may not be as generalizable as has been suggested." — [Turku repository](https://www.utupub.fi/items/101ac9b4-f708-4def-816a-78827b0fc696/full)
- I found no meta-analytic pooled effect size for concreteness fading. — [search result summary](https://world-wide.org/topic/experimental-study)
- [bg] Counterpoint: Kaminski, Sloutsky & Heckler (2008, Science) found that undergraduates who learned a mathematical concept through a generic, abstract instantiation transferred better than those who learned through concrete, contextualized instantiations. Concreteness without fading can trap knowledge in its surface. — [doi:10.1126/science.1154659](https://doi.org/10.1126/science.1154659)

Productive failure (problem solving before instruction, PS-I)
- Sinha & Kapur (2021), "When Problem Solving Followed by Instruction Works: Evidence for Productive Failure," Review of Educational Research, doi:10.3102/00346543211019105. Across 53 studies and 166 comparisons, PS-I beat instruction-first with g = 0.36 (95% CI 0.20–0.51). — [x-mol record](https://www.x-mol.com/paper/1406031499744456704); [OUCI record](https://ouci.dntb.gov.ua/works/4KnMgZq7)
  - High fidelity to productive failure principles gave g = 0.37–0.58.
  - The publication-bias-adjusted estimate was g = 0.87, which is an adjusted figure and not the headline result.
  - For second to fifth graders and for domain-general skills, effects favored instruction-first.
  - A 2019 review of 12 articles had found g = 0.43.
- [bg] Kapur (2008), Cognition and Instruction, is the original productive failure study. Students who struggled with ill-structured problems before instruction showed better later transfer. — [doi:10.1080/07370000802212669](https://doi.org/10.1080/07370000802212669)
- The tension with CLT is real. Kirschner et al. (2006) and Chen et al. (2015) predict that unguided problem solving on high-element-interactivity material hurts novices. Productive failure designs differ because the problem phase is followed by full instruction that builds on students' attempts. — [Kirschner et al. 2006 (bg)](https://doi.org/10.1207/s15326985ep4102_1); [Chen et al. 2015](https://repository.lboro.ac.uk/articles/journal_contribution/The_worked_example_effect_the_generation_effect_and_element_interactivity/12053721)

"What problem does this solve" and prequestion framing
- In Carpenter & Toftness (2017, JARMAC), students who answered two prequestions before each segment of a short three-segment video retained more information in general, not only the prequestioned items. The authors argue video is well suited to prequestions because viewers cannot easily skim ahead for answers. — [BPS Research Digest](https://bps.org.uk/research-digest/heres-simple-way-boost-your-learning-videos-prequestion); [Learning Scientists](https://www.learningscientists.org/blog/2017/11/2-1)
- Toftness, Carpenter, Lauber & Mickes (2018), "The Limited Effects of Prequestions on Learning from Authentic Lecture Videos," found weaker benefits with longer, more complex real lectures. The original video was about 2 minutes with simple prequestions. — [Royal Holloway record](https://pure.royalholloway.ac.uk/en/publications/the-limited-effects-of-prequestions-on-learning-from-authentic-le/); [PDF](https://pure.royalholloway.ac.uk/files/30437641/JARMAC_Toftness_et_al.pdf)

### Inferences
- For explaining an abstraction such as "dependency injection," "event sourcing" or "this module's plugin system," the evidence supports a sequence:
  1. Show the problem concretely. Show the pain or the failure case, for example tight coupling breaking a test.
  2. Optionally pose a "how would you solve this?" pause.
  3. Show two contrasting concrete implementations (with and without the pattern, or two different services using the same pattern).
  4. Name the abstract principle only after the comparison.
  5. Fade to a generic schematic diagram.
  Each step maps to one of the findings above: productive failure and prequestions (steps 1 to 2), case comparison (step 3), "principle after comparison" (step 4), and concreteness fading (step 5).
- Analogies to non-software domains ("a message queue is like a post office") need explicit relational alignment. Show the source and target side by side and map the relations ("sender doesn't wait for recipient" ↔ "producer doesn't block on consumer"). Say where the analogy breaks, because analogies imported without mapping transfer surface features and seed misconceptions. Two analogs beat one for schema induction (Gick & Holyoak 1983, bg).
- The Alfieri moderator ("finding similarities" > "similarities and differences") suggests that when the goal is to teach a shared abstraction, the comparison should be framed around what is common. Contrasts are better for discrimination ("when to use A vs B"), which is the interleaving logic in Q5.
- For young or very novice learners, problem-first may backfire (the Sinha & Kapur moderator). For adult developers it is likely to help, provided the "failure" phase is short and is followed by full explanation.

### Gaps
- I found no meta-analysis of concreteness fading and no effect size for analogy-based instruction in software or computing.
- I found no direct experiment testing "motivate with the problem first" framing (as opposed to productive failure or prequestions) in short videos.
- I did not retrieve the 2023–2026 prequestion and pretesting reviews (for example Pan & Carpenter 2023 in EPR), so I cannot quote their pooled effect sizes. A search snippet called the pretesting benefit "small to medium." — [Learning Scientists](https://www.learningscientists.org/blog/2017/11/2-1)

## Q5. Desirable difficulties: retrieval practice, generation, spacing, interleaving, self-explanation (Chi). Which can be embedded in passive media such as video?

### Takeaway
Retrieval practice and spacing are the most robust learning techniques known (Dunlosky "high utility"; retrieval g ≈ 0.5 to 0.6). Self-explanation, interleaving and elaborative interrogation are "moderate." Inside a single 2 to 10 minute video, the techniques that can realistically be embedded are:
- interpolated retrieval questions between segments,
- prequestions or predict-before-reveal pauses,
- self-explanation prompts ("pause and explain why this needs a lock"),
- interleaved contrast of confusable patterns.

Spacing needs a series or a follow-up. In-video quiz effects on attention and learning are positive but smaller and less consistent than the classic lab results.

### Cited Findings
- Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), Psychological Science in the Public Interest 14(1):4–58, rated ten techniques:
  - high utility: practice testing and distributed practice,
  - moderate: interleaved practice, elaborative interrogation, self-explanation,
  - low: summarization, highlighting/underlining, rereading (among others).
  The techniques benefit learners who are motivated and capable of using them. — [APS press release](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html); [summary table](https://texasldcenter.org/?p=346)
- Retrieval practice meta-analyses. Figures come from secondary summaries and the study counts differ across sources. — [bg DOI Rowland 2014, Psychological Bulletin 140(6):1432–1463](https://doi.org/10.1037/a0037559); [bg DOI Adesope et al. 2017, Review of Educational Research 87(3):659–701](https://doi.org/10.3102/0034654316689306); [secondary summary](https://studycardsai.com/blog/active-recall-statistics)
  - Rowland (2014) found an average testing effect vs restudy of g = 0.50 across 159 effect sizes from 61 studies. Final tests at 1 day or later showed g = 0.69, vs g = 0.41 for same-day tests.
  - Adesope, Trevisan & Sundararajan (2017) reported a pooled g = 0.61 across 272 effect sizes and 118 articles. Classroom studies (g = 0.67) were similar to laboratory studies (g = 0.62).
- Chan, Meissner & Davis (2018), "Retrieval potentiates new learning," Psychological Bulletin 144:1111–1146. Testing earlier material reliably potentiates learning of new material (the forward testing effect), increasing correct recall and reducing intrusions. Meta-regression favored an integration account. Testing too frequently can impair new learning. A 2020 erratum corrected mis-assigned effect sizes. — [UNF record](https://scholars.unf.edu/en/publications/retrieval-potentiates-new-learning-a-theoretical-and-meta-analyti/); [Pastötter & Bäuml review of forward testing effect](https://www.uni-trier.de/fileadmin/fb1/prof/PSY/AKP/Sekretariat/Paper/The_forward_Testing_Effect.pdf)
- Szpunar, Khan & Schacter (2013, PNAS) used a 21-minute video lecture. Interpolating brief memory tests between segments reduced mind wandering and improved learning. — [PMC3631699](https://pmc.ncbi.nlm.nih.gov/articles/PMC3631699/)
  - [bg] Tested participants also took more notes and reported less anxiety about the final test.
- A 2022 replication (Welhaf et al., per search summary) found interpolated testing reduced task-unrelated thought only with a small effect, without Bayes-factor support, and with no learning benefit. The authors suggested limited utility for supporting attention. — [PubMed 35348931](https://www.pubmed.gov/35348931/); [Schacter lab review PDF](https://sites.harvard.edu/schacter-memory/files/2022/09/stl-0000011.pdf)
- Prequestions in video: Carpenter & Toftness (2017) found a positive effect in about 2 minutes of segmented video. Toftness et al. (2018) found limited effects in authentic lectures. — [BPS](https://bps.org.uk/research-digest/heres-simple-way-boost-your-learning-videos-prequestion); [Royal Holloway](https://pure.royalholloway.ac.uk/en/publications/the-limited-effects-of-prequestions-on-learning-from-authentic-le/)
- Interleaving: Brunmair & Richter (2019), "Similarity Matters: A Meta-Analysis of Interleaved Learning and Its Moderators," Psychological Bulletin 145(11):1029–1052. It covered 59 studies, 238 effect sizes and 158 samples, with a moderate overall effect (g ≈ 0.42 per a secondary review). The authors advise caution for expository texts and words, and found only a small benefit for mathematical tasks. — [PubMed 31556629](https://pubmed.ncbi.nlm.nih.gov/31556629/); [author manuscript](https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf)
  - [bg] The title result is that interleaving helps most when categories are highly similar and must be discriminated. — [same](https://pubmed.ncbi.nlm.nih.gov/31556629/)
- [bg] Spacing:
  - Cepeda et al. (2006) meta-analysed distributed practice in verbal recall and confirmed robust spacing benefits. [doi:10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354)
  - Cepeda et al. (2008) found the optimal gap grows with the retention interval, at roughly 10 to 20% of the desired retention interval. [doi:10.1111/j.1467-9280.2008.02209.x](https://doi.org/10.1111/j.1467-9280.2008.02209.x)
- Self-explanation: Bisra, Liu, Nesbit, Salimi & Winne (2018), "Inducing Self-Explanation: a Meta-Analysis," EPR 30(3):703–725, covered 64 studies and about 6,000 participants. Self-explanation is defined as generating inferences about causal connections or conceptual relationships. Benefits appeared in most school subjects studied, for both conceptual and procedural knowledge. The authors recommend research on computer-generated prompts. — [BPS Research Digest](https://bps.org.uk/research-digest/self-explanation-powerful-learning-technique-according-meta-analysis-64-studies); [TUM Clearinghouse review](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/CHU-KR-25_ENG_Bisra_2018_Selbsterklaerungen.pdf)
  - [bg] The overall effect was g ≈ 0.55.
- [bg] Chi et al. (1989): physics students who generated more self-explanations while studying worked examples learned more. Chi et al. (1994): prompting 8th graders to self-explain each line of a text on the circulatory system improved understanding and mental-model accuracy. — [Chi et al. 1989, doi:10.1207/s15516709cog1302_1](https://doi.org/10.1207/s15516709cog1302_1); [Chi et al. 1994, doi:10.1207/s15516709cog1803_3](https://doi.org/10.1207/s15516709cog1803_3)
- [bg] Generation effect: Bertsch et al. (2007) meta-analysed generation vs reading and found d ≈ 0.40, with larger effects at longer delays. — [doi:10.3758/BF03193441](https://doi.org/10.3758/BF03193441)
  - Boundary: generation helps for low-element-interactivity material but not for high, where worked examples win. — [Chen et al. 2015](https://repository.lboro.ac.uk/articles/journal_contribution/The_worked_example_effect_the_generation_effect_and_element_interactivity/12053721)
- [bg] Fiorella & Mayer (2016) reviewed eight generative learning strategies: summarizing, mapping, drawing, imagining, self-testing, self-explaining, teaching and enacting. — [doi:10.1007/s10648-015-9348-9](https://doi.org/10.1007/s10648-015-9348-9)
- Mayer's video principles include "generative activity," meaning learners summarize or explain during or after the video. — [Learning Scientists](https://www.learningscientists.org/blog/2021/7/1-1)

### Inferences
Embeddable in a single short video, ordered by expected value:
1. A segment-boundary retrieval question ("Before we go on: which component owns the retry logic?"). This combines segmenting with interpolated testing. Keep it brief and infrequent, since Chan 2018 warns about over-frequent interruption.
2. A predict-before-reveal pause ("What happens if two requests hit this at once? Pause and predict"). This is a prequestion or generation prompt and suits low-element-interactivity sub-questions.
3. A self-explanation prompt after a worked trace ("Why did we need the idempotency key here?").
4. Interleaved contrast between confusable patterns (queue vs pub/sub, cache-aside vs write-through), which suits discrimination goals.
5. A closing "explain it back" summary prompt.

Spacing cannot happen within one video. It needs a series design: brief recap questions at the start of the next video, or a follow-up quiz a day or more later.

Because pause prompts in passive video depend on viewers actually pausing, a generator should give a visible countdown or explicit pause point and then reveal the answer. Retrieval with feedback is the strongest form of practice testing.

For novices on high-interactivity content, prefer worked trace first and generation second. Do not open with a hard generation task on the full system.

### Gaps
- I found no meta-analysis specifically of in-video (interpolated) questions on learning outcomes. Evidence consists of individual studies and narrative reviews with mixed replications.
- I did not verify whether self-paced viewers actually pause at "pause and predict" prompts, or how large the benefit is when they do not pause.
- Bjork's "desirable difficulties" framework (Bjork 1994) and the Bjork & Bjork papers were not retrieved this session.

## Q6. Mental models (Johnson-Laird, Gentner & Stevens) and the "curse of knowledge": how explainers can model what learners do not yet know

### Takeaway
Understanding a system means building a runnable mental model: entities, their states, and causal or relational rules that support prediction. Experts systematically underestimate what novices lack (the curse of knowledge or curse of expertise). Simply asking experts to remember being novices does not reliably debias them. Practical debiasing has to be structural: test the explanation on real novices, use cognitive task analysis to recover tacit steps, and explicitly anticipate known novice misconceptions.

### Cited Findings
- Hinds (1999), "The curse of expertise: The effects of expertise and debiasing methods on prediction of novice performance," J. Experimental Psychology: Applied 5(2):205–221, doi:10.1037/1076-898X.5.2.205. Cell-phone experts, intermediates and novices predicted how long novices would take to learn phone tasks. Experts were the most inaccurate, underestimating novice time. Debiasing methods, including recalling one's own early learning, did not reliably remove the bias. A secondary claim that experts "lowballed by roughly half" is unverified. — [notes on Hinds 1999](https://publish.obsidian.md/joelchan-notes/discourse-graph/sources/%40hindsCurseExpertiseEffects1999); [Psychology Today summary](https://www.psychologytoday.com/us/blog/choke/201103/the-curse-expertise)
- A 2023 Memory & Cognition paper cites Hinds (1999) among demonstrations of the curse of knowledge across medicine, law, education, business and politics. — [Springer PDF](https://link.springer.com/content/pdf/10.3758/s13421-022-01382-3.pdf)
- Hinds, Patterson & Pfeffer, "Bothered by abstraction: The effect of expertise on knowledge transfer and subsequent novice performance." The title-level claim is that experts transfer knowledge more abstractly, affecting novice performance. Detailed results were not verified. — [index record](https://academicnewsletter.sufe.edu.cn/info/372690)
- [bg] Camerer, Loewenstein & Weber (1989) coined "curse of knowledge": better-informed agents cannot ignore their private information when predicting less-informed others' judgments. — [Camerer, Loewenstein & Weber 1989, J. Political Economy, doi:10.1086/261651](https://doi.org/10.1086/261651)
- Novice programmers organize concepts by everyday-language associations, while experts organize them by programming function. This is a concrete, documented gap between expert and novice mental organization. — [McKeithen et al. 1981](https://deepblue.lib.umich.edu/items/1d548813-cc8c-4d00-bc3b-ef1cbd11ed0d)
- Margulieux et al. used cognitive task analysis with experts to make tacit subgoals explicit before building CS1 worked examples. This is a structural debiasing method in practice. — [NSF PAR](https://par.nsf.gov/servlets/purl/10171487)
- [bg] Mayer's CTML defines meaningful learning as integrating verbal and pictorial models with prior knowledge into a coherent mental model. Transfer tests ("what would happen if...") are the standard measure of that model. — [Mayer 2024](https://link.springer.com/article/10.1007/s10648-023-09842-1)

### Inferences
- An explainer-video generator built on a code-reading model is itself an "expert." It sees all the code at once and will exhibit the curse of knowledge: skipping "obvious" steps, using internal names before defining them, and explaining at the abstraction level of the code rather than the viewer. Generic "remember being a beginner" instructions mirror the debiasing that failed for Hinds. Better structural controls include:
  - an explicit prerequisite or assumed-knowledge list per audience level,
  - a rule that no identifier appears before a plain-language definition (pre-training),
  - an automated "novice simulation" check that flags undefined terms and missing causal links,
  - transfer-style questions such as "predict what happens if this service is down." If the script cannot support an answer, the mental model it builds is incomplete.
- A mental model of a software system needs at least four parts:
  - the parts, meaning components and their responsibilities,
  - the connections, meaning data and control flow,
  - the state, meaning what is stored where and its lifetime,
  - the causal dynamics, meaning what happens over time for one request or event, and under failure.
  Narration that only lists components (the parts) without running one trace through them (the dynamics) produces a static model that will not support prediction.

### Gaps
- I did not retrieve sources this session for the foundational mental-models literature:
  - Johnson-Laird (1983), Mental Models, Harvard University Press,
  - Gentner & Stevens (Eds.) (1983), Mental Models, Erlbaum,
  - the programming-specific "notional machine" work, for example du Boulay (1986), J. Educational Computing Research, doi:10.2190/3LFX-9RRF-67T8-UVK9, and Sorva (2013), ACM TOCE, doi:10.1145/2483710.2483713.
  These are standard references, but I cannot attach verified findings to them here.
- I did not retrieve sources for the Newton (1990) "tappers and listeners" study (Stanford dissertation), which is often cited for the curse of knowledge. I also did not retrieve the cognitive-task-analysis claim that experts omit a large fraction of steps when explaining (Clark et al.).
- I found no empirical work on curse-of-knowledge effects in LLM-generated explanations.

## Q7. Meta-analyses quantifying the above (Hattie, Dunlosky et al. 2013, Mayer 2020, and others)

### Takeaway
Pooled effects for well-designed, cognitively grounded techniques mostly fall in the g ≈ 0.3 to 0.6 band in independent meta-analyses. Retrieval practice, worked examples, self-explanation, case comparison, productive failure, interleaving, and signaling and segmenting all fall there. Mayer-lab medians (d ≈ 0.4 to 1.7) are notably higher and should be read as upper bounds from controlled, short, novice-learner lab studies.

### Cited Findings
- Retrieval or practice testing:
  - Rowland 2014: g = 0.50 (≥1-day delay g = 0.69). [secondary summary](https://studycardsai.com/blog/active-recall-statistics)
  - Adesope et al. 2017: g = 0.61. [secondary summary](https://studycardsai.com/blog/active-recall-statistics)
  - Test-potentiated new learning (Chan et al. 2018): pooled g = 0.44, per a later reanalysis. [UNF record](https://scholars.unf.edu/en/publications/retrieval-potentiates-new-learning-a-theoretical-and-meta-analyti/)
- Worked examples (math): g = 0.48. — [Barbieri et al. 2023](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf)
- Case comparison: d = 0.50 (57 experiments). — [Alfieri et al. 2013](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)
- Productive failure: g = 0.36 overall, 0.37–0.58 at high fidelity, 0.87 bias-adjusted. — [Sinha & Kapur 2021](https://www.x-mol.com/paper/1406031499744456704)
- Interleaving: g ≈ 0.42 (59 studies). — [Brunmair & Richter 2019](https://pubmed.ncbi.nlm.nih.gov/31556629/)
- Self-explanation: 64 studies, positive across subjects. [bg] g ≈ 0.55. — [Bisra et al. 2018](https://bps.org.uk/research-digest/self-explanation-powerful-learning-technique-according-meta-analysis-64-studies)
- Signaling: g = 0.53 retention, g = 0.33 transfer. — [Schneider et al. 2018 via QIC-WD](https://www.qic-wd.org/sites/default/files/Umbrella%20Summary%20-%20Signaling%20in%20Training%20111021.pdf)
- Segmenting: small-to-medium effects (56 investigations, 88 comparisons). — [Rey et al. 2019](https://is.tuebingen.mpg.de/publications/rey2018segmenting)
- Video in higher education: g = 0.28 when replacing teaching, g = 0.80 when supplementing (105 RCTs). — [Noetel et al. 2021](https://www.aera.net/Newsroom/Video-Improves-Learning-in-Higher-Education-A-Systematic-Review)
- Mayer-lab medians (2017):
  - multimedia 1.67, temporal contiguity 1.30, redundancy 0.87, spatial contiguity 0.79, personalization 0.79,
  - voice 0.74, modality 0.72, coherence 0.70, segmenting 0.70,
  - signaling 0.46, pre-training 0.46, embodiment 0.36.
  — [Mayer 2017](https://synapsesocial.com/papers/W2625051696)
- Mayer-corpus meta-analysis: 591 effects, with the largest effects for removing seductive details, modality, personalization and multimedia. — [NSF PAR](https://par.nsf.gov/biblio/10637927)
- Dunlosky et al. 2013 utility ratings (qualitative, not pooled): high for practice testing and distributed practice, moderate for interleaving, elaborative interrogation and self-explanation, low for rereading, highlighting and summarization. — [APS](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)
- [bg] Modality (Ginns 2005): d ≈ 0.72 (43 experiments). — [doi:10.1016/j.learninstruc.2005.07.001](https://doi.org/10.1016/j.learninstruc.2005.07.001)
- [bg] Generation effect (Bertsch et al. 2007): d ≈ 0.40. — [doi:10.3758/BF03193441](https://doi.org/10.3758/BF03193441)
- [bg] Benchmark caveat: Kraft (2020) showed that effect sizes from field RCTs of education interventions with standardized achievement outcomes are typically much smaller than lab effects. He proposed rough benchmarks where about 0.05 is small, 0.05–0.20 medium and >0.20 large for such studies. — [Kraft 2020, Educational Researcher, doi:10.3102/0013189X20912798](https://doi.org/10.3102/0013189X20912798)

### Inferences
- Treat any single principle as worth roughly a third to a half of a standard deviation on an immediate, researcher-designed test for novices. Combining several principles is not additive. The Margulieux text+example label result was explicitly non-additive.
- Lab-to-field shrinkage is the norm. A generator's real-world benefit from following these principles will be smaller than the headline numbers, and it will be larger for novices than for experts.

### Gaps
- I did not retrieve Hattie's Visible Learning figures (for example the d = 0.40 "hinge point," or specific values for worked examples, spaced practice or feedback) or the published methodological critiques of Hattie's averaging of heterogeneous meta-analyses. I cannot cite specific numbers or critiques here.
- I did not retrieve Mayer (2020), Multimedia Learning (3rd ed.), with its updated per-principle counts and medians.
- I found no independent meta-analyses this session for the voice, image and embodiment principles.

## Q8. Known criticisms, replication problems, and overstated claims

### Takeaway
The learning-styles "meshing" hypothesis lacks supporting evidence and should not drive design. Germane load is conceptually contested. Several popular video-specific claims are weaker than they are usually presented:
- the 6-minute rule is an engagement correlation,
- interpolated quizzes have mixed replications,
- prequestion effects shrink in authentic lectures,
- concreteness fading generalization is questioned.

Mayer's principle effect sizes are inflated relative to independent work and may be declining over time. Boundary conditions (prior knowledge, segment length, pacing) are the norm, not the exception.

### Cited Findings
- Learning styles: Pashler, McDaniel, Rohrer & Bjork (2008), Psychological Science in the Public Interest 9(3), found "no adequate evidence base to justify incorporating learning-styles assessments into general educational practice." Validating the idea requires a style-by-treatment crossover interaction, which very few studies used a design capable of testing. Some evidence flatly contradicts the meshing hypothesis. The authors note many style schemes are simply untested, and called widespread learning-style tests "a wasteful use of limited educational resources." — [USF repository](https://scholarcommons.usf.edu/psy_facpub/1765); [APS press release](https://www.eurekalert.org/news-releases/730055)
- Germane load: Kalyuga (2011) argues it is indistinguishable from intrinsic load in its traditional treatment. Sweller (2010) and Kalyuga (2011) are described as having given up germane load as an independent source of load. de Jong (2010) questions the clarity and measurement of all three types. — [Kalyuga 2011](https://link.springer.com/doi/10.1007/s10648-010-9150-7); [de Jong 2010](https://link.springer.com/article/10.1007/s11251-009-9113-x); [search summary of later literature](https://core.ac.uk/download/159321954.pdf)
- Interpolated testing in video: the original positive finding (Szpunar et al. 2013) has had mixed replications. Welhaf et al. (2022) found a small effect on mind wandering and no learning benefit. — [PMC3631699](https://pmc.ncbi.nlm.nih.gov/articles/PMC3631699/); [PubMed 35348931](https://www.pubmed.gov/35348931/)
- Prequestions: there are "limited effects" in authentic, longer, more complex lecture videos. — [Toftness et al. 2018](https://pure.royalholloway.ac.uk/en/publications/the-limited-effects-of-prequestions-on-learning-from-authentic-le/)
- Concreteness fading: concrete-only matched fading in one elementary-science study, and generalizability has been questioned. There is no pooled effect size. — [Turku repository](https://www.utupub.fi/items/101ac9b4-f708-4def-816a-78827b0fc696/full)
- 6-minute video rule: Guo et al. (2014) measured engagement (watch time) in MOOCs, not learning. — [Guo et al. 2014](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf?_blank)
- Mayer effect sizes:
  - The multimedia principle median d = 1.67 rests on 5 comparisons in the 2017 summary. [Mayer 2017](https://synapsesocial.com/papers/W2625051696)
  - Independent signaling and segmenting metas find g ≈ 0.3 to 0.5. [Schneider et al. 2018 via QIC-WD](https://www.qic-wd.org/sites/default/files/Umbrella%20Summary%20-%20Signaling%20in%20Training%20111021.pdf); [Rey et al. 2019](https://is.tuebingen.mpg.de/publications/rey2018segmenting)
  - A meta-analysis of the Mayer corpus reportedly found a small decline in effect size per publication year (snippet, unverified). [NSF PAR](https://par.nsf.gov/biblio/10637927)
  - The 2017 and Cambridge-handbook medians disagree for some principles. [Cambridge chapter](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/CD5B7AE1279A9AB81F8EEBB53DBEC86E)
- Modality reversal: the modality advantage reverses for long verbal segments (transient information effect). — [Leahy & Sweller 2011](https://zendy.io/title/10.1002/acp.1787)
- Productive failure: the headline g = 0.87 is a publication-bias-adjusted estimate, and the unadjusted effect is g = 0.36. Effects reverse for young children and domain-general skills. — [Sinha & Kapur 2021](https://www.x-mol.com/paper/1406031499744456704)
- Worked examples combined with self-explanation prompts showed a negative moderator effect in math (Barbieri 2023). This complicates simple "always add prompts" advice. — [Barbieri et al. 2023](https://link.springer.com/content/pdf/10.1007/s10648-023-09745-1.pdf)
- Video meta-analysis: Noetel et al. caution that results may be affected by experimental and publication biases. — [AERA](https://www.aera.net/Newsroom/Video-Improves-Learning-in-Higher-Education-A-Systematic-Review)
- Chan et al. (2018) required a 2020 erratum for mis-assigned effect sizes. A reanalysis argued the original did not separate designs, address heterogeneity or correct for publication bias, and found weak evidence for the standard design. — [UNF record](https://scholars.unf.edu/en/publications/retrieval-potentiates-new-learning-a-theoretical-and-meta-analyti/)

### Inferences
- Do not personalize by "visual vs auditory learner." Personalize by prior knowledge, which is the moderator with real evidence through expertise reversal, signaling and segmenting.
- Treat each principle as conditional. A generator should encode the boundary conditions (audience expertise, segment length, pacing control), not just the principle names.

### Gaps
- I did not retrieve critiques of Hattie (methodological objections to averaging effect sizes across heterogeneous meta-analyses) or of the "learning pyramid / Edgar Dale cone" myth, which is also common in e-learning.
- I found no large preregistered replications of Mayer principles in naturalistic video settings this session.

## Q9. Implications for an explainer-video generator (2 to 10 minute narrated video explaining a code concept or architecture)

### Takeaway
Design for a declared audience expertise level. Teach one runnable mental model built from at most about 4 named chunks per view. Synchronize narration with progressive, highlighted visuals and strip everything else. Motivate the concept with the problem, then use concrete-then-abstract worked traces and contrasting cases. Embed one or two retrieval or prediction pauses at segment boundaries. Expect modest, novice-weighted benefits.

### Cited Findings
- The supporting evidence for each rule below is cited in Q1–Q8. Key anchors: Mayer 2017 medians ([link](https://synapsesocial.com/papers/W2625051696)); Kalyuga et al. 2003 expertise reversal ([link](https://ro.uow.edu.au/edupapers/136)); Cowan 2001 ([link](https://pubmed.ncbi.nlm.nih.gov/11515286/)); Alfieri et al. 2013 ([link](https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf)); Sinha & Kapur 2021 ([link](https://www.x-mol.com/paper/1406031499744456704)); Szpunar et al. 2013 ([link](https://pmc.ncbi.nlm.nih.gov/articles/PMC3631699/)); Leahy & Sweller 2011 ([link](https://zendy.io/title/10.1002/acp.1787)); Margulieux subgoal labels ([link](https://scholarworks.gsu.edu/items/80aa2cc7-cce3-4d9f-8b7c-c6e21bd3cb58)); Guo et al. 2014 ([link](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf?_blank)); Hinds 1999 ([link](https://publish.obsidian.md/joelchan-notes/discourse-graph/sources/%40hindsCurseExpertiseEffects1999)).

### Inferences
Structure
- Fix the audience level first, as novice, intermediate or experienced developer. Most principles flip or fade with expertise.
  - Novice mode: worked trace, pre-training of names, slower segmentation, maximal signaling.
  - Expert mode: compressed overview, "this is pattern X except Y," prediction prompts, skipping familiar steps.
- Use an opening of about 30 to 60 seconds: the problem this code solves and what breaks without it. Optionally add one prequestion ("How would you keep these two services consistent?"). This draws on productive failure, prequestions and "time for telling."
- Pre-train vocabulary: introduce at most about 4 top-level components by role-based name before showing any flow. Never use an identifier before it is defined in plain language.
- Core: run one concrete end-to-end trace (one request or event) through the components. This builds the dynamic part of the mental model, not just a component list. Add subgoal labels at each step.
- Contrast: a second case (a failure path, an alternative design, or the "without this pattern" version). Let the viewer notice the shared structure, then state the principle explicitly after the comparison.
- Fade from the concrete trace to a generic schematic of the abstraction.
- Segment into chapters of about 1 to 2 minutes with brief pauses. Put one retrieval or prediction question at one or two segment boundaries, then reveal the answer with feedback. Do not quiz every 30 seconds.
- Close with an "explain it back" prompt or one transfer question ("What happens if the cache is cold?"). Point to a follow-up spaced recap if the system makes series.

Visual and narration rules
- Build diagrams progressively in sync with narration (temporal contiguity plus dynamic drawing). Highlight or zoom the exact code line or box being spoken about (signaling plus spatial contiguity).
- Use spoken explanation with on-screen short labels and key terms only. Do not show full-sentence captions duplicating the narration (redundancy). Exceptions are accessibility captions as a user toggle, and non-native audiences.
- Keep narration sentences short and do not stack several abstract relations in one long sentence (transient information). Leave persistent visual anchors on screen for anything the viewer must hold in mind.
- Avoid seductive details: no music beds, decorative stock footage, or tangential anecdotes. The Mayer-corpus meta-analysis found removing seductive details among the largest effects.
- Write in a conversational, second-person register (personalization). A high-quality TTS voice is probably acceptable (voice principle boundary, bg).
- Keep each view to about 4 chunks. Use hierarchical zoom (system → component → internals) rather than a single dense diagram.
- When using an analogy, show source and target side by side, map relations explicitly, and state where the analogy breaks.

Guarding against the curse of knowledge
- Have the generator emit and check an assumed-knowledge list. Run a "novice critic" pass that flags undefined terms, skipped causal steps and unexplained jumps in abstraction level. Verify that the script supports answering one or two transfer questions.

Calibration
- Engagement metrics (watch time) are not learning metrics. If the system is evaluated, use delayed transfer questions, for example 1 day or later, where retrieval effects are larger.

### Gaps
- These rules are extrapolated from studies mostly of science, math and procedural programming. I found no studies of learning outcomes from architecture-level code explainer videos, and none on AI-generated explainer videos specifically. Both would need to be validated empirically, for example with A/B tests using delayed transfer questions.
