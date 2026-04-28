const rootUrl = "https://lorecontext.com";
const githubUrl = "https://github.com/Lore-Context/lore-context";

export const localeOrder = [
  "en",
  "ko",
  "ja",
  "zh-hans",
  "zh-hant",
  "vi",
  "es",
  "pt",
  "ru",
  "tr",
  "de",
  "fr",
  "it",
  "el",
  "pl",
  "uk",
  "id"
];

export const pageSlugs = [
  "docs",
  "architecture",
  "changelog",
  "company",
  "contact",
  "privacy",
  "terms",
  "cookies",
  "status"
];

const locales = {
  en: {
    label: "English",
    short: "EN",
    lang: "en",
    hreflang: "en",
    nav: ["Problem", "System", "Features", "Eval", "Integrations", "Docs"],
    ctaRun: "Run local alpha",
    ctaArch: "View architecture",
    ctaDocs: "Docs",
    ctaGithub: "GitHub",
    h1: "Lore Context.",
    statement: "The control plane for AI-agent memory, eval, and governance.",
    support:
      "Know what every agent remembered, used, and should forget before memory becomes production risk.",
    chips: ["LOCAL ALPHA OPEN", "REST API", "MCP STDIO", "POSTGRES 16", "DASHBOARD", "PRIVATE DEPLOY"],
    sectionNums: ["01 / PROBLEM", "02 / SYSTEM", "03 / FEATURES", "04 / ALPHA", "05 / EVAL", "06 / INTEGRATIONS", "07 / START"],
    problemTitle: "Agents remember. Teams need proof.",
    problemCopy:
      "Every coding agent, support bot, and copilot is moving toward long-term memory. Most teams still cannot show the audit trail behind one answer.",
    problemCards: [
      ["Stale memory", "Old API contracts and one-off decisions can reappear in today's agent output."],
      ["Unknown provenance", "A useful fact appears, but no one can explain which session produced it."],
      ["Unsafe writeback", "Agents can persist hallucinations, secrets, and sensitive context into shared memory."],
      ["Backend lock-in", "Each vector store captures data in a different schema, format, and retrieval path."]
    ],
    systemTitle: "A governed path between agents and memory.",
    systemCopy:
      "MCP clients query through one composer. Lore evaluates retrieval, traces the answer path, and routes risky writebacks through governance before they reach shared memory.",
    featuresTitle: "Six product surfaces. One audit trail.",
    featuresCopy: "No magic memory layer. Each surface is inspectable, scriptable, and can be turned off.",
    features: [
      ["Context Query", "Typed retrieval with ranked memories, provenance, freshness, and policy state."],
      ["Memory Eval Playground", "Replay queries against your seed data and compare retriever settings before rollout."],
      ["Memory Observability", "Trace every retrieval, write, redaction, and policy decision by agent or user."],
      ["Governance Review", "Approve, redact, reject, or forget proposed memory with a durable audit record."],
      ["MIF-like Portability", "Export memories, embeddings, provenance, and policy state without backend lock-in."],
      ["Private Deployment", "Run locally or in your VPC with Docker Compose, Postgres, and no phone-home."]
    ],
    alphaTitle: "What is in v0.4 alpha.",
    alphaCopy: "Honest status. Built first, polished continuously. Everything below runs on your machine with Docker Compose.",
    evalTitle: "Eval proof report. On your own data.",
    evalCopy: "Watch recall, precision, stale-hit rate, and latency move as you change retrievers, rerankers, and freshness cuts.",
    integrationsTitle: "Speak the protocols your agents already use.",
    integrationsCopy: "Lore exposes MCP stdio and REST surfaces so agents query, write, and review through the same governance layer.",
    finalTitle: "Start with a local alpha. Prove memory quality before you scale it.",
    finalCopy: "Four commands. A seeded demo dataset. A Playwright smoke pass that proves the dashboard renders.",
    footerProduct: "Product",
    footerResources: "Resources",
    footerCompany: "Company",
    footerLegal: "Legal",
    pages: {
      docs: ["Docs", "Run Lore locally, inspect the demo dataset, and connect an MCP-compatible agent."],
      architecture: ["Architecture", "Lore is a local-first control plane with API, MCP transport, eval, governance, and Postgres audit storage."],
      changelog: ["Changelog", "v0.4 alpha focuses on local setup, context querying, eval proof, governance review, and reproducible smoke checks."],
      company: ["Company", "Lore Context is operated by REDLAND PTE. LTD., Singapore UEN 202304648K."],
      contact: ["Contact", "For product, security, privacy, and partnership questions, use the dedicated Lore Context contact channels."],
      privacy: ["Privacy Policy", "We collect only the data needed to operate the website, respond to requests, and support the local alpha."],
      terms: ["Terms of Service", "Lore Context is alpha software. Test carefully before production reliance."],
      cookies: ["Cookie Notice", "The website is designed to run without advertising cookies or third-party tracking scripts."],
      status: ["Status", "Public website and local alpha materials are static. Runtime services should be checked in your own deployment."]
    },
    notice: "English legal text controls unless a signed agreement says otherwise."
  },
  ko: {
    label: "한국어",
    short: "KO",
    lang: "ko",
    hreflang: "ko",
    nav: ["문제", "시스템", "기능", "평가", "연동", "문서"],
    ctaRun: "로컬 알파 실행",
    ctaArch: "아키텍처 보기",
    ctaDocs: "문서",
    ctaGithub: "GitHub",
    h1: "Lore Context.",
    statement: "AI 에이전트 메모리, 평가, 거버넌스를 위한 제어 평면.",
    support: "메모리가 운영 리스크가 되기 전에 에이전트가 무엇을 기억하고 사용하며 잊어야 하는지 확인하세요.",
    problemTitle: "에이전트는 기억합니다. 팀에는 증거가 필요합니다.",
    problemCopy: "장기 메모리는 늘어나지만, 한 답변 뒤의 감사 경로를 설명할 수 있는 팀은 아직 적습니다.",
    problemCards: [["오래된 메모리", "지난 결정이 오늘의 출력에 다시 섞일 수 있습니다."], ["불명확한 출처", "유용한 사실은 보이지만 어느 세션에서 왔는지 모릅니다."], ["위험한 저장", "환각, 비밀, 민감한 맥락이 공유 메모리에 남을 수 있습니다."], ["백엔드 종속", "저장소마다 스키마와 검색 경로가 달라집니다."]],
    systemTitle: "에이전트와 메모리 사이의 관리된 경로.",
    systemCopy: "Lore는 검색을 평가하고 답변 경로를 추적하며 위험한 쓰기를 거버넌스 검토로 보냅니다.",
    featuresTitle: "여섯 가지 제품 표면. 하나의 감사 기록.",
    featuresCopy: "각 기능은 확인 가능하고 스크립트로 제어 가능하며 필요하면 끌 수 있습니다.",
    alphaTitle: "v0.4 알파에 포함된 것.",
    alphaCopy: "먼저 작동하게 만들고 계속 다듬습니다. 아래 항목은 Docker Compose로 로컬에서 실행됩니다.",
    evalTitle: "내 데이터 위의 평가 증거.",
    evalCopy: "검색기와 최신성 기준을 바꾸며 recall, precision, stale-hit, latency를 확인합니다.",
    integrationsTitle: "이미 쓰는 에이전트 프로토콜과 연결.",
    integrationsCopy: "MCP stdio와 REST를 통해 같은 거버넌스 계층으로 질의, 쓰기, 검토합니다.",
    finalTitle: "로컬 알파에서 시작하세요. 확장 전에 메모리 품질을 증명하세요.",
    finalCopy: "네 개의 명령, 데모 데이터셋, 대시보드 렌더링을 증명하는 Playwright 스모크.",
    pages: makePages("ko"),
    notice: "서명된 계약이 없는 경우 영어 법적 문서가 우선합니다."
  },
  ja: {
    label: "日本語",
    short: "JA",
    lang: "ja",
    hreflang: "ja",
    nav: ["課題", "システム", "機能", "評価", "連携", "ドキュメント"],
    ctaRun: "ローカル Alpha を実行",
    ctaArch: "アーキテクチャを見る",
    ctaDocs: "ドキュメント",
    ctaGithub: "GitHub",
    h1: "Lore Context.",
    statement: "AI エージェントの記憶、評価、ガバナンスのための制御プレーン。",
    support: "記憶が本番リスクになる前に、各エージェントが何を覚え、使い、忘れるべきかを把握します。",
    problemTitle: "エージェントは記憶します。チームには証拠が必要です。",
    problemCopy: "長期記憶は増えていますが、1つの回答の監査経路を示せるチームはまだ多くありません。",
    problemCards: [["古い記憶", "過去の決定が今日の出力に混ざることがあります。"], ["不明な出典", "有用な事実が出ても、どのセッション由来か分かりません。"], ["危険な保存", "幻覚、秘密、機微情報が共有記憶に残る可能性があります。"], ["バックエンド固定", "保存先ごとにスキーマと検索経路が分断されます。"]],
    systemTitle: "エージェントと記憶の間にある管理された経路。",
    systemCopy: "Lore は検索を評価し、回答経路を追跡し、危険な書き戻しをガバナンスに回します。",
    featuresTitle: "6つの製品サーフェス。1つの監査証跡。",
    featuresCopy: "各機能は検査可能で、スクリプト化でき、必要に応じて無効化できます。",
    alphaTitle: "v0.4 alpha に含まれるもの。",
    alphaCopy: "まず動くものを作り、継続的に磨きます。Docker Compose でローカル実行できます。",
    evalTitle: "自分のデータで評価を証明。",
    evalCopy: "検索器や鮮度基準を変えながら recall、precision、stale-hit、latency を確認します。",
    integrationsTitle: "既存エージェントのプロトコルで接続。",
    integrationsCopy: "MCP stdio と REST を通じて同じガバナンス層で query、write、review を行います。",
    finalTitle: "ローカル Alpha から始め、拡大前に記憶品質を証明します。",
    finalCopy: "4つのコマンド、デモデータ、ダッシュボード表示を確認する Playwright smoke。",
    pages: makePages("ja"),
    notice: "署名済み契約がない限り、英語の法的文書が優先されます。"
  },
  "zh-hans": {
    label: "简体中文",
    short: "简",
    lang: "zh-Hans",
    hreflang: "zh-Hans",
    nav: ["问题", "系统", "功能", "评估", "集成", "文档"],
    ctaRun: "运行本地 Alpha",
    ctaArch: "查看架构",
    ctaDocs: "文档",
    ctaGithub: "GitHub",
    h1: "Lore Context.",
    statement: "AI Agent 记忆、评估和治理的控制平面。",
    support: "在记忆变成生产风险之前，看清每个 agent 记住了什么、使用了什么、应该忘记什么。",
    problemTitle: "Agent 会记忆，团队需要证据。",
    problemCopy: "长期记忆正在进入工作流，但多数团队仍无法解释一次回答背后的审计路径。",
    problemCards: [["过期记忆", "过去的 API 约定可能混入今天的输出。"], ["出处不明", "事实看似有用，却不知道来自哪个会话。"], ["危险写入", "幻觉、密钥和敏感上下文可能被写入共享记忆。"], ["后端锁定", "不同向量库用不同 schema、格式和检索路径锁住数据。"]],
    systemTitle: "Agent 和记忆之间的治理路径。",
    systemCopy: "Lore 评估检索、追踪回答路径，并把高风险写入送入治理审查。",
    featuresTitle: "六个产品界面，一条审计链路。",
    featuresCopy: "没有玄学记忆层；每个能力都可检查、可脚本化、可关闭。",
    alphaTitle: "v0.4 alpha 已包含的能力。",
    alphaCopy: "先真实可用，再持续打磨。以下内容都可以通过 Docker Compose 在本地运行。",
    evalTitle: "在你自己的数据上证明记忆质量。",
    evalCopy: "调整检索器、重排器和新鲜度阈值时，观察 recall、precision、stale-hit 和 latency 的变化。",
    integrationsTitle: "接入你已经在用的 agent 协议。",
    integrationsCopy: "Lore 暴露 MCP stdio 和 REST 接口，让查询、写入、审查都经过同一治理层。",
    finalTitle: "从本地 Alpha 开始，在扩展之前证明记忆质量。",
    finalCopy: "四条命令、种子演示数据集，以及验证 dashboard 正常渲染的 Playwright smoke。",
    pages: makePages("zh-hans"),
    notice: "除非另有签署协议，英文法律文本为准。"
  },
  "zh-hant": {
    label: "繁體中文",
    short: "繁",
    lang: "zh-Hant",
    hreflang: "zh-Hant",
    nav: ["問題", "系統", "功能", "評估", "整合", "文件"],
    ctaRun: "執行本機 Alpha",
    ctaArch: "查看架構",
    ctaDocs: "文件",
    ctaGithub: "GitHub",
    h1: "Lore Context.",
    statement: "AI Agent 記憶、評估與治理的控制平面。",
    support: "在記憶成為正式環境風險前，看清每個 agent 記住、使用、以及應該忘記的內容。",
    problemTitle: "Agent 會記憶，團隊需要證據。",
    problemCopy: "長期記憶正在進入工作流，但多數團隊仍無法說明一次回答背後的稽核路徑。",
    problemCards: [["過期記憶", "過去的 API 約定可能混入今天的輸出。"], ["來源不明", "事實看似有用，卻不知道來自哪個 session。"], ["危險寫入", "幻覺、密鑰與敏感上下文可能被寫入共享記憶。"], ["後端鎖定", "不同向量庫以不同 schema、格式和檢索路徑鎖住資料。"]],
    systemTitle: "Agent 與記憶之間的治理路徑。",
    systemCopy: "Lore 評估檢索、追蹤回答路徑，並將高風險寫入送入治理審查。",
    featuresTitle: "六個產品介面，一條稽核鏈路。",
    featuresCopy: "沒有魔法記憶層；每個能力都可檢查、可腳本化、可關閉。",
    alphaTitle: "v0.4 alpha 已包含的能力。",
    alphaCopy: "先真實可用，再持續打磨。以下內容可透過 Docker Compose 在本機執行。",
    evalTitle: "在你自己的資料上證明記憶品質。",
    evalCopy: "調整檢索器、重排器和新鮮度閾值時，觀察 recall、precision、stale-hit 和 latency。",
    integrationsTitle: "接入你已經使用的 agent 協議。",
    integrationsCopy: "Lore 暴露 MCP stdio 與 REST 介面，讓查詢、寫入、審查都通過同一治理層。",
    finalTitle: "從本機 Alpha 開始，在擴展前證明記憶品質。",
    finalCopy: "四條命令、種子示範資料，以及驗證 dashboard 渲染的 Playwright smoke。",
    pages: makePages("zh-hant"),
    notice: "除非另有簽署協議，英文法律文本為準。"
  },
  vi: makeEuropeanLocale("vi", "Tiếng Việt", "VI", "Mặt phẳng điều khiển cho bộ nhớ AI agent.", "Agent ghi nhớ. Đội ngũ cần bằng chứng."),
  es: makeEuropeanLocale("es", "Español", "ES", "El plano de control para la memoria de agentes de IA.", "Los agentes recuerdan. Los equipos necesitan pruebas."),
  pt: makeEuropeanLocale("pt", "Português", "PT", "O plano de controle para memória de agentes de IA.", "Agentes lembram. Equipes precisam de prova."),
  ru: makeEuropeanLocale("ru", "Русский", "RU", "Плоскость управления памятью AI-агентов.", "Агенты запоминают. Командам нужны доказательства."),
  tr: makeEuropeanLocale("tr", "Türkçe", "TR", "AI ajan belleği için kontrol düzlemi.", "Ajanlar hatırlar. Ekiplerin kanıta ihtiyacı vardır."),
  de: makeEuropeanLocale("de", "Deutsch", "DE", "Die Steuerungsebene für KI-Agenten-Gedächtnis.", "Agenten erinnern sich. Teams brauchen Belege."),
  fr: makeEuropeanLocale("fr", "Français", "FR", "Le plan de contrôle de la mémoire des agents IA.", "Les agents mémorisent. Les équipes ont besoin de preuves."),
  it: makeEuropeanLocale("it", "Italiano", "IT", "Il piano di controllo per la memoria degli agenti IA.", "Gli agenti ricordano. I team hanno bisogno di prove."),
  el: makeEuropeanLocale("el", "Ελληνικά", "EL", "Το επίπεδο ελέγχου για τη μνήμη AI agents.", "Οι agents θυμούνται. Οι ομάδες χρειάζονται αποδείξεις."),
  pl: makeEuropeanLocale("pl", "Polski", "PL", "Płaszczyzna sterowania pamięcią agentów AI.", "Agenci pamiętają. Zespoły potrzebują dowodów."),
  uk: makeEuropeanLocale("uk", "Українська", "UK", "Площина керування пам'яттю AI-агентів.", "Агенти запам'ятовують. Командам потрібні докази."),
  id: makeEuropeanLocale("id", "Bahasa Indonesia", "ID", "Bidang kendali untuk memori agen AI.", "Agen mengingat. Tim membutuhkan bukti.")
};

for (const code of localeOrder) {
  const locale = locales[code];
  locale.chips ??= locales.en.chips;
  locale.sectionNums ??= locales.en.sectionNums;
  locale.features ??= translateFeatures(code, locale);
  locale.footerProduct ??= footerWords(code).product;
  locale.footerResources ??= footerWords(code).resources;
  locale.footerCompany ??= footerWords(code).company;
  locale.footerLegal ??= footerWords(code).legal;
  locale.pages ??= makePages(code);
  locale.dir ??= "ltr";
}

export const localeCodes = localeOrder;

function makeEuropeanLocale(code, label, short, statement, problemTitle) {
  const words = euroWords(code);
  return {
    label,
    short,
    lang: code,
    hreflang: code,
    nav: words.nav,
    ctaRun: words.run,
    ctaArch: words.arch,
    ctaDocs: words.docs,
    ctaGithub: "GitHub",
    h1: "Lore Context.",
    statement,
    support: words.statement,
    problemTitle,
    problemCopy: words.problemCopy,
    problemCards: words.problemCards,
    systemTitle: words.systemTitle,
    systemCopy: words.systemCopy,
    featuresTitle: words.featuresTitle,
    featuresCopy: words.featuresCopy,
    alphaTitle: words.alphaTitle,
    alphaCopy: words.alphaCopy,
    evalTitle: words.evalTitle,
    evalCopy: words.evalCopy,
    integrationsTitle: words.integrationsTitle,
    integrationsCopy: words.integrationsCopy,
    finalTitle: words.finalTitle,
    finalCopy: words.finalCopy,
    pages: makePages(code),
    notice: words.notice
  };
}

function euroWords(code) {
  const table = {
    vi: {
      nav: ["Vấn đề", "Hệ thống", "Tính năng", "Đánh giá", "Tích hợp", "Tài liệu"],
      run: "Chạy alpha cục bộ",
      arch: "Xem kiến trúc",
      docs: "Tài liệu",
      statement: "Thấy rõ agent đã nhớ, đã dùng và nên quên gì trước khi bộ nhớ trở thành rủi ro sản xuất.",
      support: "Lore Context nằm giữa MCP client và kho nhớ để soạn truy xuất, đánh giá chất lượng, kiểm toán nguồn gốc và kiểm soát ghi ngược.",
      problemCopy: "Bộ nhớ dài hạn đang vào quy trình làm việc, nhưng ít đội có thể chứng minh đường kiểm toán của một câu trả lời.",
      systemTitle: "Đường dẫn có quản trị giữa agent và bộ nhớ.",
      systemCopy: "Lore đánh giá truy xuất, theo dõi đường trả lời và đưa ghi ngược rủi ro vào hàng đợi quản trị.",
      featuresTitle: "Sáu bề mặt sản phẩm. Một nhật ký kiểm toán.",
      featuresCopy: "Mỗi năng lực đều có thể kiểm tra, tự động hóa và tắt khi cần.",
      alphaTitle: "Có gì trong v0.4 alpha.",
      alphaCopy: "Danh sách trung thực. Chạy cục bộ bằng Docker Compose.",
      evalTitle: "Báo cáo đánh giá trên dữ liệu của bạn.",
      evalCopy: "Theo dõi recall, precision, stale-hit và latency khi thay đổi truy xuất.",
      integrationsTitle: "Kết nối với giao thức agent bạn đang dùng.",
      integrationsCopy: "Lore cung cấp MCP stdio và REST qua cùng một lớp quản trị.",
      finalTitle: "Bắt đầu với alpha cục bộ. Chứng minh chất lượng bộ nhớ trước khi mở rộng.",
      finalCopy: "Bốn lệnh, dữ liệu demo và smoke test Playwright cho dashboard.",
      notice: "Văn bản pháp lý tiếng Anh có hiệu lực nếu không có thỏa thuận khác."
    },
    es: {
      nav: ["Problema", "Sistema", "Funciones", "Evaluación", "Integraciones", "Docs"],
      run: "Ejecutar alpha local",
      arch: "Ver arquitectura",
      docs: "Docs",
      statement: "Vea qué recordó, usó y debe olvidar cada agente antes de que la memoria sea un riesgo de producción.",
      support: "Lore Context se ubica entre clientes MCP y almacenes de memoria para componer recuperación, evaluar calidad, auditar procedencia y gobernar escrituras.",
      problemCopy: "La memoria a largo plazo avanza, pero pocos equipos pueden mostrar la ruta de auditoría de una respuesta.",
      systemTitle: "Una ruta gobernada entre agentes y memoria.",
      systemCopy: "Lore evalúa la recuperación, traza la respuesta y envía escrituras riesgosas a revisión.",
      featuresTitle: "Seis superficies de producto. Una auditoría.",
      featuresCopy: "Cada capacidad es inspeccionable, automatizable y desactivable.",
      alphaTitle: "Qué incluye v0.4 alpha.",
      alphaCopy: "Lista honesta. Corre localmente con Docker Compose.",
      evalTitle: "Prueba de evaluación en sus datos.",
      evalCopy: "Observe recall, precision, stale-hit y latency al cambiar la recuperación.",
      integrationsTitle: "Use los protocolos que sus agentes ya conocen.",
      integrationsCopy: "Lore expone MCP stdio y REST bajo la misma capa de gobernanza.",
      finalTitle: "Empiece con un alpha local. Pruebe la calidad de memoria antes de escalar.",
      finalCopy: "Cuatro comandos, datos demo y una prueba Playwright del dashboard.",
      notice: "El texto legal en inglés prevalece salvo acuerdo firmado."
    },
    pt: {
      nav: ["Problema", "Sistema", "Recursos", "Avaliação", "Integrações", "Docs"],
      run: "Executar alpha local",
      arch: "Ver arquitetura",
      docs: "Docs",
      statement: "Veja o que cada agente lembrou, usou e deve esquecer antes que memória vire risco de produção.",
      support: "Lore Context fica entre clientes MCP e stores de memória para compor recuperação, avaliar qualidade, auditar origem e governar gravações.",
      problemCopy: "A memória longa cresce, mas poucas equipes conseguem mostrar a trilha de auditoria de uma resposta.",
      systemTitle: "Um caminho governado entre agentes e memória.",
      systemCopy: "Lore avalia recuperação, rastreia respostas e envia gravações arriscadas para revisão.",
      featuresTitle: "Seis superfícies de produto. Uma auditoria.",
      featuresCopy: "Cada capacidade é inspecionável, automatizável e desligável.",
      alphaTitle: "O que há no v0.4 alpha.",
      alphaCopy: "Lista honesta. Roda localmente com Docker Compose.",
      evalTitle: "Prova de avaliação nos seus dados.",
      evalCopy: "Acompanhe recall, precision, stale-hit e latency ao alterar recuperação.",
      integrationsTitle: "Fale os protocolos que seus agentes já usam.",
      integrationsCopy: "Lore expõe MCP stdio e REST pela mesma camada de governança.",
      finalTitle: "Comece com um alpha local. Prove a qualidade da memória antes de escalar.",
      finalCopy: "Quatro comandos, dados demo e um smoke test Playwright do dashboard.",
      notice: "O texto jurídico em inglês prevalece salvo acordo assinado."
    },
    ru: {
      nav: ["Проблема", "Система", "Функции", "Оценка", "Интеграции", "Документация"],
      run: "Запустить локальный alpha",
      arch: "Смотреть архитектуру",
      docs: "Документация",
      statement: "Покажите, что агент запомнил, использовал и должен забыть до того, как память станет производственным риском.",
      support: "Lore Context стоит между MCP-клиентами и хранилищами памяти: сбор контекста, оценка качества, аудит происхождения и управление записью.",
      problemCopy: "Долгая память приходит в процессы, но команды редко могут показать аудит одного ответа.",
      systemTitle: "Управляемый путь между агентами и памятью.",
      systemCopy: "Lore оценивает поиск, трассирует ответ и отправляет рискованные записи на проверку.",
      featuresTitle: "Шесть рабочих поверхностей. Один аудит.",
      featuresCopy: "Каждая возможность проверяема, автоматизируема и отключаема.",
      alphaTitle: "Что входит в v0.4 alpha.",
      alphaCopy: "Честный список. Работает локально через Docker Compose.",
      evalTitle: "Оценка качества на ваших данных.",
      evalCopy: "Смотрите recall, precision, stale-hit и latency при изменении поиска.",
      integrationsTitle: "Поддержка протоколов ваших агентов.",
      integrationsCopy: "Lore предоставляет MCP stdio и REST через единый слой управления.",
      finalTitle: "Начните с локального alpha. Докажите качество памяти до масштабирования.",
      finalCopy: "Четыре команды, демо-данные и Playwright smoke для dashboard.",
      notice: "Английский юридический текст имеет приоритет, если нет подписанного соглашения."
    },
    tr: {
      nav: ["Sorun", "Sistem", "Özellikler", "Değerlendirme", "Entegrasyonlar", "Dokümanlar"],
      run: "Yerel alpha çalıştır",
      arch: "Mimariyi gör",
      docs: "Dokümanlar",
      statement: "Bellek üretim riski olmadan önce her ajanın neyi hatırladığını, kullandığını ve unutması gerektiğini görün.",
      support: "Lore Context, MCP istemcileri ile bellek depoları arasında retrieval, değerlendirme, kaynak denetimi ve yazma yönetişimi sağlar.",
      problemCopy: "Uzun süreli bellek yayılıyor, ancak ekipler tek bir cevabın denetim izini gösteremiyor.",
      systemTitle: "Ajanlar ve bellek arasında yönetilen yol.",
      systemCopy: "Lore retrieval'ı değerlendirir, cevap yolunu izler ve riskli yazımları incelemeye gönderir.",
      featuresTitle: "Altı ürün yüzeyi. Tek denetim izi.",
      featuresCopy: "Her yetenek incelenebilir, betiklenebilir ve kapatılabilir.",
      alphaTitle: "v0.4 alpha içinde neler var.",
      alphaCopy: "Dürüst liste. Docker Compose ile yerelde çalışır.",
      evalTitle: "Kendi verinizde değerlendirme kanıtı.",
      evalCopy: "Retriever ayarları değiştikçe recall, precision, stale-hit ve latency izlenir.",
      integrationsTitle: "Ajanlarınızın kullandığı protokollerle konuşun.",
      integrationsCopy: "Lore MCP stdio ve REST'i aynı yönetişim katmanından sunar.",
      finalTitle: "Yerel alpha ile başlayın. Ölçeklemeden önce bellek kalitesini kanıtlayın.",
      finalCopy: "Dört komut, demo veri ve dashboard için Playwright smoke.",
      notice: "İmzalı anlaşma yoksa İngilizce hukuki metin geçerlidir."
    }
  };

  const defaults = {
    de: ["Problem", "System", "Funktionen", "Evaluierung", "Integrationen", "Dokumente"],
    fr: ["Problème", "Système", "Fonctions", "Évaluation", "Intégrations", "Docs"],
    it: ["Problema", "Sistema", "Funzioni", "Valutazione", "Integrazioni", "Docs"],
    el: ["Πρόβλημα", "Σύστημα", "Λειτουργίες", "Αξιολόγηση", "Ενσωματώσεις", "Docs"],
    pl: ["Problem", "System", "Funkcje", "Ewaluacja", "Integracje", "Dokumenty"],
    uk: ["Проблема", "Система", "Функції", "Оцінка", "Інтеграції", "Документи"],
    id: ["Masalah", "Sistem", "Fitur", "Evaluasi", "Integrasi", "Dokumen"]
  };

  if (table[code]) return withCards(table[code]);

  const generic = {
    nav: defaults[code],
    run: {
      de: "Lokales Alpha starten",
      fr: "Lancer l'alpha locale",
      it: "Esegui alpha locale",
      el: "Εκτέλεση τοπικού alpha",
      pl: "Uruchom lokalne alpha",
      uk: "Запустити локальну alpha",
      id: "Jalankan alpha lokal"
    }[code],
    arch: {
      de: "Architektur ansehen",
      fr: "Voir l'architecture",
      it: "Vedi architettura",
      el: "Προβολή αρχιτεκτονικής",
      pl: "Zobacz architekturę",
      uk: "Переглянути архітектуру",
      id: "Lihat arsitektur"
    }[code],
    docs: defaults[code][5],
    statement: {
      de: "Sehen Sie, was jeder Agent erinnert, nutzt und vergessen sollte, bevor Speicher zum Produktionsrisiko wird.",
      fr: "Voyez ce que chaque agent a mémorisé, utilisé et doit oublier avant que la mémoire devienne un risque de production.",
      it: "Vedi cosa ogni agente ha ricordato, usato e dovrebbe dimenticare prima che la memoria diventi un rischio di produzione.",
      el: "Δείτε τι θυμήθηκε, χρησιμοποίησε και πρέπει να ξεχάσει κάθε agent πριν η μνήμη γίνει παραγωγικός κίνδυνος.",
      pl: "Zobacz, co agent zapamiętał, użył i powinien zapomnieć, zanim pamięć stanie się ryzykiem produkcyjnym.",
      uk: "Побачте, що агент запам'ятав, використав і має забути, перш ніж пам'ять стане виробничим ризиком.",
      id: "Lihat apa yang diingat, digunakan, dan perlu dilupakan agen sebelum memori menjadi risiko produksi."
    }[code],
    support: {
      de: "Lore Context verbindet MCP-Clients und Speicher, bewertet Qualität, prüft Herkunft und steuert Schreibvorgänge.",
      fr: "Lore Context relie les clients MCP aux mémoires, évalue la qualité, audite la provenance et gouverne les écritures.",
      it: "Lore Context collega client MCP e archivi di memoria, valuta qualità, audita provenienza e governa le scritture.",
      el: "Το Lore Context συνδέει MCP clients και μνήμη, αξιολογεί ποιότητα, ελέγχει προέλευση και κυβερνά εγγραφές.",
      pl: "Lore Context łączy klientów MCP z pamięcią, ocenia jakość, audytuje pochodzenie i nadzoruje zapisy.",
      uk: "Lore Context з'єднує MCP-клієнти й сховища пам'яті, оцінює якість, аудіює походження та керує записами.",
      id: "Lore Context menghubungkan klien MCP dan penyimpanan memori, mengevaluasi kualitas, mengaudit asal, dan mengatur penulisan."
    }[code],
    problemCopy: {
      de: "Langzeitgedächtnis wächst, doch der Audit-Pfad einer Antwort bleibt oft unsichtbar.",
      fr: "La mémoire longue progresse, mais le chemin d'audit d'une réponse reste souvent invisible.",
      it: "La memoria a lungo termine cresce, ma il percorso di audit di una risposta spesso resta invisibile.",
      el: "Η μακροπρόθεσμη μνήμη αυξάνεται, αλλά η διαδρομή ελέγχου μιας απάντησης συχνά λείπει.",
      pl: "Pamięć długoterminowa rośnie, lecz ścieżka audytu odpowiedzi bywa niewidoczna.",
      uk: "Довготривала пам'ять зростає, але аудит однієї відповіді часто невидимий.",
      id: "Memori jangka panjang berkembang, tetapi jalur audit satu jawaban sering tidak terlihat."
    }[code],
    systemTitle: {
      de: "Ein kontrollierter Weg zwischen Agenten und Speicher.",
      fr: "Un chemin gouverné entre agents et mémoire.",
      it: "Un percorso governato tra agenti e memoria.",
      el: "Μια ελεγχόμενη διαδρομή μεταξύ agents και μνήμης.",
      pl: "Kontrolowana ścieżka między agentami a pamięcią.",
      uk: "Керований шлях між агентами та пам'яттю.",
      id: "Jalur terkelola antara agen dan memori."
    }[code],
    systemCopy: {
      de: "Lore bewertet Retrieval, verfolgt Antworten und leitet riskante Schreibvorgänge zur Prüfung.",
      fr: "Lore évalue la récupération, trace les réponses et envoie les écritures risquées en revue.",
      it: "Lore valuta il retrieval, traccia le risposte e invia le scritture rischiose in revisione.",
      el: "Το Lore αξιολογεί retrieval, ιχνηλατεί απαντήσεις και στέλνει επικίνδυνες εγγραφές για έλεγχο.",
      pl: "Lore ocenia wyszukiwanie, śledzi odpowiedzi i kieruje ryzykowne zapisy do przeglądu.",
      uk: "Lore оцінює retrieval, трасує відповіді й надсилає ризикові записи на перевірку.",
      id: "Lore mengevaluasi retrieval, melacak jawaban, dan mengirim penulisan berisiko untuk ditinjau."
    }[code],
    featuresTitle: {
      de: "Sechs Produktflächen. Ein Audit-Pfad.",
      fr: "Six surfaces produit. Une piste d'audit.",
      it: "Sei superfici prodotto. Una traccia di audit.",
      el: "Έξι επιφάνειες προϊόντος. Ένα audit trail.",
      pl: "Sześć powierzchni produktu. Jeden audyt.",
      uk: "Шість продуктових поверхонь. Один аудит.",
      id: "Enam permukaan produk. Satu jejak audit."
    }[code],
    featuresCopy: {
      de: "Jede Fähigkeit ist prüfbar, skriptbar und abschaltbar.",
      fr: "Chaque capacité est inspectable, scriptable et désactivable.",
      it: "Ogni capacità è ispezionabile, scriptabile e disattivabile.",
      el: "Κάθε δυνατότητα ελέγχεται, αυτοματοποιείται και απενεργοποιείται.",
      pl: "Każdą funkcję można sprawdzić, oskryptować i wyłączyć.",
      uk: "Кожну можливість можна перевірити, автоматизувати й вимкнути.",
      id: "Setiap kemampuan dapat diperiksa, diotomatisasi, dan dimatikan."
    }[code],
    alphaTitle: { de: "Was in v0.4 alpha enthalten ist.", fr: "Ce que contient v0.4 alpha.", it: "Cosa include v0.4 alpha.", el: "Τι περιλαμβάνει το v0.4 alpha.", pl: "Co zawiera v0.4 alpha.", uk: "Що входить до v0.4 alpha.", id: "Isi v0.4 alpha." }[code],
    alphaCopy: { de: "Ehrlicher Stand. Läuft lokal mit Docker Compose.", fr: "État honnête. Exécution locale avec Docker Compose.", it: "Stato onesto. Esecuzione locale con Docker Compose.", el: "Ειλικρινής κατάσταση. Τοπική εκτέλεση με Docker Compose.", pl: "Uczciwy stan. Działa lokalnie przez Docker Compose.", uk: "Чесний статус. Працює локально через Docker Compose.", id: "Status jujur. Berjalan lokal dengan Docker Compose." }[code],
    evalTitle: { de: "Eval-Nachweis auf Ihren Daten.", fr: "Preuve d'évaluation sur vos données.", it: "Prova di valutazione sui tuoi dati.", el: "Απόδειξη αξιολόγησης στα δεδομένα σας.", pl: "Dowód ewaluacji na twoich danych.", uk: "Доказ оцінки на ваших даних.", id: "Bukti evaluasi pada data Anda." }[code],
    evalCopy: { de: "Verfolgen Sie recall, precision, stale-hit und latency.", fr: "Suivez recall, precision, stale-hit et latency.", it: "Monitora recall, precision, stale-hit e latency.", el: "Παρακολουθήστε recall, precision, stale-hit και latency.", pl: "Śledź recall, precision, stale-hit i latency.", uk: "Відстежуйте recall, precision, stale-hit і latency.", id: "Pantau recall, precision, stale-hit, dan latency." }[code],
    integrationsTitle: { de: "Sprechen Sie die Protokolle Ihrer Agenten.", fr: "Parlez les protocoles de vos agents.", it: "Parla i protocolli dei tuoi agenti.", el: "Μιλήστε τα πρωτόκολλα των agents σας.", pl: "Używaj protokołów swoich agentów.", uk: "Працюйте з протоколами ваших агентів.", id: "Gunakan protokol yang sudah dipakai agen." }[code],
    integrationsCopy: { de: "Lore bietet MCP stdio und REST über dieselbe Governance-Schicht.", fr: "Lore expose MCP stdio et REST via la même gouvernance.", it: "Lore espone MCP stdio e REST sullo stesso livello di governance.", el: "Το Lore εκθέτει MCP stdio και REST από το ίδιο επίπεδο διακυβέρνησης.", pl: "Lore udostępnia MCP stdio i REST przez tę samą warstwę nadzoru.", uk: "Lore надає MCP stdio і REST через один шар governance.", id: "Lore menyediakan MCP stdio dan REST melalui lapisan tata kelola yang sama." }[code],
    finalTitle: { de: "Starten Sie lokal. Beweisen Sie Qualität vor Skalierung.", fr: "Commencez localement. Prouvez la qualité avant de passer à l'échelle.", it: "Inizia in locale. Dimostra la qualità prima di scalare.", el: "Ξεκινήστε τοπικά. Αποδείξτε ποιότητα πριν την κλιμάκωση.", pl: "Zacznij lokalnie. Udowodnij jakość przed skalowaniem.", uk: "Почніть локально. Доведіть якість перед масштабуванням.", id: "Mulai lokal. Buktikan kualitas sebelum skala." }[code],
    finalCopy: { de: "Vier Befehle, Demo-Daten und ein Playwright-Smoke-Test.", fr: "Quatre commandes, données démo et smoke test Playwright.", it: "Quattro comandi, dati demo e smoke test Playwright.", el: "Τέσσερις εντολές, demo δεδομένα και Playwright smoke.", pl: "Cztery komendy, dane demo i Playwright smoke.", uk: "Чотири команди, demo-дані та Playwright smoke.", id: "Empat perintah, data demo, dan Playwright smoke." }[code],
    notice: { de: "Der englische Rechtstext gilt, sofern keine unterschriebene Vereinbarung etwas anderes sagt.", fr: "Le texte juridique anglais prévaut sauf accord signé.", it: "Il testo legale inglese prevale salvo accordo firmato.", el: "Το αγγλικό νομικό κείμενο υπερισχύει εκτός αν υπάρχει υπογεγραμμένη συμφωνία.", pl: "Angielski tekst prawny ma pierwszeństwo, chyba że podpisano inną umowę.", uk: "Англійський юридичний текст має перевагу, якщо немає підписаної угоди.", id: "Teks hukum bahasa Inggris berlaku kecuali ada perjanjian tertulis." }[code]
  };
  return withCards(generic);
}

function withCards(words) {
  words.problemCards ??= [
    [words.nav[0], words.problemCopy],
    [words.nav[2], words.featuresCopy],
    [words.nav[3], words.evalCopy],
    [words.nav[4], words.integrationsCopy]
  ];
  return words;
}

function translateFeatures(code, locale) {
  const names = {
    en: locales.en.features,
    ko: [["Context Query", "출처, 최신성, 정책 상태가 포함된 순위 기반 메모리 검색."], ["Eval Playground", "시드 데이터로 검색 설정을 재생하고 비교합니다."], ["Memory Observability", "검색, 쓰기, 삭제, 정책 결정을 추적합니다."], ["Governance Review", "제안된 메모리를 승인, 수정, 거절하거나 잊습니다."], ["Memory Portability", "메모리와 출처, 정책 상태를 내보냅니다."], ["Private Deployment", "Docker Compose와 Postgres로 로컬 또는 VPC에서 실행합니다."]],
    ja: [["Context Query", "出典、鮮度、ポリシー状態を含むランク付き記憶検索。"], ["Eval Playground", "シードデータで検索設定を再生し比較します。"], ["Memory Observability", "検索、書き込み、削除、ポリシー判断を追跡します。"], ["Governance Review", "提案された記憶を承認、編集、拒否、忘却します。"], ["Memory Portability", "記憶、出典、ポリシー状態をエクスポートします。"], ["Private Deployment", "Docker Compose と Postgres でローカル/VPC 実行。"]],
    "zh-hans": [["Context Query", "带出处、新鲜度和策略状态的排序记忆检索。"], ["Eval Playground", "用种子数据重放并比较检索设置。"], ["Memory Observability", "追踪每次检索、写入、删除和策略决策。"], ["Governance Review", "审批、修订、拒绝或遗忘候选记忆。"], ["Memory Portability", "导出记忆、出处、嵌入和策略状态。"], ["Private Deployment", "用 Docker Compose 和 Postgres 在本地或 VPC 运行。"]],
    "zh-hant": [["Context Query", "帶來源、新鮮度和策略狀態的排序記憶檢索。"], ["Eval Playground", "用種子資料重放並比較檢索設定。"], ["Memory Observability", "追蹤每次檢索、寫入、刪除與策略決策。"], ["Governance Review", "審批、修訂、拒絕或遺忘候選記憶。"], ["Memory Portability", "匯出記憶、來源、嵌入與策略狀態。"], ["Private Deployment", "用 Docker Compose 和 Postgres 在本機或 VPC 執行。"]]
  };
  return names[code] ?? locales.en.features.map(([name], index) => [name, [locale.featuresCopy, locale.evalCopy, locale.systemCopy, locale.problemCopy, locale.integrationsCopy, locale.finalCopy][index] ?? locale.featuresCopy]);
}

function footerWords(code) {
  const map = {
    ko: ["제품", "자료", "회사", "법무"],
    ja: ["製品", "リソース", "会社", "法務"],
    "zh-hans": ["产品", "资源", "公司", "法律"],
    "zh-hant": ["產品", "資源", "公司", "法律"],
    vi: ["Sản phẩm", "Tài nguyên", "Công ty", "Pháp lý"],
    es: ["Producto", "Recursos", "Empresa", "Legal"],
    pt: ["Produto", "Recursos", "Empresa", "Legal"],
    ru: ["Продукт", "Ресурсы", "Компания", "Право"],
    tr: ["Ürün", "Kaynaklar", "Şirket", "Hukuk"],
    de: ["Produkt", "Ressourcen", "Unternehmen", "Rechtliches"],
    fr: ["Produit", "Ressources", "Entreprise", "Juridique"],
    it: ["Prodotto", "Risorse", "Azienda", "Legale"],
    el: ["Προϊόν", "Πόροι", "Εταιρεία", "Νομικά"],
    pl: ["Produkt", "Zasoby", "Firma", "Prawne"],
    uk: ["Продукт", "Ресурси", "Компанія", "Право"],
    id: ["Produk", "Sumber daya", "Perusahaan", "Legal"]
  };
  const words = map[code] ?? ["Product", "Resources", "Company", "Legal"];
  return { product: words[0], resources: words[1], company: words[2], legal: words[3] };
}

function makePages(code) {
  const common = {
    docs: ["Docs", "Install the local alpha, seed the demo dataset, run smoke checks, and connect MCP-compatible agents."],
    architecture: ["Architecture", "A local-first API, MCP transport, eval engine, governance layer, and Postgres audit log."],
    changelog: ["Changelog", "v0.4 alpha focuses on local setup, context querying, eval proof, governance review, and reproducible smoke checks."],
    company: ["Company", "Operated by REDLAND PTE. LTD., Singapore UEN 202304648K."],
    contact: ["Contact", "Email: redland2024@gmail.com"],
    privacy: ["Privacy Policy", "Lore Context is designed for private deployment. The website avoids advertising trackers and the local alpha keeps customer data under your control."],
    terms: ["Terms of Service", "Lore Context is alpha software. Test carefully before production reliance and review your own legal obligations."],
    cookies: ["Cookie Notice", "The public website is designed to work without advertising cookies or third-party tracking scripts."],
    status: ["Status", "The marketing website is static. Runtime status depends on your local or private deployment."]
  };
  const localizedTitles = {
    ko: ["문서", "아키텍처", "변경 기록", "회사", "문의", "개인정보 처리방침", "서비스 약관", "쿠키 안내", "상태"],
    ja: ["ドキュメント", "アーキテクチャ", "変更履歴", "会社", "連絡先", "プライバシーポリシー", "利用規約", "Cookie 通知", "ステータス"],
    "zh-hans": ["文档", "架构", "更新日志", "公司", "联系", "隐私政策", "服务条款", "Cookie 说明", "状态"],
    "zh-hant": ["文件", "架構", "更新日誌", "公司", "聯絡", "隱私政策", "服務條款", "Cookie 說明", "狀態"],
    vi: ["Tài liệu", "Kiến trúc", "Nhật ký thay đổi", "Công ty", "Liên hệ", "Chính sách riêng tư", "Điều khoản", "Thông báo Cookie", "Trạng thái"],
    es: ["Docs", "Arquitectura", "Cambios", "Empresa", "Contacto", "Privacidad", "Términos", "Cookies", "Estado"],
    pt: ["Docs", "Arquitetura", "Changelog", "Empresa", "Contato", "Privacidade", "Termos", "Cookies", "Status"],
    ru: ["Документация", "Архитектура", "Журнал изменений", "Компания", "Контакты", "Конфиденциальность", "Условия", "Cookies", "Статус"],
    tr: ["Dokümanlar", "Mimari", "Değişiklikler", "Şirket", "İletişim", "Gizlilik", "Şartlar", "Çerezler", "Durum"],
    de: ["Dokumente", "Architektur", "Changelog", "Unternehmen", "Kontakt", "Datenschutz", "Bedingungen", "Cookies", "Status"],
    fr: ["Docs", "Architecture", "Changelog", "Entreprise", "Contact", "Confidentialité", "Conditions", "Cookies", "Statut"],
    it: ["Docs", "Architettura", "Changelog", "Azienda", "Contatto", "Privacy", "Termini", "Cookie", "Stato"],
    el: ["Docs", "Αρχιτεκτονική", "Αλλαγές", "Εταιρεία", "Επικοινωνία", "Απόρρητο", "Όροι", "Cookies", "Κατάσταση"],
    pl: ["Dokumenty", "Architektura", "Changelog", "Firma", "Kontakt", "Prywatność", "Warunki", "Cookies", "Status"],
    uk: ["Документи", "Архітектура", "Зміни", "Компанія", "Контакт", "Приватність", "Умови", "Cookies", "Статус"],
    id: ["Dokumen", "Arsitektur", "Changelog", "Perusahaan", "Kontak", "Privasi", "Ketentuan", "Cookies", "Status"]
  };
  const titles = localizedTitles[code];
  if (!titles) return common;
  const pages = {};
  pageSlugs.forEach((slug, index) => {
    pages[slug] = [titles[index], common[slug][1]];
  });
  return pages;
}

function pathFor(locale, slug = "") {
  return slug ? `/${locale}/${slug}.html` : `/${locale}/`;
}

function hrefFor(locale, slug = "") {
  return `${rootUrl}${pathFor(locale, slug)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function alternateLinks(slug = "") {
  const links = localeOrder
    .map((code) => `<link rel="alternate" hreflang="${locales[code].hreflang}" href="${hrefFor(code, slug)}" />`)
    .join("\n    ");
  return `${links}\n    <link rel="alternate" hreflang="x-default" href="${hrefFor("en", slug)}" />`;
}

function languageMenu(current, slug = "") {
  const t = locales[current];
  return `<details class="lang-menu">
          <summary aria-label="Change language"><span class="globe" aria-hidden="true">◎</span><span>${escapeHtml(t.short)}</span><span aria-hidden="true">⌄</span></summary>
          <div class="lang-panel">
            ${localeOrder
              .map((code) => {
                const item = locales[code];
                return `<a data-locale-link href="${pathFor(code, slug)}" lang="${item.lang}" hreflang="${item.hreflang}"${code === current ? ' aria-current="true"' : ""}><span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.short)}</span></a>`;
              })
              .join("")}
          </div>
        </details>`;
}

function layout({ locale, slug = "", title, description, body, isHome = false }) {
  const t = locales[locale];
  const pageTitle = isHome ? `Lore Context - ${t.statement}` : `${title} - Lore Context`;
  const currentSlug = slug === "index" ? "" : slug;
  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(pageTitle)}</title>
    ${alternateLinks(currentSlug)}
    <style>${styles()}</style>
  </head>
  <body>
    <header class="site-header">
      <nav class="nav shell" aria-label="Primary navigation">
        <a class="brand" href="${pathFor(locale)}" aria-label="Lore Context home">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>Lore Context</span>
          <span class="version">v0.4.2 - alpha</span>
        </a>
        <div class="nav-links" aria-label="Sections">
          ${["problem", "system", "features", "eval", "integrations", "docs"]
            .map((id, index) => `<a href="${id === "docs" ? pathFor(locale, "docs") : `${pathFor(locale)}#${id}`}">${escapeHtml(t.nav[index])}</a>`)
            .join("")}
        </div>
        <div class="nav-actions">
          ${languageMenu(locale, currentSlug)}
          <a class="button secondary" href="${pathFor(locale, "docs")}">${escapeHtml(t.ctaDocs)}</a>
          <a class="button secondary" href="${githubUrl}" rel="noreferrer">${escapeHtml(t.ctaGithub)} ↗</a>
          <a class="button primary" href="${pathFor(locale)}#start">${escapeHtml(t.ctaRun)} →</a>
        </div>
      </nav>
    </header>
    <main>${body}</main>
    ${footer(locale)}
    <script>
      try {
        localStorage.setItem("lore_locale", ${JSON.stringify(locale)});
        document.querySelectorAll("[data-locale-link]").forEach(function(link) {
          link.addEventListener("click", function() {
            try { localStorage.setItem("lore_locale", link.getAttribute("hreflang").toLowerCase()); } catch (e) {}
          });
        });
      } catch (e) {}
    </script>
  </body>
</html>`;
}

function homePage(locale) {
  const t = locales[locale];
  return layout({
    locale,
    isHome: true,
    title: t.h1,
    description: t.statement,
    body: `
      <section class="hero" id="hero">
        <div class="shell hero-grid">
          <div class="hero-copy">
            <div class="chip-row">${t.chips.map((chip, index) => `<span class="chip ${index === 0 ? "live" : ""}">${escapeHtml(chip)}</span>`).join("")}</div>
            <h1>${escapeHtml(t.h1)}</h1>
            <p class="hero-statement">${escapeHtml(t.statement)}</p>
            <p class="hero-support">${escapeHtml(t.support)}</p>
            <div class="hero-actions">
              <a class="button primary large" href="#start">${escapeHtml(t.ctaRun)} <span>→</span></a>
              <a class="button secondary large" href="#system">${escapeHtml(t.ctaArch)}</a>
            </div>
            <div class="command" aria-label="Local alpha command"><span>$ pnpm seed:demo && pnpm smoke:dashboard</span><span class="cursor" aria-hidden="true"></span></div>
            <div class="metric-strip" aria-label="Evaluation summary">
              ${metric("Recall@5", "0.928", "good")}
              ${metric("Precision@5", "0.814", "good")}
              ${metric("Stale-hit", "2.1%", "warn")}
              ${metric("p95 latency", "142ms", "info")}
            </div>
          </div>
          ${productSurface()}
        </div>
      </section>
      ${problemSection(t)}
      ${systemSection(t)}
      ${featuresSection(t)}
      ${alphaSection(t)}
      ${evalSection(t)}
      ${integrationsSection(t)}
      ${finalSection(t, locale)}
    `
  });
}

function metric(label, value, tone) {
  return `<div class="metric ${tone}"><span>${label}</span><strong>${value}</strong><i aria-hidden="true"></i></div>`;
}

function productSurface() {
  const rows = [
    ["claude-code", "#a4f1", "api-contract", "yes", "12%", "low", "approved", "good"],
    ["cursor", "#b2c8", "pricing-note", "yes", "18%", "low", "approved", "good"],
    ["qwen-code", "#c9d3", "deploy-fix", "yes", "52%", "med", "flagged", "warn"],
    ["hermes", "#d1a7", "private-key", "yes", "74%", "high", "redact", "risk"],
    ["fastgpt", "#f3c1", "old-schema", "no", "46%", "med", "review", "warn"]
  ];
  return `<div class="surface" aria-label="Lore Context product preview">
            <div class="surface-head">
              <span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span>lore › <b>context.ledger</b></span>
              <span class="live-dot">live · 14.2 q/s</span>
            </div>
            <div class="surface-stats">
              ${surfaceStat("Memories tracked", "12,840", "↑ 312/h", "good")}
              ${surfaceStat("Pending review", "7", "2 redact · 5 flag", "warn")}
              ${surfaceStat("Recall@5", "0.928", "+0.041", "good")}
              ${surfaceStat("p95 latency", "142ms", "+8ms", "info")}
            </div>
            <div class="ledger" aria-label="Memory evidence ledger">
              <div class="ledger-head"><span>source</span><span>memory</span><span>evidence</span><span>used_in_response</span><span>stale_score</span><span>sensitivity</span><span>review_status</span></div>
              ${rows
                .map(
                  (row, index) => `<div class="ledger-row ${index === 0 ? "active" : ""}">
                    <span>${row[0]}</span><span>${row[1]}</span><span>${row[2]}</span><span><b class="used ${row[3] === "yes" ? "yes" : "no"}">${row[3]}</b></span>
                    <span><b class="stale"><i class="${row[7]}" style="width:${row[4]}"></i></b></span><span>${row[5]}</span><span><b class="review ${row[6]}">${row[6]}</b></span>
                  </div>`
                )
                .join("")}
            </div>
            <div class="flow-visual">
              <div class="composer-card"><strong>context.compose()</strong><br />eval 0.94<br />policy pass<br />trace 142ms<br />k 5 / 12</div>
              <div class="gov-gate">gov · gate</div>
              <svg viewBox="0 0 520 190" role="img" aria-label="Animated memory provenance graph">
                <defs>
                  <linearGradient id="flow-ok" x1="0" x2="1"><stop offset="0" stop-color="#0a8f66" /><stop offset="1" stop-color="#00a7b8" /></linearGradient>
                  <linearGradient id="flow-warn" x1="0" x2="1"><stop offset="0" stop-color="#ca7a15" /><stop offset="1" stop-color="#c94949" /></linearGradient>
                </defs>
                <path class="flow flow-a" d="M130 94 C210 34 284 42 355 54 S458 82 500 38" />
                <path class="flow flow-b" d="M130 94 C218 96 300 98 386 92 S462 90 500 94" />
                <path class="flow flow-c" d="M130 94 C220 150 300 152 380 137 S456 136 500 154" />
                <circle class="node pulse" cx="318" cy="54" r="8" />
                <circle class="node" cx="390" cy="68" r="7" />
                <circle class="node warn" cx="456" cy="58" r="8" />
                <circle class="node risk" cx="500" cy="154" r="8" />
                <text x="306" y="36">memory#a4f1</text><text x="440" y="42">STALE</text><text x="438" y="176">SENSITIVE</text>
              </svg>
            </div>
            <div class="surface-foot"><span>postgres://lore_local · audit_log</span><span>all synced 0.4s ago</span></div>
          </div>`;
}

function surfaceStat(label, value, delta, tone) {
  return `<div class="surface-stat ${tone}"><span>${label}</span><strong>${value}</strong><small>${delta}</small><svg viewBox="0 0 96 20" aria-hidden="true"><polyline points="0,16 12,14 24,15 36,10 48,12 60,8 72,9 84,5 96,4" /></svg></div>`;
}

function problemSection(t) {
  return `<section id="problem" class="section">
    <div class="shell">
      ${sectionHead(t.sectionNums[0], t.problemTitle, t.problemCopy)}
      <div class="problem-grid">${t.problemCards.map(([title, copy], index) => `<article class="problem-card"><span>0${index + 1}</span>${problemVisual(index)}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`).join("")}</div>
    </div>
  </section>`;
}

function problemVisual(index) {
  const visuals = [
    `<svg viewBox="0 0 220 70" role="img" aria-label="Stale memory timeline">
      ${Array.from({ length: 18 }, (_, i) => `<rect x="${8 + i * 11}" y="${32 - ((i * 7) % 23)}" width="6" height="${22 + ((i * 5) % 24)}" rx="1.5" class="${i > 12 ? "warn-fill" : i < 5 ? "active-fill" : "muted-fill"}" />`).join("")}
      <line x1="6" y1="58" x2="214" y2="58" /><text x="6" y="68">14d ago</text><text x="180" y="68">now</text>
    </svg>`,
    `<svg viewBox="0 0 220 70" role="img" aria-label="Unknown provenance chain">
      <circle cx="30" cy="34" r="13" /><text x="30" y="39">?</text><path class="dash" d="M48 34 H82" />
      ${["doc?", "user?", "run?", "when?"].map((label, i) => `<g transform="translate(${88 + i * 32},23)"><rect width="27" height="22" rx="3" /><text x="13.5" y="14">${label}</text></g>`).join("")}
    </svg>`,
    `<svg viewBox="0 0 220 70" role="img" aria-label="Unsafe writeback gate">
      <rect x="8" y="24" width="58" height="24" rx="4" /><text x="37" y="39">agent</text><path class="danger-path" d="M66 36 H132" /><path class="danger-arrow" d="M132 31 L142 36 L132 41 Z" />
      <rect class="diamond" x="103" y="27" width="22" height="22" /><text class="danger-text" x="114" y="41">!</text><rect x="150" y="24" width="62" height="24" rx="4" /><text x="181" y="39">memory</text>
    </svg>`,
    `<svg viewBox="0 0 220 70" role="img" aria-label="Backend lock-in stores">
      ${["pgvec", "qdrant", "weav.", "milvus"].map((label, i) => `<g transform="translate(${7 + i * 53},14)"><rect width="44" height="40" rx="4" class="${i === 0 ? "active-stroke" : ""}" /><text x="22" y="17">${label}</text><line x1="8" y1="24" x2="36" y2="24" /><line x1="8" y1="31" x2="30" y2="31" /></g>`).join("")}
    </svg>`
  ];
  return `<div class="problem-visual">${visuals[index] ?? visuals[0]}</div>`;
}

function systemSection(t) {
  return `<section id="system" class="section">
    <div class="shell">
      ${sectionHead(t.sectionNums[1], t.systemTitle, t.systemCopy)}
      <div class="system-board">
        <div class="board-head"><span>System diagram · context plane v0.4</span><span>read path · policy gate · persist + audit</span></div>
        <div class="system-canvas">
          <svg viewBox="0 0 1180 330" role="img" aria-label="Lore Context system pipeline">
            <defs>
              <marker id="arrow-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" /></marker>
              <marker id="arrow-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" /></marker>
            </defs>
            ${["MCP CLIENTS", "SDK · STDIO", "COMPOSER", "CONTROL", "PERSISTENCE"].map((label, i) => `<text class="sys-label" x="${24 + i * 230}" y="25">${label}</text>`).join("")}
            <g class="client-stack" transform="translate(24,50)">
              ${["claude-code", "cursor", "qwen-code", "hermes", "dify"].map((name, i) => `<g transform="translate(0,${i * 42})"><rect width="162" height="32" rx="4" /><circle cx="14" cy="16" r="3" /><text x="27" y="20">${name}</text></g>`).join("")}
            </g>
            <g class="sys-card query-card" transform="translate(246,132)">
              <rect width="178" height="82" rx="5" /><text class="mini-label" x="14" y="22">CALL</text><text class="card-title" x="14" y="46">context.query()</text><line x1="14" y1="58" x2="164" y2="58" /><text class="mono-small" x="14" y="72">k:5 · ttl:24h · scope:repo</text>
            </g>
            <g class="sys-card compose-card" transform="translate(470,88)">
              <rect width="210" height="164" rx="5" /><text class="mini-label" x="16" y="24">COMPOSE</text><text class="card-title" x="16" y="48">context.compose()</text><line x1="16" y1="60" x2="194" y2="60" />
              ${["retrieve()   k=12", "rerank()     local", "policy()     redact 2", "trace()      142ms", "return       5 / 12"].map((row, i) => `<text class="mono-small" x="16" y="${84 + i * 17}">${row}</text>`).join("")}
            </g>
            <g class="control-stack" transform="translate(725,48)">
              ${[["eval", "recall@5 · precision · MRR", "good"], ["trace", "span tree · per-source · p95", "info"], ["governance", "policy · redact · review", "warn"]].map(([name, copy, tone], i) => `<g transform="translate(0,${i * 68})"><rect width="220" height="52" rx="5" /><rect class="${tone}" width="4" height="52" rx="2" /><text class="card-title" x="16" y="23">${name}</text><text class="mono-small" x="16" y="41">${copy}</text></g>`).join("")}
            </g>
            <g class="sys-card store-card" transform="translate(980,54)">
              <rect width="170" height="76" rx="5" /><ellipse cx="28" cy="23" rx="15" ry="5" /><path d="M13 23 V43 A15 5 0 0 0 43 43 V23" /><text class="card-title" x="58" y="30">Postgres</text><text class="mono-small" x="58" y="48">audit · WAL · pgvector</text><line x1="14" y1="58" x2="154" y2="58" /><text class="mono-small" x="14" y="70">1,284,432 rows</text>
            </g>
            <g class="sys-card adapter-card" transform="translate(980,164)"><rect width="170" height="54" rx="5" /><text class="card-title" x="14" y="25">agentmemory</text><text class="mono-small" x="14" y="42">qdrant · weaviate · pgvec</text></g>
            <g class="sys-edges">
              <path d="M186 66 C220 66 216 174 246 174" /><path d="M186 108 C220 108 216 174 246 174" /><path d="M186 150 L246 174" /><path d="M186 192 C220 192 216 178 246 178" /><path d="M186 234 C220 234 216 182 246 182" />
              <path class="read" d="M424 174 H470" /><path d="M680 124 L725 74" /><path d="M680 170 L725 142" /><path d="M680 218 L725 210" /><path class="persist" d="M680 225 C790 304 900 286 980 198" />
            </g>
          </svg>
        </div>
        <div class="system-strip">
          ${["MCP clients", "context.query", "composer", "eval / trace / governance", "Postgres + adapter"].map((step, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><strong>${step}</strong><p>${escapeHtml([t.integrationsCopy, t.features[0][1], t.systemCopy, t.evalCopy, t.features[4][1]][index])}</p></div>`).join("")}
        </div>
      </div>
    </div>
  </section>`;
}

function featuresSection(t) {
  return `<section id="features" class="section">
    <div class="shell">
      ${sectionHead(t.sectionNums[2], t.featuresTitle, t.featuresCopy)}
      <div class="features-grid">
        ${t.features
          .map(
            ([title, copy], index) => `<article class="feature-card">
              <div class="feature-tag"><span>F · ${String(index + 1).padStart(2, "0")}</span><span>${["query", "eval", "trace", "govern", "export", "deploy"][index]}</span></div>
              ${featureVisual(index)}
              <h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p>
              <div class="feature-meta">${featureMeta(index).map((item) => `<span>${item}</span>`).join("")}</div>
            </article>`
          )
          .join("")}
      </div>
    </div>
  </section>`;
}

function featureMeta(index) {
  return [
    ["stdio", "http", "ttl-aware"],
    ["recall@5", "precision@5", "MRR"],
    ["span tree", "per-agent", "p95"],
    ["policy.lore", "diff view", "review"],
    ["JSON Lines", ".lore.tar", "replay()"],
    ["compose", "air-gapped", "BYO Postgres"]
  ][index] ?? ["inspectable", "scriptable", "governed"];
}

function featureVisual(index) {
  const visuals = [
    `<rect x="0" y="7" width="280" height="22" rx="4" /><text x="10" y="22">› context.query("auth flow", k:5)</text>${[180, 150, 112, 82].map((w, i) => `<rect class="rank-bar" x="0" y="${39 + i * 13}" width="${w}" height="9" rx="2" />`).join("")}`,
    `<line x1="0" y1="31" x2="280" y2="31" class="dash" /><line x1="0" y1="72" x2="280" y2="72" />${Array.from({ length: 26 }, (_, i) => `<rect class="${i > 17 ? "active-fill" : "rank-bar"}" x="${i * 10}" y="${70 - (20 + ((i * 9) % 48))}" width="6" height="${20 + ((i * 9) % 48)}" />`).join("")}<text x="0" y="86">run #248 → #276 · +9.2%</text>`,
    `${[["0", 8, 280], ["20", 24, 180], ["210", 24, 60], ["30", 40, 84], ["122", 40, 62], ["42", 56, 52], ["54", 72, 34]].map(([x, y, w]) => `<rect class="rank-bar" x="${x}" y="${y}" width="${w}" height="9" rx="2" />`).join("")}<text x="6" y="16">compose</text><text x="26" y="32">retrieve</text><text x="216" y="32">rerank</text>`,
    `<rect x="0" y="15" width="122" height="60" rx="4" /><text x="8" y="30">+ memory#a4f1</text><text class="ok-text" x="8" y="45">+ scope:repo</text><text class="danger-text" x="8" y="60">- secret redacted</text>${["approve", "redact", "defer", "reject"].map((label, i) => `<g transform="translate(${140 + (i % 2) * 70},${18 + Math.floor(i / 2) * 30})"><rect class="${i === 0 ? "active-stroke" : i === 3 ? "danger-stroke" : ""}" width="60" height="22" rx="4" /><text x="30" y="15">${label}</text></g>`).join("")}`,
    `<rect x="6" y="20" width="80" height="48" rx="5" /><text x="46" y="39">lore</text><text x="46" y="55">12,840 mem</text><path class="read" d="M92 44 H140" /><rect x="148" y="15" width="58" height="58" rx="5" class="dash-box" /><text x="177" y="49">⇆</text><rect x="218" y="20" width="56" height="48" rx="5" /><text x="246" y="39">qdrant</text><text x="246" y="55">replay</text>`,
    `<rect class="dash-box" x="6" y="7" width="268" height="76" rx="4" /><text x="14" y="22">your network</text>${["lore-api", "dashboard", "postgres"].map((label, i) => `<g transform="translate(${20 + i * 70},36)"><rect width="64" height="34" rx="4" /><circle cx="10" cy="14" r="3" /><text x="18" y="18">${label}</text></g>`).join("")}<rect class="danger-stroke" x="236" y="36" width="36" height="34" rx="4" /><text class="danger-text" x="254" y="58">⊘</text>`
  ];
  return `<svg class="feature-viz" viewBox="0 0 280 88" role="img" aria-label="Feature visual ${index + 1}">${visuals[index] ?? visuals[0]}</svg>`;
}

function alphaSection(t) {
  const rows = [
    ["REST API", "/v1/context · /v1/memory · /v1/eval", "v0.4.2", "done"],
    ["MCP stdio SDK transport", "drop-in compatible client transport", "mcp 0.6", "done"],
    ["Next Dashboard", "trace explorer · eval comparison · review queue", "next 16", "done"],
    ["Postgres incremental persistence", "audit log · idempotent writes", "pg 16", "done",
    ],
    ["Demo dataset", "seeded memories across fictional teams", "seed:demo", "done"],
    ["Playwright smoke", "dashboard renders and critical paths pass", "smoke", "done"],
    ["Docker Compose", "lore-api · dashboard · postgres in one private stack", "docker", "done"],
    ["Cloud sync (private)", "single-tenant path behind feature flag", "flag", "partial"],
    ["Eval autopilot", "scheduled runs in review", "next", "partial"]
  ];
  return `<section id="alpha" class="section">
    <div class="shell">
      ${sectionHead(t.sectionNums[3], t.alphaTitle, t.alphaCopy)}
      <div class="alpha-grid">
        <div class="alpha-list">${rows.map(([name, desc, status, state]) => `<div class="alpha-row"><b class="${state}">${state === "done" ? "✓" : "◐"}</b><span><strong>${name}</strong><small>${desc}</small></span><em>${status}</em></div>`).join("")}</div>
        <div class="manifest alpha-side"><div class="manifest-head"><h3>Build manifest</h3><span>v0.4.2 · 28.04.2026</span></div><dl><dt>version</dt><dd>0.4.2-alpha</dd><dt>runtime</dt><dd>node >=22 · pg 16</dd><dt>smoke</dt><dd class="ok-text">passing · 142s</dd><dt>bundle</dt><dd>static · 182 files</dd><dt>telemetry</dt><dd class="ok-text">off by default</dd><dt>license</dt><dd>Apache 2.0</dd></dl><div class="run-card"><span># first run</span><code>pnpm install<br />pnpm seed:demo<br />pnpm smoke:dashboard<br />pnpm dev:website</code></div></div>
      </div>
    </div>
  </section>`;
}

function evalSection(t) {
  return `<section id="eval" class="section">
    <div class="shell">
      ${sectionHead(t.sectionNums[4], t.evalTitle, t.evalCopy)}
      <div class="eval-shell">
        <div class="eval-head"><span>eval/run-0276</span><span>seed: lore-demo · 4,200 q · retriever: local</span><span class="live-pill">LIVE</span></div>
        <div class="eval-metrics">${evalMetric("Recall@5", "0.928", "+0.041", "good", "0,22 7,20 14,18 21,16 28,17 35,14 42,12 49,11 56,10 63,8 70,9 77,6 84,7 96,4")}${evalMetric("Precision@5", "0.814", "+0.022", "good", "0,18 7,17 14,16 21,15 28,14 35,15 42,12 49,13 56,10 63,11 70,9 77,8 84,7 96,5")}${evalMetric("MRR", "0.762", "+0.018", "good", "0,20 7,18 14,17 21,15 28,14 35,12 42,13 49,11 56,10 63,8 70,9 77,7 84,6 96,5")}${evalMetric("Stale-hit", "2.1%", "-0.6pt", "warn", "0,8 7,9 14,11 21,12 28,13 35,14 42,15 49,16 56,17 63,18 70,19 77,21 84,22 96,24")}${evalMetric("p95 latency", "142ms", "+8ms", "info", "0,18 7,17 14,16 21,17 28,15 35,14 42,15 49,13 56,12 63,14 70,11 77,12 84,10 96,8")}</div>
        <div class="eval-detail">
          <div class="eval-trace"><h3>Per-stage span timing · last 8 traces</h3>${["embed", "retrieve.pgvec", "rerank.local", "eval.score", "policy.gate", "compose", "trace.flush"].map((name, index) => `<div class="trace-row"><span>${name}</span><b><i style="left:${[0, 12, 50, 78, 86, 90, 98][index]}%;width:${[12, 38, 28, 8, 4, 8, 2][index]}%"></i></b><em>${[14, 46, 32, 9, 4, 11, 3][index]}ms</em></div>`).join("")}</div>
          <div class="eval-side"><h3>Top retrieval sources</h3>${["cursor", "claude-code", "qwen-code", "hermes", "dify", "fastgpt"].map((name, index) => `<div class="dist-row"><span>${name}</span><b><i style="width:${[86, 74, 52, 41, 28, 12][index]}%"></i></b><em>${[86, 74, 52, 41, 28, 12][index]}%</em></div>`).join("")}<div class="eval-note"><span>4,200 queries · 84,000 mem</span><span>rerun · diff vs main</span></div></div>
        </div>
      </div>
    </div>
  </section>`;
}

function evalMetric(label, value, delta, tone, points) {
  return `<div class="metric ${tone}"><span>${label}</span><strong>${value}</strong><small>${delta} vs baseline</small><svg class="spark" viewBox="0 0 96 28" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" /></svg></div>`;
}

function integrationsSection(t) {
  const names = ["Claude Code", "Cursor", "Qwen Code", "OpenClaw", "Hermes", "Dify", "FastGPT", "Roo Code", "OpenWebUI", "Local agents"];
  return `<section id="integrations" class="section">
    <div class="shell">
      ${sectionHead(t.sectionNums[5], t.integrationsTitle, t.integrationsCopy)}
      <div class="integrations-grid">${names.map((name, index) => `<div class="integration"><span>${name.slice(0, 2).toUpperCase()}</span><strong>${name}</strong><small>${index < 5 ? "mcp.stdio" : "rest.v1"} · ${index < 6 ? "alpha" : "planned"}</small></div>`).join("")}</div>
    </div>
  </section>`;
}

function finalSection(t, locale) {
  return `<section id="start" class="section final">
    <div class="shell final-grid">
      <div>${sectionHead(t.sectionNums[6], t.finalTitle, t.finalCopy)}<div class="hero-actions"><a class="button primary large" href="${pathFor(locale, "docs")}">${escapeHtml(t.ctaRun)} →</a><a class="button secondary large" href="${pathFor(locale, "architecture")}">${escapeHtml(t.ctaArch)}</a></div></div>
      <pre class="terminal" aria-label="Local alpha commands"><code>$ pnpm install
$ pnpm seed:demo
$ pnpm smoke:dashboard
$ pnpm dev:website</code></pre>
    </div>
  </section>`;
}

function sectionHead(num, title, copy) {
  return `<div class="section-head"><span class="section-num">${escapeHtml(num)}</span><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div></div>`;
}

function footer(locale) {
  const t = locales[locale];
  return `<footer class="footer">
    <div class="shell footer-grid">
      <div><a class="brand footer-brand" href="${pathFor(locale)}"><span class="brand-mark" aria-hidden="true"></span><span>Lore Context</span></a><p>REDLAND PTE. LTD.<br />UEN 202304648K · Singapore<br />redland2024@gmail.com<br />1 North Bridge Road, #11-02, High Street Centre, Singapore 179094</p></div>
      <div><h3>${escapeHtml(t.footerProduct)}</h3><a href="${pathFor(locale)}#features">${escapeHtml(t.nav[2])}</a><a href="${pathFor(locale)}#system">${escapeHtml(t.nav[1])}</a><a href="${pathFor(locale)}#eval">${escapeHtml(t.nav[3])}</a><a href="${pathFor(locale)}#integrations">${escapeHtml(t.nav[4])}</a></div>
      <div><h3>${escapeHtml(t.footerResources)}</h3><a href="${pathFor(locale, "docs")}">${escapeHtml(t.pages.docs[0])}</a><a href="${pathFor(locale, "architecture")}">${escapeHtml(t.pages.architecture[0])}</a><a href="${pathFor(locale, "changelog")}">${escapeHtml(t.pages.changelog[0])}</a><a href="${githubUrl}" rel="noreferrer">GitHub ↗</a></div>
      <div><h3>${escapeHtml(t.footerCompany)}</h3><a href="${pathFor(locale, "company")}">${escapeHtml(t.pages.company[0])}</a><a href="${pathFor(locale, "contact")}">${escapeHtml(t.pages.contact[0])}</a><a href="${pathFor(locale, "privacy")}">${escapeHtml(t.pages.privacy[0])}</a><a href="${pathFor(locale, "terms")}">${escapeHtml(t.pages.terms[0])}</a><a href="${pathFor(locale, "cookies")}">${escapeHtml(t.pages.cookies[0])}</a><a href="${pathFor(locale, "status")}">${escapeHtml(t.pages.status[0])}</a></div>
      <div class="legal-row"><span>© 2026 REDLAND PTE. LTD. · Apache 2.0</span><span>${escapeHtml(t.notice)}</span></div>
    </div>
  </footer>`;
}

function infoPage(locale, slug) {
  const t = locales[locale];
  const [title, copy] = t.pages[slug];
  return layout({
    locale,
    slug,
    title,
    description: copy,
    body: `<section class="section page">
      <div class="shell article">
        <span class="section-num">${escapeHtml(t.footerResources)} / ${escapeHtml(title)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(copy)}</p>
        <div class="info-panel">
          ${pageBody(locale, slug)}
        </div>
      </div>
    </section>`
  });
}

function pageBody(locale, slug) {
  const t = locales[locale];
  const rows = {
    docs: [
      ["1", "pnpm install"],
      ["2", "pnpm seed:demo"],
      ["3", "pnpm smoke:dashboard"],
      ["4", "pnpm dev:website"]
    ],
    architecture: [["API", "REST /v1/context, /v1/memory, /v1/eval"], ["Transport", "MCP stdio"], ["Storage", "Postgres 16 audit log"], ["Governance", "review, redact, reject, forget"]],
    changelog: [["v0.4.2-alpha", "website v3, local alpha proof, deterministic static build"], ["v0.4", "context query, eval report, governance queue"]],
    company: [["Legal entity", "REDLAND PTE. LTD."], ["UEN", "202304648K"], ["Registered office", "1 North Bridge Road, #11-02, High Street Centre, Singapore 179094"], ["Activity", "Software and application development"]],
    contact: [["Email", "redland2024@gmail.com"], ["Response scope", "Product, security, privacy, and partnership questions"], ["GitHub", githubUrl]],
    privacy: [["Data posture", "Local-first alpha; private deployment by default"], ["Website", "No advertising cookies or third-party tracking scripts"], ["Requests", "Contact redland2024@gmail.com for access, correction, or deletion requests"]],
    terms: [["Alpha notice", "Lore Context is provided for testing and evaluation"], ["No production warranty", "Validate your own use case before relying on it"], ["Governing law", "Singapore, unless a signed agreement says otherwise"]],
    cookies: [["Required cookies", "None for static browsing"], ["Local storage", "Only locale preference may be saved"], ["Advertising", "No advertising cookie layer is included"]],
    status: [["Website", "Static and edge-cache friendly"], ["Local alpha", "Runs in your environment"], ["Incidents", "Use your own deployment logs and smoke checks"]]
  }[slug];
  return `<dl>${rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl><p class="notice">${escapeHtml(t.notice)}</p>`;
}

function rootIndex() {
  const list = localeOrder.map((code) => {
    const t = locales[code];
    return `<a href="${pathFor(code)}" lang="${t.lang}" hreflang="${t.hreflang}">${escapeHtml(t.label)} <span>${escapeHtml(t.short)}</span></a>`;
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Lore Context</title>${alternateLinks("")}<style>${styles()}</style></head><body><main class="section page"><div class="shell article"><h1>Lore Context</h1><p class="lead">Choose your language.</p><div class="language-grid">${list.join("")}</div></div></main><script>
const supported=${JSON.stringify(localeOrder)};
const aliases={zh:"zh-hans","zh-cn":"zh-hans","zh-sg":"zh-hans","zh-tw":"zh-hant","zh-hk":"zh-hant","pt-br":"pt","pt-pt":"pt","id-id":"id","en-us":"en","en-gb":"en"};
function pick(){try{const saved=localStorage.getItem("lore_locale");if(supported.includes(saved))return saved;}catch(e){}const langs=navigator.languages||[navigator.language||"en"];for(const raw of langs){const lang=String(raw||"").toLowerCase();if(aliases[lang])return aliases[lang];const base=lang.split("-")[0];if(supported.includes(base))return base;}return "en";}
location.replace("/"+pick()+"/");
</script></body></html>`;
}

function redirectPage(slug) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta http-equiv="refresh" content="0; url=/en/${slug}.html" /><title>Lore Context</title></head><body><a href="/en/${slug}.html">Continue</a></body></html>`;
}

function robots() {
  return `User-agent: *
Allow: /
Sitemap: ${rootUrl}/sitemap.xml
`;
}

function sitemap() {
  const urls = [""];
  for (const locale of localeOrder) {
    urls.push(pathFor(locale));
    for (const slug of pageSlugs) urls.push(pathFor(locale, slug));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${rootUrl}${url || "/"}</loc></url>`).join("\n")}
</urlset>
`;
}

export function generateSiteFiles() {
  const files = new Map();
  files.set("index.html", rootIndex());
  files.set("robots.txt", robots());
  files.set("sitemap.xml", sitemap());
  for (const slug of pageSlugs) files.set(`${slug}.html`, redirectPage(slug));
  for (const locale of localeOrder) {
    files.set(`${locale}/index.html`, homePage(locale));
    for (const slug of pageSlugs) files.set(`${locale}/${slug}.html`, infoPage(locale, slug));
  }
  return files;
}

function styles() {
  return `
:root{color-scheme:light;--paper:#f8f7f2;--paper-2:#fffdf8;--paper-3:#f0efea;--ink:#111418;--ink-2:#303942;--muted:#65707c;--faint:#8a949f;--line:rgba(22,27,31,.13);--line-2:rgba(22,27,31,.22);--cyan:#08aebe;--green:#0a8f66;--amber:#c77912;--red:#c94949;--shadow:0 28px 70px rgba(17,20,24,.14)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}a{color:inherit;text-decoration:none}.shell{width:min(1280px,calc(100% - 48px));margin:0 auto}.site-header{position:sticky;top:0;z-index:50;border-bottom:1px solid var(--line);background:rgba(248,247,242,.9);backdrop-filter:blur(18px)}.nav{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{display:inline-flex;align-items:center;gap:10px;font-weight:800;white-space:nowrap}.brand-mark{width:20px;height:20px;border-radius:4px;background:linear-gradient(135deg,var(--ink) 0 42%,transparent 42%),linear-gradient(135deg,var(--cyan) 0 58%,var(--green) 58%)}.version{font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--faint)}.nav-links,.nav-actions{display:flex;align-items:center;gap:8px}.nav-links a{padding:8px;color:var(--ink-2);font-size:13px;font-weight:750}.nav-links a:hover{color:var(--ink)}.button{border:1px solid var(--line-2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 14px;font-size:13px;font-weight:800;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease}.button:hover{transform:translateY(-1px);border-color:rgba(8,174,190,.55);box-shadow:0 10px 26px rgba(8,174,190,.13)}.button.primary{background:var(--ink);border-color:var(--ink);color:#fff}.button.secondary{background:var(--paper-2)}.button.large{min-height:44px;padding:0 18px}.lang-menu{position:relative}.lang-menu summary{list-style:none;border:1px solid transparent;border-radius:8px;min-height:40px;padding:0 10px;display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:800}.lang-menu summary::-webkit-details-marker{display:none}.lang-menu[open] summary,.lang-menu summary:hover{background:var(--paper-2);border-color:var(--line)}.lang-panel{position:absolute;right:0;top:calc(100% + 8px);width:250px;max-height:390px;overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--paper-2);box-shadow:var(--shadow);padding:6px}.lang-panel a{display:flex;justify-content:space-between;gap:14px;border-radius:6px;padding:9px 10px;font-size:13px}.lang-panel a:hover,.lang-panel a[aria-current=true]{background:var(--paper-3)}.lang-panel a span:last-child{font:800 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--cyan)}
.hero{position:relative;overflow:hidden;border-bottom:1px solid var(--line);background:linear-gradient(rgba(37,47,56,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(37,47,56,.055) 1px,transparent 1px),var(--paper);background-size:42px 42px}.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(248,247,242,.96),rgba(248,247,242,.68) 47%,transparent 86%);pointer-events:none}.hero-grid{position:relative;display:grid;grid-template-columns:minmax(420px,540px) 1fr;gap:56px;align-items:start;padding:76px 0 72px}.chip-row{display:flex;gap:8px;flex-wrap:wrap}.chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:6px;background:rgba(255,253,248,.82);padding:5px 9px;font:800 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink-2);letter-spacing:.02em}.chip:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--green)}.chip.live{color:var(--green)}.hero h1{margin:44px 0 0;font-size:clamp(48px,6.2vw,82px);line-height:.95;letter-spacing:0;font-weight:780}.hero-statement{max-width:540px;margin:22px 0 0;font-size:clamp(21px,2vw,26px);line-height:1.18;font-weight:720;color:#1f262d}.hero-support{max-width:540px;margin:18px 0 0;color:#46505a;font-size:15px;line-height:1.6}.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}.command{margin-top:14px;display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:6px;background:rgba(255,253,248,.88);min-height:36px;padding:0 10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#4b5661}.cursor{width:7px;height:16px;margin-left:7px;background:var(--cyan);animation:cursorBlink 1.05s steps(2,end) infinite}.metric-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}.metric{border:1px solid var(--line);border-radius:8px;background:rgba(255,253,248,.84);padding:12px}.metric span{display:block;color:var(--faint);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}.metric strong{display:block;margin-top:5px;font:850 17px ui-monospace,SFMono-Regular,Menlo,monospace}.metric.good strong{color:var(--green)}.metric.warn strong{color:var(--amber)}.metric.info strong{color:#07849a}.metric i{display:block;height:4px;margin-top:12px;border-radius:4px;background:currentColor;opacity:.25;transform-origin:left;animation:barReveal 1.8s ease-out both}
.surface{border:1px solid var(--line);border-radius:8px;background:rgba(255,253,248,.9);box-shadow:var(--shadow);overflow:hidden;backdrop-filter:blur(16px)}.surface-head,.surface-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line);background:rgba(240,239,234,.78);min-height:38px;padding:0 14px;color:var(--muted);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}.surface-foot{border-top:1px solid var(--line);border-bottom:0}.window-dots{display:inline-flex;gap:5px}.window-dots i{width:8px;height:8px;border-radius:50%;background:var(--green)}.window-dots i:first-child{background:var(--red)}.window-dots i:nth-child(2){background:var(--amber)}.live-dot:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:6px;animation:nodePulse 1.6s ease-in-out infinite}.surface-stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.surface-stat{padding:14px;border-right:1px solid var(--line)}.surface-stat:last-child{border-right:0}.surface-stat span{display:block;color:var(--faint);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}.surface-stat strong{display:block;margin-top:6px;font-size:22px}.surface-stat small{display:block;color:var(--muted);font:11px ui-monospace,SFMono-Regular,Menlo,monospace}.surface-stat svg{width:100%;height:22px;margin-top:8px}.surface-stat polyline{fill:none;stroke:var(--cyan);stroke-width:1.8;stroke-dasharray:130;stroke-dashoffset:130;animation:sparkDraw 2.4s ease-out forwards}.ledger{font:10px ui-monospace,SFMono-Regular,Menlo,monospace}.ledger-head,.ledger-row{display:grid;grid-template-columns:1.1fr .66fr .95fr .86fr .9fr .74fr .95fr;gap:8px;align-items:center;padding:8px 14px;border-bottom:1px solid rgba(22,27,31,.08)}.ledger-head{color:var(--faint);font-weight:850;text-transform:uppercase;background:rgba(240,239,234,.5)}.ledger-row{position:relative;color:#4c5863}.ledger-row.active:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(8,174,190,.14),transparent);animation:ledgerScan 2.9s ease-in-out infinite}.used,.review{position:relative;z-index:1;display:inline-flex;width:max-content;border-radius:5px;padding:2px 6px;font-size:9px;font-weight:850}.used.yes,.review.approved{background:rgba(10,143,102,.12);color:var(--green)}.used.no,.review.flagged,.review.review{background:rgba(199,121,18,.14);color:var(--amber)}.review.redact{background:rgba(201,73,73,.12);color:var(--red)}.stale{display:block;height:6px;border-radius:6px;background:rgba(0,0,0,.08);overflow:hidden}.stale i{display:block;height:100%;border-radius:6px;background:var(--green);animation:barReveal 2s ease-out both}.stale i.warn{background:var(--amber)}.stale i.risk{background:var(--red)}.flow-visual{position:relative;margin:12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.5);overflow:hidden}.flow-visual svg{width:100%;height:190px;display:block}.flow{fill:none;stroke-width:1.6;stroke-dasharray:8 7;animation:flowDash 5s linear infinite}.flow-a{stroke:url(#flow-ok)}.flow-b{stroke:var(--cyan);opacity:.45}.flow-c{stroke:url(#flow-warn)}.node{fill:var(--green);opacity:.72}.node.warn{fill:var(--amber)}.node.risk{fill:var(--red)}.node.pulse{animation:nodePulse 2.2s ease-in-out infinite;transform-origin:center}.flow-visual text{font:10px ui-monospace,SFMono-Regular,Menlo,monospace;fill:var(--muted)}.composer-card,.gov-gate{position:absolute;z-index:2;border:1px solid var(--line-2);border-radius:8px;background:rgba(255,253,248,.92);font:10px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#3d4852}.composer-card{left:14px;top:50px;width:124px;padding:10px}.gov-gate{left:150px;top:82px;padding:4px 8px;color:var(--amber)}
.section{border-bottom:1px solid var(--line);padding:90px 0}.section-head{display:grid;grid-template-columns:190px 1fr;gap:34px;margin-bottom:42px}.section-num{font:900 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--green);letter-spacing:.04em;text-transform:uppercase}.section h2{margin:0;font-size:clamp(32px,3.8vw,48px);line-height:1.02;letter-spacing:0}.section-head p,.lead{max-width:740px;margin:14px 0 0;color:#48535e;font-size:16px}.problem-grid,.features-grid,.integrations-grid{display:grid;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--paper-2)}.problem-grid{grid-template-columns:repeat(4,1fr)}.problem-card,.feature-card,.integration{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:24px;min-height:190px}.problem-card:nth-child(4n),.feature-card:nth-child(3n),.integration:nth-child(5n){border-right:0}.problem-card span,.feature-tag{color:var(--faint);font:850 11px ui-monospace,SFMono-Regular,Menlo,monospace}.problem-card h3,.feature-card h3{margin:28px 0 0;font-size:19px}.problem-card p,.feature-card p{color:#56616c;font-size:14px}.pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.pipe-step{position:relative;border:1px solid var(--line);border-radius:8px;background:var(--paper-2);padding:20px;min-height:180px}.pipe-step:not(:last-child):after{content:"";position:absolute;right:-11px;top:50%;width:12px;border-top:1px solid var(--line-2)}.pipe-step span{font:850 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--faint)}.pipe-step strong{display:block;margin-top:26px;font-size:17px}.pipe-step p{color:#59636e;font-size:13px}.features-grid{grid-template-columns:repeat(3,1fr)}.feature-card{min-height:300px}.feature-tag{display:flex;justify-content:space-between}.mini-viz{width:100%;height:80px;margin:18px 0}.mini-viz rect{fill:var(--paper-3);stroke:var(--line-2)}.mini-viz path{fill:none;stroke:var(--cyan);stroke-width:1.4;stroke-dasharray:120;stroke-dashoffset:120;animation:sparkDraw 2.2s ease-out forwards}.alpha-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:24px}.alpha-list,.manifest,.eval-report,.info-panel{border:1px solid var(--line);border-radius:8px;background:var(--paper-2);overflow:hidden}.alpha-row{display:grid;grid-template-columns:28px 1fr auto;gap:14px;align-items:center;border-bottom:1px solid var(--line);padding:14px 18px}.alpha-row:last-child{border-bottom:0}.alpha-row b{display:grid;place-items:center;width:20px;height:20px;border-radius:5px;background:rgba(10,143,102,.12);color:var(--green)}.alpha-row b.partial{background:rgba(199,121,18,.14);color:var(--amber)}.alpha-row strong{display:block}.alpha-row small{display:block;color:var(--muted)}.alpha-row em{font:800 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);font-style:normal}.manifest{padding:22px}.manifest dl,.info-panel dl{display:grid;grid-template-columns:160px 1fr;gap:12px 18px}.manifest dt,.info-panel dt{color:var(--faint);font:850 11px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}.manifest dd,.info-panel dd{margin:0;color:#313b45}.eval-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--line);background:var(--paper-3);padding:14px 18px;font:800 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}.live-pill{color:var(--green)}.eval-metrics{display:grid;grid-template-columns:repeat(5,1fr)}.eval-metrics .metric{border:0;border-right:1px solid var(--line);border-radius:0}.trace-list{padding:18px}.trace-list div{display:grid;grid-template-columns:130px 1fr 54px;gap:12px;align-items:center;min-height:30px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.trace-list b{height:7px;border-radius:7px;background:rgba(0,0,0,.08);overflow:hidden}.trace-list i{display:block;height:100%;background:var(--cyan);animation:barReveal 2s ease-out both}.trace-list em{font-style:normal;color:var(--muted);text-align:right}.integrations-grid{grid-template-columns:repeat(5,1fr)}.integration{min-height:130px}.integration span{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:var(--ink);color:#fff;font:850 12px ui-monospace,SFMono-Regular,Menlo,monospace}.integration strong{display:block;margin-top:16px}.integration small{color:var(--muted);font:11px ui-monospace,SFMono-Regular,Menlo,monospace}.final{background:var(--ink);color:var(--paper);border-bottom:0}.final .section-num,.final .section-head p{color:rgba(248,247,242,.68)}.final-grid{display:grid;grid-template-columns:1fr .85fr;gap:42px;align-items:end}.terminal{margin:0;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:#080b0f;color:#d8f8e8;padding:18px;font:13px/1.8 ui-monospace,SFMono-Regular,Menlo,monospace;overflow:auto}.footer{background:var(--ink);color:rgba(248,247,242,.62);padding:44px 0 30px}.footer-grid{display:grid;grid-template-columns:1.35fr .75fr .8fr .9fr;gap:28px}.footer a{display:block;margin-top:8px}.footer a:hover{color:#fff}.footer h3{margin:0 0 12px;color:#fff;font:850 12px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}.footer-brand{color:#fff;margin-bottom:14px}.footer p{margin:0;color:rgba(248,247,242,.55);font-size:13px}.legal-row{grid-column:1/-1;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.14);padding-top:24px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace}.page{min-height:62vh}.article{max-width:900px}.article h1{font-size:clamp(44px,5vw,72px);line-height:1;margin:18px 0 0}.info-panel{margin-top:34px;padding:26px}.notice{border-left:3px solid var(--green);background:rgba(10,143,102,.08);padding:12px 14px;color:#37424c}.language-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:28px}.language-grid a{border:1px solid var(--line);border-radius:8px;background:var(--paper-2);padding:14px;font-weight:800}.language-grid span{float:right;color:var(--cyan);font:850 12px ui-monospace,SFMono-Regular,Menlo,monospace}
.problem-visual{height:74px;margin-top:18px;border:1px solid var(--line);border-radius:6px;background:rgba(240,239,234,.46);padding:8px}.problem-visual svg{width:100%;height:100%;display:block}.problem-visual rect,.problem-visual circle{fill:var(--paper-2);stroke:var(--line-2)}.problem-visual line,.problem-visual path{stroke:var(--line-2);fill:none}.problem-visual text,.feature-viz text,.system-canvas text{font:9px ui-monospace,SFMono-Regular,Menlo,monospace;fill:var(--muted)}.active-fill{fill:var(--cyan)!important;stroke:none!important}.warn-fill{fill:var(--amber)!important;stroke:none!important}.muted-fill{fill:rgba(22,27,31,.16)!important;stroke:none!important}.active-stroke{stroke:var(--cyan)!important}.danger-stroke{stroke:var(--red)!important}.danger-path{stroke:var(--red)!important}.danger-arrow{fill:var(--red)!important;stroke:none!important}.danger-text{fill:var(--red)!important}.ok-text{color:var(--green)!important;fill:var(--green)!important}.dash{stroke-dasharray:4 4}.diamond{fill:var(--paper)!important;stroke:var(--red)!important;transform:rotate(45deg);transform-origin:114px 38px}
.system-board{border:1px solid var(--line);border-radius:8px;background:var(--paper-2);overflow:hidden}.board-head{min-height:42px;padding:0 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;background:var(--paper-3);font:850 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);text-transform:uppercase}.system-canvas{overflow:auto}.system-canvas svg{min-width:880px;width:100%;height:auto;display:block}.sys-label{font-weight:850;letter-spacing:.06em}.system-canvas rect{fill:var(--paper-2);stroke:var(--line-2)}.system-canvas line,.system-canvas path{stroke:var(--line-2);fill:none}.system-canvas circle{fill:var(--green);stroke:none}.system-canvas .card-title{font:700 14px Inter,ui-sans-serif,system-ui,sans-serif;fill:var(--ink)}.system-canvas .mini-label{font-weight:850;letter-spacing:.06em;fill:var(--faint)}.system-canvas .mono-small{font-size:10px;fill:var(--muted)}.sys-card>rect,.compose-card>rect{stroke:var(--ink)!important}.control-stack .good{fill:var(--green);stroke:none}.control-stack .info{fill:var(--cyan);stroke:none}.control-stack .warn{fill:var(--amber);stroke:none}.sys-edges path{stroke:var(--muted);stroke-width:1.2}.sys-edges .read{stroke:var(--cyan);stroke-width:1.7;marker-end:url(#arrow-c)}.sys-edges .persist{stroke:var(--green);stroke-width:1.7;marker-end:url(#arrow-g)}#arrow-c path{fill:var(--cyan);stroke:none}#arrow-g path{fill:var(--green);stroke:none}.system-strip{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--line)}.system-strip div{padding:18px;border-right:1px solid var(--line);min-height:142px}.system-strip div:last-child{border-right:0}.system-strip span{font:850 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--faint)}.system-strip strong{display:block;margin-top:18px}.system-strip p{margin:8px 0 0;color:var(--muted);font-size:13px}
.feature-viz{width:100%;height:104px;margin:18px 0 8px;display:block}.feature-viz rect{fill:var(--paper-3);stroke:var(--line-2)}.feature-viz line,.feature-viz path{stroke:var(--line-2);fill:none}.feature-viz .read{stroke:var(--cyan);stroke-width:1.5;animation:flowDash 5s linear infinite}.feature-viz .rank-bar{fill:var(--cyan);stroke:none;opacity:.68;transform-origin:left;animation:barReveal 1.8s ease-out both}.feature-viz circle{fill:var(--green);stroke:none;animation:nodePulse 2.4s ease-in-out infinite}.feature-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}.feature-meta span{border:1px solid var(--line);border-radius:5px;background:var(--paper-3);padding:4px 7px;color:var(--muted);font:850 10px ui-monospace,SFMono-Regular,Menlo,monospace}
.manifest-head{display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-bottom:14px}.manifest-head h3{margin:0}.manifest-head span{font:850 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--faint)}.run-card{margin-top:14px;border:1px solid var(--line);border-radius:6px;background:var(--paper);padding:13px 14px;color:var(--muted);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}.run-card span{display:block;color:var(--ink-2);margin-bottom:6px}.run-card code{font:inherit;color:#33414c}
.eval-shell{border:1px solid var(--line);border-radius:8px;background:var(--paper-2);overflow:hidden}.eval-shell .spark{width:100%;height:30px;margin-top:10px}.eval-shell .spark polyline{fill:none;stroke:var(--green);stroke-width:1.5;stroke-dasharray:130;stroke-dashoffset:130;animation:sparkDraw 2.2s ease-out forwards}.eval-shell .metric.warn .spark polyline{stroke:var(--amber)}.eval-shell .metric.info .spark polyline{stroke:var(--cyan)}.eval-shell .metric small{display:block;margin-top:4px;color:var(--muted);font:11px ui-monospace,SFMono-Regular,Menlo,monospace}.eval-detail{display:grid;grid-template-columns:1.25fr .75fr;border-top:1px solid var(--line)}.eval-trace,.eval-side{padding:20px}.eval-trace{border-right:1px solid var(--line)}.eval-trace h3,.eval-side h3{margin:0 0 14px;font-size:14px}.trace-row,.dist-row{display:grid;grid-template-columns:132px 1fr 54px;gap:12px;align-items:center;min-height:30px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}.trace-row b,.dist-row b{position:relative;height:8px;border-radius:8px;background:rgba(0,0,0,.08);overflow:hidden}.trace-row i{position:absolute;top:0;height:100%;border-radius:8px;background:var(--cyan);animation:barReveal 1.8s ease-out both}.dist-row i{display:block;height:100%;border-radius:8px;background:var(--cyan);animation:barReveal 1.8s ease-out both}.trace-row em,.dist-row em{font-style:normal;text-align:right}.eval-note{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}.eval-note span:last-child{color:var(--green)}
.final .button.primary{background:var(--paper);border-color:var(--paper);color:var(--ink)}.final .button.secondary{background:transparent;border-color:rgba(248,247,242,.28);color:var(--paper)}.final .button:hover{box-shadow:0 12px 32px rgba(255,255,255,.08)}
@keyframes cursorBlink{0%,45%{opacity:1}46%,100%{opacity:0}}@keyframes ledgerScan{0%{transform:translateX(-100%);opacity:0}20%,72%{opacity:1}100%{transform:translateX(100%);opacity:0}}@keyframes nodePulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.16)}}@keyframes barReveal{from{transform:scaleX(.25)}to{transform:scaleX(1)}}@keyframes sparkDraw{to{stroke-dashoffset:0}}@keyframes flowDash{to{stroke-dashoffset:-90}}
@media(max-width:1120px){.nav-links{display:none}.hero-grid{grid-template-columns:1fr}.surface{max-width:760px}.problem-grid,.features-grid{grid-template-columns:repeat(2,1fr)}.problem-card:nth-child(2n),.feature-card:nth-child(2n){border-right:0}.pipeline{grid-template-columns:1fr 1fr}.pipe-step:after{display:none}.integrations-grid{grid-template-columns:repeat(3,1fr)}.footer-grid{grid-template-columns:1fr 1fr}.alpha-grid,.final-grid{grid-template-columns:1fr}}
@media(max-width:720px){.shell{width:calc(100% - 28px)}.nav{min-height:58px}.version,.nav-actions .secondary{display:none}.brand{font-size:14px}.hero-grid{padding:34px 0 52px}.hero h1{font-size:42px}.metric-strip,.surface-stats,.eval-metrics{grid-template-columns:repeat(2,1fr)}.ledger-head,.ledger-row{grid-template-columns:1.15fr .62fr .62fr .8fr}.ledger-head span:nth-child(3),.ledger-head span:nth-child(6),.ledger-head span:nth-child(7),.ledger-row span:nth-child(3),.ledger-row span:nth-child(6),.ledger-row span:nth-child(7){display:none}.problem-grid,.features-grid,.pipeline,.integrations-grid,.footer-grid,.language-grid{grid-template-columns:1fr}.problem-card,.feature-card,.integration{border-right:0}.section{padding:68px 0}.section-head{grid-template-columns:1fr;gap:14px}.manifest dl,.info-panel dl{grid-template-columns:1fr}.trace-list div{grid-template-columns:1fr}.flow-visual svg{height:176px}.composer-card{position:relative;left:auto;top:auto;margin:12px;width:auto}.gov-gate{left:18px;top:78px}.footer{padding-bottom:90px}}
@media(max-width:1120px){.system-strip{grid-template-columns:repeat(2,1fr)}.system-strip div:nth-child(2n){border-right:0}.eval-detail{grid-template-columns:1fr}.eval-trace{border-right:0;border-bottom:1px solid var(--line)}}@media(max-width:720px){.problem-visual{height:86px}.system-strip{grid-template-columns:1fr}.system-strip div{border-right:0}.board-head{align-items:flex-start;flex-direction:column;padding:12px 14px}.feature-viz{height:94px}.trace-row,.dist-row{grid-template-columns:1fr}.eval-metrics .metric:nth-child(2n){border-right:0}.alpha-side{min-height:auto}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.001ms!important}}
`;
}
