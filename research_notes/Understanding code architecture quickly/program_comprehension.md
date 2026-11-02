# Empirical Program Comprehension: How Developers Build Understanding of Code, Codebases, Architecture and Design Patterns

Notes on evidence quality. Items marked "(verified)" were checked this session against a primary source, its abstract, or the full text. Items marked "(not re-checked this session)" come from well-known primary papers whose DOI is given. Those details came from the researcher's prior knowledge and should be spot-checked before anyone quotes them. Single-study or small-n evidence is flagged inline. Most classic studies use short programs (tens to hundreds of LOC), students or a few professionals, and lab tasks. Wyrich et al. mapped 95 code comprehension experiments published 1979–2019 and documented recurring design and reporting weaknesses, so the whole field's external validity is limited — [Wyrich, Bogner & Wagner 2023, ACM CSUR](https://arxiv.org/abs/2206.11102).

## 1. Classic comprehension models, and what each predicts about the best order to present code concepts

### Takeaway
The classic models differ mainly on direction. Brooks and Soloway & Ehrlich describe top-down, hypothesis- and plan-driven understanding cued by beacons. Pennington and Shneiderman & Mayer describe bottom-up chunking into control-flow units and only then into function and data flow. Letovsky and Littman describe opportunistic or as-needed questioning versus systematic study. Von Mayrhauser & Vans' integrated metamodel and Storey's synthesis conclude that real developers switch among all of these, depending on how familiar they are with the domain and the code and on what the task is.

### Cited Findings
- Brooks (1983): comprehension is top-down and hypothesis-driven. The programmer forms a primary hypothesis about what the program does from domain knowledge, refines it into subsidiary hypotheses, and verifies them against "beacons", which are stereotypical code features that signal a known structure (e.g., a swap inside nested loops suggests a sort). Comprehension means reconstructing mappings from the problem domain to the code through intermediate domains. (not re-checked this session) — [Brooks 1983, IJMMS 18(6)](https://doi.org/10.1016/S0020-7373(83)80031-5)
- Soloway & Ehrlich (1984, IEEE TSE 10(5):595–609): experts use "programming plans", stereotyped solution fragments for recurring goals, and "rules of discourse", conventions such as meaningful names and variables used consistently with their names. In fill-in-the-blank and recall experiments with novices and experts, plan-like programs were handled much better than "unplan-like" versions that broke discourse rules, and experts' advantage shrank on the unplan-like versions. (verified at abstract level) — [IEEE TSE record](https://manuscript.isc.ac/inventory/49/970582.htm); [paper PDF](https://research.cs.queensu.ca/home/cordy/cisc860/Biblio/hurd/misc/soloway84.pdf)
- Shneiderman & Mayer (1979): programmer knowledge has two layers. Syntactic knowledge is language-specific and fragile. Semantic knowledge is language-independent concepts at several levels, from low-level operations to high-level algorithms, and is stable. Comprehension is a bottom-up recoding of syntax into a semantic, hierarchically chunked internal representation. (not re-checked this session) — [Shneiderman & Mayer 1979, Int. J. Computer & Information Sciences 8(3)](https://doi.org/10.1007/BF00977789)
- Pennington (1987, Cognitive Psychology 19(3):295–341): adapted van Dijk & Kintsch's text-comprehension theory and studied 80 professional programmers (40 COBOL, 40 FORTRAN) on short programs. Readers first build a "program model" of control flow and elementary operations, possibly because they chunk lines into control-flow units. A "situation model" of goals, functions and data flow in domain terms emerges later with continued study. Task goals shape which relations dominate. Critics note the model does not cover the macrostructure of large programs. (verified via abstract and secondary sources) — [DTIC report version](https://apps.dtic.mil/sti/pdfs/ADA179392.pdf); [bibliographic record](https://bibsonomy.org/bibtex/1d75cfb8ea3af1acd5e59ced04ef929de/msn)
- Letovsky (1987): from think-aloud protocols of professional programmers, comprehension is opportunistic. Programmers switch between top-down and bottom-up as cues allow. They generate "inquiries" (why/how/what questions) and "conjectures" (tentative answers with varying certainty). The resulting mental model has a specification layer, an implementation layer, and an annotation layer that links them. (not re-checked this session) — [Letovsky 1987, JSS 7(4)](https://doi.org/10.1016/0164-1212(87)90032-X)
- Littman, Pinto, Letovsky & Soloway (1986/1987): videotaped protocols of experienced programmers enhancing a personnel database program showed two strategies. In the systematic strategy the programmer traces data and control flow to understand global behavior before modifying. In the as-needed strategy the programmer studies only the code locally relevant to the change. Systematic study built knowledge of causal interactions among components and was associated with successful modifications. As-needed programmers missed those interactions and more often failed. Small-n protocol study. (verified at abstract level) — [Littman et al. 1987, JSS](https://typeset.io/papers/mental-models-and-software-maintenance-3mauac5iji); [dblp](https://dblp.uni-trier.de/rec/journals/jss/LittmanPLS87.html)
- Von Mayrhauser & Vans (1995): the "integrated metamodel" combines a top-down domain model (Soloway/Brooks), a program model and a situation model (Pennington), and a knowledge base. From think-aloud studies of professional maintainers on large production code, developers switch frequently among the three model levels during one task. Familiar code and domain push them top-down, and unfamiliar code pushes them bottom-up. (not re-checked this session) — [von Mayrhauser & Vans 1995, IEEE Computer 28(8)](https://doi.org/10.1109/2.402076)
- Storey's synthesis (IWPC 2005 and Software Quality Journal 2006): the diversity of comprehension theories, methods and tools comes from differences in program characteristics, programmer ability and software task. No single model is "right", and tools should support switching strategies. (verified at abstract level) — [Storey 2005 IWPC record](https://bibtex.github.io/IWPC-2005-Storey.html); [Storey 2006 SQJ 14(3):187–208 record](https://www.bibsonomy.org/bibtex/1af82bc48bcfb8197b6767f190ee388bf/sjbutler)
- Felienne Hermans' The Programmer's Brain (Manning, 2021) is a popular synthesis. It maps these models onto cognitive psychology (long-term memory, short-term memory, working memory, chunking, cognitive load) and recommends techniques such as building flashcards of syntax and plans and deliberately identifying beacons and "roles of variables". It is a secondary source. — [Manning book page](https://www.manning.com/books/the-programmers-brain)

### Inferences
- What each model implies for presentation order. These are inferences, not tested predictions:
  - Brooks predicts that the domain purpose should come first. State the hypothesis ("this is a compiler pipeline / a pub-sub event bus"), then show the beacons that confirm it, then the details.
  - Soloway & Ehrlich predict that naming the plan or pattern and keeping code conventional helps experts most. Novices need the plans taught explicitly, and violations of convention should be flagged.
  - Shneiderman & Mayer predict that concepts should be taught semantically and language-neutrally, with syntax kept secondary.
  - Pennington predicts that, for unfamiliar code with no domain cues, a viewer first needs the control-flow skeleton ("what calls what, in what order"). Data flow and purpose can then be layered on. This is the clearest empirical ordering claim (control flow before data flow/function), but it comes from short programs.
  - Letovsky predicts that understanding is question-driven, so presenting code as answers to the why/how/what questions a viewer would ask should match natural processing.
  - Littman predicts that a global, systematic overview of how components interact prevents modification errors that local reading causes.
  - Von Mayrhauser & Vans predict that the best order depends on what the audience already knows. Experts in the domain do well top-down. Newcomers to both domain and code need a program-model scaffold. A good explanation lets viewers move between levels and links each level to the others.
- Across the models, the common advice is to give a top-down frame plus concrete anchors (beacons, entry points, control-flow path) and then link the levels explicitly.

### Gaps
- No controlled study was found that directly tests "presentation order" (e.g., architecture-first vs code-first) for understanding a real codebase. The ordering claims above are extrapolations from these models.
- Davies (1990) argued that plan knowledge depends on how programmers are taught and that rules for selecting plans matter as much as owning them. A secondary source reported this, but the primary text was not retrieved this session.

## 2. Empirical findings: eye tracking, neuroimaging, identifier naming, readability models, cognitive load

### Takeaway
Experts read code less linearly than novices and less linearly than prose. Linearity depends strongly on how the code itself is structured. fMRI shows that comprehension with semantic cues (meaningful names, beacons) uses less brain activation than bottom-up comprehension, and that standard complexity metrics explain cognitive effort only weakly. Full-word identifiers beat letters and abbreviations. Small "atoms of confusion" cause outsized misreadings. No automated readability or understandability metric predicts actual human understanding well.

### Cited Findings
- Eye tracking, linearity (Busjahn et al., ICPC 2015): novices read natural-language text about 80% linearly but source code only about 70% linearly. Experts read code only about 60% linearly and made more saccades that skip intermediate lines, so non-linear "execution order" reading appears to grow with expertise. The sample was small (one replication describes 21 expert trials and 101 novice code trials). (verified via search abstract) — [Busjahn et al. 2015 PDF](https://huang.isis.vanderbilt.edu/cs8395-f23/paper/linear-order-eye.pdf)
- Replication with a twist (Peitek, Siegmund & Apel, ICPC 2020): the expertise effect was partly replicated, but the linearity of the source code itself had a stronger effect on reading order than experience. Comprehension strategy had only a minor effect. (verified at abstract level) — [Peitek et al. 2020 PDF](https://www.se.cs.uni-saarland.de/publications/docs/PSA20.pdf); [ICPC 2020 page](https://conf.researchr.org/details/icpc-2020/icpc-2020-research/21/What-Drives-the-Reading-Order-of-Programmers-An-Eye-Tracking-Study)
- Realistic-context eye tracking (Abid et al., ICSE 2019): 18 developers summarized 63 Java methods from 5 systems inside Eclipse with scrolling and file switching allowed. In this realistic setting, unlike earlier isolated-snippet studies that found most attention on the method signature, developers spent more attention on method bodies. Control-flow terms got frequent short revisits, and call terms got significant gaze time. As methods grew, experts revisited the body more than the signature. Experts wrote summaries from the lines they had read most. (verified at abstract level) — [Abid et al. 2019, arXiv](https://arxiv.org/abs/1903.03358)
- fMRI, first study (Siegmund et al., ICSE 2014): bottom-up comprehension of short snippets activated left-lateralized regions associated with working memory, attention and language processing, including Broca's-area regions. The sample was small (a later summary table lists 16 participant sessions). (not re-checked this session) — [Siegmund et al. 2014](https://doi.org/10.1145/2568225.2568252)
- fMRI, neural efficiency (Siegmund et al., ESEC/FSE 2017): comprehension guided by semantic cues needed less activation in all areas than bottom-up comprehension. The authors read this as higher "neural efficiency", meaning the process is easier. (verified via abstract) — [Siegmund et al. 2017 PDF](https://www.se.cs.uni-saarland.de/publications/docs/SPP+17.pdf)
- fMRI, top-down and beacons (Peitek, Siegmund et al., 2018): found a neural-efficiency difference between top-down and bottom-up comprehension but no significant effect of beacons. This is a null result for beacons that weakens Brooks-style claims at the neural level. (verified via abstract) — [Peitek et al. 2018](https://dl.gi.de/items/b1a838c6-9e5c-47e2-9502-41953667eab9/full)
- fMRI, complexity metrics (Peitek, Apel, Parnin, Brechmann & Siegmund, ICSE 2021): 19 participants and more than 41 metrics in 4 classes. Complexity metrics explained programmer cognition only to a limited degree. Textual size drove attention, and vocabulary size (number of distinct identifiers and operators) burdened working memory. (verified at abstract level) — [Peitek et al. 2021 record](https://archive.cps-vo.org/node/81592)
- Conflicting neuro evidence on whether code is processed like language: an MIT fMRI study (Ivanova et al., eLife 2020) found that code comprehension relied mainly on the domain-general "multiple demand" executive network rather than the language network. This contrasts with Siegmund's language-area interpretation. (not re-checked this session) — [Ivanova et al. 2020, eLife](https://elifesciences.org/articles/58906)
- Identifier naming (Hofmeister, Siegmund & Holt, SANER 2017; EMSE 2019): a within-subjects experiment compared single letters, abbreviations and full words, measuring time to find defects. Code with only letters or abbreviations was harder to comprehend, and full words sped comprehension, consistent with the word-superiority effect beating the word-length effect. (verified at abstract level) — [Hofmeister et al. 2017 PDF](https://www.se.cs.uni-saarland.de/publications/docs/HoSeHo17.pdf)
- Naming evidence is not unanimous: a 2021 review notes that three 2017 studies gave conflicting results on abbreviated vs full names, one of which found no difference in effort or efficiency. — [Never Work in Theory review](https://neverworkintheory.org/2021/08/09/abbreviated-vs-full-names.html)
- Readability models (Buse & Weimer, ISSTA 2008 / TSE 2010): a learned readability metric built from human ratings of short snippets, using features such as line length, identifier count and blank lines. It correlated with human judgments of readability, which is not the same as measured comprehension. (not re-checked this session) — [Buse & Weimer 2010, IEEE TSE](https://doi.org/10.1109/TSE.2009.70)
- Understandability metrics fail (Scalabrino et al., ASE 2017 / TSE 2019): 63 participants and 444 evaluations of Java snippets. None of 121 metrics (LOC, cyclomatic complexity, readability models, documentation and developer metrics) correlated significantly with perceived or actual understandability. Combined models improved on single metrics but were still too inaccurate to use in practice. (verified at abstract level) — [Scalabrino et al. TSE 2019 PDF](https://www.cs.wm.edu/~denys/pubs/TSE%2719-Understandability.pdf)
- Atoms of confusion (Gopstein et al., FSE 2017): small C idioms (e.g., post-increment inside expressions, implicit type conversion) produced much higher misunderstanding rates than equivalent clear code (n=73). Removing them from larger programs reduced confusion (n=43). — [NYU project post](https://ssl.engineering.nyu.edu/blog/2017-06-05-Atoms); [paper record](https://pure.psu.edu/en/publications/understanding-misunderstandings-in-source-code/)
- Atoms replicated in Java: in a study with 132 students, participants were 2.7 to 56 times more likely to err on snippets containing 7 of 14 studied atoms. Effects were not universal. — [Atoms of Confusion in Java, arXiv](https://ar5iv.labs.arxiv.org/html/2103.05424)

### Inferences
- Semantic cues (meaningful names, recognizable structure) measurably reduce cognitive effort. Explanations should therefore name things in domain terms and lean on recognizable structure rather than make viewers decode raw logic.
- Because vocabulary size taxes working memory (Peitek 2021) and abbreviations slow comprehension (Hofmeister), limiting the number of distinct new names introduced at once is likely to matter more than LOC or cyclomatic complexity.
- Expert reading is non-linear and follows execution and calls. Showing code in file order is likely less natural than following a call path.

### Gaps
- The commonly quoted sample and effect size for Hofmeister et al. (72 professional developers, about 19% faster with full words) could not be confirmed from the retrieved abstract.
- A later study comparing language and logic brain networks (Liu et al., eLife 2020) and fNIRS cognitive-load studies of poor lexicon (Fakhoury et al., ICPC 2018) were not retrieved.
- Nearly all neuro and eye-tracking studies use snippets under about 50 LOC. No neuroimaging evidence was found on architecture-level understanding.

## 3. Expert vs novice differences

### Takeaway
Experts chunk code into meaningful plans, so they recall plan-like code far better but lose that advantage on scrambled or unconventional code. They read non-linearly and focus on calls and bodies, rely on semantic cues and beacons, and spend less of their time on comprehension. Systematic study of component interactions predicts successful modification better than purely local, as-needed reading.

### Cited Findings
- Chunking and recall: experienced programmers recalled meaningful programs much better than novices, but the advantage largely disappeared for scrambled programs, mirroring chess expertise. Experts' memory organization reflected programming-language semantics. (not re-checked this session) — [McKeithen, Reitman, Rueter & Hirtle 1981, Cognitive Psychology 13(3)](https://doi.org/10.1016/0010-0285(81)90012-8)
- Plans and discourse rules: the expert advantage depends on code following plans and conventions. Unplan-like code erased much of it. — [Soloway & Ehrlich 1984 record](https://manuscript.isc.ac/inventory/49/970582.htm)
- Beacons: experienced programmers recalled "beacon" lines (e.g., the swap in a sort) far better than other lines after short study, while novices did not show this pattern. (not re-checked this session) — [Wiedenbeck 1986, IJMMS 25(6)](https://doi.org/10.1016/S0020-7373(86)80083-9)
- Beacon effects at the neural level were not significant in a 2018 fMRI study, so evidence on beacons is mixed. — [Peitek et al. 2018](https://dl.gi.de/items/b1a838c6-9e5c-47e2-9502-41953667eab9/full)
- Systematic vs as-needed: systematic tracing of global data and control flow led to successful enhancements, while the as-needed local strategy missed causal interactions and led to failures. Small protocol study. — [Littman et al. 1987](https://typeset.io/papers/mental-models-and-software-maintenance-3mauac5iji)
- Linearity: experts read code about 60% linearly vs novices about 70% (novices read prose about 80% linearly). — [Busjahn et al. 2015](https://huang.isis.vanderbilt.edu/cs8395-f23/paper/linear-order-eye.pdf). Code structure itself has a stronger effect than expertise — [Peitek et al. 2020](https://www.se.cs.uni-saarland.de/publications/docs/PSA20.pdf)
- Novices in a 2021 bug-fixing eye-tracking study read more method signatures, variable declarations, identifiers and keywords than experts did (reported in a replication summary). — [What Drives the Reading Order, ICPC 2020 PDF (related-work summary)](https://www.se.cs.uni-saarland.de/publications/docs/PSA20.pdf)
- Field data, expertise and comprehension time: across 78 professionals and 3,148 working hours in 7 projects, developers spent about 58% of their time on comprehension activities, often in browsers and document editors rather than the IDE. Senior developers spent significantly less time on comprehension than juniors. (verified at abstract level) — [Xia et al. 2018, IEEE TSE 44(10)](https://xin-xia.github.io/publication/TSE17.pdf)
- Experience does not make hard questions easier: in LaToza & Myers' reachability study, developers rated on average about 4.1 of 12 reachability questions at least somewhat hard, and experience did not make them less frequent or easier. In field observation, one reachability question often took tens of minutes. — [LaToza & Myers, ICSE 2010 PDF](https://memphis-cs.github.io/comp-7085-8085-2012-fall/papers/LaToza2010ICSE.pdf)

### Inferences
- An explanation that names the plan or pattern lets experts chunk instantly. For novices the same label is noise unless it is unpacked once, with a beacon pointed out.
- The as-needed vs systematic finding suggests that even a brief explicit map of component interactions ("A writes, B reads, C caches") may prevent the classic newcomer error of a locally correct but globally breaking change.

### Gaps
- Chunking studies (McKeithen; Shneiderman 1976) are old, use tiny programs and small samples, and recent large replications were not found.
- Evidence on how experts form architecture-level chunks (not just code-level plans) appears thin. No controlled study was found.

## 4. Codebase onboarding, questions developers ask, and what information is hardest to recover

### Takeaway
Newcomers learn a codebase mainly through early hands-on tasks, human guides or mentors, examples, and asking colleagues. Up-front architecture overviews and general documentation help orientation, but newcomers report really understanding architecture only after exploration. Developers' questions move from finding focus points to understanding how groups of code relate. The hardest information to recover is rationale or intent ("why"), runtime and low-level behavior, and history, and it mostly lives in people's heads.

### Cited Findings
- Dagenais, Ossher, Bellamy, Robillard & de Vries (ICSE 2010), grounded theory with 18 newcomers across 18 IBM projects. (verified, full text read)
  - Three integration factors: early experimentation, internalizing structures and cultures, and progress validation. — [Dagenais et al. 2010 PDF](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
  - On architecture: teams tried to convey architecture by having a team member present an architecture overview in the first days, "but it was only through exploration, i.e., questions, technical meetings and experimentation, that newcomers finally understood" it. Newcomers wanted architecture mainly for the "big picture": to know where their tasks fit and whether changes complied with the architecture. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
  - Low-level design and runtime behavior was the product feature most critical to integration and was often the least documented, "not even a simple overview was available". Rationale was recovered by asking people, and strict issue-tracker procedures helped. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
  - Learning material and presentations helped only when they addressed concepts relevant to current tasks (e.g., code structure) and were immediately applicable. Three participants wanted to revisit such material after gaining hands-on experience. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
  - Half of participants said the most valuable thing was being able to compile and run the product and then experiment. They learned more from experimenting than from courses or docs. One participant committed a bug fix on day one. Development-environment setup delays ranged from 1 week to 2 months. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
  - The four cross-factor aids were previous experience, examples, a mentor, and questions to colleagues. Three kinds of walkthrough helped: environment setup, code overview, and a complete task. The authors' view: "no tool or map could replace the richness of information provided by a human guide". — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
- Begel & Simon (ICER 2008): a two-month in-situ study of new college-graduate developers in their first six months at Microsoft (a secondary source reports 8 new hires). Their difficulties were mostly communication, collaboration and orientation rather than technical skill. — [MSR page](https://www.microsoft.com/en-us/research/?p=154722); [companion "Struggles" paper](https://www.microsoft.com/en-us/research/?p=154726)
- Sim & Holt (ICSE 1998): interviews with 4 "software immigrants" yielded 7 naturalization patterns in 4 categories, among the earliest onboarding studies. Very small n. — [Sim & Holt 1998 record](https://bibtex.github.io/ICSE-1998-SimH.html)
- Ju, Sajnani, Kelly & Herzig (ICSE SEIP 2021, Microsoft): interviews with 32 developers moving into new teams and 15 managers, triangulated with surveys (189 developers, 37 managers). Onboarding tasks affect newcomers through learning, confidence building and socialization. Managers use three onboarding strategies, often without realizing it, each with trade-offs. — [Ju et al. 2021, arXiv](https://arxiv.org/abs/2103.05055)
- Microsoft ramp-up study (Rastogi, Zimmermann et al., ESEM 2015): having a mentor, prior knowledge of required skills, and proactively asking questions shortened new hires' ramp-up (per search summary of the talk). — [Talk slides](https://speakerdeck.com/tomzimmermann/ramp-up-journey-of-new-hires-tug-of-war-of-aids-and-impediments)
- Remote onboarding at Microsoft during COVID (Rodeghero et al., ICSE SEIP 2021): a study of remotely onboarded new hires found that building social connections and getting help were harder remotely. — [Rodeghero et al., arXiv/ar5iv](https://ar5iv.labs.arxiv.org/html/2011.08130)
- Google (Green, Jaspan, Hodges et al., IEEE Software 2023, "Developer Productivity for Humans, Part 5"): an overview of Google's onboarding and ramp-up measurement. A secondary summary reports that the top three ramp-up hindrances in Google surveys were learning a new technology, poor or missing documentation, and finding expertise, and that remote onboarding slowed ramp-up by about 3–6 weeks. This is a secondary report and should be checked against the paper. — [Google Research page](https://research.google/pubs/developer-productivity-for-humans-part-5-onboarding-and-ramp-up/); [DX secondary summary](https://newsletter.getdx.com/p/developer-onboarding-time)
- Questions developers ask (Sillito, Murphy & De Volder, FSE 2006 / TSE 2008): two qualitative studies, one of newcomers on change tasks in a medium-sized code base and one of industrial programmers on their own tasks, catalogued 44 kinds of questions. The four categories, by scope, are finding initial focus points, building on those points, understanding a subgraph, and understanding relationships among groups of subgraphs. Tools supported the narrow questions far better than the broad ones. (verified at abstract level; category names per thesis record) — [Sillito et al. TSE record](https://manuscript.isc.ac/Inventory/49/1142180.htm); [UBC thesis](https://open.library.ubc.ca/collections/831/items/1.0052042)
- Hard-to-answer questions (LaToza & Myers, PLATEAU 2010): a survey of 179 professional developers at Microsoft about hard-to-answer questions they had recently asked. Many questions were not addressed by existing research or tools. — [PLATEAU 2010 slides](https://ecs.wgtn.ac.nz/foswiki/pub/Events/PLATEAU/2010Program/plateau10-latoza-slides.pdf)
- Maintaining mental models (LaToza, Venolia & DeLine, ICSE 2006, Microsoft): two surveys and 11 interviews. Developers "go to great lengths to create and maintain rich mental models of code" and rarely rely on external representations. Keeping those models in sync requires frequent face-to-face communication, which slows newcomers. (verified at abstract level) — [MSR page](https://www.microsoft.com/en-us/research/?p=154508)
- Information seeking (Ko, Myers, Coblenz & Aung, TSE 2006): developers given an unfamiliar program for 70 minutes of debugging and enhancement interleaved seeking, relating and collecting information. They kept found information in fragile IDE state (tabs, scroll positions) and lost it. The authors framed program understanding as information foraging. — [dblp record](https://dblp.dagstuhl.de/rec/journals/tse/KoMCA06.html); [TSE abstract](https://manuscript.isc.ac/Inventory/49/841092.htm)
- Time on comprehension: about 58% of professionals' time — [Xia et al. 2018](https://xin-xia.github.io/publication/TSE17.pdf)
- LLM-based onboarding assistants (2025), early and small-n:
  - "Onboarding Buddy" (TU Delft/JetBrains) is a multi-agent RAG plus chain-of-thought assistant. A study with 8 participants on a closed-source project gave a mean helpfulness of 3.26/4. — [arXiv 2503.23421](https://arxiv.org/html/2503.23421v1)
  - A codebase-understanding design study interviewed 8 code auditors and then ran a user study with 9 experienced and 6 novice developers. — [arXiv 2504.04553](https://arxiv.org/abs/2504.04553)

### Inferences
- Across Dagenais, Ju and Rastogi, the strongest onboarding interventions are social and task-anchored (mentor, guided first task, fast feedback). Static overviews are a useful map, but understanding forms through exploration.
- Sillito's broadest question categories (how groups of code relate) are exactly what architecture explanations address and what tools support worst. That is the gap a short architecture explainer can fill.
- "Why" knowledge (rationale, intent, history) is the scarcest type and is held in people. Any medium that captures it, whether an ADR, a video, or a recorded walkthrough, addresses a documented pain point.

### Gaps
- Several commonly quoted figures could not be confirmed this session and should not be used without checking:
  - Ko et al. 2006, about 35% of time spent on navigation mechanics.
  - LaToza et al. 2006, about 66% rating "understanding the rationale behind code" a serious problem.
  - LaToza & Myers 2010, 371 questions in 21 categories.
  - Minelli et al. 2015, about 70% of IDE time spent on comprehension.
- No controlled study was found that measures whether "code tours" (e.g., VS Code CodeTour) or recorded architecture videos speed onboarding. Evidence on tours is anecdotal or tool papers only.
- The SPAC-B newcomer assistant (FSE Companion 2025, 10 developers) surfaced in search, but no primary URL was retrieved.

## 5. Design pattern and anti-pattern comprehension

### Takeaway
Controlled experiments, mostly from the early 2000s, show that explicitly documenting which design patterns a program uses speeds pattern-relevant maintenance or reduces errors. Patterns used where simpler solutions would do are usually neutral or helpful, but not always. Single anti-patterns hurt comprehension little, and combinations or repeated occurrences hurt significantly.

### Cited Findings
- Prechelt, Unger, Philippsen & Tichy (IEEE TSE 2002): two controlled experiments. In the first, 74 German graduate students worked in Java; in the replication, 22 US undergraduates worked in C++. Both did maintenance on programs of 360–560 LOC containing patterns. Programs carried either redundant comments naming the patterns or equally well-commented code without pattern names. Pattern-relevant tasks were completed faster or with fewer errors when pattern documentation was present. The information was redundant, meaning the pattern names added no new facts, only a recognized chunk. (verified at abstract level) — [Prechelt et al. 2002 record](https://cris.fau.de/publications/115927284)
- Prechelt, Unger, Tichy, Brössler & Votta (IEEE TSE 2001): a professional-subject experiment comparing pattern-based designs with simpler alternatives for maintenance. Using a pattern where a simpler solution would suffice was usually helpful or neutral, but some cases showed negative effects, so the authors advised common sense over blanket pattern use. (not re-checked this session) — [Prechelt et al. 2001](https://doi.org/10.1109/32.988711)
- Abbes, Khomh, Guéhéneuc & Antoniol (CSMR 2011, best paper and later "most influential" award): three experiments, 24 subjects each, measured NASA-TLX workload, time and correctness. A single Blob or Spaghetti Code antipattern did not significantly reduce performance. The combination of the two did. (verified at abstract level) — [Polytechnique Montréal record](https://publications.polymtl.ca/17390/)
- Politowski, Khomh, Guéhéneuc et al. (2020), larger follow-up: single occurrences of Blob or Spaghetti Code had little effect, but two occurrences of either significantly hurt comprehension. — [arXiv 2009.02438](https://arxiv.org/pdf/2009.02438.pdf)

### Inferences
- Prechelt's result fits Soloway & Ehrlich's plan theory: a pattern name works as a pre-built chunk that lets readers predict structure. Naming the pattern ("this is an Observer") is cheap and evidence-backed for viewers who already know it.
- Anti-pattern effects compound, so explanations of legacy code should flag the places where several smells co-occur rather than every smell.

### Gaps
- Replications with professionals (e.g., Vokáč et al. 2004, EMSE, reportedly finding Observer and Decorator easy, Visitor hard) and eye-tracking studies of pattern representations in UML (Jeanmart et al. 2009) were not retrieved this session.
- No recent (post-2015) controlled experiment on pattern documentation effects was found. The core evidence is about 20+ years old, student-heavy, and uses small programs.

## 6. How developers learn architecture: architecture knowledge, erosion awareness, rationale and ADRs

### Takeaway
Architecture knowledge is mostly tacit and held in people. Newcomers get it from overviews plus exploration and conversation, and practitioners value rationale but seldom record it systematically. Evidence that ADRs help is limited to perceived usefulness in small action-research studies and low adoption in open source. No controlled study shows that ADRs measurably speed comprehension.

### Cited Findings
- Newcomers sought architecture for the big picture: where tasks fit and whether changes complied. A first-days architecture overview was given, but real understanding came only through exploration, questions, technical meetings and experimentation. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
- Developers keep rich mental models of code in their heads and rarely rely on external representations. Keeping those models in sync needs frequent face-to-face meetings. — [LaToza, Venolia & DeLine 2006](https://www.microsoft.com/en-us/research/?p=154508)
- Design rationale survey (Tang, Ali Babar, Gorton & Han, JSS 2006; 81 valid practitioner responses): practitioners recognize the importance of documenting rationale and frequently use it when reasoning about design choices, but report barriers to recording it. At the time, claims about the cost of missing rationale were largely untested empirically. — [Swinburne report record](https://figshare.swinburne.edu.au/articles/report/A_survey_of_architecture_design_rationale/26269849)
- ADRs in agile practice (Chalmers action research, about 2023, one company, 2 months): teams perceived ADRs as useful. Concerns were documenting too much or too little, prioritization, placement, and keeping ADRs current. — [Chalmers record](https://research.chalmers.se/en/publication/538920)
- ADRs in a microservice company (ECSA 2024 action research; 7 developers interviewed, 3 months of observation): cooperation between teams improved. Challenges in documentation culture, knowledge transfer and prioritization were largely addressed, while distributed-systems challenges remained. Where ADRs are stored strongly affected their perceived usefulness. — [Chalmers record](https://research.chalmers.se/en/publication/542849); [ECSA 2024 page](https://conf.researchr.org/details/ecsa-2024/ecsa-2024-research-papers/9/Introducing-Architecture-Decision-Records-in-Practice-An-Action-Research-Study)
- ADR adoption on GitHub (IEEE Access 2023, mining study): adoption is limited. About 50% of repositories with ADRs contain only 1–5 of them, which suggests the practice is tried but not sustained. Repositories that use ADRs systematically treat decision recording as a long-running team activity. — [IEEE Access 2023 via DOAJ](https://doaj.org/article/f838f2a538ea48e7a3b15ce99befe612)
- Rationale is recovered by asking people. Strict issue-tracking procedures helped newcomers recover it. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
- Undocumented, implicit repository knowledge was among the explanations METR gave for why AI tools slowed experienced developers on their own large repositories. This is indirect evidence that tacit architecture knowledge is large and valuable. — [METR 2025, arXiv 2507.09089](https://arxiv.org/abs/2507.09089); [Willison summary](https://simonwillison.net/2025/Jul/12/ai-open-source-productivity/)

### Inferences
- "What" knowledge (components, structure) is recoverable from code with effort. "Why" knowledge (decisions, rejected alternatives, constraints) is the part that vaporizes and is hardest to recover. An explanation adds the most value when it carries the why.
- The ADR studies measure perceived usefulness and adoption, not comprehension speed. Claims that ADRs speed onboarding are plausible but unproven.

### Gaps
- Empirical work on architecture erosion awareness (e.g., Li, Liang et al. mapping study and practitioner studies, about 2021–2022) and reflexion-model case studies (Murphy & Notkin) were not retrieved this session.
- No controlled experiment comparing comprehension or onboarding with vs without ADRs or architecture docs was found.

## 7. LLM-era findings (2023–2026): AI explanations, assistants, comprehension, learning and mental models

### Takeaway
LLM explanations are often rated clearer than novice-written ones, and in-IDE explanation tools can raise task completion. However, the best randomized evidence (Anthropic 2026) shows that AI assistance while learning a new library reduced conceptual understanding, code reading and especially debugging skill by about 17 percentage points of quiz score, without a significant speed gain. Learning was preserved only when developers used AI to ask conceptual questions or to explain generated code. Self-perceived productivity and understanding often diverge from measured outcomes, an "illusion of competence".

### Cited Findings
- Anthropic RCT (Shen & Tamkin, Jan 2026): 52 mostly junior engineers who used Python weekly learned the async library Trio. The session was a 35-minute task followed by a 25-minute quiz on debugging, code reading, code writing and concepts. (verified)
  - The AI group scored 50% vs 67% for hand-coding (Cohen's d = 0.738, p = 0.01).
  - The AI group was about 2 minutes faster, which was not significant (p = 0.391).
  - The largest gap was on debugging questions. — [Anthropic research post](https://www.anthropic.com/research/AI-assistance-coding-skills); [arXiv 2601.20245](https://www.arxiv.org/pdf/2601.20245)
- Same study, interaction patterns (qualitative, n = 2–7 per pattern, not causal):
  - Low-scoring patterns (under 40%): AI delegation (39%, fastest at about 19.5 min), progressive reliance (35%), and iterative AI debugging (24%).
  - High-scoring patterns (65% or more): generation-then-comprehension, i.e., generating code and then asking follow-up questions (86%); hybrid code plus explanation (68%); and conceptual inquiry only (65%).
  - Caveats: the quiz was immediate with no retention test, and the tool was a sidebar chat, not an agentic tool. — [Anthropic research post](https://www.anthropic.com/research/AI-assistance-coding-skills)
- METR RCT (July 2025): 16 experienced open-source developers did 246 tasks of about 2 hours each on their own mature repositories, with AI randomly allowed or disallowed per task. AI increased completion time by about 19%. Developers had forecast a 24% speedup and afterward believed they had been about 20% faster. Authors caution that the result is specific to experts on familiar, large codebases. A separate Google RCT (96 engineers) reportedly found about a 21% speedup on an enterprise task (secondary report). — [METR arXiv 2507.09089](https://arxiv.org/abs/2507.09089); [Willison summary](https://simonwillison.net/2025/Jul/12/ai-open-source-productivity/)
- Prather et al. (ICER 2024, "The Widening Gap"): 21 novices in lab sessions with eye tracking, observation and interviews. 20 of 21 finished the task, but outcomes split.
  - Students with better grades and self-efficacy used AI to accelerate on code they already intended to write.
  - Struggling students had existing metacognitive difficulties compounded and new ones introduced, often ending with an unwarranted "illusion of competence". 10 of 21 showed at least one of 8 metacognitive difficulties.
  - Small qualitative study. — [arXiv 2405.17739](https://arxiv.org/abs/2405.17739)
- Kazemitabaar et al. (CHI 2023): 69 learners aged 10–17 with no text-programming experience learned Python with or without Codex.
  - Codex improved code-authoring performance and did not hurt manual modification tasks.
  - One-week retention was slightly better with Codex but not significant overall. It was significantly better only for learners with higher prior Scratch scores.
  - Authors flag over-reliance risk. — [arXiv 2302.07427](https://arxiv.org/abs/2302.07427)
- Nam, Macvean, Hellendoorn, Vasilescu & Myers (ICSE 2024): GILT, an in-IDE GPT-3.5 plugin that explains selected code, API details, domain concepts and usage examples, tested with 32 participants on unfamiliar code (data visualization, 3D rendering) against web search. The plugin aided task completion more than web search. One summary reports no notable gains in time or measured understanding (verify in the paper). Benefits differed between students and professionals. — [arXiv 2307.08177](https://arxiv.org/abs/2307.08177); [Google Research page](https://research.google/pubs/using-an-llm-to-help-with-code-understanding/)
- Leinonen et al. (ITiCSE 2023): LLM-generated explanations of 3 functions were rated easier to understand and more accurate summaries than explanations written by students in a large course (about 1,000 students). Neither set was always correct. — [arXiv 2304.03938](https://arxiv.org/abs/2304.03938); [Never Work in Theory review](https://neverworkintheory.org/2023/04/13/comparing-student-and-llm-code-explanations.html)
- LLM onboarding assistants are early (n = 8 to 15) and report perceived helpfulness, not measured comprehension. — [Onboarding Buddy](https://arxiv.org/html/2503.23421v1); [arXiv 2504.04553](https://arxiv.org/abs/2504.04553)

### Inferences
- Receiving an explanation passively does not equal understanding. The Anthropic patterns suggest that comprehension survives when the learner stays cognitively engaged: asking why, predicting, and resolving errors themselves. This matches the generation and testing effects from learning science (inference, not tested here).
- The perception gap in METR, and the illusion of competence in Prather et al., imply that self-reported "I get it now" after watching or reading an AI explanation is unreliable. Comprehension should be checked with prediction or debugging questions.
- Debugging showed the largest loss, which suggests that runtime-behavior and causal models are the part of a mental model most easily skipped when someone else (AI) writes the code.

### Gaps
- No RCT was found measuring long-term retention (weeks or more) of codebase or architecture understanding formed from AI explanations.
- Evidence on agentic tools (e.g., Claude Code, Copilot agent mode) and comprehension is untested per the Anthropic authors.
- The CHI 2025 survey on generative AI and critical thinking among knowledge workers (Lee et al., Microsoft/CMU) was not retrieved.

## 8. Implications for explaining code architecture in a short video

### Takeaway
The evidence favors a short video that:
- frames the system top-down with its domain purpose and one hypothesis about what it is
- anchors that frame in a single concrete execution path (control flow first, then data flow)
- names recognized patterns as chunks
- keeps the number of new identifiers small
- spends disproportionate time on "why" (rationale and constraints)
- ends by sending the viewer into hands-on exploration with a prediction question, rather than claiming the video alone produces understanding.

### Cited Findings
- Real architecture understanding came from exploration after an initial overview. Overviews and learning material helped when tied to tasks and immediately applicable. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf)
- Control-flow (program model) representations form before function and data-flow (situation model) representations in unfamiliar code. — [Pennington 1987](https://apps.dtic.mil/sti/pdfs/ADA179392.pdf)
- Semantic cues reduce neural effort, and vocabulary size taxes working memory. — [Siegmund et al. 2017](https://www.se.cs.uni-saarland.de/publications/docs/SPP+17.pdf); [Peitek et al. 2021](https://archive.cps-vo.org/node/81592)
- Naming the design pattern speeds pattern-relevant maintenance. — [Prechelt et al. 2002](https://cris.fau.de/publications/115927284)
- Global understanding of component interactions predicts successful changes. — [Littman et al. 1987](https://typeset.io/papers/mental-models-and-software-maintenance-3mauac5iji)
- Experts read along execution and calls, not file order. — [Busjahn et al. 2015](https://huang.isis.vanderbilt.edu/cs8395-f23/paper/linear-order-eye.pdf); [Abid et al. 2019](https://arxiv.org/abs/1903.03358)
- Rationale is the scarcest knowledge and lives in people. — [Dagenais et al. 2010](https://www.cs.mcgill.ca/~martin/papers/icse2010.pdf); [LaToza et al. 2006](https://www.microsoft.com/en-us/research/?p=154508); [Tang et al. 2006](https://figshare.swinburne.edu.au/articles/report/A_survey_of_architecture_design_rationale/26269849)
- Passive consumption of explanations risks an illusion of understanding, and engagement-preserving use retains learning. — [Anthropic 2026](https://www.anthropic.com/research/AI-assistance-coding-skills); [Prather et al. 2024](https://arxiv.org/abs/2405.17739); [METR 2025](https://arxiv.org/abs/2507.09089)

### Inferences
- A suggested structure, inferred and not tested:
  1. Purpose and domain hypothesis (Brooks), about 10%.
  2. A boxes-and-arrows map with at most about 5–7 named components, using full-word domain names (Hofmeister; Peitek on vocabulary load).
  3. Trace one representative request or event end to end in execution order (Pennington's control flow first; expert call-following).
  4. Overlay the data flow and state ownership on the same path (situation model; Littman's interactions).
  5. Name the patterns as chunks, with one beacon each (Soloway & Ehrlich; Prechelt; Wiedenbeck).
  6. "Why it is this way", covering key decisions, rejected alternatives and constraints (the rationale gap).
  7. Where newcomers usually break things, i.e., cross-component interactions and co-occurring smells (Littman; Abbes).
  8. A concrete first exploration task plus a prediction question (Dagenais early experimentation; Anthropic engagement patterns).
- Answer Sillito's broad "how do these groups relate" questions, since tools serve those worst, and leave narrow "where is X" questions to search.
- For mixed audiences, label the pattern for experts and unpack it once for novices. Show the same structure at two zoom levels and link them explicitly, as von Mayrhauser & Vans' level-switching suggests.

### Gaps
- No study was found that measures comprehension gains from short architecture videos or screencasts specifically. All of the implications above are extrapolated from reading, onboarding and documentation research.
- Optimal length, pacing, and diagram vs live-code balance for developer explainer videos are not established by the evidence retrieved here.
