# Graph Report - devops-game-team-b  (2026-10-22)

## Corpus Check
- 173 files · ~367,328 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .example 3, .Dockerfile 1)

## Summary
- 1083 nodes · 3059 edges · 58 communities (49 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2345fafa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getNode
- vitest
- engine/life.ts
- grader.ts
- engine/review.ts
- package.json
- main.ts
- types.ts
- avatar.ts
- career.ts
- capstone.ts
- mkdirp
- sandbox-server/server.js
- vfs.ts
- grader/index.ts
- resolvePath
- Grader Server — проверка смысла ответов через Claude API
- grader-server/package.json
- grader-server/server.js
- compilerOptions
- sandbox-server/package.json
- ui-icons.ts
- inline-code.ts
- Terminal Ops Academy
- missions/index.ts
- esc
- lessons/index.ts
- certificate.ts
- exams.ts
- Terminal Ops Academy
- .prettierrc.json
- dependencies
- Pipeline Sandbox Server — разворачивание на своём сервере
- cloud.ts
- pages.ts
- startLesson
- log
- vite-env.d.ts
- set-key.sh
- ui/life.ts
- $
- Terminal Ops Academy — PROJECT.md
- legacy-import.ts
- scripts
- devDependencies
- writeFile
- client.ts
- live.ts
- character.ts
- renderPanel
- gen-phosphor.mjs
- dependencies

## God Nodes (most connected - your core abstractions)
1. `$` - 54 edges
2. `writeFile()` - 52 edges
3. `World` - 47 edges
4. `mkdirp()` - 46 edges
5. `icon()` - 42 edges
6. `vitest` - 41 edges
7. `resolvePath()` - 40 edges
8. `esc()` - 38 edges
9. `LessonRun` - 35 edges
10. `getNode()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения)` --references--> `carIcon()`  [INFERRED]
  PROJECT.md → src/data/icons.ts
- `4. Архитектура кода (где что лежит)` --references--> `Life`  [INFERRED]
  PROJECT.md → src/engine/life.ts
- `6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения)` --references--> `setCurrentJob()`  [INFERRED]
  PROJECT.md → src/engine/life.ts
- `10. Известные ограничения и куда смотреть дальше` --references--> `onLessonComplete()`  [INFERRED]
  PROJECT.md → src/engine/life.ts
- `6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения)` --references--> `onLessonComplete()`  [INFERRED]
  PROJECT.md → src/engine/life.ts

## Import Cycles
- None detected.

## Communities (58 total, 9 thin omitted)

### Community 0 - "getNode"
Cohesion: 0.12
Nodes (20): dir(), file(), getNode(), baseFS(), doneOf(), seedHome(), sequence(), stageTriple (+12 more)

### Community 1 - "vitest"
Cohesion: 0.06
Nodes (36): 4. Архитектура кода (где что лежит), Тестовый паттерн (обязательно соблюдать при любом расширении), vitest, 2. [Medium] Лидерборд принимает нефальсифицируемые на вид, но фактически клиентские данные, LessonRun, norm(), ReplayAction, StepResult (+28 more)

### Community 2 - "engine/life.ts"
Cohesion: 0.11
Nodes (27): ACCESSORIES, Accessory, Car, CarBody, CARS, COMFORT, ComfortItem, FOOD (+19 more)

### Community 3 - "grader.ts"
Cohesion: 0.07
Nodes (39): Как работаем, Нельзя, ТЗ: перекройка Terminal Ops Academy — дизайн и повторение, Три подхода (обязательно разные), Часть 1. Дизайн — критерии приёмки, Часть 2. Повторение — критерии приёмки, Шкала жюри (каждый пункт 0–10), akin() (+31 more)

### Community 4 - "engine/review.ts"
Cohesion: 0.07
Nodes (56): LessonState, mergeLife(), loadProgress(), migrateProgress(), Progress, BOX_INTERVAL_DAYS, buildReviewPool(), countToNumber() (+48 more)

### Community 5 - "package.json"
Cohesion: 0.14
Nodes (13): description, name, private, type, version, eslint, eslint-config-prettier, prettier (+5 more)

### Community 6 - "main.ts"
Cohesion: 0.11
Nodes (34): parseSalary(), isDead(), clearProgress(), nextRank(), rankOf(), saveProgress(), lessonById(), checkDeath() (+26 more)

### Community 7 - "types.ts"
Cohesion: 0.08
Nodes (25): Check, CiRun, CiState, CommandFn, Commit, Container, DockerImage, FileNode (+17 more)

### Community 8 - "avatar.ts"
Cohesion: 0.11
Nodes (36): 6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения), accessoryOverlay(), AvatarOptions, avatarSVG(), BEARD_PATHS, BEARDS, clampIx(), defaultAppearance() (+28 more)

### Community 9 - "career.ts"
Cohesion: 0.11
Nodes (30): ACT_TO_TOPIC, Grade, Job, JOBS, jobTopics(), pickQuestions(), SOFT_QUESTIONS, SoftQuestion (+22 more)

### Community 10 - "capstone.ts"
Cohesion: 0.21
Nodes (5): CAPSTONE_TASKS, Deps, openCapstone(), SANDBOX_URL, SandboxClient

### Community 11 - "mkdirp"
Cohesion: 0.21
Nodes (18): Alert, Lesson, mkdirp(), seedProject(), seedRepoWithCommit(), seedRepo(), seedInfra(), seedK8s() (+10 more)

### Community 12 - "sandbox-server/server.js"
Cohesion: 0.10
Nodes (14): ALLOWED_ORIGINS, app, attempts, crypto, { execFile }, express, http, MAX_CONCURRENT (+6 more)

### Community 13 - "vfs.ts"
Cohesion: 0.39
Nodes (6): applyFileEdit(), DirNode, FSNode, copyNode(), parentOf(), splitPath()

### Community 14 - "grader/index.ts"
Cohesion: 0.12
Nodes (15): ALLOWED_ORIGINS, ask(), Bool, CommandVerdict, corsHeaders(), env(), Explanation, extractJson() (+7 more)

### Community 15 - "resolvePath"
Cohesion: 0.07
Nodes (42): runPipeline(), ComposeService, loadCompose(), parseCompose(), initDisks(), applyManifest(), dataKeys(), k8sInit() (+34 more)

### Community 16 - "Grader Server — проверка смысла ответов через Claude API"
Cohesion: 0.22
Nodes (8): Grader Server — проверка смысла ответов через Claude API, Мониторинг, Открыть наружу через Cloudflare Tunnel (бесплатно, без аккаунта), Проверка вручную, Стоимость, Установка (4 команды), Что нужно на сервере, Что это НЕ делает (осознанно)

### Community 17 - "grader-server/package.json"
Cohesion: 0.13
Nodes (14): dependencies, dotenv, express, description, engines, node, dotenv, express (+6 more)

### Community 18 - "grader-server/server.js"
Cohesion: 0.14
Nodes (9): ALLOWED_ORIGINS, app, express, hits, key(), pickProvider(), PORT, PREFERRED (+1 more)

### Community 19 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+5 more)

### Community 20 - "sandbox-server/package.json"
Cohesion: 0.14
Nodes (13): node-pty, ws, description, engines, node, dotenv, express, main (+5 more)

### Community 21 - "ui-icons.ts"
Cohesion: 0.12
Nodes (20): ACCESSORY_ICONS, CAR_ICONS, carIcon(), CATEGORY_ICONS, CLOTHES_ICONS, COMFORT_ICONS, FOOD_ICONS, HOME_ICONS (+12 more)

### Community 22 - "inline-code.ts"
Cohesion: 0.18
Nodes (13): GLOSSARY, GlossaryEntry, GlossaryRow, searchGlossary(), openGlossary(), openGlossary(), rowHtml(), codeConfidence() (+5 more)

### Community 23 - "Terminal Ops Academy"
Cohesion: 0.25
Nodes (7): Terminal Ops Academy, Как добавить задание, Команды, Куда расти, Модель контента: урок из маленьких шагов, Проверки в тестах, Структура

### Community 24 - "missions/index.ts"
Cohesion: 0.13
Nodes (15): Act, Mission, act02, act04, act05, seedRepo(), act06, seedApp() (+7 more)

### Community 25 - "esc"
Cohesion: 0.16
Nodes (19): explainTopic(), leaveSandbox(), BriefingHandlers, renderBriefing(), esc(), explainCurrentStep(), ExplainPhase, PanelHandlers (+11 more)

### Community 26 - "lessons/index.ts"
Cohesion: 0.18
Nodes (18): act01, act02, act03, act04, act05, act06, act07, act08 (+10 more)

### Community 27 - "certificate.ts"
Cohesion: 0.36
Nodes (8): openCertificate(), buildCertificateCanvas(), certificateText(), CertStats, downloadCertificate(), wrap(), toast(), base

### Community 28 - "exams.ts"
Cohesion: 0.11
Nodes (17): EXAM_01, EXAM_02, EXAM_03, EXAM_04, EXAM_05, EXAM_06, EXAM_07, EXAM_08 (+9 more)

### Community 29 - "Terminal Ops Academy"
Cohesion: 0.29
Nodes (6): graphify, Terminal Ops Academy, Команда ролей (`.claude/agents/`), Проверки (запускай сам, не верь отчётам), Процесс, Устройство

### Community 30 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 31 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, dotenv, express, node-pty, ws

### Community 32 - "Pipeline Sandbox Server — разворачивание на своём сервере"
Cohesion: 0.29
Nodes (6): Pipeline Sandbox Server — разворачивание на своём сервере, Мониторинг, Открыть наружу через Cloudflare Tunnel (бесплатно, без аккаунта), Установка (5 команд), Что нужно на сервере, Что это НЕ делает (осознанно, ради безопасности)

### Community 33 - "cloud.ts"
Cohesion: 0.10
Nodes (32): @supabase/supabase-js, 1. [Medium] Обход allowlist по Origin в sandbox-server — эксплуатируемо, 3. [Low] Открытая регистрация без анти-абьюз мер → ресурсная нагрузка на sandbox-хост, 4. [Info] Неиспользуемая часть схемы БД — `comments` (решение за владельцем), 5. [Info] Целостность локального прогресса — принято как есть, SECURITY_REVIEW.md — red-team-style review, Итог, Находки (+24 more)

### Community 34 - "pages.ts"
Cohesion: 0.11
Nodes (35): MAX_BOX, ACTS, bar(), career(), charTile(), countLessonToday(), dailyGoal(), doneToday() (+27 more)

### Community 35 - "startLesson"
Cohesion: 0.25
Nodes (14): shortCwd(), enterStep(), handleInput(), handleSandbox(), mountSandbox(), startLesson(), clearTerminal(), InputHistory (+6 more)

### Community 36 - "log"
Cohesion: 0.40
Nodes (6): closeSession(), dockerKill(), log(), rateLimited(), shutdown(), wss

### Community 45 - "ui/life.ts"
Cohesion: 0.23
Nodes (16): buy(), clamp(), eat(), spend(), unequipAccessory(), xpEarnBonusPct(), bar(), btn() (+8 more)

### Community 46 - "$"
Cohesion: 0.25
Nodes (16): applyRoute(), confirmReset(), enterView(), go(), routeFromHash(), setRailOpen(), showHow(), showLegacyImport() (+8 more)

### Community 47 - "Terminal Ops Academy — PROJECT.md"
Cohesion: 0.14
Nodes (14): 10. Известные ограничения и куда смотреть дальше, 11. Как продолжать работу с этим файлом, 1. Что это за проект, 2. Сюжет и педагогическая идея, 3. Технологический стек, 5. RPG-слой: деньги, здоровье, покупки, карьера, 7. Капстоун — единственное «настоящее» окружение, 8. Деплой — ветки и «зеркала» (+6 more)

### Community 48 - "legacy-import.ts"
Cohesion: 0.26
Nodes (10): applyLegacy(), countKeys(), importLife(), KEYS, LegacySave, LegacySummary, readLegacySave(), summarize() (+2 more)

### Community 49 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, build:single, dev, format, format:check, lint, preview (+3 more)

### Community 50 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-prettier, prettier, typescript, typescript-eslint, vite, vite-plugin-pwa (+2 more)

### Community 51 - "writeFile"
Cohesion: 0.40
Nodes (8): writeFile(), seedApp(), seedWithContainer(), seedWithDockerfile(), seedWithImage(), seedGrafana(), seedWithDash(), seedWithDs()

### Community 52 - "client.ts"
Cohesion: 0.36
Nodes (7): closeReason(), encodeAuth(), encodeInput(), encodeResize(), parseServerMsg(), SandboxHandlers, ServerMsg

### Community 53 - "live.ts"
Cohesion: 0.28
Nodes (7): @xterm/addon-fit, @xterm/xterm, openLiveServerFlow(), sandboxUrl(), Deps, esc(), openLiveServer()

### Community 54 - "character.ts"
Cohesion: 0.32
Nodes (7): Appearance, Sex, Life, BoolField, CharacterDeps, NumField, LifeDeps

### Community 55 - "renderPanel"
Cohesion: 0.67
Nodes (7): afterStep(), applyResult(), askMentor(), openFileEditor(), renderPanel(), run(), setTaskStatus()

### Community 57 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, @supabase/supabase-js, @xterm/addon-fit, @xterm/xterm

## Knowledge Gaps
- **7 isolated node(s):** `express`, `dotenv`, `eslint`, `prettier`, `typescript` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 362 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `engine/life.ts`, `grader.ts`, `pages.ts`, `package.json`, `engine/review.ts`, `avatar.ts`, `career.ts`, `capstone.ts`, `legacy-import.ts`, `client.ts`, `ui-icons.ts`, `inline-code.ts`, `lessons/index.ts`, `certificate.ts`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `express`, `dotenv`, `eslint` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getNode` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._
- **Why does `World` connect `vitest` to `getNode`, `startLesson`, `main.ts`, `types.ts`, `mkdirp`, `vfs.ts`, `$`, `resolvePath`, `writeFile`, `missions/index.ts`, `lessons/index.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.06302521008403361 - nodes in this community are weakly interconnected._
- **Why does `Progress` connect `engine/review.ts` to `vitest`, `cloud.ts`, `grader.ts`, `pages.ts`, `engine/life.ts`, `main.ts`, `avatar.ts`, `career.ts`, `legacy-import.ts`, `character.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `engine/life.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._