import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "../missions/helpers";
import type { Lesson, World } from "../engine/types";

const TF_CONFIG =
  'resource "local_file" "config" {\n  filename = "app.conf"\n  content  = "env=prod"\n}\n';

const TF_TWO =
  'resource "local_file" "config" {\n  filename = "app.conf"\n  content  = "env=prod"\n}\n\n' +
  'resource "local_file" "database" {\n  filename = "db.conf"\n  content  = "host=db-main"\n}\n';

/** Пустой каталог инфраструктуры. */
function seedInfra(w: World): void {
  mkdirp(w, "/home/devops/infra");
  w.cwd = "/home/devops/infra";
}

export const act08: Lesson[] = [
  {
    id: "8.1",
    act: 8,
    title: "Зачем инфраструктура как код",
    xp: 15,
    intro: "Проблема: сервер настроили руками в панели, и повторить это невозможно.",
    steps: [
      {
        kind: "say",
        text:
          "Сервер обычно поднимают так: заходят в панель облака, тыкают кнопки — создать\n" +
          "виртуалку, выбрать размер, добавить диск, настроить сеть, открыть порты.\n\n" +
          "Через полгода никто не помнит, что именно нажимали. Нужен второй такой же сервер —\n" +
          "делают на глаз, получается чуть другой. Такой сервер называют «снежинкой»:\n" +
          "уникальный, настроенный вручную, невоспроизводимый.",
      },
      {
        kind: "say",
        text:
          "Чем плоха «снежинка»:\n\n" +
          "  • упал — восстанавливать по памяти, часами\n" +
          "  • нельзя поднять точную копию для тестов\n" +
          "  • изменения никто не отслеживает — кто открыл этот порт и зачем?\n" +
          "  • новый человек в команде не понимает, как всё устроено",
      },
      {
        kind: "say",
        text:
          "Решение — «инфраструктура как код» (Infrastructure as Code, IaC).\n\n" +
          "Всю инфраструктуру — виртуалки, сети, диски, правила файрвола — ОПИСЫВАЮТ\n" +
          "текстовыми файлами и хранят в git. Инструмент читает файлы и создаёт\n" +
          "ровно то, что там написано.\n\n" +
          "Самый распространённый инструмент —  Terraform .",
      },
      {
        kind: "say",
        text:
          "Что это даёт:\n\n" +
          "  • инфраструктура под контролем версий — видно историю, кто и что менял\n" +
          "  • поднять точную копию — одна команда\n" +
          "  • изменения проходят ревью в pull request, как код\n" +
          "  • сервер-«снежинка» превращается в воспроизводимый из файла",
      },
      {
        kind: "quiz",
        text: "Что такое «инфраструктура как код»?",
        options: [
          "Серверы, сети и диски описаны файлами в git, а не настроены кликами",
          "Код приложения, который работает на сервере",
          "Способ ускорить сайт",
        ],
        answer: 0,
        explain: "Инфраструктура становится воспроизводимой и отслеживаемой — как обычный код.",
      },
    ],
  },
  {
    id: "8.2",
    act: 8,
    title: "Декларативный подход",
    xp: 20,
    intro: "Ты описываешь ЖЕЛАЕМЫЙ результат, а не шаги к нему.",
    steps: [
      {
        kind: "say",
        text:
          "Есть два способа объяснить компьютеру, что делать.\n\n" +
          "Императивный («как»): пошаговая инструкция.\n" +
          '  «создай виртуалку», «поставь nginx», «открой порт 80», «запусти сервис»\n\n' +
          "Декларативный («что»): описание конечного состояния.\n" +
          '  «должна существовать виртуалка с nginx и открытым портом 80»',
      },
      {
        kind: "say",
        text:
          "Terraform — декларативный. Ты пишешь, КАКОЙ должна быть инфраструктура.\n" +
          "Terraform сам смотрит, что уже есть, сравнивает с описанием и делает разницу:\n\n" +
          "  описано, но нет     → создать\n" +
          "  есть и совпадает    → не трогать\n" +
          "  есть, но описание изменилось → изменить\n" +
          "  есть, но в описании больше нет → удалить",
      },
      {
        kind: "say",
        text:
          "Почему это удобно: тебе не важно, в каком состоянии сейчас инфраструктура.\n" +
          "Запусти Terraform на пустом месте — он создаст всё. Запусти на уже готовом —\n" +
          "он ничего не сделает (всё и так совпадает). Это свойство называется\n" +
          "идемпотентность (помнишь из Акта 3): повторный запуск не ломает и не дублирует.",
      },
      {
        kind: "quiz",
        text:
          "Ты описал инфраструктуру в файле и применил. Запустил Terraform ещё раз, ничего не меняя. Что произойдёт?",
        options: [
          "Ничего — всё уже совпадает с описанием",
          "Всё создастся заново, получится дубль",
          "Terraform выдаст ошибку",
        ],
        answer: 0,
        explain: "Декларативный подход + идемпотентность: Terraform делает только разницу между «есть» и «описано».",
      },
    ],
  },
  {
    id: "8.3",
    act: 8,
    title: "Первый файл: блок resource",
    xp: 25,
    intro: "Инфраструктуру описывают в файлах .tf. Основной кирпич — resource.",
    setup: (w) => {
      seedInfra(w);
      w.templates = {
        "/home/devops/infra/main.tf":
          "# ЗАДАЧА: опиши один ресурс. Сотри этот комментарий и впиши:\n" +
          "#\n" +
          '#   resource "local_file" "config" {\n' +
          '#     filename = "app.conf"\n' +
          '#     content  = "env=prod"\n' +
          "#   }\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Файлы Terraform имеют расширение  .tf . Главный по имени —  main.tf .\n" +
          "Внутри — блоки. Основной блок называется  resource  — «ресурс», единица\n" +
          "инфраструктуры: виртуалка, сеть, файл, запись в DNS.",
      },
      {
        kind: "say",
        text:
          "Синтаксис блока resource:\n\n" +
          '  resource "ТИП" "ИМЯ" {\n' +
          "    параметр1 = значение\n" +
          "    параметр2 = значение\n" +
          "  }\n\n" +
          "Разбор:\n" +
          '  ТИП   — что за ресурс. Например  local_file  (файл на диске),\n' +
          "          aws_instance  (виртуалка в AWS),  yandex_compute_instance .\n" +
          '  ИМЯ   — как ты будешь ссылаться на него внутри Terraform (любое).\n' +
          "  { }   — параметры конкретно этого ресурса.",
      },
      {
        kind: "say",
        text:
          "Полный пример — создать текстовый файл:\n\n" +
          '  resource "local_file" "config" {\n' +
          '    filename = "app.conf"\n' +
          '    content  = "env=prod"\n' +
          "  }\n\n" +
          "Читается: «должен существовать local_file, я зову его config, у него имя файла\n" +
          "app.conf и содержимое env=prod».",
      },
      {
        kind: "do",
        text:
          "Задача: создай main.tf с одним ресурсом. Набери:\n" +
          "edit main.tf\n" +
          'Сотри подсказку и впиши блок  resource "local_file" "config"  с filename и content. Сохрани.',
        check: has("/home/devops/infra/main.tf", /resource\s+"[^"]+"\s+"[^"]+"/),
        answer: TF_CONFIG,
        editFile: "/home/devops/infra/main.tf",
        hint:
          "Открой  edit main.tf  и впиши:\n" +
          'resource "local_file" "config" {\n  filename = "app.conf"\n  content  = "env=prod"\n}',
      },
      {
        kind: "quiz",
        text: 'В блоке  resource "local_file" "config"  что означает слово  config ?',
        options: [
          "Имя ресурса внутри Terraform — по нему на него ссылаются",
          "Имя файла на диске",
          "Тип ресурса",
        ],
        answer: 0,
        explain:
          'Порядок: resource "ТИП" "ИМЯ" { ... }. Тип — local_file, имя — config, файл на диске задаётся параметром filename.',
      },
    ],
  },
  {
    id: "8.4",
    act: 8,
    title: "terraform init",
    xp: 20,
    intro: "Перед работой Terraform скачивает «драйверы» для нужного облака.",
    setup: (w) => {
      seedInfra(w);
      writeFile(w, "/home/devops/infra/main.tf", TF_CONFIG);
    },
    steps: [
      {
        kind: "say",
        text:
          "Terraform сам по себе не умеет работать ни с AWS, ни с Яндексом, ни с файлами.\n" +
          "Для каждого вида инфраструктуры есть «провайдер» (provider) — плагин-драйвер,\n" +
          "который знает, как создавать ресурсы именно там.\n\n" +
          "В нашем main.tf тип  local_file  — значит нужен провайдер  hashicorp/local .",
      },
      {
        kind: "say",
        text:
          "Команда  terraform init  скачивает нужные провайдеры в текущую папку\n" +
          "(в скрытую  .terraform/ ). Её делают:\n\n" +
          "  • один раз в начале работы с проектом\n" +
          "  • ещё раз, если добавили новый провайдер или сменили его версию",
      },
      {
        kind: "watch",
        run: "terraform init",
        note:
          "«Terraform успешно инициализирован!»\n\n" +
          "Провайдер скачан, папка готова к работе. Без init любая другая команда\n" +
          "Terraform откажется работать.",
      },
      { kind: "type", text: "Инициализируй сам. Набери:  terraform init", cmd: "terraform init" },
      {
        kind: "quiz",
        text: "Что делает  terraform init ?",
        options: [
          "Скачивает провайдеры (драйверы) для нужного облака в текущую папку",
          "Создаёт всю инфраструктуру",
          "Удаляет инфраструктуру",
        ],
        answer: 0,
        explain: "init только готовит папку. Создаёт ресурсы команда apply, и то после plan.",
      },
    ],
  },
  {
    id: "8.5",
    act: 8,
    title: "terraform plan — посмотреть, не трогая",
    xp: 25,
    intro: "Главная привычка: сначала посмотреть, что изменится. Ничего при этом не создаётся.",
    setup: (w) => {
      seedInfra(w);
      writeFile(w, "/home/devops/infra/main.tf", TF_CONFIG);
      w.tf = { inited: true, plan: null, applied: [] };
    },
    steps: [
      {
        kind: "say",
        text:
          "Перед тем как что-то менять, Terraform показывает план:  terraform plan .\n\n" +
          "plan НИЧЕГО не создаёт и не удаляет. Это «сухой прогон» (dry-run) — он читает\n" +
          "твой main.tf, сверяется с текущим состоянием и показывает список будущих изменений.",
      },
      {
        kind: "watch",
        run: "terraform plan",
        note:
          "Разбор вывода:\n\n" +
          "  + local_file.config (создать)\n" +
          "  План: 1 создать, 0 изменить, 0 удалить.\n\n" +
          "Знаки читаются так:\n" +
          "  +  ресурс будет СОЗДАН\n" +
          "  ~  ресурс будет ИЗМЕНЁН\n" +
          "  -  ресурс будет УДАЛЁН   ← самый опасный, всегда проверяй такие строки",
      },
      { kind: "type", text: "Посмотри план сам. Набери:  terraform plan", cmd: "terraform plan" },
      {
        kind: "say",
        text:
          "Правило, которое спасает от катастроф:\n\n" +
          "НИКОГДА не применяй Terraform, не прочитав plan построчно.\n" +
          "Особенно строки со знаком минус. Один невнимательный apply может снести\n" +
          "боевую базу данных — примеры таких инцидентов есть у каждой крупной компании.",
      },
      {
        kind: "quiz",
        text: "Что делает  terraform plan ?",
        options: [
          "Показывает список будущих изменений, ничего при этом не меняя",
          "Применяет изменения",
          "Создаёт резервную копию",
        ],
        answer: 0,
        explain: "plan — сухой прогон. Реально меняет инфраструктуру только apply.",
      },
    ],
  },
  {
    id: "8.6",
    act: 8,
    title: "terraform apply",
    xp: 20,
    intro: "Прочитал план, согласен — применяешь.",
    setup: (w) => {
      seedInfra(w);
      writeFile(w, "/home/devops/infra/main.tf", TF_CONFIG);
      w.tf = { inited: true, plan: null, applied: [] };
    },
    steps: [
      {
        kind: "say",
        text:
          "Команда  terraform apply  реально создаёт (или меняет, или удаляет) инфраструктуру\n" +
          "по плану. В настоящем Terraform она сначала ещё раз показывает план и спрашивает\n" +
          "«yes/no» — это последняя точка, где можно передумать.",
      },
      {
        kind: "watch",
        run: "terraform plan",
        note: "Сначала всегда plan — смотрим, что будет создано: local_file.config.",
      },
      {
        kind: "watch",
        run: "terraform apply",
        note:
          "«Apply complete! Ресурсов: 1 создано, 0 удалено.»\n\n" +
          "Ресурс создан. Теперь Terraform ЗНАЕТ, что local_file.config существует —\n" +
          "запомнил это в своём состоянии (о нём следующий урок).",
      },
      {
        kind: "type",
        text: "Применить сам: сначала  terraform plan , потом  terraform apply",
        cmd: "terraform apply",
      },
      {
        kind: "watch",
        run: "terraform plan",
        note:
          "Проверим план ещё раз, после apply — «0 создать, 0 изменить, 0 удалить».\n\n" +
          "Идемпотентность в действии: инфраструктура уже совпадает с описанием,\n" +
          "менять нечего. Именно поэтому apply можно запускать сколько угодно раз.",
      },
      {
        kind: "quiz",
        text: "Ты применил Terraform, потом сразу посмотрел план снова, ничего не меняя. Что покажет план?",
        options: [
          "0 создать, 0 изменить, 0 удалить — всё уже совпадает",
          "Тот же список создания, что и в первый раз",
          "Ошибка «ресурс уже существует»",
        ],
        answer: 0,
        explain: "apply и plan работают только с разницей между «есть» и «описано». Нет разницы — пустой план.",
      },
    ],
  },
  {
    id: "8.7",
    act: 8,
    title: "Состояние (state)",
    xp: 25,
    intro: "Terraform запоминает, что он создал — в файле состояния. Это критичный файл.",
    setup: (w) => {
      seedInfra(w);
      writeFile(w, "/home/devops/infra/main.tf", TF_CONFIG);
      w.tf = { inited: true, plan: null, applied: ["local_file.config"] };
    },
    steps: [
      {
        kind: "say",
        text:
          "Откуда Terraform знает, что уже создано? Он ведёт «состояние» (state) —\n" +
          "файл, где записано: «я создал local_file.config, вот его параметры».\n\n" +
          "Именно сравнивая main.tf (что должно быть) со state (что есть по моим записям),\n" +
          "Terraform вычисляет разницу для plan.",
      },
      {
        kind: "watch",
        run: "terraform state list",
        note:
          "Команда  terraform state list  показывает всё, что Terraform считает созданным.\n" +
          "Сейчас там  local_file.config  — тот ресурс, что мы применили.",
      },
      {
        kind: "type",
        text: "Посмотри состояние сам. Набери:  terraform state list",
        cmd: "terraform state list",
      },
      {
        kind: "say",
        text:
          "Три важных факта про state:\n\n" +
          "  1) Потерял state — Terraform «забыл» про инфраструктуру. plan захочет создать\n" +
          "     всё заново поверх уже существующего. Больно.\n" +
          "  2) В state попадают ЗНАЧЕНИЯ ресурсов, включая пароли и ключи. Это секретный файл.\n" +
          "  3) Если в команде несколько человек — state нельзя держать на одном ноутбуке.",
      },
      {
        kind: "say",
        text:
          "Поэтому в реальных проектах state хранят в «удалённом бэкенде» (remote backend):\n" +
          "в облачном хранилище (S3, GCS) с блокировкой. Тогда:\n\n" +
          "  • state не потеряется вместе с ноутбуком\n" +
          "  • двое не запустят apply одновременно (блокировка не даст)\n" +
          "  • доступ к секретам в state контролируется",
      },
      {
        kind: "quiz",
        text: "Почему в командных проектах state Terraform хранят в облачном хранилище, а не локально?",
        options: [
          "Чтобы не потерять его и чтобы двое не применяли изменения одновременно",
          "Чтобы Terraform работал быстрее",
          "Так требует лицензия",
        ],
        answer: 0,
        explain: "Потерянный state = потерянная связь с инфраструктурой. Плюс блокировка от одновременных apply.",
      },
    ],
  },
  {
    id: "8.8",
    act: 8,
    title: "Инцидент: plan хочет удалить ресурс ⚡",
    xp: 45,
    intro: "plan показывает строку со знаком минус. Разбираемся, почему, и не даём удалить нужное.",
    setup: (w) => {
      seedInfra(w);
      writeFile(w, "/home/devops/infra/main.tf", TF_CONFIG);
      w.tf = { inited: true, plan: null, applied: ["local_file.config", "local_file.database"] };
    },
    steps: [
      {
        kind: "say",
        text:
          "Ты собираешься применить небольшую правку. Как положено, сначала  terraform plan .\n" +
          "И видишь в плане строку, которой не ждал.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри план и найди опасную строку.",
        check: ran(/^terraform\s+plan/),
        answer: "terraform plan",
        hint: "Команда  terraform plan",
      },
      {
        kind: "say",
        text:
          "В плане:\n\n" +
          "  + local_file.config (создать)\n" +
          "  - local_file.database (УДАЛИТЬ)\n\n" +
          "  ⚠ ВНИМАНИЕ: план удаляет существующий ресурс.\n\n" +
          "Terraform хочет удалить  local_file.database . Почему? Потому что этот ресурс\n" +
          "ЕСТЬ в состоянии (его когда-то применили), но его БОЛЬШЕ НЕТ в main.tf.\n" +
          "Для декларативного инструмента «нет в описании» = «должно быть удалено».",
      },
      {
        kind: "do",
        text: "Шаг 2. Посмотри текущий main.tf — убедись, что блок database действительно пропал.",
        check: ran(/^cat\s+main\.tf/),
        answer: "cat main.tf",
        hint: "Команда  cat main.tf",
      },
      {
        kind: "say",
        text:
          "В файле только блок  config . Блок  database  кто-то удалил (может, случайно\n" +
          "при слиянии веток). База данных удаляться не должна — возвращаем блок обратно.",
      },
      {
        kind: "do",
        text:
          "Шаг 3. Верни ресурс. Набери:\n" +
          "edit main.tf\n" +
          'Добавь обратно блок  resource "local_file" "database"  с filename и content. Сохрани.',
        check: has("/home/devops/infra/main.tf", /resource\s+"local_file"\s+"database"/),
        answer: TF_TWO,
        editFile: "/home/devops/infra/main.tf",
        hint:
          "В  edit main.tf  допиши второй блок:\n" +
          'resource "local_file" "database" {\n  filename = "db.conf"\n  content  = "host=db-main"\n}',
      },
      {
        kind: "do",
        text: "Шаг 4. Проверь план снова — удаления быть не должно.",
        check: (w) => !!w.tf.plan && w.tf.plan.del.length === 0,
        answer: "terraform plan",
        hint: "Команда  terraform plan  — в строке итога должно быть  0 удалить",
      },
      {
        kind: "do",
        text: "Шаг 5. Теперь можно безопасно применить.",
        check: (w) => w.tf.applied.includes("local_file.database"),
        answer: "terraform apply",
        hint: "Команда  terraform apply",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт. Главный урок: строку со знаком  -  в плане нужно объяснить\n" +
          "ДО apply. Если удаление не задумано — почини main.tf, а не жми apply вслепую.\n" +
          "Ещё защита: параметр  prevent_destroy  в ресурсе физически запрещает его удаление.",
      },
    ],
  },
  {
    id: "8.9",
    act: 8,
    title: "Переменные и повторное использование",
    xp: 20,
    intro: "Одно и то же значение в десяти местах — плохо. Выносим в переменную.",
    steps: [
      {
        kind: "say",
        text:
          "Представь конфиг на 300 строк, где имя окружения  prod  повторяется 40 раз.\n" +
          "Нужно сделать копию для  staging  — меняешь 40 мест, одно пропустил, сломалось.\n\n" +
          "Terraform, как и bash из Акта 3, умеет переменные. Объявляют так:\n\n" +
          '  variable "env" {\n' +
          '    default = "prod"\n' +
          "  }",
      },
      {
        kind: "say",
        text:
          "Используют через  var.ИМЯ :\n\n" +
          '  resource "local_file" "config" {\n' +
          '    filename = "app.conf"\n' +
          '    content  = "env=${var.env}"\n' +
          "  }\n\n" +
          "Теперь окружение задаётся в одном месте. А при запуске его можно переопределить:\n" +
          "  terraform apply -var env=staging",
      },
      {
        kind: "say",
        text:
          "Зеркальная вещь —  output . Это «что показать после apply»:\n\n" +
          '  output "config_path" {\n' +
          "    value = local_file.config.filename\n" +
          "  }\n\n" +
          'После apply Terraform напечатает  config_path = "app.conf" . Через output\n' +
          "один модуль отдаёт значения (IP сервера, имя бакета) другим модулям.",
      },
      {
        kind: "quiz",
        text: "Зачем в Terraform выносят значение в  variable ?",
        options: [
          "Чтобы менять его в одном месте, а не искать по всему конфигу",
          "Чтобы Terraform работал быстрее",
          "Переменные обязательны в каждом файле",
        ],
        answer: 0,
        explain: "Одно место правды. Плюс возможность переопределить при запуске (-var) для разных окружений.",
      },
    ],
  },
  {
    id: "8.10",
    act: 8,
    title: "Модули",
    xp: 20,
    intro: "Набор ресурсов, который повторяется — упаковывают в модуль и переиспользуют.",
    steps: [
      {
        kind: "say",
        text:
          "«Веб-сервис» — это обычно не один ресурс, а набор: виртуалка + диск + запись\n" +
          "в DNS + правило файрвола + балансировщик. И таких сервисов у компании десятки,\n" +
          "все устроены одинаково.\n\n" +
          "Копировать эти 5 блоков 30 раз — путь к хаосу. Их упаковывают в «модуль».",
      },
      {
        kind: "say",
        text:
          "Модуль — это папка с  .tf -файлами, у которой есть вход (переменные) и выход\n" +
          "(outputs). Подключается так:\n\n" +
          '  module "shop_api" {\n' +
          '    source   = "./modules/web-service"\n' +
          '    name     = "shop-api"\n' +
          "    cpu      = 2\n" +
          "  }\n\n" +
          "Один блок  module  разворачивает весь набор ресурсов с нужными параметрами.",
      },
      {
        kind: "say",
        text:
          "Откуда берут модули:\n\n" +
          "  • свои — папка  ./modules/... в том же репозитории\n" +
          '  • из git —  source = "git::https://...//modules/vpc"  с указанием версии\n' +
          "  • из публичного реестра Terraform Registry — готовые модули для AWS/GCP/Azure\n\n" +
          "Правило: у модуля из git или реестра ВСЕГДА фиксируй версию, иначе обновление\n" +
          "модуля сломает твою инфраструктуру внезапно (как  latest  у Docker-образа).",
      },
      {
        kind: "quiz",
        text: "Зачем нужны модули в Terraform?",
        options: [
          "Упаковать повторяющийся набор ресурсов и переиспользовать с разными параметрами",
          "Ускорить terraform plan",
          "Хранить пароли",
        ],
        answer: 0,
        explain: "Модуль = функция для инфраструктуры: вход (переменные), тело (ресурсы), выход (outputs).",
      },
    ],
  },
  {
    id: "8.11",
    act: 8,
    title: "Terraform в CI/CD",
    xp: 20,
    intro: "apply вслепую руками — так не работают. plan в pull request, apply после ревью.",
    steps: [
      {
        kind: "say",
        text:
          "Запускать  terraform apply  со своего ноутбука по инфраструктуре компании —\n" +
          "плохая практика. Слишком легко ошибиться, и никто не увидит, что ты сделал.\n\n" +
          "Правильный процесс встроен в CI/CD (Акт 7):",
      },
      {
        kind: "say",
        text:
          "  1) меняешь  .tf -файлы в ветке, открываешь pull request\n" +
          "  2) CI автоматически прогоняет  terraform plan  и вешает его результат\n" +
          "     комментарием в PR — вся команда видит, что именно изменится\n" +
          "  3) коллеги смотрят план (особенно строки с  - ), одобряют\n" +
          "  4) после merge в main CI сам делает  terraform apply\n\n" +
          "Ни один apply не происходит без предварительного plan на глазах у людей.",
      },
      {
        kind: "say",
        text:
          "Дополнительные защиты в таком пайплайне:\n\n" +
          "  • apply в  prod  — только с ручным подтверждением (approval gate)\n" +
          "  • state в удалённом бэкенде с блокировкой — двое не применят разом\n" +
          "  •  prevent_destroy  на критичных ресурсах (база, бакет с данными)\n" +
          "  • отдельные state и переменные для  staging  и  prod",
      },
      {
        kind: "quiz",
        text: "Как правильно применять изменения Terraform в команде?",
        options: [
          "plan автоматически в PR на ревью, apply — только CI после merge",
          "Каждый делает apply со своего ноутбука, когда нужно",
          "apply один раз в месяц по расписанию",
        ],
        answer: 0,
        explain: "Изменения инфраструктуры проходят ревью как код. Человек видит plan до того, как что-то применится.",
      },
    ],
  },
  {
    id: "8.12",
    act: 8,
    title: "Проверка: описать и применить сам",
    xp: 35,
    intro: "С нуля: два ресурса, init, plan, apply, проверка состояния.",
    setup: (w) => {
      seedInfra(w);
      w.templates = {
        "/home/devops/infra/main.tf":
          "# Опиши ДВА ресурса local_file (config и database). Сотри этот комментарий.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финал Акта 8. Разверни небольшую инфраструктуру самостоятельно.\n" +
          "Всё знакомо. Ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text:
          'Шаг 1. Опиши в main.tf два ресурса:  local_file "config"  и  local_file "database" .\n' +
          "Набери:  edit main.tf",
        check: (w) =>
          has("/home/devops/infra/main.tf", /resource\s+"local_file"\s+"config"/)(w) &&
          has("/home/devops/infra/main.tf", /resource\s+"local_file"\s+"database"/)(w),
        answer: TF_TWO,
        editFile: "/home/devops/infra/main.tf",
        hint:
          "Открой  edit main.tf  и впиши два блока:\n" +
          'resource "local_file" "config" {\n  filename = "app.conf"\n  content  = "env=prod"\n}\n' +
          'resource "local_file" "database" {\n  filename = "db.conf"\n  content  = "host=db-main"\n}',
      },
      {
        kind: "do",
        text: "Шаг 2. Инициализируй Terraform.",
        check: (w) => w.tf.inited,
        answer: "terraform init",
        hint: "Команда  terraform init",
      },
      {
        kind: "do",
        text: "Шаг 3. Посмотри план (должно быть 2 создать, 0 удалить).",
        check: ran(/^terraform\s+plan/),
        answer: "terraform plan",
        hint: "Команда  terraform plan",
      },
      {
        kind: "do",
        text: "Шаг 4. Примени.",
        check: (w) => w.tf.applied.length >= 2,
        answer: "terraform apply",
        hint: "Команда  terraform apply",
      },
      {
        kind: "do",
        text: "Шаг 5. Проверь, что оба ресурса в состоянии.",
        check: ran(/^terraform\s+state\s+list/),
        answer: "terraform state list",
        hint: "Команда  terraform state list",
      },
      {
        kind: "say",
        text:
          "Акт 8 пройден. Ты умеешь:\n\n" +
          "  • объяснить, зачем инфраструктура как код и что такое «снежинка»\n" +
          "  • понимать декларативный подход и идемпотентность\n" +
          "  • писать main.tf: блоки resource, variable, output\n" +
          "  • цикл init → plan → apply, и почему plan нельзя пропускать\n" +
          "  • читать план: знаки + ~ -, и не давать удалить нужное\n" +
          "  • зачем нужен удалённый state и как Terraform живёт в CI/CD\n\n" +
          "Дальше — Kubernetes: как запускать десятки контейнеров и держать сервис живым.",
      },
    ],
  },
];
