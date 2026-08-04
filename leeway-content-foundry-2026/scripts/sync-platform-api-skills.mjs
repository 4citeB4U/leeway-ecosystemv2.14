#!/usr/bin/env node
/**
 * sync-platform-api-skills.mjs
 * Beast AI — Autonomous Content Foundry
 * Generates public/platform-api-skills.json
 * Grounded in official platform API documentation for each supported platform.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '../public/platform-api-skills.json');

/**
 * Platform API skills — each entry is grounded in the official documentation
 * for that platform's content publishing / posting API.
 */
const PLATFORM_SKILLS = [
  {
    key: 'youtube',
    displayName: 'YouTube',
    officialDocUrl: 'https://developers.google.com/youtube/v3/docs/videos/insert',
    auth: {
      method: 'OAuth2',
      scopes: ['https://www.googleapis.com/auth/youtube.upload'],
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    },
    endpoints: {
      upload: {
        method: 'POST',
        url: 'https://www.googleapis.com/upload/youtube/v3/videos',
        params: 'part=snippet,status',
        contentType: 'multipart/related',
        notes: 'Resumable upload supported for files >5MB via X-Upload-Content-Type header',
      },
      schedulePublish: {
        method: 'PUT',
        url: 'https://www.googleapis.com/youtube/v3/videos?part=status',
        notes: 'Set status.publishAt (ISO 8601) with privacyStatus=private to schedule',
      },
    },
    mediaTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/webm'],
    maxFileSizeMB: 256000,
    rateLimits: { quotaUnitsPerDay: 10000, uploadCost: 1600 },
    supportsScheduling: true,
    requiredFields: ['title', 'description', 'categoryId', 'privacyStatus'],
    agentSkill: `
## YouTube Upload Skill
POST to https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
Auth: Bearer {access_token} (OAuth2 youtube.upload scope)
Body: multipart/related — metadata JSON + video binary
Schedule: include status.publishAt = "2025-01-01T00:00:00Z" and privacyStatus = "private"
`,
  },
  {
    key: 'tiktok',
    displayName: 'TikTok',
    officialDocUrl: 'https://developers.tiktok.com/doc/content-posting-api-reference-direct-post',
    auth: {
      method: 'OAuth2',
      scopes: ['video.upload', 'video.publish'],
      tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
    },
    endpoints: {
      initUpload: {
        method: 'POST',
        url: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
        notes: 'Returns upload_url and publish_id for file or pull-based upload',
      },
      publishStatus: {
        method: 'POST',
        url: 'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        notes: 'Poll with publish_id to check processing status',
      },
    },
    mediaTypes: ['video/mp4', 'video/webm'],
    maxFileSizeMB: 4096,
    rateLimits: { requestsPerDay: 1000 },
    supportsScheduling: true,
    requiredFields: ['title', 'privacy_level', 'video_cover_timestamp_ms'],
    agentSkill: `
## TikTok Direct Post Skill
1. POST /v2/post/publish/video/init/ — get upload_url
2. PUT upload_url — binary upload with Content-Type: video/mp4
3. POST /v2/post/publish/status/fetch/ with publish_id — poll until PUBLISH_COMPLETE
Auth: Authorization: Bearer {access_token} (video.upload + video.publish scopes)
Schedule: post_info.scheduled_publish_time = epoch seconds
`,
  },
  {
    key: 'instagram',
    displayName: 'Instagram',
    officialDocUrl: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing',
    auth: {
      method: 'OAuth2',
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
      tokenEndpoint: 'https://graph.facebook.com/oauth/access_token',
    },
    endpoints: {
      createContainer: {
        method: 'POST',
        url: 'https://graph.instagram.com/v21.0/{ig-user-id}/media',
        notes: 'image_url or video_url (hosted URL), caption, media_type (IMAGE/VIDEO/REELS)',
      },
      publishContainer: {
        method: 'POST',
        url: 'https://graph.instagram.com/v21.0/{ig-user-id}/media_publish',
        notes: 'creation_id from createContainer step',
      },
    },
    mediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    maxFileSizeMB: 1024,
    rateLimits: { publishPerUser24h: 50 },
    supportsScheduling: false,
    requiredFields: ['image_url or video_url', 'media_type', 'caption'],
    agentSkill: `
## Instagram Content Publish Skill
Step 1: POST /{ig-user-id}/media — {image_url, caption, media_type}
Step 2: POST /{ig-user-id}/media_publish — {creation_id}
Auth: access_token via Instagram Graph API (instagram_content_publish scope)
Note: Media must be hosted at a public URL before container creation
`,
  },
  {
    key: 'twitter',
    displayName: 'X (Twitter)',
    officialDocUrl: 'https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets',
    auth: {
      method: 'OAuth2 / OAuth1.0a',
      scopes: ['tweet.write', 'media.write', 'users.read'],
      tokenEndpoint: 'https://api.x.com/2/oauth2/token',
    },
    endpoints: {
      uploadMedia: {
        method: 'POST',
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        notes: 'chunked upload for video; INIT → APPEND → FINALIZE',
      },
      createTweet: {
        method: 'POST',
        url: 'https://api.x.com/2/tweets',
        notes: 'JSON body: { text, media: { media_ids } }',
      },
    },
    mediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    maxFileSizeMB: 512,
    rateLimits: { tweetsPerDay: 2400, mediaUploadMBPerMonth: 5000 },
    supportsScheduling: false,
    requiredFields: ['text'],
    agentSkill: `
## X (Twitter) Tweet Skill
Media Upload (chunked): POST /1.1/media/upload.json — INIT → APPEND → FINALIZE → get media_id
Post Tweet: POST /2/tweets — { text: "...", media: { media_ids: [media_id] } }
Auth: Bearer {access_token} (OAuth2, tweet.write + media.write)
`,
  },
  {
    key: 'linkedin',
    displayName: 'LinkedIn',
    officialDocUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api',
    auth: {
      method: 'OAuth2',
      scopes: ['w_member_social', 'r_liteprofile'],
      tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    endpoints: {
      registerUpload: {
        method: 'POST',
        url: 'https://api.linkedin.com/v2/assets?action=registerUpload',
        notes: 'serviceRelationships, recipes (e.g. urn:li:digitalmediaRecipe:feedshare-image)',
      },
      createPost: {
        method: 'POST',
        url: 'https://api.linkedin.com/v2/ugcPosts',
        notes: 'author = urn:li:person:{id}, lifecycleState = PUBLISHED',
      },
    },
    mediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    maxFileSizeMB: 5120,
    rateLimits: { requestsPerDay: 100000 },
    supportsScheduling: false,
    requiredFields: ['author', 'commentary', 'visibility'],
    agentSkill: `
## LinkedIn Post Skill
1. POST /v2/assets?action=registerUpload — register media asset, get uploadUrl + asset URN
2. PUT uploadUrl — binary upload
3. POST /v2/ugcPosts — { author, lifecycleState: PUBLISHED, specificContent: feedShare... }
Auth: Bearer {access_token} (w_member_social scope)
`,
  },
  {
    key: 'facebook',
    displayName: 'Facebook',
    officialDocUrl: 'https://developers.facebook.com/docs/pages/publishing/',
    auth: {
      method: 'OAuth2',
      scopes: ['pages_manage_posts', 'pages_read_engagement'],
      tokenEndpoint: 'https://graph.facebook.com/oauth/access_token',
    },
    endpoints: {
      createPost: {
        method: 'POST',
        url: 'https://graph.facebook.com/v21.0/{page-id}/feed',
        notes: 'message, link, published (bool), scheduled_publish_time (epoch)',
      },
      uploadVideo: {
        method: 'POST',
        url: 'https://graph-video.facebook.com/v21.0/{page-id}/videos',
        notes: 'title, description, source (binary)',
      },
    },
    mediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    maxFileSizeMB: 10240,
    rateLimits: { postsPerHour: 200 },
    supportsScheduling: true,
    requiredFields: ['message'],
    agentSkill: `
## Facebook Page Post Skill
Post: POST /{page-id}/feed — { message, published: true } — access_token = page token
Schedule: published: false, scheduled_publish_time: epoch timestamp (min 10min, max 30 days)
Video: POST /{page-id}/videos (graph-video.facebook.com) — multipart/form-data, source=binary
Auth: Page Access Token (pages_manage_posts)
`,
  },
  {
    key: 'substack',
    displayName: 'Substack',
    officialDocUrl: 'https://substack.com/api/v1/posts',
    auth: {
      method: 'Cookie/Session (substack-sid)',
      notes: 'No official public OAuth. Use session cookie or substack.com email + password login flow.',
    },
    endpoints: {
      draftPost: {
        method: 'POST',
        url: 'https://{publication}.substack.com/api/v1/drafts',
        notes: 'JSON: { draft_title, draft_body (HTML), draft_subtitle, type: "newsletter" }',
      },
      publishDraft: {
        method: 'POST',
        url: 'https://{publication}.substack.com/api/v1/posts/{id}/confirm',
        notes: 'Moves draft to published state',
      },
    },
    mediaTypes: ['text/html', 'image/jpeg', 'image/png'],
    supportsScheduling: true,
    requiredFields: ['draft_title', 'draft_body'],
    agentSkill: `
## Substack Publish Skill
1. POST /{pub}.substack.com/api/v1/drafts — { draft_title, draft_body (HTML), type: newsletter }
2. POST /{pub}.substack.com/api/v1/posts/{id}/confirm — publish the draft
Auth: Cookie: substack-sid={session_token} (obtained via login)
Schedule: Include send_at ISO timestamp in draft payload
`,
  },
  {
    key: 'wordpress',
    displayName: 'WordPress',
    officialDocUrl: 'https://developer.wordpress.org/rest-api/reference/posts/',
    auth: {
      method: 'Application Password / JWT',
      notes: 'WordPress Application Passwords (WP 5.6+). Authorization: Basic base64(user:apppassword)',
    },
    endpoints: {
      createPost: {
        method: 'POST',
        url: 'https://{site}/wp-json/wp/v2/posts',
        notes: 'JSON: { title, content, status (draft|publish|future), date (ISO 8601) }',
      },
      uploadMedia: {
        method: 'POST',
        url: 'https://{site}/wp-json/wp/v2/media',
        notes: 'Content-Type: image/jpeg, Content-Disposition: attachment; filename=...',
      },
    },
    mediaTypes: ['text/html', 'image/jpeg', 'image/png', 'video/mp4'],
    supportsScheduling: true,
    requiredFields: ['title', 'content', 'status'],
    agentSkill: `
## WordPress REST API Post Skill
Create Post: POST /wp-json/wp/v2/posts — { title, content (HTML), status: "publish" }
Schedule: status: "future", date: "2025-01-01T09:00:00" (site local time)
Upload Media: POST /wp-json/wp/v2/media — raw binary, Content-Type: image/jpeg
Auth: Authorization: Basic base64(username:application_password)
`,
  },
  {
    key: 'notion',
    displayName: 'Notion',
    officialDocUrl: 'https://developers.notion.com/reference/post-page',
    auth: {
      method: 'Bearer Token (Integration Token)',
      tokenEndpoint: 'https://api.notion.com/v1/oauth/token',
    },
    endpoints: {
      createPage: {
        method: 'POST',
        url: 'https://api.notion.com/v1/pages',
        notes: 'parent: { database_id or page_id }, properties, children (blocks)',
      },
      appendBlocks: {
        method: 'PATCH',
        url: 'https://api.notion.com/v1/blocks/{block_id}/children',
        notes: 'Append content blocks to existing page',
      },
    },
    mediaTypes: ['text/plain', 'text/markdown', 'image/jpeg', 'image/png'],
    supportsScheduling: false,
    requiredFields: ['parent', 'properties'],
    agentSkill: `
## Notion Create Page Skill
POST /v1/pages — { parent: { database_id }, properties: { Name: { title: [{text:{content}}] } }, children: [blocks] }
Auth: Authorization: Bearer {integration_token}, Notion-Version: 2022-06-28
Blocks: paragraph, heading_1/2/3, bulleted_list_item, image, embed
`,
  },
  {
    key: 'telegram',
    displayName: 'Telegram',
    officialDocUrl: 'https://core.telegram.org/bots/api#sendmessage',
    auth: {
      method: 'Bot Token',
      notes: 'Get token from @BotFather. Pass as URL parameter or Authorization header.',
    },
    endpoints: {
      sendMessage: {
        method: 'POST',
        url: 'https://api.telegram.org/bot{token}/sendMessage',
        notes: '{ chat_id, text, parse_mode: HTML|Markdown }',
      },
      sendVideo: {
        method: 'POST',
        url: 'https://api.telegram.org/bot{token}/sendVideo',
        notes: '{ chat_id, video (file_id or URL or multipart), caption }',
      },
      sendPhoto: {
        method: 'POST',
        url: 'https://api.telegram.org/bot{token}/sendPhoto',
        notes: '{ chat_id, photo (file_id or URL or multipart), caption }',
      },
    },
    mediaTypes: ['text/plain', 'image/jpeg', 'image/png', 'video/mp4'],
    maxFileSizeMB: 2000,
    rateLimits: { messagesPerSecond: 30, messagesPerMinutePerGroup: 20 },
    supportsScheduling: false,
    requiredFields: ['chat_id'],
    agentSkill: `
## Telegram Bot Skill
Send Text: POST /bot{token}/sendMessage — { chat_id, text, parse_mode: "HTML" }
Send Video: POST /bot{token}/sendVideo — { chat_id, video: "url_or_file_id", caption }
Send Photo: POST /bot{token}/sendPhoto — { chat_id, photo: "url_or_file_id", caption }
Auth: token in URL /bot{BOT_TOKEN}/ (no OAuth needed)
`,
  },
  {
    key: 'notebooklm',
    displayName: 'NotebookLM',
    officialDocUrl: 'https://ai.google.dev/gemini-api/docs/document-processing',
    notes: 'NotebookLM has no public publishing API. Beast AI uses Gemini Document API to ingest source material, then generates structured notebook-compatible content.',
    auth: {
      method: 'API Key (Gemini)',
      tokenEndpoint: 'https://generativelanguage.googleapis.com',
    },
    endpoints: {
      uploadDocument: {
        method: 'POST',
        url: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
        notes: 'Resumable upload; returns file URI for subsequent use in generateContent',
      },
      generateContent: {
        method: 'POST',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
        notes: 'Include file URI in parts array for document analysis',
      },
    },
    mediaTypes: ['application/pdf', 'text/plain', 'text/markdown'],
    supportsScheduling: false,
    requiredFields: ['file or text content'],
    agentSkill: `
## NotebookLM / Gemini Document Skill
Upload: POST /upload/v1beta/files — multipart; returns file.uri
Analyze: POST /v1beta/models/gemini-1.5-pro:generateContent — { parts: [{fileData: {fileUri}}] }
Auth: ?key={GEMINI_API_KEY}
Output: Structured notes, summaries, Q&A grounded in the document
`,
  },
];

const output = {
  generated: new Date().toISOString(),
  version: '1.0.0',
  description: 'Beast AI Platform API Skills — grounded in official documentation for each platform',
  platforms: PLATFORM_SKILLS,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
console.log(`✅ Platform API skills written to ${OUT_FILE} (${PLATFORM_SKILLS.length} platforms)`);
