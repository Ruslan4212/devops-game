# Graph Report - devops-game-team-c  (2026-10-22)

## Corpus Check
- 171 files · ~375,106 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 8, .example 3, .Dockerfile 1)

## Summary
- 1072 nodes · 3040 edges · 54 communities (44 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2345fafa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- missions/index.ts
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
- prom.ts
- sandbox-server/server.js
- def
- grader/index.ts
- disks.ts
- Grader Server — проверка смысла ответов через Claude API
- grader-server/package.json
- grader-server/server.js
- compilerOptions
- sandbox-server/package.json
- registry.ts
- pages.ts
- Terminal Ops Academy
- startLesson
- vitest
- esc
- certificate.ts
- World
- Terminal Ops Academy
- .prettierrc.json
- dependencies
- Pipeline Sandbox Server — разворачивание на своём сервере
- cloud.ts
- LessonRun
- exams.ts
- log
- vite-env.d.ts
- set-key.sh
- exams.ts
- lesson-run.ts
- 4. Архитектура кода (где что лежит)
- MissionRun
- scripts
- devDependencies
- client.ts
- live.ts
- dependencies

## God Nodes (most connected - your core abstractions)
1. `$` - 55 edges
2. `writeFile()` - 52 edges
3. `World` - 47 edges
4. `icon()` - 46 edges
5. `mkdirp()` - 46 edges
6. `esc()` - 41 edges
7. `vitest` - 40 edges
8. `resolvePath()` - 40 edges
9. `LessonRun` - 35 edges
10. `getNode()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения)` --references--> `avatarSVG()`  [INFERRED]
  PROJECT.md → src/data/avatar.ts
- `6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения)` --references--> `accessoryOverlay()`  [INFERRED]
  PROJECT.md → src/data/avatar.ts
- `4. Архитектура кода (где что лежит)` --references--> `LessonRun`  [INFERRED]
  PROJECT.md → src/engine/lesson-run.ts
- `4. Архитектура кода (где что лежит)` --references--> `Life`  [INFERRED]
  PROJECT.md → src/engine/life.ts
- `10. Известные ограничения и куда смотреть дальше` --references--> `onLessonComplete()`  [INFERRED]
  PROJECT.md → src/engine/life.ts

## Import Cycles
- None detected.

## Communities (54 total, 10 thin omitted)

### Community 0 - "missions/index.ts"
Cohesion: 0.07
Nodes (79): syncPods(), Act, Lesson, Mission, World, dir(), file(), getNode() (+71 more)

### Community 1 - "vitest"
Cohesion: 0.36
Nodes (6): vitest, execLine(), splitChain(), baseFS(), newWorld(), seeded()

### Community 2 - "engine/life.ts"
Cohesion: 0.06
Nodes (63): 10. Известные ограничения и куда смотреть дальше, 11. Как продолжать работу с этим файлом, 1. Что это за проект, 2. Сюжет и педагогическая идея, 3. Технологический стек, 5. RPG-слой: деньги, здоровье, покупки, карьера, 6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения), 7. Капстоун — единственное «настоящее» окружение (+55 more)

### Community 3 - "grader.ts"
Cohesion: 0.06
Nodes (51): Как работаем, Нельзя, ТЗ: перекройка Terminal Ops Academy — дизайн и повторение, Три подхода (обязательно разные), Часть 1. Дизайн — критерии приёмки, Часть 2. Повторение — критерии приёмки, Шкала жюри (каждый пункт 0–10), akin() (+43 more)

### Community 4 - "engine/review.ts"
Cohesion: 0.07
Nodes (52): LessonState, loadProgress(), migrateProgress(), Progress, BOX_INTERVAL_DAYS, buildReviewPool(), countToNumber(), ensureMarathon() (+44 more)

### Community 5 - "package.json"
Cohesion: 0.14
Nodes (13): description, name, private, type, version, eslint, eslint-config-prettier, prettier (+5 more)

### Community 6 - "main.ts"
Cohesion: 0.06
Nodes (93): parseSalary(), defaultLife(), isDead(), clearProgress(), saveProgress(), shortCwd(), lessonById(), afterStep() (+85 more)

### Community 7 - "types.ts"
Cohesion: 0.08
Nodes (23): Alert, Check, CiRun, CiState, Commit, Container, DockerImage, FileNode (+15 more)

### Community 8 - "avatar.ts"
Cohesion: 0.09
Nodes (44): accessoryOverlay(), Appearance, AvatarOptions, avatarSVG(), BEARD_PATHS, beardPath(), BEARDS, crown() (+36 more)

### Community 9 - "career.ts"
Cohesion: 0.13
Nodes (25): ACT_TO_TOPIC, Grade, Job, JOBS, jobTopics(), pickQuestions(), SOFT_QUESTIONS, SoftQuestion (+17 more)

### Community 10 - "capstone.ts"
Cohesion: 0.32
Nodes (5): @xterm/addon-fit, @xterm/xterm, CAPSTONE_TASKS, Deps, SANDBOX_URL

### Community 11 - "prom.ts"
Cohesion: 0.25
Nodes (6): UDP_PORTS, ZONE, metricsText(), promInit(), promShortValue(), PromState

### Community 12 - "sandbox-server/server.js"
Cohesion: 0.10
Nodes (14): ALLOWED_ORIGINS, app, attempts, crypto, { execFile }, express, http, MAX_CONCURRENT (+6 more)

### Community 13 - "def"
Cohesion: 0.21
Nodes (8): KNOWN_PACKAGES, def(), escapeRegex(), DirNode, FSNode, copyNode(), parentOf(), splitPath()

### Community 14 - "grader/index.ts"
Cohesion: 0.12
Nodes (15): ALLOWED_ORIGINS, ask(), Bool, CommandVerdict, corsHeaders(), env(), Explanation, extractJson() (+7 more)

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

### Community 21 - "registry.ts"
Cohesion: 0.18
Nodes (11): ComposeService, loadCompose(), parseCompose(), CMDS, overridePath(), reload(), unitText(), CmdResult (+3 more)

### Community 22 - "pages.ts"
Cohesion: 0.06
Nodes (62): GLOSSARY, GlossaryEntry, GlossaryRow, searchGlossary(), filledIconNames, icon(), IconDef, iconNames (+54 more)

### Community 23 - "Terminal Ops Academy"
Cohesion: 0.25
Nodes (7): Terminal Ops Academy, Как добавить задание, Команды, Куда расти, Модель контента: урок из маленьких шагов, Проверки в тестах, Структура

### Community 24 - "startLesson"
Cohesion: 0.39
Nodes (4): runPipeline(), evalTest(), NUM_OPS, resolvePath()

### Community 25 - "vitest"
Cohesion: 0.36
Nodes (5): applyManifest(), dataKeys(), k8sInit(), E(), K8sState

### Community 26 - "esc"
Cohesion: 0.44
Nodes (9): analyze(), evalPrint(), pipMain(), PKG_VER, pyInit(), pythonMain(), runVenv(), O() (+1 more)

### Community 27 - "certificate.ts"
Cohesion: 0.43
Nodes (6): buildCertificateCanvas(), certificateText(), CertStats, downloadCertificate(), wrap(), base

### Community 28 - "World"
Cohesion: 0.29
Nodes (5): BUILTIN, CMP, loadAgentConf(), zabbixInit(), ZabbixState

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
Cohesion: 0.09
Nodes (33): @supabase/supabase-js, 1. [Medium] Обход allowlist по Origin в sandbox-server — эксплуатируемо, 2. [Medium] Лидерборд принимает нефальсифицируемые на вид, но фактически клиентские данные, 3. [Low] Открытая регистрация без анти-абьюз мер → ресурсная нагрузка на sandbox-хост, 4. [Info] Неиспользуемая часть схемы БД — `comments` (решение за владельцем), 5. [Info] Целостность локального прогресса — принято как есть, SECURITY_REVIEW.md — red-team-style review, Итог (+25 more)

### Community 34 - "LessonRun"
Cohesion: 0.17
Nodes (4): applyFileEdit(), LessonRun, PageDeps, answerCurrentStep()

### Community 36 - "log"
Cohesion: 0.40
Nodes (6): closeSession(), dockerKill(), log(), rateLimited(), shutdown(), wss

### Community 45 - "exams.ts"
Cohesion: 0.10
Nodes (18): EXAM_01, EXAM_02, EXAM_03, EXAM_04, EXAM_05, EXAM_06, EXAM_07, EXAM_08 (+10 more)

### Community 46 - "lesson-run.ts"
Cohesion: 0.16
Nodes (12): norm(), ReplayAction, StepResult, typoHint(), DoStep, QuizStep, Step, TypeStep (+4 more)

### Community 47 - "4. Архитектура кода (где что лежит)"
Cohesion: 0.31
Nodes (9): 4. Архитектура кода (где что лежит), Тестовый паттерн (обязательно соблюдать при любом расширении), execPipeline(), expand(), fail(), ok(), runOne(), runScript() (+1 more)

### Community 48 - "MissionRun"
Cohesion: 0.23
Nodes (4): RANKS, MissionRun, MISSIONS, TOTAL_XP

### Community 49 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, build:single, dev, format, format:check, lint, preview (+3 more)

### Community 50 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-prettier, prettier, typescript, typescript-eslint, vite, vite-plugin-pwa (+2 more)

### Community 51 - "client.ts"
Cohesion: 0.21
Nodes (9): openCapstone(), closeReason(), encodeAuth(), encodeInput(), encodeResize(), parseServerMsg(), SandboxClient, SandboxHandlers (+1 more)

### Community 52 - "live.ts"
Cohesion: 0.47
Nodes (4): sandboxUrl(), Deps, esc(), openLiveServer()

### Community 56 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, @supabase/supabase-js, @xterm/addon-fit, @xterm/xterm

## Knowledge Gaps
- **7 isolated node(s):** `express`, `dotenv`, `eslint`, `prettier`, `typescript` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 350 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `missions/index.ts`, `engine/life.ts`, `grader.ts`, `engine/review.ts`, `package.json`, `main.ts`, `avatar.ts`, `career.ts`, `capstone.ts`, `exams.ts`, `lesson-run.ts`, `MissionRun`, `client.ts`, `pages.ts`, `certificate.ts`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **What connects `express`, `dotenv`, `eslint` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `missions/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06629405371836672 - nodes in this community are weakly interconnected._
- **Why does `World` connect `missions/index.ts` to `vitest`, `LessonRun`, `main.ts`, `types.ts`, `prom.ts`, `lesson-run.ts`, `disks.ts`, `4. Архитектура кода (где что лежит)`, `MissionRun`, `registry.ts`, `startLesson`, `vitest`, `esc`, `World`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `engine/life.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.060641627543035995 - nodes in this community are weakly interconnected._
- **Why does `LessonRun` connect `LessonRun` to `missions/index.ts`, `grader.ts`, `main.ts`, `exams.ts`, `lesson-run.ts`, `4. Архитектура кода (где что лежит)`, `pages.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `grader.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056866303690260134 - nodes in this community are weakly interconnected._