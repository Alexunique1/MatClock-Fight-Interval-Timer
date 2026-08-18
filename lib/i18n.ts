export const locales = [
  "en",
  "es",
  "pt",
  "pt-BR",
  "ar",
  "zh-Hant",
  "th",
  "hi",
  "ru",
  "fr",
] as const;

export type Locale = (typeof locales)[number];

export const LOCALE_STORAGE_KEY = "matclock-user-locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  "pt-BR": "Português BR",
  ar: "العربية",
  "zh-Hant": "繁體中文",
  th: "ไทย",
  hi: "हिन्दी",
  ru: "Русский",
  fr: "Français",
};

export type Dictionary = Record<DictionaryKey, string>;

type DictionaryKey =
  | "title"
  | "subtitle"
  | "ready"
  | "prepare"
  | "round"
  | "warning"
  | "rest"
  | "finished"
  | "paused"
  | "rounds"
  | "roundTime"
  | "restTime"
  | "prepareTime"
  | "warningTime"
  | "minutes"
  | "seconds"
  | "start"
  | "pause"
  | "resume"
  | "reset"
  | "currentRound"
  | "totalRounds"
  | "next"
  | "settings"
  | "totalTime"
  | "about"
  | "aboutKicker"
  | "aboutHeadline"
  | "aboutIntro"
  | "aboutOrigins"
  | "aboutFeedback"
  | "aboutThanks"
  | "aboutYoutube"
  | "aboutInstall"
  | "aboutShareFeedback"
  | "aboutWatchYoutube"
  | "maximize"
  | "minimize"
  | "install"
  | "storeSoon"
  | "googlePlay"
  | "appStore"
  | "desktop"
  | "privacy"
  | "cookies"
  | "social"
  | "language"
  | "policyUpdated"
  | "privacyTitle"
  | "cookiesTitle"
  | "privacyBody"
  | "cookiesBody"
  | "contact"
  | "home"
  | "placeholderNotice"
  | "noAdsRule";

export const dictionaries = {
  en: {
    title: "Fight Interval Timer",
    subtitle: "Boxing, MMA, Muay Thai, HIIT, and mat work rounds.",
    ready: "Ready",
    prepare: "Prepare",
    round: "Round",
    warning: "Warning",
    rest: "Rest",
    finished: "Finished",
    paused: "Paused",
    rounds: "Rounds",
    roundTime: "Round",
    restTime: "Rest",
    prepareTime: "Prepare",
    warningTime: "Warning",
    minutes: "Min",
    seconds: "Sec",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    reset: "Reset",
    currentRound: "Round",
    totalRounds: "of",
    next: "Next",
    settings: "Settings",
    totalTime: "Total Time",
    about: "About",
    aboutKicker: "About MatClock",
    aboutHeadline: "Built on the mat, for the mat.",
    aboutIntro:
      "We are a father and son who both train Brazilian jiu-jitsu. We created MatClock because we wanted a simple, reliable interval timer for our own rounds, and a useful tool we could share with teammates, coaches, and fellow athletes.",
    aboutOrigins:
      "What started on the BJJ mats has grown into a timer for boxing, MMA, Muay Thai, HIIT, and other round-based training.",
    aboutFeedback:
      "We use MatClock ourselves and continue improving it with feedback from the community. Try it during your next training session and let us know what works, what could be better, and which features you would like us to add.",
    aboutThanks: "Thank you for supporting MatClock. Train hard and make every round count.",
    aboutYoutube: "Follow our BJJ journey and training content on YouTube.",
    aboutInstall: "Install MatClock",
    aboutShareFeedback: "Share Feedback",
    aboutWatchYoutube: "Watch on YouTube",
    maximize: "Maximize",
    minimize: "Minimize",
    install: "Install App",
    storeSoon: "Coming soon",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "Desktop",
    privacy: "Privacy Policy",
    cookies: "Cookie Policy",
    social: "Social",
    language: "Language",
    policyUpdated: "Last updated: May 30, 2026",
    privacyTitle: "Privacy Policy for MatClock",
    cookiesTitle: "Cookie Policy",
    privacyBody:
      "MatClock is a free interval timer. The web version does not require an account. Timer settings may be stored locally in your browser so the app can remember your last configuration. We may add privacy-respecting analytics and advertising tools later, and this policy will be updated before those tools are enabled.",
    cookiesBody:
      "MatClock may use local browser storage to remember your timer settings and language preference. We do not use advertising cookies in the initial web release. If Google AdSense, analytics, or similar services are added later, this page will be updated with the required details.",
    contact: "Contact",
    home: "Timer",
    placeholderNotice: "Store and social links are placeholders for now.",
    noAdsRule: "No pop-up or overlay ads during active training.",
  },
  es: {
    title: "Temporizador de Combate",
    subtitle: "Rondas para boxeo, MMA, Muay Thai, HIIT y trabajo en colchoneta.",
    ready: "Listo",
    prepare: "Preparación",
    round: "Ronda",
    warning: "Aviso",
    rest: "Descanso",
    finished: "Finalizado",
    paused: "Pausado",
    rounds: "Rondas",
    roundTime: "Ronda",
    restTime: "Descanso",
    prepareTime: "Preparación",
    warningTime: "Aviso",
    minutes: "Min",
    seconds: "Seg",
    start: "Iniciar",
    pause: "Pausar",
    resume: "Continuar",
    reset: "Reiniciar",
    currentRound: "Ronda",
    totalRounds: "de",
    next: "Siguiente",
    settings: "Ajustes",
    totalTime: "Tiempo Total",
    about: "Acerca",
    aboutKicker: "Acerca de MatClock",
    aboutHeadline: "Creado en el tatami, para el tatami.",
    aboutIntro:
      "Somos un padre y un hijo que entrenamos jiu-jitsu brasileño. Creamos MatClock porque queríamos un temporizador de intervalos sencillo y fiable para nuestros propios rounds, y una herramienta útil que pudiéramos compartir con compañeros, entrenadores y otros deportistas.",
    aboutOrigins:
      "Lo que comenzó en los tatamis de BJJ se ha convertido en un temporizador para boxeo, MMA, Muay Thai, HIIT y otros entrenamientos por rounds.",
    aboutFeedback:
      "Usamos MatClock nosotros mismos y seguimos mejorándolo con los comentarios de la comunidad. Pruébalo en tu próximo entrenamiento y cuéntanos qué funciona, qué podría mejorar y qué funciones te gustaría que añadiéramos.",
    aboutThanks: "Gracias por apoyar MatClock. Entrena duro y aprovecha cada round.",
    aboutYoutube: "Sigue nuestro camino en el BJJ y nuestro contenido de entrenamiento en YouTube.",
    aboutInstall: "Instalar MatClock",
    aboutShareFeedback: "Enviar comentarios",
    aboutWatchYoutube: "Ver en YouTube",
    maximize: "Maximizar",
    minimize: "Minimizar",
    install: "Instalar",
    storeSoon: "Próximamente",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "Escritorio",
    privacy: "Privacidad",
    cookies: "Cookies",
    social: "Social",
    language: "Idioma",
    policyUpdated: "Última actualización: 24 de mayo de 2026",
    privacyTitle: "Política de Privacidad",
    cookiesTitle: "Política de Cookies",
    privacyBody:
      "MatClock es un temporizador gratuito. La versión web no requiere cuenta. La configuración puede guardarse localmente en el navegador. Más adelante podremos añadir analítica y publicidad respetuosas con la privacidad, y actualizaremos esta política antes de activarlas.",
    cookiesBody:
      "MatClock puede usar almacenamiento local del navegador para recordar la configuración y el idioma. En la primera versión web no usamos cookies publicitarias. Si añadimos Google AdSense, analítica o servicios similares, actualizaremos esta página.",
    contact: "Contacto",
    home: "Temporizador",
    placeholderNotice: "Los enlaces de tiendas y redes son provisionales.",
    noAdsRule: "Sin anuncios emergentes ni superpuestos durante el entrenamiento.",
  },
  pt: {
    title: "Temporizador de Combate",
    subtitle: "Rounds para boxe, MMA, Muay Thai, HIIT e treino no tatame.",
    ready: "Pronto",
    prepare: "Preparar",
    round: "Round",
    warning: "Aviso",
    rest: "Descanso",
    finished: "Terminado",
    paused: "Pausado",
    rounds: "Rounds",
    roundTime: "Round",
    restTime: "Descanso",
    prepareTime: "Preparar",
    warningTime: "Aviso",
    minutes: "Min",
    seconds: "Seg",
    start: "Iniciar",
    pause: "Pausar",
    resume: "Continuar",
    reset: "Reiniciar",
    currentRound: "Round",
    totalRounds: "de",
    next: "Próximo",
    settings: "Definições",
    totalTime: "Tempo Total",
    about: "Sobre",
    aboutKicker: "Sobre o MatClock",
    aboutHeadline: "Criado no tatame, para o tatame.",
    aboutIntro:
      "Somos pai e filho e ambos treinamos jiu-jitsu brasileiro. Criámos o MatClock porque queríamos um temporizador de intervalos simples e fiável para os nossos próprios rounds, e uma ferramenta útil que pudéssemos partilhar com companheiros de treino, treinadores e outros atletas.",
    aboutOrigins:
      "O que começou nos tatames de BJJ tornou-se um temporizador para boxe, MMA, Muay Thai, HIIT e outros treinos baseados em rounds.",
    aboutFeedback:
      "Nós próprios usamos o MatClock e continuamos a melhorá-lo com o feedback da comunidade. Experimente-o no seu próximo treino e diga-nos o que funciona, o que pode ser melhorado e que funcionalidades gostaria que adicionássemos.",
    aboutThanks: "Obrigado por apoiar o MatClock. Treine com dedicação e aproveite cada round.",
    aboutYoutube: "Acompanhe o nosso percurso no BJJ e os nossos conteúdos de treino no YouTube.",
    aboutInstall: "Instalar MatClock",
    aboutShareFeedback: "Enviar feedback",
    aboutWatchYoutube: "Ver no YouTube",
    maximize: "Maximizar",
    minimize: "Minimizar",
    install: "Instalar",
    storeSoon: "Em breve",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "Área de trabalho",
    privacy: "Privacidade",
    cookies: "Cookies",
    social: "Social",
    language: "Idioma",
    policyUpdated: "Atualizado em: 24 de maio de 2026",
    privacyTitle: "Política de Privacidade",
    cookiesTitle: "Política de Cookies",
    privacyBody:
      "MatClock é um temporizador gratuito. A versão web não exige conta. As definições podem ser guardadas localmente no navegador. Podemos adicionar análise e publicidade mais tarde, atualizando esta política antes disso.",
    cookiesBody:
      "MatClock pode usar armazenamento local para lembrar definições e idioma. Na primeira versão web não usamos cookies de publicidade. Se adicionarmos Google AdSense, análise ou serviços semelhantes, esta página será atualizada.",
    contact: "Contacto",
    home: "Temporizador",
    placeholderNotice: "Ligações de lojas e redes sociais são provisórias.",
    noAdsRule: "Sem anúncios pop-up ou sobrepostos durante o treino ativo.",
  },
  "pt-BR": {
    title: "Timer de Luta",
    subtitle: "Rounds para boxe, MMA, Muay Thai, HIIT e treino no tatame.",
    ready: "Pronto",
    prepare: "Preparar",
    round: "Round",
    warning: "Aviso",
    rest: "Descanso",
    finished: "Finalizado",
    paused: "Pausado",
    rounds: "Rounds",
    roundTime: "Round",
    restTime: "Descanso",
    prepareTime: "Preparar",
    warningTime: "Aviso",
    minutes: "Min",
    seconds: "Seg",
    start: "Iniciar",
    pause: "Pausar",
    resume: "Continuar",
    reset: "Zerar",
    currentRound: "Round",
    totalRounds: "de",
    next: "Próximo",
    settings: "Configurações",
    totalTime: "Tempo Total",
    about: "Sobre",
    aboutKicker: "Sobre o MatClock",
    aboutHeadline: "Criado no tatame, para o tatame.",
    aboutIntro:
      "Somos pai e filho e os dois treinamos jiu-jitsu brasileiro. Criamos o MatClock porque queríamos um timer de intervalos simples e confiável para os nossos próprios rounds, além de uma ferramenta útil que pudéssemos compartilhar com colegas de treino, treinadores e outros atletas.",
    aboutOrigins:
      "O que começou nos tatames de BJJ se tornou um timer para boxe, MMA, Muay Thai, HIIT e outros treinos baseados em rounds.",
    aboutFeedback:
      "Nós mesmos usamos o MatClock e continuamos melhorando o app com o feedback da comunidade. Use no seu próximo treino e conte para nós o que funciona, o que pode melhorar e quais recursos você gostaria que adicionássemos.",
    aboutThanks: "Obrigado por apoiar o MatClock. Treine com dedicação e faça cada round valer a pena.",
    aboutYoutube: "Acompanhe nossa jornada no BJJ e nosso conteúdo de treino no YouTube.",
    aboutInstall: "Instalar MatClock",
    aboutShareFeedback: "Enviar feedback",
    aboutWatchYoutube: "Ver no YouTube",
    maximize: "Maximizar",
    minimize: "Minimizar",
    install: "Instalar",
    storeSoon: "Em breve",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "Área de trabalho",
    privacy: "Privacidade",
    cookies: "Cookies",
    social: "Social",
    language: "Idioma",
    policyUpdated: "Atualizado em: 24 de maio de 2026",
    privacyTitle: "Política de Privacidade",
    cookiesTitle: "Política de Cookies",
    privacyBody:
      "MatClock é um timer gratuito. A versão web não exige conta. As configurações podem ser salvas localmente no navegador. Podemos adicionar análise e publicidade futuramente, e esta política será atualizada antes disso.",
    cookiesBody:
      "MatClock pode usar armazenamento local para lembrar configurações e idioma. Na primeira versão web não usamos cookies de publicidade. Se adicionarmos Google AdSense, análise ou serviços parecidos, esta página será atualizada.",
    contact: "Contato",
    home: "Timer",
    placeholderNotice: "Links de lojas e redes sociais são provisórios.",
    noAdsRule: "Sem anúncios pop-up ou sobrepostos durante o treino ativo.",
  },
  ar: {
    title: "مؤقت فترات القتال",
    subtitle: "جولات للملاكمة وMMA والمواي تاي وHIIT وتدريب البساط.",
    ready: "جاهز",
    prepare: "استعداد",
    round: "جولة",
    warning: "تحذير",
    rest: "راحة",
    finished: "انتهى",
    paused: "متوقف",
    rounds: "الجولات",
    roundTime: "الجولة",
    restTime: "الراحة",
    prepareTime: "الاستعداد",
    warningTime: "التحذير",
    minutes: "د",
    seconds: "ث",
    start: "ابدأ",
    pause: "إيقاف",
    resume: "متابعة",
    reset: "إعادة",
    currentRound: "جولة",
    totalRounds: "من",
    next: "التالي",
    settings: "الإعدادات",
    totalTime: "الوقت الكلي",
    about: "حول",
    aboutKicker: "حول MatClock",
    aboutHeadline: "صُنع على البساط، من أجل البساط.",
    aboutIntro:
      "نحن أب وابنه، وكلانا يتدرب على الجيوجيتسو البرازيلية. أنشأنا MatClock لأننا أردنا مؤقت فترات بسيطا وموثوقا لجولاتنا، وأداة مفيدة نشاركها مع زملائنا والمدربين والرياضيين الآخرين.",
    aboutOrigins:
      "ما بدأ على بساط BJJ أصبح مؤقتا للملاكمة وMMA والمواي تاي وHIIT وغيرها من التدريبات القائمة على الجولات.",
    aboutFeedback:
      "نستخدم MatClock بأنفسنا ونواصل تحسينه بفضل ملاحظات المجتمع. جربه في حصتك التدريبية القادمة وأخبرنا بما يعمل جيدا، وما يمكن تحسينه، والميزات التي تود أن نضيفها.",
    aboutThanks: "شكرا لدعمكم MatClock. تدربوا بجد واستفيدوا من كل جولة.",
    aboutYoutube: "تابعوا رحلتنا في BJJ ومحتوى تدريباتنا على YouTube.",
    aboutInstall: "تثبيت MatClock",
    aboutShareFeedback: "إرسال الملاحظات",
    aboutWatchYoutube: "شاهد على YouTube",
    maximize: "تكبير",
    minimize: "تصغير",
    install: "تثبيت",
    storeSoon: "قريبا",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "سطح المكتب",
    privacy: "الخصوصية",
    cookies: "ملفات تعريف الارتباط",
    social: "اجتماعي",
    language: "اللغة",
    policyUpdated: "آخر تحديث: 24 مايو 2026",
    privacyTitle: "سياسة الخصوصية",
    cookiesTitle: "سياسة ملفات تعريف الارتباط",
    privacyBody:
      "MatClock مؤقت مجاني. لا تتطلب نسخة الويب حسابا. قد تحفظ الإعدادات محليا في المتصفح. قد نضيف لاحقا أدوات تحليل أو إعلانات تحترم الخصوصية، وسيتم تحديث هذه السياسة قبل التفعيل.",
    cookiesBody:
      "قد يستخدم MatClock التخزين المحلي لتذكر الإعدادات واللغة. لا نستخدم ملفات تعريف ارتباط إعلانية في الإصدار الأول. إذا أضفنا Google AdSense أو التحليلات لاحقا، فسيتم تحديث هذه الصفحة.",
    contact: "اتصال",
    home: "المؤقت",
    placeholderNotice: "روابط المتاجر والشبكات الاجتماعية مؤقتة حاليا.",
    noAdsRule: "لا إعلانات منبثقة أو متراكبة أثناء التدريب النشط.",
  },
  "zh-Hant": {
    title: "格鬥間歇計時器",
    subtitle: "適用於拳擊、MMA、泰拳、HIIT 與墊上訓練。",
    ready: "就緒",
    prepare: "準備",
    round: "回合",
    warning: "警告",
    rest: "休息",
    finished: "完成",
    paused: "暫停",
    rounds: "回合數",
    roundTime: "回合",
    restTime: "休息",
    prepareTime: "準備",
    warningTime: "警告",
    minutes: "分",
    seconds: "秒",
    start: "開始",
    pause: "暫停",
    resume: "繼續",
    reset: "重設",
    currentRound: "回合",
    totalRounds: "共",
    next: "下一步",
    settings: "設定",
    totalTime: "總時間",
    about: "關於",
    aboutKicker: "關於 MatClock",
    aboutHeadline: "源自墊上，為墊上而生。",
    aboutIntro:
      "我們是一對父子，也都練習巴西柔術。我們打造 MatClock，是因為想為自己的回合訓練做一個簡單可靠的間歇計時器，也希望把這個實用工具分享給隊友、教練和其他運動員。",
    aboutOrigins:
      "從 BJJ 墊上開始的想法，如今已發展為適用於拳擊、MMA、泰拳、HIIT 及其他回合制訓練的計時器。",
    aboutFeedback:
      "我們自己也使用 MatClock，並持續根據社群意見改進。請在下一次訓練時試用，告訴我們哪些地方好用、哪些地方可以更好，以及你希望我們加入哪些功能。",
    aboutThanks: "感謝你支持 MatClock。努力訓練，珍惜每一個回合。",
    aboutYoutube: "在 YouTube 上關注我們的 BJJ 歷程與訓練內容。",
    aboutInstall: "安裝 MatClock",
    aboutShareFeedback: "提供意見",
    aboutWatchYoutube: "前往 YouTube",
    maximize: "最大化",
    minimize: "最小化",
    install: "安裝",
    storeSoon: "即將推出",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "桌面版",
    privacy: "隱私權",
    cookies: "Cookie",
    social: "社群",
    language: "語言",
    policyUpdated: "最後更新：2026 年 5 月 24 日",
    privacyTitle: "隱私權政策",
    cookiesTitle: "Cookie 政策",
    privacyBody:
      "MatClock 是免費間歇計時器。網頁版不需要帳號。計時器設定可能會儲存在你的瀏覽器本機。日後若加入分析或廣告工具，我們會先更新本政策。",
    cookiesBody:
      "MatClock 可能使用瀏覽器本機儲存來記住設定和語言。初始網頁版不使用廣告 Cookie。若日後加入 Google AdSense、分析或類似服務，本頁會更新。",
    contact: "聯絡",
    home: "計時器",
    placeholderNotice: "商店與社群連結目前為預留位置。",
    noAdsRule: "訓練進行中不顯示彈出或覆蓋式廣告。",
  },
  th: {
    title: "นาฬิกาจับเวลาการต่อสู้",
    subtitle: "รอบสำหรับมวย MMA มวยไทย HIIT และการฝึกบนเสื่อ",
    ready: "พร้อม",
    prepare: "เตรียม",
    round: "ยก",
    warning: "เตือน",
    rest: "พัก",
    finished: "เสร็จ",
    paused: "หยุดชั่วคราว",
    rounds: "จำนวนยก",
    roundTime: "เวลายก",
    restTime: "เวลาพัก",
    prepareTime: "เตรียม",
    warningTime: "เตือน",
    minutes: "นาที",
    seconds: "วินาที",
    start: "เริ่ม",
    pause: "พัก",
    resume: "ต่อ",
    reset: "รีเซ็ต",
    currentRound: "ยก",
    totalRounds: "จาก",
    next: "ถัดไป",
    settings: "ตั้งค่า",
    totalTime: "เวลารวม",
    about: "เกี่ยวกับ",
    aboutKicker: "เกี่ยวกับ MatClock",
    aboutHeadline: "สร้างจากบนเสื่อ เพื่อการฝึกบนเสื่อ",
    aboutIntro:
      "เราเป็นพ่อลูกที่ฝึกบราซิลเลียนยิวยิตสูทั้งคู่ เราสร้าง MatClock เพราะต้องการตัวจับเวลาแบบเป็นช่วงที่เรียบง่ายและเชื่อถือได้สำหรับการซ้อมเป็นยกของเราเอง และเป็นเครื่องมือที่มีประโยชน์ซึ่งแชร์กับเพื่อนร่วมทีม โค้ช และนักกีฬาคนอื่น ๆ ได้",
    aboutOrigins:
      "สิ่งที่เริ่มต้นบนเสื่อ BJJ ได้พัฒนาเป็นตัวจับเวลาสำหรับมวยสากล MMA มวยไทย HIIT และการฝึกแบบแบ่งยกประเภทอื่น ๆ",
    aboutFeedback:
      "เราใช้ MatClock ด้วยตัวเองและปรับปรุงอย่างต่อเนื่องจากความคิดเห็นของชุมชน ลองใช้ในการฝึกครั้งถัดไป แล้วบอกเราว่าส่วนไหนใช้งานได้ดี ส่วนไหนควรปรับปรุง และอยากให้เราเพิ่มฟีเจอร์ใด",
    aboutThanks: "ขอบคุณที่สนับสนุน MatClock ฝึกให้เต็มที่และทำทุกยกให้คุ้มค่า",
    aboutYoutube: "ติดตามเส้นทาง BJJ และเนื้อหาการฝึกของเราบน YouTube",
    aboutInstall: "ติดตั้ง MatClock",
    aboutShareFeedback: "ส่งความคิดเห็น",
    aboutWatchYoutube: "ดูบน YouTube",
    maximize: "ขยาย",
    minimize: "ย่อ",
    install: "ติดตั้ง",
    storeSoon: "เร็วๆ นี้",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "เดสก์ท็อป",
    privacy: "ความเป็นส่วนตัว",
    cookies: "คุกกี้",
    social: "โซเชียล",
    language: "ภาษา",
    policyUpdated: "อัปเดตล่าสุด: 24 พฤษภาคม 2026",
    privacyTitle: "นโยบายความเป็นส่วนตัว",
    cookiesTitle: "นโยบายคุกกี้",
    privacyBody:
      "MatClock เป็นตัวจับเวลาฟรี เวอร์ชันเว็บไม่ต้องมีบัญชี การตั้งค่าอาจถูกบันทึกไว้ในเบราว์เซอร์ของคุณ เราอาจเพิ่มการวิเคราะห์และโฆษณาในภายหลัง และจะอัปเดตนโยบายนี้ก่อนเปิดใช้",
    cookiesBody:
      "MatClock อาจใช้พื้นที่จัดเก็บในเบราว์เซอร์เพื่อจำการตั้งค่าและภาษา เวอร์ชันแรกไม่มีคุกกี้โฆษณา หากเพิ่ม Google AdSense หรือเครื่องมือวิเคราะห์ในภายหลัง หน้านี้จะถูกอัปเดต",
    contact: "ติดต่อ",
    home: "ตัวจับเวลา",
    placeholderNotice: "ลิงก์ร้านค้าและโซเชียลยังเป็นตัวอย่าง",
    noAdsRule: "ไม่มีโฆษณาป๊อปอัปหรือทับหน้าจอระหว่างฝึก",
  },
  hi: {
    title: "फाइट इंटरवल टाइमर",
    subtitle: "बॉक्सिंग, MMA, मुआय थाई, HIIT और मैट ट्रेनिंग राउंड।",
    ready: "तैयार",
    prepare: "तैयारी",
    round: "राउंड",
    warning: "चेतावनी",
    rest: "आराम",
    finished: "समाप्त",
    paused: "रुका हुआ",
    rounds: "राउंड",
    roundTime: "राउंड",
    restTime: "आराम",
    prepareTime: "तैयारी",
    warningTime: "चेतावनी",
    minutes: "मि",
    seconds: "से",
    start: "शुरू",
    pause: "रोकें",
    resume: "जारी",
    reset: "रीसेट",
    currentRound: "राउंड",
    totalRounds: "में से",
    next: "अगला",
    settings: "सेटिंग्स",
    totalTime: "कुल समय",
    about: "परिचय",
    aboutKicker: "MatClock के बारे में",
    aboutHeadline: "मैट पर बना, मैट के लिए।",
    aboutIntro:
      "हम पिता और पुत्र हैं और दोनों ब्राज़ीलियन जिउ-जित्सु का अभ्यास करते हैं। हमने MatClock बनाया क्योंकि हमें अपने राउंड्स के लिए एक सरल और भरोसेमंद इंटरवल टाइमर चाहिए था, और हम एक उपयोगी टूल अपने साथियों, कोचों और अन्य खिलाड़ियों के साथ साझा करना चाहते थे।",
    aboutOrigins:
      "BJJ मैट पर शुरू हुआ यह विचार अब बॉक्सिंग, MMA, मुआय थाई, HIIT और अन्य राउंड-आधारित ट्रेनिंग के लिए एक टाइमर बन गया है।",
    aboutFeedback:
      "हम खुद MatClock का उपयोग करते हैं और समुदाय की प्रतिक्रिया के आधार पर इसे लगातार बेहतर बना रहे हैं। अपनी अगली ट्रेनिंग में इसे आज़माएं और हमें बताएं कि क्या अच्छा काम करता है, क्या बेहतर हो सकता है और आप कौन-से फीचर्स जुड़वाना चाहते हैं।",
    aboutThanks: "MatClock का समर्थन करने के लिए धन्यवाद। मेहनत से ट्रेनिंग करें और हर राउंड को सार्थक बनाएं।",
    aboutYoutube: "YouTube पर हमारी BJJ यात्रा और ट्रेनिंग सामग्री देखें।",
    aboutInstall: "MatClock इंस्टॉल करें",
    aboutShareFeedback: "प्रतिक्रिया भेजें",
    aboutWatchYoutube: "YouTube पर देखें",
    maximize: "बड़ा करें",
    minimize: "छोटा करें",
    install: "इंस्टॉल",
    storeSoon: "जल्द",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "डेस्कटॉप",
    privacy: "गोपनीयता",
    cookies: "कुकी",
    social: "सोशल",
    language: "भाषा",
    policyUpdated: "अंतिम अपडेट: 24 मई 2026",
    privacyTitle: "गोपनीयता नीति",
    cookiesTitle: "कुकी नीति",
    privacyBody:
      "MatClock एक मुफ्त इंटरवल टाइमर है। वेब संस्करण के लिए खाते की जरूरत नहीं है। सेटिंग्स आपके ब्राउज़र में स्थानीय रूप से सेव हो सकती हैं। बाद में विश्लेषण या विज्ञापन जोड़े गए तो यह नीति पहले अपडेट होगी।",
    cookiesBody:
      "MatClock सेटिंग्स और भाषा याद रखने के लिए ब्राउज़र स्टोरेज का उपयोग कर सकता है। शुरुआती वेब रिलीज में विज्ञापन कुकी नहीं हैं। Google AdSense या विश्लेषण जुड़ने पर यह पेज अपडेट होगा।",
    contact: "संपर्क",
    home: "टाइमर",
    placeholderNotice: "स्टोर और सोशल लिंक अभी placeholder हैं।",
    noAdsRule: "सक्रिय ट्रेनिंग के दौरान pop-up या overlay विज्ञापन नहीं।",
  },
  ru: {
    title: "Боевой интервальный таймер",
    subtitle: "Раунды для бокса, MMA, муай-тай, HIIT и тренировок на мате.",
    ready: "Готов",
    prepare: "Подготовка",
    round: "Раунд",
    warning: "Предупреждение",
    rest: "Отдых",
    finished: "Завершено",
    paused: "Пауза",
    rounds: "Раунды",
    roundTime: "Раунд",
    restTime: "Отдых",
    prepareTime: "Подготовка",
    warningTime: "Предупреждение",
    minutes: "Мин",
    seconds: "Сек",
    start: "Старт",
    pause: "Пауза",
    resume: "Продолжить",
    reset: "Сброс",
    currentRound: "Раунд",
    totalRounds: "из",
    next: "Дальше",
    settings: "Настройки",
    totalTime: "Общее время",
    about: "О проекте",
    aboutKicker: "О MatClock",
    aboutHeadline: "Создан на татами, для татами.",
    aboutIntro:
      "Мы отец и сын, и оба занимаемся бразильским джиу-джитсу. Мы создали MatClock, потому что хотели получить простой и надежный интервальный таймер для собственных раундов и полезный инструмент, которым можно поделиться с товарищами по команде, тренерами и другими спортсменами.",
    aboutOrigins:
      "То, что начиналось на татами BJJ, превратилось в таймер для бокса, MMA, муай-тай, HIIT и других тренировок по раундам.",
    aboutFeedback:
      "Мы сами используем MatClock и продолжаем улучшать его с учетом отзывов сообщества. Попробуйте таймер на следующей тренировке и расскажите нам, что работает хорошо, что можно улучшить и какие функции вы хотели бы добавить.",
    aboutThanks: "Спасибо за поддержку MatClock. Тренируйтесь усердно и цените каждый раунд.",
    aboutYoutube: "Следите за нашим путем в BJJ и тренировочным контентом на YouTube.",
    aboutInstall: "Установить MatClock",
    aboutShareFeedback: "Оставить отзыв",
    aboutWatchYoutube: "Смотреть на YouTube",
    maximize: "Развернуть",
    minimize: "Свернуть",
    install: "Установить",
    storeSoon: "Скоро",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "Десктоп",
    privacy: "Политика конфиденциальности",
    cookies: "Политика Cookie",
    social: "Соцсети",
    language: "Язык",
    policyUpdated: "Обновлено: 24 мая 2026",
    privacyTitle: "Политика конфиденциальности",
    cookiesTitle: "Политика cookie",
    privacyBody:
      "MatClock - бесплатный интервальный таймер. Веб-версия не требует аккаунта. Настройки таймера могут храниться локально в браузере. Позже мы можем добавить аналитику и рекламу, и обновим эту политику до их включения.",
    cookiesBody:
      "MatClock может использовать локальное хранилище браузера, чтобы помнить настройки и выбранный язык. В первой веб-версии рекламные cookie не используются. Если позже будут добавлены Google AdSense, аналитика или похожие сервисы, эта страница будет обновлена.",
    contact: "Контакт",
    home: "Таймер",
    placeholderNotice: "Ссылки на сторы и соцсети пока заглушки.",
    noAdsRule: "Никакой всплывающей или перекрывающей рекламы во время тренировки.",
  },
  fr: {
    title: "Minuteur d'Intervalles de Combat",
    subtitle: "Rounds pour boxe, MMA, Muay Thai, HIIT et entraînement au sol.",
    ready: "Prêt",
    prepare: "Préparation",
    round: "Round",
    warning: "Alerte",
    rest: "Repos",
    finished: "Terminé",
    paused: "Pause",
    rounds: "Rounds",
    roundTime: "Round",
    restTime: "Repos",
    prepareTime: "Préparation",
    warningTime: "Alerte",
    minutes: "Min",
    seconds: "Sec",
    start: "Démarrer",
    pause: "Pause",
    resume: "Reprendre",
    reset: "Réinitialiser",
    currentRound: "Round",
    totalRounds: "sur",
    next: "Suivant",
    settings: "Réglages",
    totalTime: "Temps Total",
    about: "À propos",
    aboutKicker: "À propos de MatClock",
    aboutHeadline: "Conçu sur le tatami, pour le tatami.",
    aboutIntro:
      "Nous sommes un père et son fils, et nous pratiquons tous les deux le jiu-jitsu brésilien. Nous avons créé MatClock parce que nous voulions un minuteur d'intervalles simple et fiable pour nos propres rounds, ainsi qu'un outil utile à partager avec nos partenaires d'entraînement, les coachs et les autres athlètes.",
    aboutOrigins:
      "Ce qui a commencé sur les tatamis de BJJ est devenu un minuteur pour la boxe, le MMA, le Muay Thai, le HIIT et les autres entraînements organisés en rounds.",
    aboutFeedback:
      "Nous utilisons MatClock nous-mêmes et continuons à l'améliorer grâce aux retours de la communauté. Essayez-le lors de votre prochaine séance et dites-nous ce qui fonctionne, ce qui pourrait être amélioré et quelles fonctionnalités vous aimeriez voir ajoutées.",
    aboutThanks: "Merci de soutenir MatClock. Entraînez-vous sérieusement et faites compter chaque round.",
    aboutYoutube: "Suivez notre parcours en BJJ et nos contenus d'entraînement sur YouTube.",
    aboutInstall: "Installer MatClock",
    aboutShareFeedback: "Envoyer un avis",
    aboutWatchYoutube: "Voir sur YouTube",
    maximize: "Agrandir",
    minimize: "Réduire",
    install: "Installer",
    storeSoon: "Bientôt",
    googlePlay: "Google Play",
    appStore: "App Store",
    desktop: "Bureau",
    privacy: "Confidentialité",
    cookies: "Cookies",
    social: "Social",
    language: "Langue",
    policyUpdated: "Dernière mise à jour : 24 mai 2026",
    privacyTitle: "Politique de Confidentialité",
    cookiesTitle: "Politique relative aux Cookies",
    privacyBody:
      "MatClock est un minuteur gratuit. La version web ne nécessite pas de compte. Les réglages peuvent être stockés localement dans votre navigateur. Des outils d'analyse et de publicité pourront être ajoutés plus tard, et cette politique sera mise à jour avant leur activation.",
    cookiesBody:
      "MatClock peut utiliser le stockage local du navigateur pour retenir vos réglages et votre langue. La première version web n'utilise pas de cookies publicitaires. Si Google AdSense, des analyses ou des services similaires sont ajoutés, cette page sera mise à jour.",
    contact: "Contact",
    home: "Minuteur",
    placeholderNotice: "Les liens stores et réseaux sociaux sont provisoires.",
    noAdsRule: "Aucune publicité pop-up ou superposée pendant l'entraînement actif.",
  },
} satisfies Record<Locale, Dictionary>;

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return "en";
  }

  const exact = locales.find((locale) => locale.toLowerCase() === value.toLowerCase());
  if (exact) {
    return exact;
  }

  const base = value.split("-")[0]?.toLowerCase();
  if (base === "zh") {
    return "zh-Hant";
  }

  return locales.find((locale) => locale.toLowerCase() === base) ?? "en";
}

export function isRtl(locale: Locale) {
  return locale === "ar";
}
