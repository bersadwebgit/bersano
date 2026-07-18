# 10 — SystemSetting keys

جدول `SystemSetting` کلید/مقدار پلتفرمی است (نه per-shop مگر استفاده‌های خاص).

## ماتریس (66)
| Key | Secret | Scope | Status |
|-----|--------|-------|--------|
| `ai_embedding_api_key` | secret | platform-wide | referenced-in-code |
| `ai_embedding_base_url` | non-secret | platform-wide | referenced-in-code |
| `ai_enabled` | non-secret | platform-wide | referenced-in-code |
| `ai_gateway_enabled` | non-secret | platform-wide | referenced-in-code |
| `ai_gateway_last_checked_at` | non-secret | platform-wide | referenced-in-code |
| `ai_gateway_last_status` | non-secret | platform-wide | referenced-in-code |
| `ai_model_chat` | non-secret | platform-wide | referenced-in-code |
| `ai_model_complex` | non-secret | platform-wide | referenced-in-code |
| `ai_model_content` | non-secret | platform-wide | referenced-in-code |
| `ai_model_embedding` | non-secret | platform-wide | referenced-in-code |
| `ai_model_fallback` | non-secret | platform-wide | referenced-in-code |
| `ai_model_router` | non-secret | platform-wide | referenced-in-code |
| `ai_model_simple` | non-secret | platform-wide | referenced-in-code |
| `ai_model_wholesale` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_article_prompt` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_faq_prompt` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_base` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_brand` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_category` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_description` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_features` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_fulldesc` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_price` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_specs` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_type` | non-secret | platform-wide | referenced-in-code |
| `ai_seo_prompt_variants` | non-secret | platform-wide | referenced-in-code |
| `blog_ai_auto_continue` | non-secret | platform-wide | referenced-in-code |
| `blog_ai_chunk_size` | non-secret | platform-wide | referenced-in-code |
| `blog_ai_max_chunks` | non-secret | platform-wide | referenced-in-code |
| `blog_ai_overlap_tokens` | secret | platform-wide | referenced-in-code |
| `blog_comments` | non-secret | platform-wide | referenced-in-code |
| `blog_comments_control` | non-secret | platform-wide | referenced-in-code |
| `blog_posts` | non-secret | platform-wide | referenced-in-code |
| `central_bale_bot_api_key` | secret | platform-wide | referenced-in-code |
| `central_bale_bot_token` | secret | platform-wide | referenced-in-code |
| `central_telegram_bot_api_key` | secret | platform-wide | referenced-in-code |
| `central_telegram_bot_token` | secret | platform-wide | referenced-in-code |
| `global_melipayamak_password` | secret | platform-wide | referenced-in-code |
| `global_melipayamak_pattern_code` | non-secret | platform-wide | referenced-in-code |
| `global_melipayamak_username` | non-secret | platform-wide | referenced-in-code |
| `openrouter_api_key` | secret | platform-wide | referenced-in-code |
| `openrouter_blog_model` | non-secret | platform-wide | referenced-in-code |
| `openrouter_control_model` | non-secret | platform-wide | referenced-in-code |
| `openrouter_model` | non-secret | platform-wide | referenced-in-code |
| `pexels_api_key` | secret | platform-wide | referenced-in-code |
| `platform_blog_faq_model` | non-secret | platform-wide | referenced-in-code |
| `platform_blog_geo_model` | non-secret | platform-wide | referenced-in-code |
| `platform_blog_idea_model` | non-secret | platform-wide | referenced-in-code |
| `platform_blog_outline_model` | non-secret | platform-wide | referenced-in-code |
| `platform_blog_rewrite_model` | non-secret | platform-wide | referenced-in-code |
| `platform_blog_section_model` | non-secret | platform-wide | referenced-in-code |
| `platform_blog_seo_model` | non-secret | platform-wide | referenced-in-code |
| `poof_api_key` | secret | platform-wide | referenced-in-code |
| `saas_comparisons` | non-secret | platform-wide | referenced-in-code |
| `saas_demos` | non-secret | platform-wide | referenced-in-code |
| `saas_faqs` | non-secret | platform-wide | referenced-in-code |
| `saas_features` | non-secret | platform-wide | referenced-in-code |
| `saas_hero_subtitle` | non-secret | platform-wide | referenced-in-code |
| `saas_hero_title` | non-secret | platform-wide | referenced-in-code |
| `saas_meta_desc` | non-secret | platform-wide | referenced-in-code |
| `saas_meta_title` | non-secret | platform-wide | referenced-in-code |
| `saas_platform` | non-secret | platform-wide | referenced-in-code |
| `saas_pricing` | non-secret | platform-wide | referenced-in-code |
| `saas_primary_cta` | non-secret | platform-wide | referenced-in-code |
| `saas_prompts` | non-secret | platform-wide | referenced-in-code |
| `saas_secondary_cta` | non-secret | platform-wide | referenced-in-code |

فایل: [SETTING-MATRIX.csv](./SETTING-MATRIX.csv)

## گروه‌ها
- **AI models/gateway:** `ai_model_*`, `ai_enabled`, `ai_gateway_*`, `ai_embedding_*`, `openrouter_*`
- **CMS SaaS:** `saas_*`
- **SMS:** `global_melipayamak_*` (رمزنگاری‌شده با SMS_ENCRYPTION_KEY)
- **Messaging:** `central_bale_*`, `central_telegram_*`
- **Media:** `pexels_api_key`, `poof_api_key`
- **Blog AI:** `blog_ai_*`, `platform_blog_*_model`, `ai_seo_*`

UI نوشتن اصلی: `src/app/api/super-admin/settings/route.ts` + `src/app/super-admin/page.tsx`
Cache invalidate: `invalidateModelCache`, `invalidateAiProviderConfigCache`

Evidence: `src/app/api/super-admin/settings/route.ts:397-521`
