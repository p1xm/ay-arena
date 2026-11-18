# إعداد AY Arena (مجاني بالكامل)
1. Firebase Console: أنشئ مشروعًا (خطة Spark) ← Authentication ← فعّل Email/Password ← Firestore Database.
2. في Firestore أنشئ مستندًا يدويًا: collection `config` ، document `invite` ، حقل `code` = `AY2009` (الرمز يبقى في الخادم فقط).
3. الصق محتوى firestore.rules في Firestore ← Rules ← Publish.
4. Authentication ← Settings ← Authorized domains: أضف `YOUR-USER.github.io`.
5. Cloudflare Workers (مجاني): أنشئ Worker والصق worker.js ، وأضف Secrets: `GEMINI_KEY` و `FB_KEY` (Web API Key). مفتاح Gemini مجاني من aistudio.google.com.
6. عدّل `cfg` و `WORKER` في أول سكربت داخل index.html.
7. ارفع الملفات إلى GitHub ← Settings ← Pages ← Deploy from branch.
