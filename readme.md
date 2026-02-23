# Hardline Privacy — Full Site (v1.0.6)

This bundle merges your **current production visuals** with the **full premium system** from v1.0.5.

## Visuals included
- All pages: index, services, pricing, resources, about, contact, privacy, terms, scan, success, cancel
- Assets: assets/css/styles.364.css, assets/js/main.364.js, assets/images/logo.svg, assets/images/favicon.svg
- robots.txt, sitemap.xml

## Premium system included
- Functions: stripe-webhook, entitlements-me, auth-request-link, auth-consume-link, admin, brokers, _lib/jwt, search, search-google, search-bing
- Pages: signin.html, members/opt-out-hub/, admin/
- JS: assets/js/scan-premium.js

## Netlify configuration
- netlify.toml: publish=".", functions="netlify/functions", wildcard /api/* → functions
- package.json: stripe ^20.3.1, @netlify/blobs ^10.5.0

## Environment variables
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, JWT_SECRET, HP_ADMIN_EMAILS
GOOGLE_API_KEY, GOOGLE_CX, BING_V7_KEY
EMAIL_PROVIDER (mailgun, sendgrid, or postmark), EMAIL_API_KEY
EMAIL_FROM (optional, defaults to no-reply@hardlineprivacy.com)
EMAIL_DOMAIN (optional, for Mailgun only)

## Deploy
1) Upload/commit the contents to your repo.
2) Set environment variables above.
3) Trigger deploy in Netlify.
4) Smoke test: webhook 200 OK, sign-in sends email, Members Hub loads cards, Scanner shows badges.
