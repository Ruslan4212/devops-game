export interface FileNode {
  type: "file";
  content: string;
  mode: string;
  owner?: string;
}
export interface DirNode {
  type: "dir";
  children: Record<string, FSNode>;
}
export type FSNode = FileNode | DirNode;

export interface Proc {
  pid: number;
  user: string;
  cpu: number;
  cmd: string;
  port?: number;
}

export interface Service {
  desc: string;
  state: "active" | "inactive" | "failed" | "auto-restart";
  enabled: boolean;
  needsPort?: number;
  err?: string | null;
  journal?: string[];
  /** политика авто-перезапуска из unit-файла */
  restart?: "no" | "on-failure" | "always";
  /** сколько попыток за окно допускается (systemd: StartLimitBurst) */
  startLimitBurst?: number;
  /** окно в секундах (systemd: StartLimitIntervalSec) */
  startLimitInterval?: number;
  /** пауза между попытками (systemd: RestartSec) */
  restartSec?: number;
  /** сломанный конфиг: сервис падает сразу при старте */
  badConfig?: boolean;
  /** сколько раз systemd уже перезапускал сервис */
  restartCount?: number;
  /** размер журнала сервиса в строках (растёт при шторме) */
  journalLines?: number;
}

export interface Commit {
  msg: string;
  files: string[];
  branch: string;
  hash: string;
}
export interface GitState {
  branch: string;
  branches: string[];
  staged: string[];
  commits: Commit[];
  remote: string | null;
  pushed: number;
  merged?: string[];
}

export interface DockerImage {
  tag: string;
  layers: number;
}
export interface Container {
  name: string;
  image: string;
  state: "running" | "exited";
  hostPort: number | null;
  cPort: number | null;
  logs: string[];
}

export interface CiRun {
  n: number;
  stages: [string, string][];
  ok: boolean;
  secretLeak: boolean;
  log: string[];
}
export interface CiState {
  runs: CiRun[];
  secrets: string[];
  workflow?: string;
}

export interface TfState {
  inited: boolean;
  plan: { add: string[]; del: string[] } | null;
  applied: string[];
}

export interface K8sDeploy {
  name: string;
  replicas: number;
  image: string;
  crash: boolean;
}
export interface K8sPod {
  name: string;
  deploy: string;
  status: string;
  restarts: number;
}
export interface K8sState {
  deploys: K8sDeploy[];
  pods: K8sPod[];
  svcs: { name: string; port: number }[];
}

export interface Alert {
  name: string;
  sev: string;
  desc: string;
}

/** Триггер Zabbix: имя, выражение и важность. */
export interface ZabbixTrigger {
  name: string;
  expr: string;
  severity: string;
}

/** Состояние симулятора Zabbix. */
export interface ZabbixState {
  /** конфиг агента прочитан и валиден (есть Server= и Hostname=) */
  agentConfigured: boolean;
  /** адрес Zabbix-сервера из конфига агента */
  serverAddr: string | null;
  /** свои метрики из UserParameter: ключ -> команда */
  userParams: Record<string, string>;
  /** заведённые триггеры */
  triggers: ZabbixTrigger[];
  /** сервер действительно достаёт метрики с хоста (агент настроен и сеть открыта) */
  serverReaches: boolean;
}

/** Цель, которую Prometheus опрашивает (job + адрес + жива ли она). */
export interface PromTarget {
  job: string;
  instance: string;
  up: boolean;
}

/** Панель дашборда Grafana: заголовок, запрос PromQL и единица измерения. */
export interface GrafanaPanel {
  title: string;
  expr: string;
  unit: string;
}

/** Состояние симулятора Grafana. */
export interface GrafanaState {
  /** имена подключённых источников данных */
  datasources: string[];
  /** загруженные дашборды */
  dashboards: { title: string; panels: GrafanaPanel[] }[];
}

/** Состояние симулятора Prometheus. */
export interface PromState {
  /** запущенные экспортёры: порт -> имя (node, app, blackbox) */
  exporters: Record<number, string>;
  /** цели, которые Prometheus опрашивает по конфигу */
  targets: PromTarget[];
  /** конфиг применён (prometheus.yml прошёл проверку и загружен) */
  configLoaded: boolean;
  /** правила алертов загружены */
  rulesLoaded: boolean;
}

/** Состояние симулятора Python (акт «Python для DevOps»). */
export interface PyState {
  /** активировано виртуальное окружение: python -m venv .venv && source .venv/bin/activate */
  venv: boolean;
  /** пакеты, установленные через pip (requests, pyyaml, ...) */
  pkgs: string[];
  /** сколько раз пользователь успешно запустил python-скрипт */
  ran: number;
}

export interface LogEntry {
  cmd: string;
  code: number;
}

export interface World {
  user: string;
  host: string;
  fs: DirNode;
  cwd: string;
  env: Record<string, string>;
  procs: Proc[];
  services: Record<string, Service>;
  ports: Record<number, string>;
  firewall: Record<number, boolean>;
  git: GitState | null;
  docker: { images: DockerImage[]; containers: Container[] };
  registry: string[];
  ci: CiState;
  tf: TfState;
  k8s: K8sState | null;
  /** состояние симулятора Prometheus (акт «Мониторинг») */
  prom?: PromState;
  /** состояние симулятора Grafana (акт «Дашборды») */
  grafana?: GrafanaState;
  /** состояние симулятора Zabbix (акт «Zabbix») */
  zabbix?: ZabbixState;
  /** состояние симулятора Python (акт «Python для DevOps») */
  py?: PyState;
  alerts: Alert[];
  code: number;
  log: LogEntry[];
  /** заготовки файлов, которые редактор подставляет при первом открытии */
  templates?: Record<string, string>;
  sudo?: boolean;
  scriptRan?: number;
  execedContainer?: boolean;
  /** заполненность диска в процентах (растёт при шторме перезапусков) */
  disk?: number;
}

export interface CmdResult {
  out: string;
  code: number;
  err?: boolean;
  /** управляющие сигналы для UI */
  clear?: boolean;
  hint?: boolean;
  restart?: boolean;
  edit?: string;
}

export type CommandFn = (args: string[], w: World, stdin: string | null, raw: string[]) => CmdResult;

export interface Objective {
  t: string;
  d: string;
  ok: (w: World) => boolean;
}

/** шаг эталонного решения: либо команда, либо запись файла через редактор */
export type SolutionStep = string | { file: string; content: string };

export interface Mission {
  id: string;
  act: number;
  title: string;
  xp: number;
  why: string;
  incident?: boolean;
  cheat: [string, string][];
  hints: string[];
  setup?: (w: World) => void;
  objs: Objective[];
  /** прогоняется тестами: доказывает, что задание в принципе проходимо */
  solution: SolutionStep[];
}

export interface Act {
  id: number;
  name: string;
}

/* ======================================================================
 *  Модель урока (новая): один шаг = одно действие.
 *  Ритм: смотри -> повтори -> сделай -> вопрос. Застрять нельзя.
 * ==================================================================== */

export type Check = (w: World) => boolean;

/** Просто текст-подводка. Кнопка «Дальше». */
export interface SayStep {
  kind: "say";
  text: string;
}

/** Команда выполняется сама, игрок видит вывод и пояснение. «I do». */
export interface WatchStep {
  kind: "watch";
  text?: string;
  run: string;
  note: string;
}

/** Игрок обязан набрать ровно эту команду — мышечная память. «We do». */
export interface TypeStep {
  kind: "type";
  text: string;
  cmd: string;
}

/** Настоящая маленькая задача. Ответ показывается сам после 2 промахов. «You do». */
export interface DoStep {
  kind: "do";
  text: string;
  check: Check;
  answer: string;
  hint: string;
  /** если шаг решается через редактор файла: куда автопрогон записывает `answer` */
  editFile?: string;
}

/** Проверка понимания без печати. */
export interface QuizStep {
  kind: "quiz";
  text: string;
  options: string[];
  answer: number;
  explain: string;
  /**
   * Уровень сложности 1–7 (только у экзаменационных уроков из `lessons/exams.ts`).
   * Экзамен выстраивает вопросы по возрастанию `d`: от «вспомни» до «разбери инцидент».
   * У обычных внутриурочных вопросов не задаётся.
   */
  d?: number;
}

export type Step = SayStep | WatchStep | TypeStep | DoStep | QuizStep;

export interface Lesson {
  id: string;
  act: number;
  title: string;
  /** одно предложение при старте урока */
  intro: string;
  xp: number;
  setup?: (w: World) => void;
  steps: Step[];
  /** только для уроков-адаптеров из старых заданий: как их проиграть в тесте */
  replay?: SolutionStep[];
}
