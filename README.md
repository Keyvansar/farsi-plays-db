# بانک اطلاعات نمایشنامه‌های فارسی | Farsi Plays Database

<p align="center" dir="rtl">
  <strong>سامانه جامع، متن‌باز و پژوهشی برای ثبت و جستجوی متون نمایشی به زبان فارسی</strong>
</p>

<p align="center">
  <a href="https://farsiplays.netlify.app">🌐 مشاهده نسخه زنده | Live Demo</a>
</p>

---

## 📖 معرفی | About

<div dir="rtl">

بانک اطلاعات نمایشنامه‌های فارسی یک پروژه متن‌باز است که هدف آن ایجاد یک منبع جامع و قابل جستجو برای تمام نمایشنامه‌ها و متون نمایشی منتشرشده به زبان فارسی است. این سامانه امکان ثبت اثر، جستجوی پیشرفته، برچسب‌گذاری موضوعی و مدیریت محتوای جمعی را فراهم می‌کند.

</div>

Farsi Plays Database is an open-source project aiming to build a comprehensive, searchable repository of all published plays and performance texts in the Persian (Farsi) language. The platform supports work submission, advanced search, thematic tagging, and collaborative content moderation.

## ✨ ویژگی‌ها | Features

<div dir="rtl">

- 🔍 **جستجوی پیشرفته** — جستجو بر اساس نویسنده، مترجم، ناشر، سال، تعداد بازیگران، برچسب موضوعی و …
- ✍️ **ثبت اثر** — فرم ساختاریافته برای ثبت نمایشنامه‌های چاپ‌شده با اعتبارسنجی هوشمند
- 🏷️ **طبقه‌بندی موضوعی** — سیستم برچسب‌گذاری سلسله‌مراتبی (taxonomy) برای دسته‌بندی آثار
- 👤 **حساب کاربری** — ورود، ویرایش نام نمایشی و تغییر رمز عبور
- 📋 **کارتابل بررسی** — سیستم مدیریت محتوا برای تأیید اطلاعات ثبت‌شده توسط همکاران
- 📝 **پیشنهاد اصلاح** — امکان گزارش خطا یا پیشنهاد ویرایش برای هر اثر
- 📚 **تاریخچه ویرایش** — ثبت تمام تغییرات اعمال‌شده بر هر اثر
- 🌐 **متن‌باز** — داده‌ها و کد در دسترس عموم برای استفاده پژوهشی

</div>

- 🔍 **Advanced Search** — filter by playwright, translator, publisher, year, cast size, tags, etc.
- ✍️ **Work Submission** — structured form for registering published plays with smart validation
- 🏷️ **Thematic Taxonomy** — hierarchical tagging system for categorizing works
- 👤 **User Accounts** — sign in, display-name editing, password reset
- 📋 **Moderation Dashboard** — content management system for verifying submissions
- 📝 **Edit Suggestions** — flag errors or propose corrections for any entry
- 📚 **Edit History** — full audit trail of changes per edition
- 🌐 **Open Data** — database and code openly available for research

## 🛠️ تکنولوژی | Tech Stack

| لایه | تکنولوژی |
| --- | --- |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS 4 |
| Forms & Validation | React Hook Form + Zod |
| Routing | React Router DOM 7 |
| Backend & Database | Supabase (PostgreSQL) |
| Linting | Oxlint |
| Hosting | Netlify |

## 🚀 راه‌اندازی محلی | Local Setup

### پیش‌نیازها | Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) project (free tier)

### مراحل نصب | Installation

```bash
# 1. Clone the repository
git clone https://github.com/Keyvansar/farsi-plays-db.git
cd farsi-plays-db

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Then fill in your Supabase credentials

# 4. Run the development server
npm run dev
```

### متغیرهای محیطی | Environment Variables

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ Never commit your `.env.local` file. It is already ignored in `.gitignore`.

## 👥 حساب‌ها و نقش‌ها | Accounts & Roles

| نقش | Role | دسترسی |
| --- | --- | --- |
| مهمان | Guest | جستجو، ثبت اثر (در صف بررسی)، گزارش خطا |
| مشارکت‌کننده | Contributor | مانند مهمان + ثبت با نام کاربری |
| ویراستار | Moderator | تأیید/رد پیشنهادات، ویرایش مستقیم، تکمیل آثار |
| مدیر | Admin | همه دسترسی‌ها + حذف اثر و مدیریت نقش‌ها |

<div dir="rtl">

ورود فقط با دعوت است: مدیران از بخش Supabase → Authentication → Users گزینه «Invite user» را می‌زنند و کاربر دعوت‌شده به‌صورت خودکار نقش «ویراستار» دریافت می‌کند.

</div>

Accounts are invite-only: admins send invites via Supabase, and invited users automatically receive the moderator role.

## 🗄️ پایگاه داده | Database

The project uses a relational PostgreSQL schema managed via Supabase. Key tables:

| Table | Purpose |
| --- | --- |
| `works` | Original works (playwright, source language) |
| `farsi_editions` | Persian editions/translations (publisher, year, ISBN, etc.) |
| `taxonomy` | Hierarchical tags and categories |
| `edition_tags` | Many-to-many link between editions and tags |
| `external_references` | URLs to external sources (bookshops, libraries) |
| `pending_submissions` | Moderation queue for new entries and edits |
| `edit_history` | Audit log of all changes |
| `flags` | User-reported issues or corrections |
| `user_roles` | Role-based access control (contributor, moderator, admin) |
| `contributor_stats` | Public contributor leaderboards |

### راه‌اندازی اولیه | Initial Setup

1. Create a new Supabase project.
2. In the **SQL Editor**, run the full contents of `supabase_schema.sql` — it creates tables, RLS policies, RPC functions (`search_editions`, autocomplete, moderation), and triggers.
3. In **Authentication → URL Configuration**, set the Site URL to your deployed app (e.g. `https://farsiplays.netlify.app`) and add `/reset-password` to the redirect URLs.
4. In **Authentication → Email Templates**, point the reset link to `{{ .SiteURL }}/reset-password`.
5. Invite moderators via **Authentication → Users → Invite user**.
6. Deploy the frontend with an SPA redirect rule so deep links work (already provided in `public/_redirects`):

```text
/*  /index.html  200
```

## 🤝 مشارکت | Contributing

<div dir="rtl">

ما از مشارکت شما استقبال می‌کنیم! چند راه برای کمک:

- **ثبت اثر** — نمایشنامه‌های چاپ‌شده‌ای که در سامانه نیستند را ثبت کنید.
- **گزارش خطا** — اگر اطلاعات اثری نادرست است، از دکمه «گزارش خطا» استفاده کنید.
- **توسعه کد** — issueهای باز را بررسی کنید یا pull request ارسال نمایید.
- **بهبود طبقه‌بندی** — برچسب‌های موضوعی (taxonomy) را گسترش دهید.

</div>

We welcome contributions! You can help by:

- **Submitting works** — register published plays not yet in the database
- **Reporting errors** — use the "Flag" button if you spot incorrect data
- **Code contributions** — check open issues or submit a pull request
- **Improving taxonomy** — expand the thematic tagging system

### راهنمای ارسال Pull Request | PR Guidelines

1. Fork the repository and create a feature branch: `git checkout -b feature/my-feature`
2. Ensure `oxlint` passes: `npm run lint`
3. Keep components small and focused
4. Write clear commit messages in English
5. Link related issues in your PR description

## 🗺️ نقشه راه | Roadmap

- [x] Server-side advanced search (PostgreSQL RPC)
- [x] Moderation dashboard & edit history
- [x] Accounts, password reset & role management
- [ ] Automated tests (Vitest + React Testing Library)
- [ ] Gradual TypeScript migration
- [ ] CSV/JSON export & English UI option

## 📸 تصاویر | Screenshots

<!-- TODO: add screenshots -->

- Homepage / search view
- Submission form
- Moderation dashboard
- Play detail modal

## 📜 مجوز | License

This project is licensed under the [MIT License](LICENSE).

<div dir="rtl">

این پروژه تحت مجوز MIT منتشر شده است. استفاده، تغییر و توزیع آن برای اهداف شخصی و پژوهشی آزاد است.

</div>

## 🙏 قدردانی | Acknowledgments

<div dir="rtl">

از تمام پژوهشگران، دانشجویان تئاتر و کتابدارانی که داده‌های این پروژه را غنی می‌کنند، سپاسگزاریم. این پروژه با هدف حفظ و دسترسی آسان به میراث نمایشی فارسی ایجاد شده است.

</div>

Thanks to all researchers, theater students, and librarians enriching this database. This project was created to preserve and provide easy access to the heritage of Persian dramatic literature.

<p align="center" dir="rtl">

ساخته‌شده با ❤️ برای تئاتر فارسی

</p>