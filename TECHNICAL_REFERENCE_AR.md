# ShopHub — المرجع التقني الشامل (عربي)

> تطبيق تجارة إلكترونية إنتاجي ثنائي اللغة (عربي/إنجليزي مع دعم RTL كامل)، يشمل لوحة تحكم Admin متكاملة، منظومة Guards للمسارات، نظام أخطاء عالمي، بيئات أنجولار-ستايل، وبنية CMS جاهزة للنشر.

---

## جدول المحتويات

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [التقنيات المستخدمة](#2-التقنيات-المستخدمة)
3. [البدء السريع](#3-البدء-السريع)
4. [هيكل المشروع](#4-هيكل-المشروع)
5. [نظام البيئات](#5-نظام-البيئات)
6. [تهيئة التطبيق عند التشغيل](#6-تهيئة-التطبيق-عند-التشغيل)
7. [الترجمة والتدويل (i18n)](#7-الترجمة-والتدويل-i18n)
8. [نظام الثيمات](#8-نظام-الثيمات)
9. [معمارية المسارات والـ Guards](#9-معمارية-المسارات-والـ-guards)
10. [المصادقة وـ Auth Store](#10-المصادقة-وـ-auth-store)
11. [طبقة الـ API](#11-طبقة-الـ-api)
12. [إدارة الحالة (State Management)](#12-إدارة-الحالة-state-management)
13. [نظام الأخطاء العالمي](#13-نظام-الأخطاء-العالمي)
14. [بوابة تهيئة التطبيق](#14-بوابة-تهيئة-التطبيق)
15. [خدمة محتوى الـ CMS](#15-خدمة-محتوى-الـ-cms)
16. [Feature Flags](#16-feature-flags)
17. [الـ Layouts](#17-الـ-layouts)
18. [صفحات لوحة التحكم (Admin)](#18-صفحات-لوحة-التحكم-admin)
19. [صفحات واجهة المستخدم (Storefront)](#19-صفحات-واجهة-المستخدم-storefront)
20. [المكونات المشتركة](#20-المكونات-المشتركة)
21. [التحقق من المدخلات (Form Validation)](#21-التحقق-من-المدخلات-form-validation)
22. [الـ Mock Server](#22-الـ-mock-server)
23. [البناء وتقسيم الـ Bundle](#23-البناء-وتقسيم-الـ-bundle)
24. [ثبات السلة ومزامنة قائمة الأمنيات](#24-ثبات-السلة-ومزامنة-قائمة-الأمنيات)
25. [إرشادات التطوير](#25-إرشادات-التطوير)

---

## 1. نظرة عامة على المشروع

### ايه هو ShopHub؟

ShopHub هو تطبيق تجارة إلكترونية أحادي الصفحة (SPA) مكتوب بـ React 19 + TypeScript + Vite. التطبيق ثنائي اللغة (عربي وإنجليزي) وبيشتغل على بيئتين مختلفتين في نفس الوقت:

- **واجهة المستخدم (User Storefront)** — صفحات التسوق العامة والمحمية (الرئيسية، كتالوج المنتجات، السلة، قائمة الأمنيات، الدفع، الطلبات، الملف الشخصي).
- **لوحة التحكم (Admin Panel)** — مخصصة لإدارة المنتجات والفئات والطلبات، ومقيدة بدور `ADMIN` أو `MANAGER`.

### المميزات الأساسية

| الميزة | التفاصيل |
|---|---|
| واجهة ثنائية اللغة | عربي + إنجليزي مع تبديل تلقائي لـ RTL |
| منظومة Guards | ProtectedRoute ← WhitelistGuard ← RoleGuard ← FeatureGuard ← DeepLinkGuard |
| نظام الأخطاء | 4 أوضاع عرض: PAGE, MODAL, TOAST, INLINE — مدار بـ typed error store |
| محتوى CMS | حزم الترجمة وضبط الأخطاء تتحمّل من السيرفر عند التشغيل |
| المصادقة | JWT access token في الكوكي + silent refresh + feature flags لكل مستخدم |
| تبديل الـ API | Mock (json-server) ↔ backend حقيقي عبر `VITE_API_SOURCE` |
| تقسيم الكود | كل صفحة `React.lazy()` — ~70% أصغر في الـ initial bundle |
| البيئات | Angular-style typed `environment.ts` / `environment.prod.ts` |

### ليه ده مهم في البرودكشن؟

المشروع مصمم ليكون **جاهز للإنتاج من اليوم الأول**. كل قرار معماري موجود عشان يحل مشكلة حقيقية:
- التبديل بين Mock و Real API يخلّيك تطور وتختبر بدون ما تحتاج backend حقيقي
- الـ Guards المتداخلة تضمن إن كل صفحة محمية على أكتر من مستوى
- نظام الأخطاء المركزي بيمنع التكرار ويضمن تجربة مستخدم متسقة

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو شلنا أي جزء من المعمارية دي:
- بدون الـ Guards: أي مستخدم ممكن يوصل لـ Admin pages
- بدون نظام الأخطاء: كل page هتتعامل مع الأخطاء بطريقتها الخاصة — كود متكرر ومشكلة صيانة
- بدون الـ lazy loading: الـ initial bundle هيكون كبير جداً ووقت التحميل هيطول

---

## 2. التقنيات المستخدمة

### مكتبات وقت التشغيل (Runtime Dependencies)

> دي المكتبات اللي بتتحمّل للمستخدم النهائي — اختيار كل واحدة كان مقصود.

| الحزمة | الإصدار | الدور |
|---|---|---|
| `react` | ^19.2 | إطار عمل الواجهة |
| `react-dom` | ^19.2 | renderer للـ DOM |
| `react-router-dom` | ^7.13 | توجيه الصفحات (Client-side routing) |
| `zustand` | ^5.0 | إدارة الحالة العالمية |
| `axios` | ^1.13 | HTTP client |
| `react-hook-form` | ^7.71 | إدارة حالة الفورم |
| `@hookform/resolvers` | ^5.2 | ربط Zod بـ RHF |
| `zod` | ^4.3 | التحقق من المدخلات |
| `firebase` | ^12.10 | تسجيل الدخول الاجتماعي (Google, Facebook, Microsoft) |
| `js-cookie` | ^3.0 | إدارة كوكيز الـ JWT |
| `lucide-react` | ^0.577 | مكتبة الأيقونات |
| `tailwind-merge` | ^3.4 | دمج classes الـ Tailwind |
| `tailwindcss-animate` | ^1.0 | animations |

### أدوات التطوير (Dev Dependencies)

| الحزمة | الدور |
|---|---|
| `vite` ^8 | Dev server + bundler |
| `@vitejs/plugin-react` | Fast Refresh + JSX transform |
| `vite-tsconfig-paths` | دعم الـ `@/` path alias |
| `typescript` ~5.9 | Type checking |
| `tailwindcss` ^3.4 | CSS utility-first framework |
| `eslint` + `typescript-eslint` | Linting |
| `json-server` ^0.17 | Mock REST API backend |
| `concurrently` | تشغيل Vite + json-server في نفس الوقت |

### ليه ده مهم في البرودكشن؟

- **Zustand بدل Redux**: أبسط بكتير، bundlesize أصغر، وبيدعم الـ imperative access من خارج الـ components — مهم جداً في الـ interceptors والـ logout logic.
- **Zod بدل Yup**: أسرع في الـ type inference، وبيشتغل بشكل أفضل مع TypeScript strict mode.
- **json-server**: بيخلّيك تطور بدون backend — لكن نتأكد إن الـ API contracts صح قبل ما نوصّل بـ real backend.

---

## 3. البدء السريع

### المتطلبات

- Node.js نسخة 18 أو أحدث
- npm نسخة 9 أو أحدث

### التثبيت

```bash
npm install
```

### إعداد ملفات البيئة

اعمل copy لـ `.env.example` باسم `.env.local` واملأ القيم المطلوبة:

```bash
# استراتيجية الـ API: 'mock' (json-server) أو 'real' (backend)
VITE_API_SOURCE=mock

# مصدر المحتوى: 'local' (json-server) أو 'backend' (CMS)
VITE_CONTENT_SOURCE=local

# Base URL للـ backend (بس لما VITE_API_SOURCE=real)
VITE_LOGIN_AUTH_URL=https://api.freeapi.app/api/v1

# URL الـ Mock Server (بس في التطوير)
VITE_MOCK_SERVER_URL=http://localhost:3001

# إعدادات Firebase (مطلوبة لتسجيل الدخول الاجتماعي)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### أوامر NPM

| الأمر | الوصف |
|---|---|
| `npm run dev` | Vite dev server فقط |
| `npm run dev:mock` | json-server mock backend فقط |
| `npm run dev:all` | Vite + json-server في نفس الوقت (الأنسب للتطوير المحلي) |
| `npm run build` | TypeScript compile ثم Vite production build |
| `npm run preview` | تشغيل الـ production build محلياً |
| `npm run lint` | فحص جودة الكود بـ ESLint |

### سير عمل التطوير

للتطوير المحلي الكامل مع الـ Mock APIs:

```bash
npm run dev:all
```

هيشتغل:
- Vite dev server على `http://localhost:5173`
- json-server على `http://localhost:3001`

الـ Vite proxy بيبعت `/api/v1/*` و `/content/*` لـ json-server تلقائياً.

### ليه ده مهم في البرودكشن؟

`npm run dev:all` هو الأمر الأساسي للتطوير — بيضمن إن الـ frontend والـ mock backend بيشتغلوا سوا بدون ما تحتاج تفتح تيرمينالين.

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو نسيت تشغّل json-server وشغّلت Vite بس، كل الـ API calls هترجع 404 وهتظن إن في bug في الكود وهو في الحقيقة السيرفر مش شغال.

---

## 4. هيكل المشروع

> فهم هيكل الملفات مهم جداً قبل ما تبدأ تضيف features جديدة.

```
react-auth/
├── mock-server/            # إعدادات json-server + بيانات تجريبية
│   └── server.cjs
├── public/                 # ملفات ثابتة (static assets)
├── src/
│   ├── api/                # وحدات Axios (ملف واحد لكل domain)
│   │   ├── base/
│   │   │   └── axios.ts        # Factory الـ Axios instance + الـ interceptors
│   │   ├── auth.api.ts
│   │   ├── cart.api.ts
│   │   ├── categories.api.ts
│   │   ├── orders.api.ts
│   │   ├── products.api.ts
│   │   └── wishlist.api.ts
│   ├── components/
│   │   ├── admin/
│   │   │   └── DeleteModal.tsx
│   │   ├── auth/               # UI مشترك للـ Login/Register
│   │   │   ├── Divider.tsx
│   │   │   ├── common/         # Error notification, icons, spinner
│   │   │   └── social-media-auth/
│   │   ├── common/
│   │   │   └── GlobalLoader.tsx
│   │   ├── form/
│   │   │   └── input/          # FormInputControl (input متصل بـ RHF)
│   │   └── ui/
│   │       ├── InitSkeleton.tsx  # Skeleton أثناء تحميل AppInitializer
│   │       └── Skeleton.tsx
│   ├── config/
│   │   ├── Define.ts           # Export لـ Axios instance (بيستخدم environment.ts)
│   │   ├── firebase.ts         # إعدادات Firebase app
│   │   └── whitelist.config.ts # قواعد صلاحيات الوصول الدقيقة
│   ├── core/
│   │   ├── content/
│   │   │   └── content.service.ts
│   │   ├── errors/             # نظام الأخطاء العالمي
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── GlobalErrorRenderer.tsx
│   │   │   ├── default-error.ts
│   │   │   ├── error.config.ts
│   │   │   ├── error.handler.ts
│   │   │   ├── error.store.ts
│   │   │   └── error.types.ts
│   │   └── init/               # بوابة تهيئة التطبيق
│   │       ├── AppInitializer.tsx
│   │       ├── init.service.ts
│   │       └── init.store.ts
│   ├── environments/           # إعدادات البيئة بالأسلوب الأنجولاري
│   │   ├── environment.ts      # بيئة التطوير (الافتراضية)
│   │   └── environment.prod.ts # توثيق بيئة الإنتاج
│   ├── hooks/                  # Custom React hooks
│   │   ├── useCartMerge.ts
│   │   ├── useDebounce.ts
│   │   ├── useSocialAuth.ts
│   │   └── useWishlistSync.ts
│   ├── i18n/                   # الترجمة والتدويل
│   │   ├── i18n.context.tsx    # I18nProvider + useI18n hook
│   │   └── locales/
│   │       ├── en.ts           # ترجمة إنجليزية ثابتة (TypeScript)
│   │       ├── ar.ts           # ترجمة عربية ثابتة (TypeScript)
│   │       ├── default-en.ts   # حزمة إنجليزية ديناميكية (من الـ CMS)
│   │       └── default-ar.ts   # حزمة عربية ديناميكية (من الـ CMS)
│   ├── layouts/
│   │   ├── AdminLayout.tsx     # Shell لوحة التحكم (sidebar)
│   │   ├── AuthLayout.tsx      # Shell صفحات تسجيل الدخول
│   │   └── UserLayout.tsx      # Shell واجهة المتجر (header + footer)
│   ├── pages/
│   │   ├── Error.tsx
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   ├── Register.tsx
│   │   ├── Unauthorized.tsx
│   │   ├── admin/
│   │   │   ├── AdminOrdersPage.tsx
│   │   │   ├── CategoriesPage.tsx
│   │   │   ├── CreateProductPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EditProductPage.tsx
│   │   │   ├── ErrorPlaygroundPage.tsx
│   │   │   └── ProductsListPage.tsx
│   │   └── user/
│   │       ├── CartPage.tsx
│   │       ├── CheckoutPage.tsx
│   │       ├── HomePage.tsx
│   │       ├── OrdersPage.tsx
│   │       ├── ProductDetailPage.tsx
│   │       ├── ProductsPage.tsx
│   │       ├── ProfilePage.tsx
│   │       └── WishlistPage.tsx
│   ├── routes/
│   │   ├── AppRouter.tsx       # شجرة المسارات الكاملة مع lazy loading
│   │   ├── DeepLinkGuard.tsx   # Guard للتحقق من ملكية الـ resource
│   │   ├── FeatureGuard.tsx    # Guard لـ feature flags
│   │   ├── ProtectedRoute.tsx  # Guard للمصادقة
│   │   ├── RoleGuard.tsx       # Guard للأدوار
│   │   └── WhitelistGuard.tsx  # Guard للصلاحيات الدقيقة
│   ├── schemas/                # Zod schemas للتحقق
│   │   ├── checkout.schema.ts
│   │   ├── login.schema.ts
│   │   ├── product.schema.ts
│   │   └── register.schema.ts
│   ├── store/                  # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── cart.store.ts
│   │   ├── ui.store.ts
│   │   └── wishlist.store.ts
│   ├── themes/
│   │   └── theme.context.tsx   # ThemeProvider + useTheme hook
│   ├── types/
│   │   └── auth.types.ts
│   ├── utils/
│   │   ├── cookie.service.ts
│   │   ├── normalizeApiError.ts
│   │   └── ...
│   ├── App.tsx                 # جذر الـ Providers
│   └── main.tsx                # نقطة الدخول لـ React DOM
├── .env                        # متغيرات البيئة الأساسية
├── .env.local                  # overrides محلية (مش في الـ git)
├── .env.production             # بيئة الإنتاج (مش في الـ git)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### ليه ده مهم في البرودكشن؟

التنظيم ده بيفصل المسؤوليات بشكل واضح:
- `api/` بس بتتكلم مع الـ backend
- `store/` بس بيدير الحالة
- `routes/` بس بيتحكم في التنقل والحماية
- `core/` فيها الأنظمة الأساسية اللي الكل بيعتمد عليها

---

## 5. نظام البيئات

### المشكلة اللي بيحلها

في أي مشروع React، بتلاقي `import.meta.env.VITE_API_URL` منتشرة في كل الكود. ده بيخلّي:
- الكود صعب القراءة
- التغيير في اسم المتغير يتطلب بحث وتبديل في كل الملفات
- مفيش type safety على قيم البيئة

النظام ده بيحل المشكلة بأسلوب Angular — **ملفات TypeScript موحّدة** تقرأ من `.env` وتكشف interface نظيف للكود.

### الملفات

| الملف | الغرض |
|---|---|
| `src/environments/environment.ts` | بيئة التطوير — بيقرأ من `.env` / `.env.local` |
| `src/environments/environment.prod.ts` | توثيق — بيوثّق متغيرات `.env.production` المطلوبة |

### الـ `Environment` interface

```ts
export interface Environment {
  production: boolean;           // true بس في `vite build`
  apiSource: 'mock' | 'real';   // استراتيجية توجيه الـ API
  apiUrl: string;                // Base URL للـ backend
  contentSource: 'local' | 'backend'; // استراتيجية حزم الـ CMS
  mockServerUrl: string;         // URL الـ json-server (للتطوير فقط)
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}
```

### الاستخدام

```ts
import { environment } from '@/environments/environment';

if (environment.production) { ... }
const baseUrl = environment.apiUrl;
```

### كيف Vite بيحل ملفات البيئة

| الملف | متى بيتحمّل |
|---|---|
| `.env` | دايماً (القيم الأساسية) |
| `.env.local` | overrides محلية للتطوير (مش في الـ git) |
| `.env.production` | بس في `vite build` |

> ملفات `.env*` في جذر المشروع هي مصدر الحقيقة للقيم. ملفات TypeScript `environment.ts` هي **غلاف typed** — بتوفر autocompletion وأمان وقت الـ compile. مش بتبدّل أو تنقل ملفات الـ Vite `.env`.

### المستهلكون

كل الكود اللي محتاج قيم البيئة بيستورد من `@/environments/environment`:

- `src/config/Define.ts` — بيختار mock أو real API base URL
- `src/config/firebase.ts` — تهيئة Firebase app
- `src/core/init/init.service.ts` — استراتيجية حزمة المحتوى (`local` أو `backend`)

### ليه ده مهم في البرودكشن؟

بدل ما تكتب `import.meta.env.VITE_SOME_KEY` في 20 ملف، بتكتبها مرة واحدة في `environment.ts`. لو غيّرت اسم المتغير، بتعدّله في مكان واحد بس.

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو رجعنا لـ `import.meta.env` مباشرة في كل مكان، هيفضل TypeScript مش عارف يتحقق من صحة القيم، وأي مشكلة في اسم متغير هتظهر بس وقت التشغيل مش وقت الـ compile.

---

## 6. تهيئة التطبيق عند التشغيل

### ترتيب الـ Providers في `App.tsx` (من الخارج للداخل)

```
I18nProvider          ← اللغة + RTL (بيقرأ من localStorage عند التحميل)
  ThemeProvider       ← dark / light theme (بيقرأ من localStorage عند التحميل)
    AppInitializer    ← بيمنع Router من التحميل لحد ما حزم الترجمة والأخطاء تتحمّل
      ErrorBoundary   ← شبكة أمان لأخطاء الـ render
        GlobalLoader  ← spinner fullscreen (z-9999)
        GlobalErrorRenderer ← overlays أخطاء PAGE / MODAL / TOAST
        AppRouter     ← شجرة المسارات (بتتحمّل بس لما AppInitializer.isReady)
```

### ليه الترتيب ده مهم؟

1. `I18nProvider` و `ThemeProvider` بيشتغلوا الأول عشان `dir`، `lang`، والـ `dark` class تتحط على `<html>` **synchronously** — ده بيمنع الـ layout flash قبل أي paint.
2. `AppInitializer` بيضمن إن كل string الترجمة وضبط الأخطاء متاح قبل ما أي صفحة تتحمّل.
3. `GlobalLoader` و `GlobalErrorRenderer` فوق الـ router عشان يعلوا على كل محتوى الصفحات.

### ليه ده مهم في البرودكشن؟

لو عكست الترتيب — مثلاً حطّيت AppRouter قبل I18nProvider — هيحصل لحظة عرض بدون ترجمة، وهيبان للمستخدم إن في مشكلة في التطبيق حتى لو كل حاجة شغالة.

### ممكن يحصل ايه لو شلنا الجزء ده؟

- بدون `AppInitializer`: الصفحات هتتحمّل قبل ما الترجمات تكون جاهزة — هتبان الـ keys بدل النصوص.
- بدون `ErrorBoundary`: أي خطأ في الـ render هيكسر التطبيق بالكامل بدون fallback.

---

## 7. الترجمة والتدويل (i18n)

### المعمارية

```
useI18n()                    ← React hook (في أي component)
  I18nProvider               ← React Context (بيلف الـ App)
    i18n.context.tsx         ← provider + hook + resolve()
      LOCALES (ثابتة)        ← en.ts / ar.ts (متاحة دايماً)
      dynamicLocales (store) ← useInitStore — حزم من الـ CMS
        init.store.ts
```

دالة الترجمة اسمها `translate` (على نفس أسلوب Angular `translate` pipe):

```tsx
const { translate, lang, setLang, dir } = useI18n();

<h1>{translate('home.hero.title')}</h1>
<button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
  {translate('nav.language')}
</button>
```

### كيف بيشتغل حل الـ Keys

الـ keys هي paths بالنقط داخل كائن الترجمة:

```ts
translate('nav.home')              // → 'Home' (en) | 'الرئيسية' (ar)
translate('admin.orders.title')    // → 'Orders' (en) | 'الطلبات' (ar)
translate('missing.key')           // → 'missing.key' (الـ key نفسه كـ fallback)
translate('missing.key', 'N/A')    // → 'N/A' (fallback صريح)
```

الـ resolver بيمشي على كائن الترجمة بتقسيم الـ key على `.` وبيتنقل في كل مستوى. مفيش crash لو الـ key مش موجود — بيرجع الـ fallback.

### الـ Interpolation

دالة `translate()` مش بتدعم الـ interpolation arguments. للنصوص ذات القيم الديناميكية، استخدم `.replace()` بعد `translate()`:

```ts
translate('admin.products.showing')
  .replace('{{from}}', String(startItem))
  .replace('{{to}}', String(endItem))
  .replace('{{total}}', String(totalItems))
// en locale: 'Showing {{from}}–{{to}} of {{total}}'
// → 'Showing 1–20 of 147'
```

### الحزم الثابتة مقابل الديناميكية

| نوع الحزمة | المصدر | متى تُستخدم |
|---|---|---|
| ثابتة | `en.ts` / `ar.ts` (TypeScript imports) | متاحة دايماً؛ fallback لو فشل CMS fetch |
| ديناميكية | CMS/json-server عبر `fetchLocaleBundle()` | بتتحمّل عند التشغيل بـ `AppInitializer`؛ بتـoverride الثابتة |

دالة translate بتجرب الحزمة الديناميكية أول، وبعدين بترجع للثابتة. يعني الحزم الثابتة دايماً فيها أحدث الـ keys (المضافة وقت التطوير)، والحزمة الديناميكية بتوفر نصوص قابلة للتغيير من السيرفر.

### RTL Layout

لما `lang === 'ar'`:
1. `document.documentElement.dir = 'rtl'` — المتصفح بيعكس الـ layout تلقائياً
2. `document.documentElement.lang = 'ar'` — screen readers بتستخدم قواعد النطق العربي
3. `rtl:` variants متاحة في Tailwind للـ overrides الدقيقة

### ملفات الترجمة

| الملف | الغرض |
|---|---|
| `src/i18n/locales/en.ts` | ترجمة إنجليزية ثابتة (دايماً في الـ bundle) |
| `src/i18n/locales/ar.ts` | ترجمة عربية ثابتة (دايماً في الـ bundle) |
| `src/i18n/locales/default-en.ts` | حزمة إنجليزية ديناميكية يخدمها CMS / json-server |
| `src/i18n/locales/default-ar.ts` | حزمة عربية ديناميكية يخدمها CMS / json-server |

`default-en.ts` بيـexport نوع `Locale` اللي TypeScript بيـenforce عليه في كل ملفات الترجمة — ضيف key في `default-en.ts` والـ compiler فوراً بيحدد أي ملف ترجمة فاته.

### هيكل مفاتيح الترجمة

```
nav.*            روابط التنقل (الرئيسية، المنتجات، الطلبات، إلخ)
common.*         تسميات UI مشتركة (lightMode، darkMode، إلخ)
auth.*           نصوص صفحات Login / Register
home.*           الصفحة الرئيسية للمتجر
products.*       كتالوج المنتجات + تفاصيل المنتج
cart.*           سلة التسوق
wishlist.*       قائمة الأمنيات
checkout.*       فورم الدفع + تأكيد الطلب
orders.*         قائمة طلبات المستخدم + تفاصيل
profile.*        صفحة الملف الشخصي
admin.dashboard.*  لوحة تحكم الـ Admin
admin.products.*   إدارة المنتجات في Admin
admin.categories.* إدارة الفئات في Admin
admin.orders.*     إدارة الطلبات في Admin
errors.*         رسائل الأخطاء العالمية (محتوى PAGE / MODAL / TOAST)
```

### إضافة مفتاح ترجمة جديد

1. ضيف الـ key في `src/i18n/locales/default-en.ts` (TypeScript هيـenforce على باقي الملفات)
2. ضيف الترجمة العربية في `src/i18n/locales/default-ar.ts`
3. ضيف نفس الـ key في `src/i18n/locales/en.ts` و `src/i18n/locales/ar.ts` (الحزم الثابتة)
4. استخدم `translate('your.key')` في الـ component

### ليه ده مهم في البرودكشن؟

- الحزم الديناميكية تخلّيك تغير نصوص التطبيق من السيرفر بدون deploy جديد
- النظام المزدوج (ثابت + ديناميكي) يضمن إن التطبيق مش هيبقى فارغ حتى لو فشل الـ CMS

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو اعتمدنا على الحزم الديناميكية بس، وسقط الـ CMS، كل النصوص هتختفي. الحزم الثابتة هي الشبكة الأمان.

---

## 8. نظام الثيمات

دعم الثيم موجود في `src/themes/theme.context.tsx` باستخدام نفس أسلوب React Context كالـ i18n.

### الثيمات المدعومة

- `light` — الافتراضي، لوحة ألوان أبيض/رمادي
- `dark` — لوحة ألوان رمادي داكن/slate
- `custom` — variant ثالث قابل للتوسعة (الـ hook بيكشف اسم الثيم الحالي)

### الاستخدام

```tsx
import { useTheme } from '@/themes/theme.context';

const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</button>
```

`toggleTheme` بيدور في حلقة: `light → dark → light`. اسم الثيم بيتحفظ في `localStorage` والـ `dark` class بتتحط على `<html>` **synchronously** عند التحميل لمنع الـ FOUC (Flash of Unstyled Content).

### Tailwind Dark Mode

Tailwind مضبوط بـ `darkMode: 'class'`. كل styles الـ dark mode بتستخدم prefix الـ `dark:`:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

### ليه ده مهم في البرودكشن؟

لو الثيم اتحط في `localStorage` بس من غير ما يتأكد إن الـ `dark` class على `<html>` من أول render، المستخدم هيشوف لحظة بيضاء قبل ما الثيم الداكن يظهر — تجربة مستخدم سيئة جداً.

---

## 9. معمارية المسارات والـ Guards

### نظرة عامة على شجرة المسارات

```
/login                        AuthLayout → Login
/register                     AuthLayout → Register

/                             UserLayout (ErrorBoundary)
/products                       → ProductsPage
/products/:slugId               → ProductDetailPage
/cart                           → CartPage
/wishlist                       → WishlistPage

  ProtectedRoute (يلزم المصادقة)
  /checkout                     → CheckoutPage
  /profile                      → ProfilePage
  /orders                       → OrdersPage
    DeepLinkGuard (ملكية الـ resource)
    /orders/:id                 → OrdersPage (عرض تفصيلي)

ProtectedRoute
  WhitelistGuard (config/whitelist.config.ts)
    RoleGuard (ADMIN | MANAGER)
      AdminLayout (ErrorBoundary)
      /admin                    → redirect /admin/dashboard
      /admin/dashboard          → DashboardPage
      /admin/products           → ProductsListPage
      /admin/products/create    → CreateProductPage
      /admin/products/:id/edit  → EditProductPage
      /admin/categories         → CategoriesPage
      /admin/orders             → AdminOrdersPage
        FeatureGuard (errorPlayground flag)
        /admin/error-playground → ErrorPlaygroundPage

/unauthorized                 Unauthorized (بدون layout)
/error                        ErrorPage (بدون layout)
/*                            NotFound (catch-all)
```

### شرح منظومة الـ Guards

الـ Guards هي React Router layout routes (components بتـrender `<Outlet />`). بتتكون بالتداخل — كل guard خارجي بيشتغل قبل الـ guards الداخلية.

> **تخيل ده كمداخل فندق**: الـ ProtectedRoute هو الباب الرئيسي (هل معاك تذكرة؟)، الـ WhitelistGuard هو الكاشير (هل اسمك في القائمة؟)، الـ RoleGuard هو حارس الـ VIP (هل انت ضيف VIP؟)، والـ FeatureGuard هو الموظف اللي بيتحقق من الـ backstage pass.

#### `ProtectedRoute`

بيتحقق إن `useAuthStore().user !== null`. بيـredirect المستخدمين غير المسجلين لـ `/login?targetUrl=<encoded-path>`. بعد تسجيل الدخول، بيـredirect للـ URL الأصلي.

```ts
// تدفق الـ Redirect:
// المستخدم يزور /checkout (غير مسجل)
//   → ProtectedRoute → /login?targetUrl=%2Fcheckout
//   → تسجيل دخول ناجح  → navigate('/checkout', { replace: true })
```

#### `WhitelistGuard`

بيقرأ `WHITELIST_CONFIG` من `src/config/whitelist.config.ts`. لكل admin route، بيـenforce `allowedRoles`، `allowedUserIds`، و `requiredFeatureFlags`. بيـredirect لـ `/unauthorized` عند الانتهاك.

القواعد بتدعم المطابقة الدقيقة والـ prefix matching (`matchPrefix: true`).

#### `RoleGuard`

بيتحقق من `user.role` مقابل prop الـ `allowedRoles`. بُستخدم للوصول الشامل بالدور (ADMIN, MANAGER). بيـredirect لـ `/unauthorized`.

#### `FeatureGuard`

بيتحقق من `useAuthStore().featureFlags[featureFlag]`. بيـredirect لـ `/unauthorized` لو الـ flag مش موجود أو `false`.

```tsx
<FeatureGuard featureFlag="errorPlayground" />
```

#### `DeepLinkGuard`

فحص ملكية async. بيقرأ `:id` من الـ route params، بيستدعي خدمة للتحقق إن الـ resource ملك المستخدم الحالي. بيعرض loading state أثناء الفحص. بيـredirect لـ `/unauthorized` عند الفشل.

```tsx
<DeepLinkGuard resourceType="order" />
```

### Code Splitting

كل صفحة متلفّفة في `React.lazy()` + `<Suspense>`. المكوّن المساعد `<Page>` بيتعامل مع ده بشكل موحّد:

```tsx
function Page({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<GlobalLoader show />}>
      <Component />
    </Suspense>
  );
}
```

JavaScript كل صفحة بيتنزّل بس لما المستخدم يزورها أول مرة، مما يقلل الـ initial bundle بحوالي 70%.

### Error Boundary لكل Layout

كلاً من `AdminLayout` و `UserLayout` ملفوفان بـ `ErrorBoundary` على مستوى الـ route. أخطاء JS وقت الـ render داخل قسم الـ layout بتعرض fallback UI من غير ما تكسر التطبيق بالكامل. الـ boundary بيـresets تلقائياً لما المستخدم يتنقل لـ route جديد عبر `resetKey={location.pathname}`.

### ليه ده مهم في البرودكشن؟

- **DeepLinkGuard** بالذات ده حماية مهمة جداً: يمنع أي مستخدم من تخمين URL طلبات مستخدم تاني وعرضها.
- بدون **WhitelistGuard**، `RoleGuard` لوحده مش كافي — ممكن يحصل edge cases في الـ roles.

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو شلنا `ProtectedRoute`: أي متصفح يقدر يوصل لـ `/checkout` و `/orders` بدون login.
لو شلنا `RoleGuard`: أي مستخدم عادي يقدر يوصل لـ Admin panel.
لو شلنا `DeepLinkGuard`: المستخدم A يقدر يشوف طلبات المستخدم B بمجرد تغيير الـ `:id` في الـ URL.

---

## 10. المصادقة وـ Auth Store

**الملف:** `src/store/auth.store.ts`

### الحالة (State)

| الحقل | النوع | الحفظ | الوصف |
|---|---|---|---|
| `user` | `UserType \| null` | `localStorage` (`auth-user`) | المستخدم المسجل — بيبقى موجود بعد refresh الصفحة |
| `accessToken` | `string \| null` | In-memory فقط | الـ JWT الحالي (الكوكي هو المصدر الحقيقي) |
| `featureFlags` | `Record<string, boolean>` | `localStorage` (`auth-feature-flags`) | Feature flags لكل مستخدم |

### الإجراءات (Actions)

| الإجراء | الوصف |
|---|---|
| `setAuth(user, token)` | بيتُستدعى بعد تسجيل الدخول الناجح. بيحفظ المستخدم، بيخزّن الـ token في الكوكي. |
| `setAccessToken(token)` | بيحدّث الـ token بعد silent refresh. مش بيحدّث `user`. |
| `setFeatureFlags(flags)` | بيستبدل خريطة الـ feature flags بالكامل. بيتُستدعى بعد تسجيل الدخول. |
| `logout()` | بيمسح كل الحالة، بيزيل البيانات المحفوظة، بيزيل الكوكي. بيستدعي أيضاً `useCartStore.getState().clearCart()` و `useWishlistStore.getState().clearItems()` لمسح الحالة المحلية فقط. السلة وقائمة الأمنيات على السيرفر بيتحافظ عليها عن قصد عشان تتحمل من جديد عند الـ login التالي. |

### ليه بنحفظ `user` بس ومش `accessToken`؟

الـ access token محفوظ بالفعل في كوكي المتصفح بواسطة `cookieService.setToken()`. الـ Axios request interceptor بيقرأ الـ token من الكوكي مباشرة في كل request. حفظ `user` في `localStorage` بيضمن إن الـ store يتهيأ **synchronously** قبل أي component يتـrender — مفيش auth flicker عند refresh الصفحة.

### Default Feature Flags (بيئة التطوير)

في builds التطوير (`import.meta.env.DEV`)، `errorPlayground` مفعّل عشان المطورين يقدروا يوصلوا لـ `/admin/error-playground` من غير backend feature-flag API. باقي الـ flags افتراضياً `false`.

### منع الـ Circular Dependencies

`auth.store.ts` **يجب أن لا** يستورد `authUrl` من `src/config/Define.ts`. الـ Axios instance بيقرأ `useAuthStore.getState()` داخلياً. استيراد `api` في الـ store هيخلق circular module dependency بيكسر Vite HMR وبناء الإنتاج.

`auth.store.ts` بيستورد بأمان `useCartStore` و `useWishlistStore` (static ES imports) لأن أياً من هذه الـ stores لا يستورد `auth.store.ts`. الـ `logout()` action بيستدعي `useCartStore.getState().clearCart()` و `useWishlistStore.getState().clearItems()` بشكل imperative — مفيش انتهاك لقواعد الـ React hooks لأن دول function calls عادية خارج دورة الـ render.

### تدفق Token Refresh

```
Request → 401 → isRefreshing؟
  نعم → queue request → انتظر الـ refresh
  لا  → اضبط isRefreshing = true
      → POST /users/refresh-token (withCredentials)
        نجاح → processQueue(null, newToken) → إعادة تجربة الـ requests المنتظرة
        فشل  → processQueue(error) → logout() → redirect /login
```

### ليه ده مهم في البرودكشن؟

لو مشيت بـ JWT بدون silent refresh، كل مستخدم كل ساعة (أو كل فترة انتهاء صلاحية الـ token) هيتـlogout تلقائياً — تجربة مستخدم مزعجة جداً. الـ silent refresh بيجدد الـ token في الخلفية من غير ما المستخدم يحس بحاجة.

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو شلنا الـ stale session detection اللي بيحصل عند تحميل الـ module، هيحصل crash عند refresh الصفحة لو الكوكي انتهت صلاحيته — لأن `user` هيكون في `localStorage` لكن الـ token مش موجود.

---

## 11. طبقة الـ API

### Axios Instance Factory

**الملف:** `src/api/base/axios.ts`

`createApiInstance(baseURL)` بتنشئ Axios instance مضبوط مع 5 cross-cutting concerns مدمجة:

#### 1. حقن Bearer Token
كل request خارج بياخد `Authorization: Bearer <token>` من الكوكي.

#### 2. عداد التحميل العالمي
بيزيد `useUiStore.activeApiRequestsCount` عند بداية كل request، وبيقلله عند الانتهاء. بيستخدم عداد (مش boolean) عشان الـ requests المتوازية تشتغل بشكل صح.

Opt-out لكل request:
```ts
authUrl.get('/endpoint', { showGlobalLoader: false })
```

#### 3. Silent Token Refresh (معالجة 401)
بيـqueue الـ 401 responses المتزامنة، بيبعت request refresh-token واحدة، ثم بيعيد تجربة كل الـ requests المنتظرة بالـ token الجديد. عند فشل الـ refresh، بيستدعي `logout()` وبيـnavigates بشكل مباشر لـ `/login`.

#### 4. التكامل مع Global Error Store
بيعترض أخطاء الشبكة، أخطاء 5xx، الـ 403 Forbidden، و4xx غير المعالجة (404، 409، 429، إلخ)، بيحل `ErrorCode`، وبيدفعه لـ global error store. `GlobalErrorRenderer` بيتعامل مع العرض بدون hard navigation.

**لا يدفع** لـ error store في حالات:
- `401` — معالج بـ silent refresh
- `400` / `422` — أخطاء validation، معالجة بـ form components بشكل مباشر
- Requests ملغية (`axios.isCancel`)
- Requests بـ `skipGlobalErrorHandler: true`

الشرط اللي بيُشغّل التوجيه للـ global error:
```ts
// بيشتغل لـ: أخطاء الشبكة، 5xx، 403، وأي 4xx مش معالجة محلياً
type === 'network' ||
type === 'server'  ||
(status >= 400 && status < 500 && status !== 400 && status !== 401 && status !== 422)
```

Opt-out لكل request:
```ts
authUrl.get('/endpoint', { skipGlobalErrorHandler: true })
```

#### 5. Mapping كود الخطأ من الـ Backend
لما response الـ 4xx/5xx فيها `{ errorCode: "ORDER_NOT_FOUND" }` في الـ body، `resolveErrorCode()` بيـmap الكود لـ `ErrorCode` enum لعرض الأخطاء بشكل دقيق.

### وحدات الـ API

كل وحدات الـ API بتستورد من `src/config/Define.ts` اللي بيـexport `authUrl` (الـ Axios instance المضبوط):

```ts
import { authUrl } from '@/config/Define';

export const getProducts = () => authUrl.get('/products');
export const createProduct = (data: ProductPayload) => authUrl.post('/products', data);
```

### التبديل بين مصادر الـ API

**الملف:** `src/config/Define.ts`

```ts
// mock mode  → base URL: '/api/v1'  (Vite-proxied to json-server)
// real mode  → base URL: environment.apiUrl  (production backend)
const AUTH_BASE = environment.apiSource === 'mock'
  ? '/api/v1'
  : (environment.apiUrl || '/api/v1');

export const authUrl = createApiInstance(AUTH_BASE);
```

اضبط `VITE_API_SOURCE=real` و `VITE_LOGIN_AUTH_URL=https://api.yourapp.com` في `.env.production` للتبديل لـ backend حقيقي.

### ليه ده مهم في البرودكشن؟

الـ interceptor بيوفر عليك كتابة نفس الـ error handling في كل component. بدله، كل component بيفترض إن الـ API calls هتنجح، والـ interceptor بيتعامل مع كل الحالات الاستثنائية مركزياً.

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو شلنا الـ silent refresh: كل 401 response هيـlogout المستخدم فوراً بدل ما يجدد الـ token في الخلفية.
لو شلنا الـ error store integration: كل component لازم يعالج أخطاء الشبكة لوحده — مئات من أسطر try/catch.

---

## 12. إدارة الحالة (State Management)

كل الحالة العالمية بتستخدم **Zustand**. حالة الـ UI (اللغة، الثيم) بتستخدم **React Context**. الحالة المحلية للـ component بتستخدم `useState`.

### `useAuthStore` — `src/store/auth.store.ts`

المستخدم، الـ token، والـ feature flags. شوف [القسم 10](#10-المصادقة-وـ-auth-store).

### `useCartStore` — `src/store/cart.store.ts`

حالة سلة التسوق محفوظة في `localStorage`.

| الحالة | النوع | الوصف |
|---|---|---|
| `items` | `CartItem[]` | مصفوفة من `{ product, quantity }` |

| الإجراء | الوصف |
|---|---|
| `addItem(product)` | يضيف عنصر أو يزيد الكمية |
| `removeItem(productId)` | يزيل العنصر بالكامل |
| `updateQuantity(productId, qty)` | يضبط كمية محددة |
| `clearCart()` | يفضي سلة Zustand (ويمسح `localStorage`). بيتُستدعى عند logout وبعد merge السلة مع السيرفر. |
| `loadServerCart(items)` | بيستبدل السلة المحلية بقائمة السيرفر المعتمدة. بيتُستدعى بـ `useCartMerge` بعد تسجيل الدخول. |

Badge عدد عناصر السلة بتـsubscribe باستخدام selector لتجنب الـ re-renders غير الضرورية:

```ts
const cartCount = useCartStore((s) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0)
);
```

### `useWishlistStore` — `src/store/wishlist.store.ts`

حالة قائمة الأمنيات محفوظة في `localStorage`. بتتزامن مع الـ backend عند تسجيل الدخول عبر `useWishlistSync` hook.

| الإجراء | الوصف |
|---|---|
| `addItem(productId)` | يضيف Product ID لقائمة الأمنيات المحلية |
| `removeItem(productId)` | يزيل Product ID |
| `clearItems()` | يفضي قائمة الأمنيات. بيتُستدعى عند logout. |
| `setItemsFromServer(productIds)` | بيستبدل قائمة الأمنيات المحلية بالقائمة المعتمدة من السيرفر. بيتُستدعى بـ `useWishlistSync` بعد المزامنة عشان الـ badge وأيقونات القلب على بطاقات المنتجات تكون دقيقة. |

### `useUiStore` — `src/store/ui.store.ts`

حالة UI فقط (عداد التحميل):

| الحالة | النوع | الوصف |
|---|---|---|
| `activeApiRequestsCount` | `number` | Semaphore للـ requests المتوازية |

| الإجراء | الوصف |
|---|---|
| `startLoading()` | بيزيد العداد |
| `stopLoading()` | بيقلل العداد (مش بينزل عن 0) |

`GlobalLoader` بيظهر لما `activeApiRequestsCount > 0`.

### `useInitStore` — `src/core/init/init.store.ts`

حالة التهيئة:

| الحالة | النوع | الوصف |
|---|---|---|
| `isReady` | `boolean` | true بعد ما `AppInitializer` يكمل |
| `dynamicLocales` | `Record<Lang, Locale>` | حزم الترجمة من الـ CMS |
| `errorConfig` | `ErrorBundle \| null` | ضبط الأخطاء من الـ CMS |

### `useErrorStore` — `src/core/errors/error.store.ts`

حالة الأخطاء العالمية. شوف [القسم 13](#13-نظام-الأخطاء-العالمي).

### ليه Zustand بدل Redux؟

Zustand أبسط بكثير — مش محتاج actions، reducers، selectors منفصلة. والأهم: بيدعم **الوصول الـ imperative** من خارج الـ React lifecycle:

```ts
// ده مش ممكن بسهولة في Redux
useAuthStore.getState().logout();
useCartStore.getState().clearCart();
```

ده مهم جداً في الـ Axios interceptors اللي مش بتشتغل داخل React components.

---

## 13. نظام الأخطاء العالمي

### المشكلة اللي بيحلها

في معظم المشاريع، كل component بيعمل error handling بطريقته:
- Page A بتعرض modal
- Page B بتعرض رسالة في الصفحة
- Page C بتتجاهل الخطأ خالص

النظام ده بيحل المشكلة بـ **pipeline مركزي** يضمن تجربة متسقة.

### تدفق الأخطاء

```
خطأ خام (Axios / JS / Route guard)
  │
  ▼
error.handler.ts    → بيحوّل الخطأ الخام لـ ErrorCode
  │
  ▼
error.config.ts     → بيجيب ErrorConfig (وضع العرض، أيقونة، مفاتيح i18n)
  │
  ▼
error.store.ts      → بيوجه لـ: pageError | modalError | toastQueue | inlineError
  │
  ▼
GlobalErrorRenderer.tsx → بيـrender الـ UI المناسب
```

### أوضاع العرض

| الوضع | متى تستخدمه | الـ UI |
|---|---|---|
| `PAGE` | أخطاء حرجة بتستبدل محتوى الصفحة | Overlay fullscreen (z-9990) |
| `INLINE` | أخطاء مستوى الـ form أو القسم | Banner صغيرة داخل الـ component |
| `MODAL` | أخطاء تتطلب إجراء من المستخدم | Dialog overlay (z-9995) |
| `TOAST` | إشعارات غير حرجة ومؤقتة | Stack في أسفل اليمين (z-9999)، بتختفي تلقائياً |

### كودات الأخطاء

```ts
type ErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'FEATURE_DISABLED'
  | 'VALIDATION_ERROR'
  | 'SESSION_EXPIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'UNKNOWN_ERROR';
```

### دفع خطأ

```ts
import { useErrorStore } from '@/core/errors/error.store';

const { pushError } = useErrorStore();

// دفع أساسي — بيستخدم الإعدادات الافتراضية من error.config.ts
pushError('NETWORK_ERROR');

// مع خيارات
pushError('PRODUCT_NOT_FOUND', {
  displayModeOverride: 'TOAST',
  dismissible: true,
  onRetry: () => refetch(),
  duration: 5000, // ميلي ثانية، للـ toast فقط
});
```

### ضبط الأخطاء (Error Config)

كل `ErrorCode` له `ErrorConfig` ثابت في `src/core/errors/error.config.ts`:

```ts
type ErrorConfig = {
  code: ErrorCode;
  displayMode: ErrorDisplayMode;  // وضع العرض الافتراضي
  iconName: string;               // اسم أيقونة Lucide
  iconBgClass: string;            // Tailwind bg class
  iconColorClass: string;         // Tailwind text class
  titleKey: string;               // مفتاح i18n للعنوان
  descriptionKey: string;         // مفتاح i18n للوصف
  primaryAction?: { label, variant, redirectTo };
  secondaryAction?: { label, variant, redirectTo };
};
```

### كيف تغيّر وضع عرض خطأ من PAGE لـ MODAL؟

**الطريقة 1: override في مكان الاستدعاء (مؤقت)**
```ts
pushError('ORDER_NOT_FOUND', { displayModeOverride: 'MODAL' });
```

**الطريقة 2: تغيير الـ config بشكل دائم**
```ts
// في src/core/errors/error.config.ts
ORDER_NOT_FOUND: {
  code: 'ORDER_NOT_FOUND',
  displayMode: 'MODAL',    // ← كانت 'PAGE'
  ...
},
```

### Error Boundary

`src/core/errors/ErrorBoundary.tsx` هو React class component بيـcatch أخطاء JavaScript وقت الـ render. مستخدم في:
- أعلى `App.tsx` — بيـcatch أخطاء الـ providers
- لف `AdminLayout` و `UserLayout` في `AppRouter.tsx` — بيـreset تلقائياً عند تغيير الـ route

```tsx
<ErrorBoundary resetKey={location.pathname}>
  <AdminLayout />
</ErrorBoundary>
```

### Error Playground

`/admin/error-playground` هي صفحة أدوات للمطورين لاختبار كل أوضاع عرض الأخطاء بشكل تفاعلي. محمية بـ `errorPlayground` feature flag وقابلة للوصول فقط لمستخدمي `ADMIN` مع تفعيل الـ flag.

### ليه ده مهم في البرودكشن؟

الـ `displayModeOverride` قوي جداً: بيخلّيك تختار وضع العرض المناسب حسب السياق بدون ما تمس `error.config.ts`. مثلاً: نفس الخطأ `ORDER_NOT_FOUND` ممكن يتعرض كـ PAGE في صفحة الطلبات وكـ MODAL في dialog تفاصيل الطلب.

### ممكن يحصل ايه لو شلنا الجزء ده؟

لو كل component عمل error handling بنفسه، هيكون فيه عشرات من `try/catch` blocks متكررة، وتجربة مستخدم متفرقة — خطأ ما بيبان في modal وخطأ تاني بيبان في toast وخطأ تالت بيبان في رسالة inline.

---

## 14. بوابة تهيئة التطبيق

**الملفات:** `src/core/init/AppInitializer.tsx`، `src/core/init/init.service.ts`، `src/core/init/init.store.ts`

### ايه اللي بيعمله؟

بيمنع الـ router من الـ mount لحد ما حزمتين يتجلبوا بشكل متوازي:

1. **حزمة الترجمة** — نصوص الترجمة للغة المحفوظة للمستخدم
2. **حزمة ضبط الأخطاء** — إعداد عرض الأخطاء القابل للتغيير من السيرفر

### تدفق التهيئة

```
1. اقرأ اللغة المحفوظة من localStorage
2. جيب حزمة الترجمة  ─┐ متوازي (Promise.all)
3. جيب ضبط الأخطاء  ──┘
4. خزّن كليهما في useInitStore
5. setReady() → AppRouter يتـmount
```

### الضمانات

- الـ router **لا يتـmount** لحد ما `isReady` يكون `true`
- كل الـ API calls على مستوى الصفحة ممنوعة بشكل طبيعي لحد ما الـ router موجود
- فشل الـ fetch دايماً بيرجع للـ TypeScript bundles الثابتة — التطبيق دايماً بيشتغل

### حالة التحميل

أثناء التهيئة، `AppInitializer` بيـrender `<InitSkeleton />` — skeleton fullscreen متحرك بيتناسب مع هيكل layout التطبيق.

### تبديل اللغة بعد التهيئة

لما المستخدم يغيّر اللغة عبر `setLang()`، `i18n.context.tsx` بيستدعي `fetchLocaleBundle(newLang)` وبيحدّث الـ store. مفيش حاجة لـ page reload.

### ليه ده مهم في البرودكشن؟

تخيل إن صفحة تتفتح قبل ما الترجمات تتحمّل — كل النصوص هتبان كـ keys زي `nav.home` بدل "الرئيسية". الـ AppInitializer بيمنع ده تماماً.

### ممكن يحصل ايه لو شلنا الجزء ده؟

كل صفحة هتحتاج تتحقق بنفسها إن الترجمات جاهزة — كود متكرر ومعرّض للخطأ.

---

## 15. خدمة محتوى الـ CMS

**الملف:** `src/core/init/init.service.ts`

بتتحكم فيها `VITE_CONTENT_SOURCE`:

| القيمة | نمط الـ URL | علامة في الـ Network tab |
|---|---|---|
| `local` | `/content/default-*` | `default-ar` |
| `backend` | `/content/be-default-*` | `be-default-ar` |

الاختلاف ده ظاهر في Network tab للمتصفح — الـ prefix `be-` هي العلامة التشخيصية إن الـ backend mode شغّال.

### Fetch مع Timeout و Fallback

الخدمة بتستخدم timeout مدته 5 ثواني لكل fetch وبترجع للـ bundle الثابت بصمت عند أي فشل:

```
Network fetch (5s timeout)
  → 200 OK → parse JSON → خزّن في useInitStore
  → HTTP error / timeout / network error → استخدم الـ static fallback
```

الـ JSON response ممكن يكون raw object أو FreeAPI envelope `{ data: {...} }` — كلاهما معالج.

### تقديم الـ Mock Bundles

`json-server` بيـserve ملفات الترجمة TypeScript كـ JSON لما Vite يعمل proxy لـ `/content/*`. الـ mock server بيحوّل الـ TypeScript exports لـ JSON fixtures تلقائياً.

### ليه ده مهم في البرودكشن؟

بيخلّيك تغيّر نصوص التطبيق (أي نص بيراه المستخدم) من الـ backend بدون أي deploy جديد. مفيد جداً للعروض والمناسبات.

---

## 16. Feature Flags

الـ Feature Flags بتمكّن من طرح ميزات تدريجية لكل مستخدم بدون deploy كود جديد.

### التخزين

الـ flags محفوظة كـ `Record<string, boolean>` في:
- `useAuthStore.featureFlags` (Zustand state في الذاكرة)
- `localStorage` تحت `auth-feature-flags` (بيبقى بعد refresh)

### دورة الحياة

1. المستخدم بيسجّل الدخول
2. الـ backend بيرجع flags مخصصة للمستخدم (أو API call منفصل `/feature-flags`)
3. بيتُستدعى `setFeatureFlags(flags)`
4. `FeatureGuard`، `WhitelistGuard`، و `DeepLinkGuard` بيقروا الـ flags من الـ store
5. `logout()` بيمسح الـ flags ويرجّعها للإعدادات الافتراضية

### الـ Flags الافتراضية (بيئة التطوير)

```ts
// في auth.store.ts — defaultFeatureFlags() في DEV mode:
{
  errorPlayground: true,   // بيفعّل /admin/error-playground
  betaReports: false,
  analyticsV2: false,
  newCheckout: false,
}
```

في الإنتاج، كل الـ flags الافتراضية هي `{}` (فارغة) — الميزات معطّلة إلا لو الـ backend منحها.

### استخدام الـ Feature Flags في Components

```tsx
const { featureFlags } = useAuthStore();

if (featureFlags.analyticsV2) {
  return <NewAnalyticsDashboard />;
}
```

### حماية المسارات بالـ Feature Flags

```tsx
// في AppRouter.tsx — فقط المستخدمين بـ errorPlayground flag يقدروا يوصلوا للـ route ده:
<Route element={<FeatureGuard featureFlag="errorPlayground" />}>
  <Route path="/admin/error-playground" element={<Page component={ErrorPlaygroundPage} />} />
</Route>
```

### ليه ده مهم في البرودكشن؟

بيخلّيك تطلق ميزة لـ 10% من المستخدمين الأول وتجمع feedback قبل ما تطلقها للكل. لو فيه مشكلة، بتوقف الـ flag من الـ backend وبتحل المشكلة بدون rollback.

---

## 17. الـ Layouts

### `AuthLayout` — `src/layouts/AuthLayout.tsx`

Layout بطاقة مركزية لصفحات تسجيل الدخول والتسجيل. مفيش navigation. Full-viewport، متمركز أفقياً ورأسياً.

### `UserLayout` — `src/layouts/UserLayout.tsx`

Shell واجهة المتجر. الهيكل:

```
┌─────────────────────────────────────────────────────────┐
│  Logo  Home  Products  Orders  Profile  🤍(n)  🛒(n)  👤 │  ← Header Desktop
│  Logo                                  🤍(n)  🛒(n)   ☰  │  ← Header Mobile
├─────────────────────────────────────────────────────────┤
│                  <Outlet /> — محتوى الصفحة              │
├─────────────────────────────────────────────────────────┤
│          © 2025 ShopHub. All rights reserved.            │  ← Footer
└─────────────────────────────────────────────────────────┘
```

**Desktop:** روابط nav أفقية + toggle الثيم + toggle اللغة + avatar المستخدم + زر الخروج.

**Mobile:** Logo + badge قائمة الأمنيات + badge السلة + hamburger. الضغط على الـ hamburger بيـslide درج بالارتفاع الكامل (RTL-aware بـ `start-0`) يحتوي على كل الروابط، toggle الثيم، toggle اللغة، معلومات المستخدم، وتسجيل الخروج.

الـ Footer ثابت في أسفل الـ viewport في الصفحات القصيرة بـ `min-h-screen flex flex-col` مع `flex-1` على الـ main.

#### تدفق تسجيل الخروج (مع حفظ السلة)

`handleLogout` هو async. قبل استدعاء `logout()`، بيدفع محتويات سلة Zustand الحالية للسيرفر لضمان بقاء العناصر:

```ts
const handleLogout = useCallback(async () => {
  // حفظ السلة الحالية على السيرفر عشان تبقى عبر الجلسات
  const items = useCartStore.getState().items;
  if (items.length > 0) {
    await Promise.allSettled(
      items.map(({ product, quantity }) =>
        addToServerCart(product._id, quantity)
      )
    );
  }
  logout();                               // بيمسح Zustand + كوكي + localStorage
  navigate('/login', { replace: true });
}, [logout, navigate]);
```

ده بيضمن: المستخدم A بيسجل دخول → بيضيف عناصر → بيسجّل خروج → العناصر على السيرفر → المستخدم A يسجّل دخول تاني → `useCartMerge` بيعيد تحميلها تلقائياً.

### `AdminLayout` — `src/layouts/AdminLayout.tsx`

Shell لوحة التحكم. الهيكل:

```
┌──────────────────────────────────────────────────────┐
│  Logo  ShopHub Admin                           [user] │  ← Top bar
├──────────────────────────────────────────────────────┤
│ Sidebar  │                                           │
│ Dashboard│           <Outlet />                      │
│ Products │           (محتوى الصفحة)                 │
│ Categories│                                          │
│ Orders   │                                           │
│          │                                           │
└──────────────────────────────────────────────────────┘
```

الـ Sidebar فيها كل روابط تنقل الـ admin. النسخة المحمولة بتطوي لـ hamburger مع درج slide-in.

### ليه ده مهم في البرودكشن؟

`Promise.allSettled` بدل `Promise.all` في حفظ السلة ده قرار مدروس: لو item واحد فشل في الحفظ (مثلاً المنتج انتهى من المخزن)، الـ logout بيكمل بشكل طبيعي وباقي العناصر بتتحفظ. `Promise.all` كانت ستوقف الـ logout بالكامل لو أي item فشل.

---

## 18. صفحات لوحة التحكم (Admin)

كل الـ admin routes محمية بـ `ProtectedRoute → WhitelistGuard → RoleGuard(ADMIN|MANAGER)`.

### Dashboard — `/admin/dashboard`

**الملف:** `src/pages/admin/DashboardPage.tsx`

مقاييس نظرة عامة (إجمالي المنتجات، الفئات، الطلبات، الإيرادات) معروضة كـ stat cards. أزرار quick-action بتوصّل للأقسام الرئيسية في الـ admin. كل النصوص مترجمة بالكامل عبر `useI18n()`.

### قائمة المنتجات — `/admin/products`

**الملف:** `src/pages/admin/ProductsListPage.tsx`

جدول منتجات مع pagination:
- بحث (debounced، client-side)
- dropdown فلتر الفئة
- ترتيب بالاسم/السعر/المخزون (تصاعدي/تنازلي)
- badges حالة المخزون (في المخزون، مخزون منخفض، نفد المخزون)
- actions مدمجة: تعديل، حذف (مع modal تأكيد)
- Pagination بعرض `X–Y of Z` مع interpolation مترجم

### إنشاء منتج — `/admin/products/create`

**الملف:** `src/pages/admin/CreateProductPage.tsx`

فورم لإنشاء منتج جديد. بيتحقق بـ Zod schema (`src/schemas/product.schema.ts`). الحقول: الاسم، الوصف، الفئة، السعر، المخزون، URL الصورة.

### تعديل منتج — `/admin/products/:id/edit`

**الملف:** `src/pages/admin/EditProductPage.tsx`

فورم تعديل مع قيم مسبقة. بيحمّل المنتج بالـ ID من الـ API، وبيملأ الحقول مسبقاً.

### الفئات — `/admin/categories`

**الملف:** `src/pages/admin/CategoriesPage.tsx`

جدول الفئات مع فورم إنشاء مدمج وmodal تأكيد الحذف. الـ delete modal بيحذّر إن المنتجات في الفئة ستفقد تصنيفها. مقيدة بدور `ADMIN` (MANAGER لا يستطيع الوصول).

### الطلبات — `/admin/orders`

**الملف:** `src/pages/admin/AdminOrdersPage.tsx`

جدول إدارة الطلبات:
- فلتر الحالة (الكل / قيد الانتظار / تم التسليم / ملغي)
- badges الحالة مع تسميات مترجمة
- modal تفاصيل الطلب مع تفاصيل المنتجات، الإجمالي الجزئي، وحالة الدفع
- Pagination

تسميات badge الحالة بتستخدم `labelKey` references في الترجمة، مترجمة وقت الـ render:
```ts
PENDING:   { labelKey: 'admin.orders.status.pending', ... }
DELIVERED: { labelKey: 'admin.orders.status.delivered', ... }
CANCELLED: { labelKey: 'admin.orders.status.cancelled', ... }
```

#### Null-safety على البيانات المالية للطلبات

كل استدعاءات `.toFixed()` للمبالغ محمية من `undefined` بـ `?? 0`:

```ts
(order.discountedOrderPrice ?? order.orderPrice ?? 0).toFixed(2)  // الإجمالي المعروض
(order.orderPrice ?? 0).toFixed(2)                                 // الإجمالي الجزئي
(item.product?.price ?? 0).toFixed(2)                             // سعر العنصر
```

حقول العميل بتستخدم optional chaining + fallbacks:
```ts
order.customer?.username ?? '—'
order.customer?.email ?? ''
```

هذه الـ guards بتحمي من كلٍّ من بيانات seed القديمة (حقول مفقودة) وردود الـ mock server قبل تشغيل `normalizeOrder()`.

### Error Playground — `/admin/error-playground`

**الملف:** `src/pages/admin/ErrorPlaygroundPage.tsx`

صفحة أدوات للمطورين لاختبار كل أوضاع عرض الأخطاء. البوابة: دور `ADMIN` + `errorPlayground` feature flag. تسمح بإطلاق سيناريوهات أخطاء PAGE, MODAL, TOAST, و INLINE.

### قواعد الـ Whitelist

```ts
// src/config/whitelist.config.ts
'/admin/error-playground': { allowedRoles: ['ADMIN'], requiredFeatureFlags: ['errorPlayground'] },
'/admin/dashboard':        { allowedRoles: ['ADMIN', 'MANAGER'] },
'/admin/products':         { allowedRoles: ['ADMIN', 'MANAGER'], matchPrefix: true },
'/admin/categories':       { allowedRoles: ['ADMIN'] },
'/admin/orders':           { allowedRoles: ['ADMIN', 'MANAGER'] },
```

### ليه ده مهم في البرودكشن؟

الـ null guards على البيانات المالية مهمة جداً — بيانات legacy أو responses غير مكتملة من الـ API ممكن تعمل crash في الصفحة لو مفيش guards. الـ `.toFixed()` بترمي error لو الـ value هي `undefined`.

---

## 19. صفحات واجهة المستخدم (Storefront)

### الرئيسية — `/`

**الملف:** `src/pages/user/HomePage.tsx`

Hero section، منتجات مميزة، أبرز الفئات. عامة (لا تتطلب مصادقة).

### المنتجات — `/products`

**الملف:** `src/pages/user/ProductsPage.tsx`

كتالوج منتجات مع بحث، فلتر فئة، وترتيب. Grid مع pagination. عامة.

### تفاصيل المنتج — `/products/:slugId`

**الملف:** `src/pages/user/ProductDetailPage.tsx`

تفاصيل المنتج الكاملة مع صورة، وصف، سعر، وأزرار إضافة للسلة / قائمة الأمنيات. عامة.

### السلة — `/cart`

**الملف:** `src/pages/user/CartPage.tsx`

محتويات السلة مع أدوات التحكم في الكمية، إزالة العناصر، الإجمالي الجزئي، وزر الانتقال للدفع. عامة (حالة السلة في Zustand محلي).

### قائمة الأمنيات — `/wishlist`

**الملف:** `src/pages/user/WishlistPage.tsx`

عناصر قائمة الأمنيات مع أزرار الإضافة للسلة والإزالة. بتتزامن مع الـ backend لما المستخدم يسجّل دخوله عبر `useWishlistSync` hook.

### الدفع — `/checkout` _(محمية)_

**الملف:** `src/pages/user/CheckoutPage.tsx`

فورم دفع متعدد الحقول بالتحقق عبر Zod (`src/schemas/checkout.schema.ts`). يجمع عنوان الشحن وطريقة الدفع. يرسل الطلب لـ API. يحاكي الدفع على الـ mock backend.

### الطلبات — `/orders` _(محمية)_

**الملف:** `src/pages/user/OrdersPage.tsx`

سجل طلبات المستخدم. يدعم كلاً من عرض القائمة (`/orders`) والعرض التفصيلي (`/orders/:id`). العرض التفصيلي محمي بـ `DeepLinkGuard` لمنع تخمين الـ URL.

### الملف الشخصي — `/profile` _(محمية)_

**الملف:** `src/pages/user/ProfilePage.tsx`

عرض وتعديل معلومات حساب المستخدم.

---

## 20. المكونات المشتركة

### `GlobalLoader` — `src/components/common/GlobalLoader.tsx`

Spinner overlay fullscreen مدار بـ `useUiStore.activeApiRequestsCount`. متحمّل فوق الـ router (z-9999). بيظهر تلقائياً لكل Axios request لا يـopt-out بـ `showGlobalLoader: false`.

### `InitSkeleton` — `src/components/ui/InitSkeleton.tsx`

Skeleton fullscreen متحرك يظهر بينما `AppInitializer` ينتظر حزمتي الترجمة وضبط الأخطاء. يتناسب مع هيكل layout التطبيق لتقليل الـ perceived layout shift.

### `DeleteModal` — `src/components/admin/DeleteModal.tsx`

Modal تأكيد قابل لإعادة الاستخدام لعمليات الحذف في صفحات الـ admin. يقبل props: `title`، `message`، `onConfirm`، `onCancel`، و `isDeleting`.

### `FormInputControl` — `src/components/form/input/FormInputControl.tsx`

Component input متصل بـ `react-hook-form`. يـrender label، حقل input، ورسالة خطأ validation. يقبل `UseFormRegisterReturn` الكامل من RHF.

### `ErrorBoundary` — `src/core/errors/ErrorBoundary.tsx`

React class component error boundary. يقبل prop `resetKey` للـ reset عند تغيير الـ route.

### `GlobalErrorRenderer` — `src/core/errors/GlobalErrorRenderer.tsx`

بيـsubscribe لـ `useErrorStore` وبيـrender:
- `pageError` → PAGE overlay fullscreen (z-9990)
- `modalError` → dialog overlay (z-9995)
- `toastQueue` → stack toasts أسفل اليمين (z-9999)، بتختفي تلقائياً حسب `duration`
- INLINE errors مش بتتـrender هنا — بتُستهلك مباشرة بالـ components

---

## 21. التحقق من المدخلات (Form Validation)

كل الفورمز بتستخدم `react-hook-form` + `zod` عبر `@hookform/resolvers`.

### النمط

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/schemas/login.schema';

const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

### الـ Schemas

| الملف | الفورم |
|---|---|
| `src/schemas/login.schema.ts` | فورم تسجيل الدخول (email, password) |
| `src/schemas/register.schema.ts` | فورم التسجيل (username, email, password, confirm) |
| `src/schemas/checkout.schema.ts` | فورم الدفع (address, payment) |
| `src/schemas/product.schema.ts` | فورم Admin لإنشاء/تعديل منتج |

### أخطاء التحقق

أخطاء Zod بتظهر عبر `formState.errors` وبتتـrender بـ `FormInputControl` داخل كل حقل. نظام الأخطاء العالمي **لا يُستخدم** لـ form validation — ردود الـ API 400/422 معالجة بواسطة form components مباشرة.

### ليه Zod بدل Yup؟

- Zod بيـinfer الـ TypeScript types من الـ schema تلقائياً — مش محتاج تكتب النوع وتكتب الـ schema بشكل منفصل
- Zod strict mode أفضل في اكتشاف الـ edge cases
- Zod v4 أسرع بكثير في الـ parse performance

---

## 22. الـ Mock Server

**الملف:** `mock-server/server.cjs`

الـ mock server بيستخدم `json-server` لمحاكاة الـ REST API. بيوفر:

- كل endpoints المنتجات، الفئات، الطلبات، المستخدمين، السلة، وقائمة الأمنيات
- Authentication endpoints (`/users/login`، `/users/refresh-token`، `/users/register`)
- Content bundle endpoints (`/content/default-en`، `/content/default-ar`، `/content/default-error`)

### تشغيل الـ Mock Server

```bash
npm run dev:mock
```

أو مع Vite:

```bash
npm run dev:all
```

### إعداد الـ Vite Proxy

`vite.config.ts` بيـforward الـ requests للـ mock server:

```ts
server: {
  proxy: {
    '/content': { target: 'http://localhost:3001', changeOrigin: true },
    // /api/v1 بس بيتـproxy لما VITE_API_SOURCE=mock:
    '/api/v1': { target: 'http://localhost:3001', changeOrigin: true },
  },
},
```

يعني الـ API calls من المتصفح بتبان كـ `/api/v1/...` في الـ Network tab — نفس الإنتاج — والـ mock server بيعترضها بشفافية.

### Endpoints السلة

الـ mock server بيـimplements تخزين سلة server-side لكل مستخدم مع populate كامل للمنتجات:

| الـ Method | الـ Path | الوصف |
|---|---|---|
| `GET` | `/api/v1/ecommerce/cart` | جيب سلة المستخدم المصادق عليه |
| `POST` | `/api/v1/ecommerce/cart/item/:productId` | أضف أو اضبط كمية العنصر (upsert مع stock clamping) |
| `PATCH` | `/api/v1/ecommerce/cart/item/:productId` | حدّث كمية عنصر موجود |
| `DELETE` | `/api/v1/ecommerce/cart/item/:productId` | أزيل عنصر واحد |
| `DELETE` | `/api/v1/ecommerce/cart` | امسح كل العناصر للمستخدم |

كل ردود السلة يبنيها `buildCartResponse(db, userId)` اللي بيـpopulate الـ product objects الكاملة وبيحسب `cartTotal` و `discountedTotal`.

### Endpoints قائمة الأمنيات

| الـ Method | الـ Path | الوصف |
|---|---|---|
| `GET` | `/api/v1/ecommerce/profile/wishlist` | جيب قائمة أمنيات المستخدم المصادق عليه |
| `POST` | `/api/v1/ecommerce/profile/wishlist/:productId` | Toggle عنصر (أضف لو مش موجود، أزيل لو موجود) |

كل ردود قائمة الأمنيات يبنيها `buildWishlistResponse(db, userId)` اللي بيرجع الـ shape المتوافق مع FreeAPI:
```json
{ "wishlistItems": [{ "_id": "...", "product": { "_id": "...", "name": "...", ... } }], "wishlistItemsCount": 2 }
```

### Normalization الطلبات

`normalizeOrder(order, db)` بيشتغل على كل طلب بيرجع من الـ mock server. بيعمل:

- يـmap الـ legacy `totalAmount` → `orderPrice` / `discountedOrderPrice` (بيحل مشكلة الـ `.toFixed()` crash في AdminOrdersPage)
- يـpopulate كائن `customer` (`{ _id, username, email, role }`) من `db.users`
- يـenrich كل عنصر في الطلب بالـ product object الكامل من `db.products`
- يضيف الحقول المفقودة (`coupon`، `paymentProvider`، `paymentId`، `isPaymentDone`، `updatedAt`) بقيم آمنة افتراضية

هذا الـ normalization يعني إن الـ frontend ممكن يستدعي `.toFixed()` على إجماليات الطلب بدون null guards — رغم إن الـ component بيضيفها احترازياً كإجراء وقاية مزدوج.

### ليه ده مهم في البرودكشن؟

الـ normalization في الـ mock server بيـsimulate ما يجب أن يعمله الـ backend الحقيقي. لما تربط بـ backend حقيقي، لو الـ normalization مش موجودة على السيرفر، الـ frontend سيكسر. ده بيدّيك warning مبكر.

---

## 23. البناء وتقسيم الـ Bundle

### البناء للإنتاج

```bash
npm run build
```

TypeScript بيـcompile الأول (`tsc -b`)، ثم Vite بيبني ويعمل tree-shake للـ output.

### تقسيم الـ Chunks اليدوي

`vite.config.ts` بيضبط Rollup manual chunks لتفصيل الحزم الكبيرة إلى ملفات قابلة للـ cache بشكل منفصل:

| الـ Chunk | المحتويات | فائدة الـ Cache |
|---|---|---|
| `vendor-firebase` | `firebase/*` | يتنزّل بس لما المستخدم يزور صفحة Login |
| `vendor-react` | `react`، `react-dom`، `react-router`، `scheduler` | مستقر جداً؛ lifetime cache طويل |
| `vendor-icons` | `lucide-react` | Tree-shaken لكل صفحة وقت الاستيراد |
| `vendor-utils` | `zustand`، `axios`، `zod`، `react-hook-form`، `js-cookie` | طبقة utilities مستقرة |
| `vendor` | كل شيء تاني من `node_modules` | |

### حد التحذير للـ Chunk Size

`chunkSizeWarningLimit: 600` (KB) بيكبت التحذيرات لـ icon vendor chunk اللي كبير ولكن بيتعمله tree-shake كثير وقت التشغيل.

### تأثير تقسيم الكود

كل صفحة هي `React.lazy()` — JavaScript كل صفحة بيتنزّل بس في أول زيارة. بالتزامن مع تقسيم vendor chunk، الـ initial load أصغر بحوالي 70% من build غير مقسّم.

### ليه ده مهم في البرودكشن؟

Firebase كبير جداً (~500KB). لو حطّيناه في الـ main bundle، كل مستخدم هيحمّله حتى لو مش هيستخدم social login. بتقسيمه في `vendor-firebase`، بيتحمّل بس لما المستخدم يزور صفحة Login.

### ممكن يحصل ايه لو شلنا الجزء ده؟

كل الـ vendor code هيتحط في bundle واحد كبير — وقت التحميل الأولي هيطول بشكل ملحوظ، خصوصاً على الشبكات البطيئة.

---

## 24. ثبات السلة ومزامنة قائمة الأمنيات

> ده من أكتر الأجزاء تعقيداً في التطبيق — بيدير سيناريوهات متعددة المستخدمين عبر الجلسات.

### دورة حياة السلة

| المرحلة | التخزين | الآلية |
|---|---|---|
| ضيف (غير مصادق) | `localStorage` | Zustand `persist` middleware |
| مصادق | السيرفر + Zustand | Login merge + `loadServerCart()` |
| بعد الـ Checkout | مسوحة | `clearCart()` + `clearServerCart()` |
| تسجيل الخروج | Zustand مسوح، السيرفر محفوظ | `logout()` بيمسح Zustand فقط؛ سلة السيرفر محفوظة للـ login التالي |

### Login Merge — `src/hooks/useCartMerge.ts`

بيتُستدعى fire-and-forget مباشرة بعد `setAuth(user, token)`:

```
1. getServerCart()                   ← دايماً اجلب، حتى لو مفيش عناصر ضيف
                                       (يحل مشكلة: المستخدمين الراجعين كانوا بيشوفوا سلة فاضية)
2. لو guestItems.length > 0:
   لكل guestItem:
     لو موجود على السيرفر → updateServerCartItem(sum, capped at stock)
     لو جديد              → addToServerCart(qty)
   clearCart()                        ← امسح سلة localStorage الضيف
   getServerCart()                    ← أعد تحميل الحالة المعتمدة بعد الـ merge
3. loadServerCart(serverItems)        ← اسكن Zustand من حقيقة السيرفر
```

**إصلاح مشكلة أساسية:** الـ implementation الأصلية كانت بترجع مبكراً لما `guestItems.length === 0`، مما يعني إن المستخدم الراجع المصادق لم يكن يحمّل سلة السيرفر أبداً. الإصلاح: دايماً تابع لخطوة التحميل بغض النظر عن عدد عناصر الضيف.

**حل تعارض السلتين:**

| السيناريو | الحل |
|---|---|
| نفس المنتج في السلتين | اجمع الكميات، حد أقصى `product.stock` |
| منتج في سلة الضيف فقط | أضفه للسيرفر بكمية الضيف |
| منتج في سلة السيرفر فقط | غير مُعدَّل (بيرجع في خطوة التحميل) |
| المنتج نفد من المخزون على السيرفر | `addToServerCart` بيفشل بصمت عبر `allSettled` |

### حفظ السلة عند الخروج — `src/layouts/UserLayout.tsx`

قبل استدعاء `logout()`، `handleLogout` بيدفع عناصر سلة Zustand الحالية للسيرفر بـ `Promise.allSettled()`. لو الحفظ فشل (خطأ شبكة)، العناصر ممكن تضيع — لكن المستخدم بادر بتسجيل الخروج، فده مقبول. ده بيضمن:

```
المستخدم A: يضيف عناصر → يسجّل خروج → العناصر محفوظة على السيرفر
المستخدم B: يسجّل دخول على نفس المتصفح → عنده سلته الخاصة، سلة A غير متأثرة
المستخدم A: يسجّل دخول مجدداً → useCartMerge يعيد تحميل سلة السيرفر
```

### مزامنة قائمة الأمنيات — `src/hooks/useWishlistSync.ts`

بيتُستدعى fire-and-forget مباشرة بعد `setAuth(user, token)`:

```
1. خذ snapshot لـ localIds من Zustand (قائمة أمنيات الضيف قبل المزامنة)
2. getWishlist()                     ← جيب قائمة الأمنيات الحالية من السيرفر
3. idsToAdd = localIds − serverIds   ← فرق: تجنب الـ double-toggle
4. Promise.allSettled(
     idsToAdd.map(id => toggleWishlistItem(id))
   )
5. setItemsFromServer([...serverIds, ...idsToAdd])
   ← استبدل الـ store المحلي بالقائمة الكاملة من السيرفر
```

**لماذا خطوة الـ diff حاسمة:** الـ FreeAPI wishlist endpoint هو **toggle** — استدعاؤه لمنتج موجود على السيرفر بالفعل سيـ*حذفه*. بدون الـ diff، مزامنة منتج موجود على السيرفر بالفعل ستحذفه بصمت.

**لماذا `setItemsFromServer` بدل `clearItems`:** استدعاء `clearItems()` الأصلي كان بيترك الـ store المحلي فارغاً بعد المزامنة، مما يجعل الـ badge في navbar يعرض 0 و `WishlistPage` يعرض الحالة الفارغة. `setItemsFromServer` بيستبدل الـ store المحلي بالـ IDs من السيرفر عشان الـ badge count وأيقونات القلب على بطاقات المنتجات تكون دقيقة فوراً.

### ليه ده مهم في البرودكشن؟

ده أكتر scenario معقد في أي تطبيق e-commerce: المستخدم بيضيف منتجات كضيف، ثم بيسجّل دخوله، وبتسأل نفسك "هتحصل ايه لعناصر السلة؟". بدون merge logic، إما الـ guest cart تتفضي أو تطغى على سلة السيرفر.

### ممكن يحصل ايه لو شلنا الجزء ده؟

- بدون المزامنة: سلة كل جلسة ضيف تضيع عند تسجيل الدخول
- بدون الـ diff في wishlist sync: منتجات موجودة على السيرفر ممكن تتحذف بصمت
- بدون cart persistence عند الخروج: سلة الجلسة تضيع لو المستخدم سجّل خروج من متصفح تاني

---

## 25. إرشادات التطوير

### إضافة صفحة جديدة

1. أنشئ الـ component في `src/pages/user/` أو `src/pages/admin/`
2. أضف `React.lazy()` import وإدخال `<Route>` في `src/routes/AppRouter.tsx`
3. لفّه بالـ guards المناسبة لو الصفحة محمية
4. أضف مفاتيح الترجمة لـ `default-en.ts` → `default-ar.ts` → `en.ts` → `ar.ts`

### إضافة Admin route جديد مع التحكم في الوصول

1. أضف الـ route لـ `AppRouter.tsx` داخل قسم الـ admin
2. أضف `WhitelistRule` لـ `src/config/whitelist.config.ts`:
   ```ts
   '/admin/reports': {
     allowedRoles: ['ADMIN'],
     requiredFeatureFlags: ['betaReports'],
   },
   ```
3. مش محتاج تعدّل في `WhitelistGuard.tsx` — بيقرأ الـ config تلقائياً

### إضافة Feature Flag جديد

1. أضف الـ flag لـ `defaultFeatureFlags()` في `auth.store.ts` (اضبطه `true` في DEV، `false` في prod)
2. استخدمه في component: `featureFlags.yourFlagName`
3. أو احمي route: `<FeatureGuard featureFlag="yourFlagName" />`
4. الـ backend بيوفر قيم لكل مستخدم عند تسجيل الدخول عبر `setFeatureFlags()`

### إضافة كود خطأ جديد

1. أضف الكود لـ `ErrorCode` union في `src/core/errors/error.types.ts`
2. أضف إدخال `ErrorConfig` مطابق في `src/core/errors/error.config.ts`
3. أضف مفاتيح i18n لـ `titleKey` و `descriptionKey` في كلا ملفي الترجمة
4. ادفع الخطأ من أي component أو interceptor عبر `pushError('YOUR_CODE')`

### إضافة مفتاح ترجمة جديد

1. أضف لـ `src/i18n/locales/default-en.ts` — TypeScript سيحدد المفاتيح المفقودة في الملفات الأخرى
2. أضف الترجمة العربية لـ `src/i18n/locales/default-ar.ts`
3. اعكس في `src/i18n/locales/en.ts` و `src/i18n/locales/ar.ts` (الحزم الثابتة)

### تسمية متغيرات البيئة

كل متغيرات البيئة المتاحة للـ client لازم تبدأ بـ `VITE_`. المتغيرات بدون هذا الـ prefix لا تُكشف للمتصفح أبداً. الأسرار الخاصة بالسيرفر (URLs قاعدة البيانات، مفاتيح التوقيع) يجب أن لا تحمل أبداً الـ prefix `VITE_`.

### تجنب الـ Circular Dependencies

- `auth.store.ts` يجب أن لا يستورد من `api/` أو `config/Define.ts`
- `api/base/axios.ts` بيستورد من `auth.store.ts` (عبر `getState()`) — هذا هو الـ one-way dependency المقصود
- لو utility محتاجة كلاً من auth state وAPI access، مرّرها كـ parameter بدل ما تستورد كليهما

### أفضل ممارسات i18n

- لا تـhardcode أي strings يراها المستخدم — دايماً استخدم `translate('key')`
- للـ strings ذات القيم الديناميكية، استخدم `.replace('{{placeholder}}', value)` بعد `translate()`
- استخدم أسماء keys وصفية: `admin.products.showing` مش `productsPage.str3`
- جمّع الـ keys حسب الصفحة/الميزة، مش حسب الـ component

### TypeScript Strict Mode

المشروع بيشتغل بـ `erasableSyntaxOnly: true` في tsconfig. ده يعني:
- استخدم `type` unions بدل `enum` (مثلاً `type ErrorCode = 'FOO' | 'BAR'`)
- استخدم `type` imports لما ممكن (`import type { Foo }`)

---

*آخر تحديث: 2026-03-19 — تم الإضافة: استراتيجية ثبات السلة، استراتيجية مزامنة قائمة الأمنيات، CRUD سلة/قائمة أمنيات/طلبات الـ Mock Server، توجيه Axios العالمي للـ 4xx، مسح سلة/قائمة أمنيات auth store عند الخروج، async logout الـ UserLayout، null-safety الـ AdminOrdersPage*
