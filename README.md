# Agency — وكلاء الذكاء الاصطناعي

مجموعة كاملة من **200 وكيل ودليل ذكاء اصطناعي متخصص** من مستودع [agency-agents](https://github.com/msitarzewski/agency-agents)، مع:

- **تطبيق PWA** عربي للجوال: تصفّح، بحث، مفضلة، ومحادثة مع أي وكيل — ويشتغل بدون نت.
- **سكربت طرفية** (`run_agent.py`) للتشغيل عبر OpenRouter (مجاني) أو OpenAI.

---

## تطبيق الـPWA

### التشغيل على الكمبيوتر (localhost)

يلزم [Node.js](https://nodejs.org) 18 أو أحدث فقط — بدون أي تثبيت إضافي.

```bash
npm start            # أو: ./start.sh  |  ويندوز: .\start.ps1
```

ثم افتح <http://localhost:4173>.

### ربطه بالآيفون

الآيفون يشترط **HTTPS** عشان يثبّت التطبيق ويشغّله بدون نت. أسهل طريقة عبر Tailscale (مجاني):

1. ثبّت Tailscale على الكمبيوتر والآيفون وسجّل بنفس الحساب.
2. على ويندوز شغّل:
   ```powershell
   .\start.ps1 -Tailscale
   ```
   أو يدوياً على أي نظام، في طرفية ثانية والخادم شغّال:
   ```bash
   tailscale serve --bg --https=8444 http://localhost:4173
   ```
3. يطلع لك رابط بشكل `https://اسم-جهازك.xxxx.ts.net:8444` — افتحه في **Safari** على الآيفون.
4. اضغط زر المشاركة ← **«إضافة إلى الشاشة الرئيسية»**.

> على نفس الواي فاي تقدر تفتح `http://IP-الكمبيوتر:4173` للتصفح السريع، لكن بدون HTTPS ما يشتغل وضع «بدون نت».

### المحادثة مع الوكلاء

من تبويب **الإعدادات** في التطبيق: اختر المزوّد، الصق مفتاح API (مجاني من [openrouter.ai/keys](https://openrouter.ai/keys))، واضغط «اختبار الاتصال». المفتاح ينحفظ على جهازك فقط ويُرسل مباشرة للمزوّد.

### هيكل التطبيق

| المسار | الوظيفة |
|--------|---------|
| `app/` | التطبيق (HTML/CSS/JS بدون مكتبات ولا خطوة build) |
| `app/sw.js` | Service Worker: يخزّن التطبيق وكل الوكلاء للعمل بدون نت |
| `server.mjs` | خادم محلي بدون اعتماديات — يخدم `app/` و`agents/` فقط |
| `scripts/build-data.mjs` | يبني فهرس الوكلاء ورقم الإصدار (شغّله بعد تعديل أي وكيل) |
| `scripts/make-icons.mjs` | يولّد الأيقونات من `app/icons/icon.svg` |

---

## سكربت الطرفية (Python)

### التثبيت السريع

```bash
# 1. ثبّت المتطلبات
pip install -r requirements.txt

# 2. انسخ ملف البيئة وعدّله
cp .env.example .env
# افتح .env وضع مفتاحك
```

---

## الإعداد

### OpenRouter (مجاني — موصى به للبداية)

1. سجّل على [openrouter.ai](https://openrouter.ai) واحصل على مفتاح مجاني
2. في ملف `.env`:

```env
PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxx
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

### OpenAI

```env
PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

---

## الاستخدام

```bash
# تشغيل تفاعلي — يعرض قائمة بجميع الوكلاء
python run_agent.py

# تشغيل وكيل محدد مباشرة
python run_agent.py --agent engineering/engineering-senior-developer

# عرض قائمة بكل الوكلاء
python run_agent.py --list

# تغيير المزوّد مؤقتاً
python run_agent.py --provider openai

# استخدام موديل مخصص
python run_agent.py --model qwen/qwen-2.5-7b-instruct:free

# عرض النماذج المجانية المتاحة
python run_agent.py --free-models
```

---

## النماذج السحابية المجانية على OpenRouter

كلها مجانية تماماً ($0) — لا بطاقة ائتمانية مطلوبة.

| النموذج | الحجم | مميز لـ |
|---------|-------|---------|
| `deepseek/deepseek-r1-0528:free` ⭐ | 671B | تفكير عميق، برمجة (الافتراضي) |
| `deepseek/deepseek-chat-v3-0324:free` | 671B | محادثة سريعة وذكية |
| `meta-llama/llama-4-maverick:free` | MoE | أحدث نماذج Meta |
| `meta-llama/llama-3.3-70b-instruct:free` | 70B | متوازن وقوي |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 24B | سريع وخفيف |
| `google/gemma-3-27b-it:free` | 27B | Google Gemma |
| `qwen/qwen-2.5-72b-instruct:free` | 72B | تعدد اللغات |
| `nvidia/llama-3.1-nemotron-70b-instruct:free` | 70B | NVIDIA tuned |
| `moonshotai/kimi-k2:free` | — | Kimi K2 |
| `microsoft/phi-4:free` | 14B | Microsoft Phi |

---

## أقسام الوكلاء

| القسم | الوصف |
|-------|-------|
| `engineering` | مطورون، معماريون، DevOps |
| `marketing` | محتوى، SEO، سوشيال ميديا |
| `specialized` | متخصصون في مجالات نادرة |
| `design` | UI/UX، هوية بصرية |
| `sales` | مبيعات، استراتيجية |
| `testing` | جودة، اختبار |
| `support` | دعم، تقارير |
| `project-management` | إدارة مشاريع |
| `paid-media` | إعلانات مدفوعة |
| `finance` | مالية، تحليل |
| `product` | إدارة منتج |
| `academic` | أكاديمي، بحثي |
| `spatial-computing` | AR/VR |
| `game-development` | تطوير ألعاب |

---

## بنية الملفات

```
agencyfull/
├── agents/              # كل ملفات الوكلاء (.md)
│   ├── engineering/
│   ├── marketing/
│   ├── design/
│   └── ...
├── examples/            # أمثلة على سير العمل
├── scripts/             # أدوات تحويل للأدوات الأخرى
├── run_agent.py         # المشغّل الرئيسي
├── requirements.txt
├── .env.example
└── README.md
```

---

## مثال على جلسة

```
$ python run_agent.py --agent marketing/marketing-seo-specialist

╭─────────────────────────────────────────╮
│  SEO Specialist                         │
│  Provider: openrouter | Model: ...      │
│  Type your message, 'quit' to exit      │
╰─────────────────────────────────────────╯

You: كيف أحسّن ترتيب موقعي في Google؟
SEO Specialist: ...
```

---

## المصدر

مبني على [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) — MIT License.
