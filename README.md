# Agency Agents — OpenRouter & OpenAI

مجموعة كاملة من **144+ وكيل ذكاء اصطناعي متخصص** من مستودع [agency-agents](https://github.com/msitarzewski/agency-agents)، مُعدَّلة للعمل مع **OpenRouter (مجاني)** أو **OpenAI API**.

---

## التثبيت السريع

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

## النماذج المجانية على OpenRouter

| النموذج | الحجم |
|---------|-------|
| `mistralai/mistral-7b-instruct:free` | 7B |
| `meta-llama/llama-3.1-8b-instruct:free` | 8B |
| `meta-llama/llama-3.2-3b-instruct:free` | 3B |
| `qwen/qwen-2.5-7b-instruct:free` | 7B |
| `google/gemma-3-1b-it:free` | 1B |

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
