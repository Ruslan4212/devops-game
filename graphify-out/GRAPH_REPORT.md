# Graph Report - devops-academy  (2026-10-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 970 nodes · 2618 edges · 45 communities (36 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6a69e236`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- vfs.ts
- vitest
- engine/life.ts
- grader.ts
- progress.ts
- package.json
- main.ts
- types.ts
- avatar.ts
- career.ts
- capstone.ts
- grafana.ts
- sandbox-server/server.js
- fs2.ts
- grader/index.ts
- registry.ts
- Grader Server — проверка смысла ответов через Claude API
- grader-server/package.json
- grader-server/server.js
- compilerOptions
- sandbox-server/package.json
- readFile
- inline-code.ts
- Terminal Ops Academy
- resolvePath
- E
- O
- certificate.ts
- zabbix.ts
- Terminal Ops Academy
- .prettierrc.json
- dependencies
- Pipeline Sandbox Server — разворачивание на своём сервере
- cloud.ts
- theme.ts
- core.ts
- log
- vite-env.d.ts
- set-key.sh

## God Nodes (most connected - your core abstractions)
1. `writeFile()` - 52 edges
2. `World` - 46 edges
3. `mkdirp()` - 46 edges
4. `$` - 45 edges
5. `resolvePath()` - 40 edges
6. `vitest` - 39 edges
7. `getNode()` - 34 edges
8. `LessonRun` - 33 edges
9. `icon()` - 31 edges
10. `esc()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `4. Архитектура кода (где что лежит)` --references--> `Lesson`  [INFERRED]
  PROJECT.md → src/engine/types.ts
- `4. Архитектура кода (где что лежит)` --references--> `World`  [INFERRED]
  PROJECT.md → src/engine/types.ts
- `4. Архитектура кода (где что лежит)` --references--> `Life`  [INFERRED]
  PROJECT.md → src/engine/life.ts
- `4. Архитектура кода (где что лежит)` --references--> `Progress`  [INFERRED]
  PROJECT.md → src/engine/progress.ts
- `10. Известные ограничения и куда смотреть дальше` --references--> `onLessonComplete()`  [INFERRED]
  PROJECT.md → src/engine/life.ts

## Import Cycles
- None detected.

## Communities (45 total, 9 thin omitted)

### Community 0 - "vfs.ts"
Cohesion: 0.07
Nodes (79): syncPods(), Act, Lesson, Mission, World, dir(), file(), getNode() (+71 more)

### Community 1 - "vitest"
Cohesion: 0.07
Nodes (32): 4. Архитектура кода (где что лежит), Тестовый паттерн (обязательно соблюдать при любом расширении), vitest, applyFileEdit(), LessonRun, norm(), ReplayAction, StepResult (+24 more)

### Community 2 - "engine/life.ts"
Cohesion: 0.05
Nodes (71): 10. Известные ограничения и куда смотреть дальше, 11. Как продолжать работу с этим файлом, 1. Что это за проект, 2. Сюжет и педагогическая идея, 3. Технологический стек, 5. RPG-слой: деньги, здоровье, покупки, карьера, 6. Что добавлено в САМОЙ ПОСЛЕДНЕЙ сессии (важно для продолжения), 7. Капстоун — единственное «настоящее» окружение (+63 more)

### Community 3 - "grader.ts"
Cohesion: 0.05
Nodes (45): akin(), CommandJudgeInput, compare(), Concept, conceptsOf(), ExplainInput, GradeInput, GradeResult (+37 more)

### Community 4 - "progress.ts"
Cohesion: 0.06
Nodes (41): Как работаем, Нельзя, ТЗ: перекройка Terminal Ops Academy — дизайн и повторение, Три подхода (обязательно разные), Часть 1. Дизайн — критерии приёмки, Часть 2. Повторение — критерии приёмки, Шкала жюри (каждый пункт 0–10), LessonState (+33 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (38): dependencies, @supabase/supabase-js, @xterm/addon-fit, @xterm/xterm, description, devDependencies, eslint, eslint-config-prettier (+30 more)

### Community 6 - "main.ts"
Cohesion: 0.05
Nodes (94): parseSalary(), TechQuestion, icon(), iconNames, ICONS, asVerdict(), callGrader(), explainTopic() (+86 more)

### Community 7 - "types.ts"
Cohesion: 0.08
Nodes (23): Alert, Check, CiRun, CiState, CommandFn, Commit, Container, DockerImage (+15 more)

### Community 8 - "avatar.ts"
Cohesion: 0.13
Nodes (30): accessoryOverlay(), Appearance, AvatarOptions, avatarSVG(), beard(), BEARD_PATHS, BEARDS, cap() (+22 more)

### Community 9 - "career.ts"
Cohesion: 0.13
Nodes (24): ACT_TO_TOPIC, Grade, Job, JOBS, jobTopics(), pickQuestions(), SOFT_QUESTIONS, SoftQuestion (+16 more)

### Community 10 - "capstone.ts"
Cohesion: 0.11
Nodes (19): @xterm/addon-fit, @xterm/xterm, CAPSTONE_TASKS, openLiveServerFlow(), Deps, openCapstone(), SANDBOX_URL, closeReason() (+11 more)

### Community 11 - "grafana.ts"
Cohesion: 0.16
Nodes (8): UDP_PORTS, ZONE, metricsText(), promInit(), promShortValue(), GrafanaPanel, GrafanaState, PromState

### Community 12 - "sandbox-server/server.js"
Cohesion: 0.10
Nodes (14): ALLOWED_ORIGINS, app, attempts, crypto, { execFile }, express, http, MAX_CONCURRENT (+6 more)

### Community 13 - "fs2.ts"
Cohesion: 0.27
Nodes (6): escapeRegex(), DirNode, FSNode, copyNode(), parentOf(), splitPath()

### Community 14 - "grader/index.ts"
Cohesion: 0.12
Nodes (15): ALLOWED_ORIGINS, ask(), Bool, CommandVerdict, corsHeaders(), env(), Explanation, extractJson() (+7 more)

### Community 15 - "registry.ts"
Cohesion: 0.24
Nodes (4): initDisks(), KNOWN_PACKAGES, CMDS, def()

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

### Community 21 - "readFile"
Cohesion: 0.26
Nodes (8): ComposeService, loadCompose(), parseCompose(), overridePath(), reload(), unitText(), Service, readFile()

### Community 22 - "inline-code.ts"
Cohesion: 0.21
Nodes (10): GLOSSARY, GlossaryEntry, GlossaryRow, searchGlossary(), codeConfidence(), COMMANDS, EXTRA_COMMANDS, INLINE_FRAGMENT (+2 more)

### Community 23 - "Terminal Ops Academy"
Cohesion: 0.25
Nodes (7): Terminal Ops Academy, Как добавить задание, Команды, Куда расти, Модель контента: урок из маленьких шагов, Проверки в тестах, Структура

### Community 24 - "resolvePath"
Cohesion: 0.39
Nodes (4): runPipeline(), evalTest(), NUM_OPS, resolvePath()

### Community 25 - "E"
Cohesion: 0.36
Nodes (5): applyManifest(), dataKeys(), k8sInit(), E(), K8sState

### Community 26 - "O"
Cohesion: 0.53
Nodes (8): analyze(), evalPrint(), pipMain(), PKG_VER, pyInit(), pythonMain(), runVenv(), O()

### Community 27 - "certificate.ts"
Cohesion: 0.43
Nodes (6): buildCertificateCanvas(), certificateText(), CertStats, downloadCertificate(), wrap(), base

### Community 28 - "zabbix.ts"
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
Cohesion: 0.10
Nodes (30): @supabase/supabase-js, 1. [Medium] Обход allowlist по Origin в sandbox-server — эксплуатируемо, 2. [Medium] Лидерборд принимает нефальсифицируемые на вид, но фактически клиентские данные, 3. [Low] Открытая регистрация без анти-абьюз мер → ресурсная нагрузка на sandbox-хост, 4. [Info] Неиспользуемая часть схемы БД — `comments` (решение за владельцем), 5. [Info] Целостность локального прогресса — принято как есть, SECURITY_REVIEW.md — red-team-style review, Итог (+22 more)

### Community 34 - "theme.ts"
Cohesion: 0.60
Nodes (4): applyTheme(), initThemeSwitch(), readTheme(), ThemeChoice

### Community 36 - "log"
Cohesion: 0.40
Nodes (6): closeSession(), dockerKill(), log(), rateLimited(), shutdown(), wss

## Knowledge Gaps
- **7 isolated node(s):** `dotenv`, `express`, `dotenv`, `express`, `eslint` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 348 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `vfs.ts`, `engine/life.ts`, `grader.ts`, `progress.ts`, `package.json`, `main.ts`, `avatar.ts`, `career.ts`, `capstone.ts`, `inline-code.ts`, `certificate.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `dotenv`, `express`, `dotenv` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `vfs.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06629405371836672 - nodes in this community are weakly interconnected._
- **Why does `LessonRun` connect `vitest` to `vfs.ts`, `main.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.06740506329113924 - nodes in this community are weakly interconnected._
- **Why does `World` connect `vfs.ts` to `vitest`, `main.ts`, `types.ts`, `grafana.ts`, `registry.ts`, `readFile`, `resolvePath`, `E`, `O`, `zabbix.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `engine/life.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052531645569620256 - nodes in this community are weakly interconnected._