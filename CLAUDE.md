# Terminal Ops Academy

Обучающая DevOps-игра: Vite + TypeScript, симулятор терминала, 14 актов / ~283 урока, ИИ-проверка ответов
(Supabase Edge Function `grader`, Groq), синхронизация прогресса (Supabase). Публикация — GitHub Pages:
`play/` собирается из ветки `vite-rewrite`, `/next/` — из `main`.

## Устройство
- `src/lessons/actNN.ts` — уроки. Шаги: `say` / `watch` / `type` / `do` / `quiz` (типы — `src/engine/types.ts`).
- `src/engine/` — движок: shell, lesson-run, grader, progress, life. `src/commands/` — команды симулятора.
- `src/ui/` — интерфейс; `src/style.css` — стили; `src/data/` — данные (`interview.ts` — банк вопросов повторения).
- `src/sync/` — синхронизация прогресса (слияние обязано быть монотонным — см. `tests/sync-merge.spec.ts`).
- `supabase/functions/grader/` — серверная проверка ответов; `sandbox-server/` — настоящий Linux-контейнер.

## Проверки (запускай сам, не верь отчётам)
- `npx tsc --noEmit`
- `npx eslint <изменённые файлы>`
- `npx vitest run --exclude "**/.claude/**"` — флаг обязателен, иначе тесты подхватят копии в `.claude/worktrees`.
- `npx prettier --write <изменённые файлы>`
- Сборка: `npx vite build --mode single` → `dist-single/index.html`.

## Процесс
- Ветки — от `vite-rewrite`, изменения принимаются PR в `vite-rewrite`; `play/` и `/next/` обновляются отдельными sync-PR.
- В сообщения коммитов и описания PR не добавлять строки атрибуции.
- Секреты и ключи не вводить и не печатать: ключи вводит владелец.

## Команда ролей (`.claude/agents/`)
cto, architect, ux-designer, frontend-dev, backend-dev, devops, qa-tester, reviewer.
Решают и проверяют (cto, architect, ux-designer, qa-tester, reviewer) — код продукта не правят.
Пишут код (frontend-dev, backend-dev, devops). Reviewer перепроверяет всех и не доверяет отчётам.

## graphify

В проекте есть граф знаний в `graphify-out/` (узлы-хабы, сообщества, связи между файлами).

Правила:
- Если есть `graphify-out/graph.json`, на вопрос о коде сначала выполни `graphify query "<вопрос>"` — до первого grep,
  поиска или чтения исходника — и вставляй это правило в промпт каждого субагента, который изучает код.
  Сырые файлы читай только в местах, которые нашёл граф. Связи: `graphify path "A" "B"`, понятие: `graphify explain "X"`.
- Для общего обзора архитектуры читай `graphify-out/GRAPH_REPORT.md`.
- После правок кода запусти `graphify update .` (только AST, бесплатно, без ключей).
- Закоммиченный `graphify-out/graph.json` перезаписывается целиком при каждой сборке — большой дифф в PR ожидаем.

Заметка для этой машины: команды `graphify` нет в PATH, вызывай по полному пути:
`C:/Users/krashennyi.r/AppData/Roaming/Python/Python313/Scripts/graphify.exe`
(например `... query "<вопрос>"`, `... explain "renderLessonPanel()"`, `... update .`).
