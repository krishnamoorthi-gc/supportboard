import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";
import DevConsoleScr from "./DevConsoleScr";

// ─── INTEGRATIONS & API ───────────────────────────────────────────────────
function IntegLogo({name,s=22}){
  const st={width:s,height:s,display:"block"};
  const logos={
    Slack:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M5.5 10a1.5 1.5 0 110-3h3v3a1.5 1.5 0 01-3 0z" fill="#E01E5A"/><path d="M10 10a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 000-3H11.5A1.5 1.5 0 0010 10z" fill="#E01E5A"/><path d="M14 5.5a1.5 1.5 0 10-3 0V8.5h3a1.5 1.5 0 000-3z" fill="#36C5F0"/><path d="M14 13a1.5 1.5 0 00-1.5-1.5h-3a1.5 1.5 0 000 3h3A1.5 1.5 0 0014 13z" fill="#36C5F0"/><path d="M18.5 13a1.5 1.5 0 110 3h-3v-3a1.5 1.5 0 013 0z" fill="#2EB67D"/><path d="M14 13a1.5 1.5 0 00-1.5-1.5H10v3h2.5A1.5 1.5 0 0014 13z" fill="#2EB67D"/><path d="M10 18.5a1.5 1.5 0 103 0V15.5h-3a1.5 1.5 0 000 3z" fill="#ECB22E"/><path d="M10 11.5A1.5 1.5 0 0011.5 13H14v-3h-2.5A1.5 1.5 0 0010 11.5z" fill="#ECB22E"/></svg>,
    Jira:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 2L2 12l5 5 5-5 5 5 5-5L12 2z" fill="#2684FF"/><path d="M12 7.5L7.5 12l4.5 4.5V7.5z" fill="url(#jg1)"/><defs><linearGradient id="jg1" x1="12" y1="7.5" x2="7.5" y2="12"><stop stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/></linearGradient></defs></svg>,
    Shopify:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M15.5 3.5s-.3-.1-.6 0c-.2 0-3.5 1-3.5 1L9 5.5l-.5.2s-.4.1-.4.5v9.3l5.5 2.5 6-2V6s-3.3-2.2-4.1-2.5zM13 8v5l-2.2-.9V7.3L13 8z" fill="#96BF48"/><path d="M13 8l-2.2-.7.8-2.5L13 5.5V8z" fill="#5E8E3E"/></svg>,
    Stripe:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" fill="#635BFF"/><path d="M11 10.5c0-.8.7-1.2 1.8-1.2 1 0 2 .3 2.8.8V8c-.9-.4-1.9-.5-2.8-.5-2.3 0-3.8 1.2-3.8 3.1 0 3 4.2 2.6 4.2 3.9 0 .9-.8 1.2-1.9 1.2-1.1 0-2.3-.4-3.2-1v2.2c1 .5 2.1.7 3.2.7 2.3 0 3.9-1.2 3.9-3.1-.1-3.3-4.2-2.7-4.2-4z" fill="#fff"/></svg>,
    HubSpot:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="none" stroke="#FF7A59" strokeWidth="1.8"/><circle cx="12" cy="6" r="1.5" fill="#FF7A59"/><circle cx="17.2" cy="9" r="1.5" fill="#FF7A59"/><circle cx="17.2" cy="15" r="1.5" fill="#FF7A59"/><circle cx="12" cy="18" r="1.5" fill="#FF7A59"/><circle cx="6.8" cy="15" r="1.5" fill="#FF7A59"/><circle cx="6.8" cy="9" r="1.5" fill="#FF7A59"/><line x1="12" y1="7.5" x2="12" y2="9" stroke="#FF7A59" strokeWidth="1.2"/><line x1="15.8" y1="9.8" x2="14.5" y2="10.5" stroke="#FF7A59" strokeWidth="1.2"/><line x1="15.8" y1="14.2" x2="14.5" y2="13.5" stroke="#FF7A59" strokeWidth="1.2"/><line x1="12" y1="16.5" x2="12" y2="15" stroke="#FF7A59" strokeWidth="1.2"/><line x1="8.2" y1="14.2" x2="9.5" y2="13.5" stroke="#FF7A59" strokeWidth="1.2"/><line x1="8.2" y1="9.8" x2="9.5" y2="10.5" stroke="#FF7A59" strokeWidth="1.2"/></svg>,
    Salesforce:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M10 6.5a4 4 0 016.8 1A3.5 3.5 0 0120 11a3.5 3.5 0 01-2.4 3.3A3 3 0 0114.5 18h-7A3.5 3.5 0 014 14.5a3.5 3.5 0 012-3.2A4.5 4.5 0 0110 6.5z" fill="#00A1E0"/></svg>,
    Zapier:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#FF4A00"/><path d="M12 6v4.5L8 7.5M12 6v4.5l4-3M12 18v-4.5l4 3M12 18v-4.5l-4 3M6 12h4.5l-3-4M6 12h4.5l-3 4M18 12h-4.5l3 4M18 12h-4.5l3-4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/><circle cx="12" cy="12" r="2.5" fill="#FF4A00" stroke="#fff" strokeWidth="1.2"/></svg>,
    "Google Sheets":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" fill="#34A853"/><path d="M4 7h16v10H4z" fill="#fff" opacity="0.2"/><rect x="6" y="8" width="5" height="3" rx="0.5" fill="#fff" opacity="0.7"/><rect x="13" y="8" width="5" height="3" rx="0.5" fill="#fff" opacity="0.7"/><rect x="6" y="13" width="5" height="3" rx="0.5" fill="#fff" opacity="0.7"/><rect x="13" y="13" width="5" height="3" rx="0.5" fill="#fff" opacity="0.7"/></svg>,
    Twilio:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#F22F46"/><circle cx="9.5" cy="9.5" r="1.8" fill="#fff"/><circle cx="14.5" cy="9.5" r="1.8" fill="#fff"/><circle cx="9.5" cy="14.5" r="1.8" fill="#fff"/><circle cx="14.5" cy="14.5" r="1.8" fill="#fff"/></svg>,
    Mailchimp:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FFE01B"/><path d="M12 7c-2.2 0-4 1.8-4 4v2c0 1.7 1.3 3 3 3h2c1.7 0 3-1.3 3-3v-2c0-2.2-1.8-4-4-4z" fill="#241C15"/><circle cx="10.5" cy="11" r="1" fill="#fff"/><circle cx="13.5" cy="11" r="1" fill="#fff"/><path d="M10.5 14c.5.5 1.5.8 2.5.5" stroke="#FFE01B" strokeWidth="0.8" strokeLinecap="round" fill="none"/></svg>,
    GitHub:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21.5c0 .27.16.59.67.5A10.013 10.013 0 0022 12c0-5.52-4.48-10-10-10z" fill="#e8eeff"/></svg>,
    Notion:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" fill="#fff"/><rect x="4" y="3" width="16" height="18" rx="2" stroke="#333" strokeWidth="1.5" fill="none"/><path d="M7 7h4l4 5V7h2v10h-2l-5-6v6H7V7z" fill="#333"/></svg>,
    Intercom:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#1F8DED"/><path d="M7 8v5M9.5 7v7M12 6.5v8M14.5 7v7M17 8v5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 16s2 1.5 5 1.5 5-1.5 5-1.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>,
    Zendesk:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 4l8 8H12V4z" fill="#03363D"/><circle cx="8" cy="8" r="4" fill="#03363D"/><path d="M12 20l-8-8h8v8z" fill="#03363D"/><rect x="12" y="12" width="8" height="8" rx="4" fill="#03363D"/></svg>,
    Segment:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#52BD94"/><path d="M7 12h10M7 9h7M7 15h7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Webhook:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="7" cy="17" r="3" stroke="#22d4e8" strokeWidth="1.8" fill="none"/><circle cx="17" cy="17" r="3" stroke="#22d4e8" strokeWidth="1.8" fill="none"/><circle cx="12" cy="7" r="3" stroke="#22d4e8" strokeWidth="1.8" fill="none"/><path d="M12 10v3l-4 4M12 13l4 4" stroke="#22d4e8" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Asana:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="16" r="4" fill="#F06A6A"/><circle cx="6" cy="9" r="4" fill="#F06A6A"/><circle cx="18" cy="9" r="4" fill="#F06A6A"/></svg>,
    Linear:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#5E6AD2"/><path d="M6 12l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    "Monday.com":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#FF3D57"/><circle cx="8" cy="9" r="2" fill="#fff"/><circle cx="12" cy="14" r="2" fill="#FFCB00"/><circle cx="16" cy="9" r="2" fill="#00D647"/></svg>,
    WooCommerce:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" fill="#96588A"/><path d="M7 9c0 2 1 3.5 2.5 3.5S12 11 12 9s-1-3.5-2.5-3.5S7 7 7 9zM12 9c0 2 1 3.5 2.5 3.5S17 11 17 9s-1-3.5-2.5-3.5S12 7 12 9z" stroke="#fff" strokeWidth="1.2" fill="none"/></svg>,
    Razorpay:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#072654"/><path d="M14 6l-4 12h4l4-12h-4zM6 10h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    "Google Analytics":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="5" y="12" width="4" height="8" rx="1" fill="#F9AB00"/><rect x="10" y="8" width="4" height="12" rx="1" fill="#E37400"/><rect x="15" y="4" width="4" height="16" rx="1" fill="#F9AB00"/></svg>,
    Mixpanel:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#7856FF"/><path d="M7 14l3-4 3 2 4-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Freshdesk:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#00A651"/><path d="M12 7v5l3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="12" cy="12" r="6" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>,
    Airtable:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" fill="#18BFFF"/><rect x="3" y="4" width="9" height="8" fill="#FCB400"/><rect x="12" y="4" width="9" height="8" fill="#18BFFF"/><rect x="3" y="12" width="9" height="8" fill="#18BFFF" opacity="0.7"/><rect x="12" y="12" width="9" height="8" fill="#F82B60" opacity="0.7"/></svg>,
    "Microsoft Teams":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#5B5FC7"/><circle cx="15" cy="8" r="2.5" fill="#fff" opacity="0.8"/><path d="M10 10h8c1.1 0 2 .9 2 2v4H10v-6z" fill="#fff" opacity="0.5"/><circle cx="10" cy="8" r="3" fill="#fff"/><path d="M5 11h10c1.1 0 2 .9 2 2v5H5v-7z" fill="#fff"/></svg>,
    Discord:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#5865F2"/><path d="M9.5 9c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5S10.3 9 9.5 9zM14.5 9c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z" fill="#fff"/><path d="M16.5 7s-1.5-1-3.5-1.2V6c0 .3-.2.5-.5.6L12 7l-.5-.4c-.3-.1-.5-.3-.5-.6v-.2C9 6 7.5 7 7.5 7S5.5 10.5 6 16c1.5 1.5 3.5 1.5 3.5 1.5l.5-1c2 .5 4-.5 4-.5l.5 1s2 0 3.5-1.5c.5-5.5-1.5-9-1.5-9z" fill="#fff" opacity="0.2"/></svg>,
    n8n:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#EA4B71"/><circle cx="8" cy="12" r="2.5" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="16" cy="12" r="2.5" stroke="#fff" strokeWidth="1.5" fill="none"/><path d="M10.5 12h3" stroke="#fff" strokeWidth="1.5"/></svg>,
    Make:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#6D00CC"/><circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="1.5" fill="#fff"/></svg>,
    "Google Drive":<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M8 4l-5 9h6l5-9H8z" fill="#0066DA"/><path d="M14 4l5 9h-6l-5-9h6z" fill="#00AC47"/><path d="M3 13l3 6h12l3-6H3z" fill="#FFBA00"/></svg>,
    "AWS S3":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#FF9900"/><path d="M12 5v14M7 8l5-3 5 3M7 16l5 3 5-3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>,
    OpenAI:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10A37F"/><path d="M12 6v4M12 14v4M6 12h4M14 12h4M8.5 8.5l2.8 2.8M12.7 12.7l2.8 2.8M15.5 8.5l-2.8 2.8M11.3 12.7l-2.8 2.8" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    Dropbox:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 3l-5 3.5L12 10l5-3.5zM2 10l5 3.5L12 10 7 6.5zM12 10l5 3.5L22 10l-5-3.5zM7 13.5v3l5 3.5 5-3.5v-3" stroke="#0061FF" strokeWidth="1.2" strokeLinejoin="round" fill="none"/></svg>,
    Trello:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0079BF"/><rect x="5" y="5" width="6" height="14" rx="1.5" fill="#fff"/><rect x="13" y="5" width="6" height="9" rx="1.5" fill="#fff"/></svg>,
    Confluence:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#172B4D"/><path d="M6 16c2-3 4-5 6-5s4 2 6 5M6 8c2 3 4 5 6 5s4-2 6-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    "Zendesk Chat":<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 4l8 8H12V4z" fill="#03363D"/><circle cx="8" cy="8" r="4" fill="#03363D"/></svg>,
    Pipedrive:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#00B388"/><path d="M8 16V8l4 4 4-4v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    "Zoho CRM":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#E42527"/><path d="M6 15l3-6 3 3 3-5 3 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    BigCommerce:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#34313F"/><path d="M7 9h5M7 12h7M7 15h4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    PayPal:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#003087"/><path d="M9 18l1-6h3c2 0 3.5-1.5 3.5-3.5S15 5 13 5H9L7 18h2z" fill="#fff"/></svg>,
    Square:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#006AFF"/><rect x="7" y="7" width="10" height="10" rx="2" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>,
    Amplitude:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#1D2B3A"/><path d="M5 17l4-6 3 3 4-8 3 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Datadog:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#632CA6"/><path d="M8 16l2-5 3 2 3-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Sentry:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#362D59"/><path d="M12 6l-6 12h4c0-3 2-5 4-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    GitLab:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 20L3 13l2.5-8L8 13h8l2.5-8L21 13z" fill="#FC6D26"/></svg>,
    Vercel:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#000"/><path d="M12 6l7 12H5z" fill="#fff"/></svg>,
    Supabase:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#3ECF8E"/><path d="M12 5v7l5 5H7l5-5z" fill="#fff"/></svg>,
    Firebase:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FFCA28"/><path d="M8 17l2-12 2 5 2-3 2 10H8z" fill="#fff"/></svg>,
    SendGrid:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#1A82E2"/><rect x="6" y="8" width="5" height="5" fill="#fff" opacity="0.8"/><rect x="13" y="8" width="5" height="5" fill="#fff" opacity="0.5"/><rect x="6" y="14" width="5" height="4" fill="#fff" opacity="0.5"/></svg>,
    Brevo:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#0B996E"/><path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Calendly:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" fill="#006BFF"/><path d="M3 9h18" stroke="#fff" strokeWidth="1.5"/><rect x="12" y="11" width="4" height="4" rx="1" fill="#fff"/></svg>,
    Typeform:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#262627"/><path d="M7 8h10M9 12h8M7 16h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Clearbit:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#3E5BF5"/><circle cx="12" cy="9" r="3" fill="#fff"/><path d="M7 18c0-3 2-5 5-5s5 2 5 5" fill="#fff" opacity="0.7"/></svg>,
    FullStory:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#448DFC"/><circle cx="12" cy="10" r="4" stroke="#fff" strokeWidth="1.5" fill="none"/><path d="M12 14v4M9 19h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Chargebee:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FF6C37"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Freshsales:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#3E8EF7"/><circle cx="12" cy="12" r="5.5" stroke="#fff" strokeWidth="1.5" fill="none"/><path d="M12 7v5l3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    Webflow:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#4353FF"/><path d="M6 15s2-8 6-8c0 0 0 8-4 8 4 0 4-8 8-8 0 0 2 8-2 8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>,
    Aircall:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#00B388"/><path d="M9 7c-2 0-3 2-3 4s1 4 3 4M15 7c2 0 3 2 3 4s-1 4-3 4M10 10h4M10 14h4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>,
    "Help Scout":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#1292EE"/><circle cx="12" cy="10" r="3.5" fill="#fff"/><path d="M7 18c0-3 2-4.5 5-4.5s5 1.5 5 4.5" fill="#fff" opacity="0.7"/></svg>,
    Anthropic:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#D4A574"/><path d="M8 17l4-12 4 12M9.5 13h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    "Zendesk Sell":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#03363D"/><path d="M6 8l6 4 6-4M6 16h12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    "Copper CRM":<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#F7941D"/><path d="M8 12a4 4 0 108 0 4 4 0 10-8 0" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="1.5" fill="#fff"/></svg>,
    "Freshworks CRM":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FF5A1F"/><path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    Magento:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#EE672F"/><path d="M12 5l6 4v6l-3 2v-6l-3-2-3 2v6l-3-2V9l6-4z" fill="#fff"/></svg>,
    PrestaShop:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#DF0067"/><path d="M8 10h8l-2 7H10l-2-7z" fill="#fff"/><circle cx="12" cy="8" r="2" fill="#fff"/></svg>,
    Squarespace:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#111"/><path d="M6 14l4-4 4 4 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Paddle:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FFD43A"/><path d="M9 8v8M15 8v8M9 12h6" stroke="#333" strokeWidth="2" strokeLinecap="round"/></svg>,
    Recurly:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#75B73B"/><path d="M8 12a4 4 0 014-4h1a3 3 0 010 6h-1" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/><path d="M13 14l3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    "Lemon Squeezy":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FFC233"/><ellipse cx="12" cy="12" rx="4" ry="5" fill="#fff" opacity="0.8"/><path d="M12 6c-1 0-2 1-2 2" stroke="#333" strokeWidth="1" fill="none"/></svg>,
    ClickUp:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#7B68EE"/><path d="M8 14l4-4 4 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Basecamp:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#1D2D35"/><path d="M6 16c2-4 4-8 6-8s4 4 6 8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>,
    Todoist:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#E44332"/><path d="M6 9l12-2M6 13l12-2M6 17l12-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Coda:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#F46A54"/><circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="2" fill="none"/><path d="M14 10v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    OneNote:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#7719AA"/><path d="M8 7v10M8 7l5 5-5 5M14 7v10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    Evernote:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#00A82D"/><path d="M10 6v5h5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 18c0-4 2-7 4-9 2 2 4 5 4 9" stroke="#fff" strokeWidth="1.3" fill="none"/></svg>,
    Tableau:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="11" y="4" width="2" height="6" fill="#E97627"/><rect x="11" y="14" width="2" height="6" fill="#E97627"/><rect x="4" y="11" width="6" height="2" fill="#E97627"/><rect x="14" y="11" width="6" height="2" fill="#E97627"/><rect x="7" y="7" width="2" height="2" fill="#E97627" opacity="0.6"/><rect x="15" y="7" width="2" height="2" fill="#E97627" opacity="0.6"/><rect x="7" y="15" width="2" height="2" fill="#E97627" opacity="0.6"/><rect x="15" y="15" width="2" height="2" fill="#E97627" opacity="0.6"/></svg>,
    Looker:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#4285F4"/><circle cx="12" cy="11" r="4" stroke="#fff" strokeWidth="1.5" fill="none"/><path d="M15 14l3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Heap:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#5041BC"/><circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2" fill="#fff"/></svg>,
    PostHog:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#1D4AFF"/><path d="M8 8h8v8H8z" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2" fill="#fff"/></svg>,
    Hotjar:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FD3A5C"/><path d="M10 6c0 4 4 4 4 8s-4 4-4 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>,
    BambooHR:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#73C41D"/><path d="M12 6c-3 0-5 3-5 6 0 4 3 6 5 6s5-2 5-6c0-3-2-6-5-6z" fill="#fff" opacity="0.8"/><path d="M12 6v12" stroke="#73C41D" strokeWidth="1.5"/></svg>,
    Workday:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#0875E1"/><circle cx="12" cy="10" r="3" fill="#fff"/><path d="M7 18c0-3 2-5 5-5s5 2 5 5" fill="#fff"/></svg>,
    Okta:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#007DC1"/><circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="1.5" fill="#fff"/></svg>,
    Auth0:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#EB5424"/><path d="M12 6l5 4-2 6h-6l-2-6 5-4z" fill="#fff"/></svg>,
    "1Password":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#0572EC"/><rect x="8" y="8" width="8" height="8" rx="2" stroke="#fff" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="1.5" fill="#fff"/></svg>,
    Gainsight:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#ED6B23"/><path d="M7 14l3-4 3 2 4-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    ChurnZero:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#5B2D8E"/><path d="M12 7v10M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="1.2" fill="none"/></svg>,
    Pendo:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#E04F69"/><path d="M12 6l2 5h5l-4 3 1.5 5L12 16l-4.5 3L9 14l-4-3h5l2-5z" fill="#fff"/></svg>,
    Snowflake:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#29B5E8"/><path d="M12 6v12M6 12h12M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    BigQuery:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#4285F4"/><path d="M8 8v8l4 2 4-2V8l-4-2-4 2z" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinejoin="round"/><path d="M12 10v4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Redshift:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#8C4FFF"/><path d="M7 17l5-10 5 10" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 13h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    Twitch:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#9146FF"/><path d="M7 5v12l3 2h6l3-3V5H7z" fill="#fff"/><rect x="11" y="8" width="1.5" height="4" fill="#9146FF"/><rect x="14" y="8" width="1.5" height="4" fill="#9146FF"/></svg>,
    "WhatsApp Cloud":<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#25D366"/><path d="M17 7A7.5 7.5 0 007 17l-1 3 3-1a7.5 7.5 0 008-12z" fill="#fff"/><path d="M14.5 13.5c-.3.5-1 1-1.7.8-.7-.2-2.5-1.3-3.3-2.8-.3-.5 0-1 .3-1.3.2-.2.5-.3.6-.3h.4c.2 0 .3 0 .5.4s.6 1.5.6 1.6c.1.1 0 .3-.1.4-.1.2-.2.3-.3.4" stroke="#25D366" strokeWidth="0.7" fill="none"/></svg>,
    "Tawk.to":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#03A84E"/><path d="M7 8h10v7l-3 2H10l-3 2V8z" fill="#fff"/></svg>,
    LiveChat:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FF5100"/><path d="M6 8h12v6H10l-4 3V8z" fill="#fff"/></svg>,
    "Power BI":<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="5" y="6" width="3" height="12" rx="1" fill="#F2C811"/><rect x="10" y="4" width="3" height="14" rx="1" fill="#F2C811" opacity="0.8"/><rect x="15" y="8" width="3" height="10" rx="1" fill="#F2C811" opacity="0.6"/></svg>,
    Retool:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#3D3D3D"/><rect x="7" y="7" width="4" height="4" rx="1" fill="#fff"/><rect x="13" y="7" width="4" height="4" rx="1" fill="#fff"/><rect x="7" y="13" width="4" height="4" rx="1" fill="#fff"/><rect x="13" y="13" width="4" height="4" rx="1" fill="#fff" opacity="0.5"/></svg>,
    Grafana:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#F46800"/><path d="M6 16l4-6 4 3 4-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    PagerDuty:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#06AC38"/><path d="M10 6h3a4 4 0 010 8h-3V6z" fill="#fff"/><path d="M10 14v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>,
    LaunchDarkly:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#405BFF"/><path d="M8 6l8 6-8 6V6z" fill="#fff"/></svg>
  };
  return logos[name]||<svg style={st} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill={C.t3}/></svg>;
}
const INTEG_LIST=[
  {id:"ig1",name:"Slack",cat:"Communication",color:"#4A154B",desc:"Send notifications to Slack channels and create tickets from messages",connected:true,fields:["Workspace URL","Bot Token","Default Channel"],rating:4.8,installs:12400,featured:true,longDesc:"Bi-directional Slack integration. Get notified about new conversations, reply directly from Slack, escalate threads, and sync channels with inboxes."},
  {id:"ig2",name:"Jira",cat:"Project Management",color:"#0052CC",desc:"Create Jira tickets from conversations",connected:false,fields:["Domain","Email","API Token","Project Key"],rating:4.6,installs:8900,featured:true,longDesc:"Link support conversations to Jira issues. Auto-create tickets, sync status updates, and attach conversation context to issues."},
  {id:"ig3",name:"Shopify",cat:"E-commerce",color:"#96BF48",desc:"Sync orders, customers & products",connected:true,fields:["Shop Domain","Admin API Token"],rating:4.7,installs:6800,featured:true,longDesc:"View customer orders, process refunds, and track shipments directly in the conversation sidebar. Auto-tag VIP customers."},
  {id:"ig4",name:"Stripe",cat:"Payments",color:"#635BFF",desc:"View payment info and process refunds in conversations",connected:false,fields:["Secret Key","Webhook Secret"],rating:4.5,installs:5200,featured:false,longDesc:"See customer payment history, subscription status, and process refunds without leaving SupportDesk."},
  {id:"ig5",name:"HubSpot",cat:"CRM",color:"#FF7A59",desc:"Sync contacts, deals, and company data",connected:false,fields:["API Key","Portal ID"],rating:4.4,installs:7300,featured:false,longDesc:"Two-way sync contacts and deals. View HubSpot timeline in conversations. Auto-create contacts from new conversations."},
  {id:"ig6",name:"Salesforce",cat:"CRM",color:"#00A1E0",desc:"Two-way contact & case sync",connected:true,fields:["Instance URL","Client ID","Client Secret"],rating:4.3,installs:4100,featured:false,longDesc:"Enterprise-grade Salesforce integration. Sync contacts, cases, accounts, and custom objects bi-directionally."},
  {id:"ig7",name:"Zapier",cat:"Automation",color:"#FF4A00",desc:"Connect 5000+ apps via Zapier triggers and actions",connected:false,fields:["API Key"],rating:4.7,installs:11200,featured:true,longDesc:"Trigger Zaps from SupportDesk events or perform actions in SupportDesk from any of 5000+ apps."},
  {id:"ig8",name:"Google Sheets",cat:"Productivity",color:"#34A853",desc:"Export data to Google Sheets automatically",connected:true,fields:["Service Account JSON"],rating:4.2,installs:3400,featured:false,longDesc:"Auto-export conversation data, contact lists, and reports to Google Sheets on a schedule or trigger."},
  {id:"ig9",name:"Twilio",cat:"Communication",color:"#F22F46",desc:"SMS & voice via Twilio",connected:false,fields:["Account SID","Auth Token","Phone Number"],rating:4.6,installs:5800,featured:false,longDesc:"Send and receive SMS, make and receive voice calls through your Twilio numbers directly in SupportDesk."},
  {id:"ig10",name:"Mailchimp",cat:"Marketing",color:"#FFE01B",desc:"Sync subscribers & campaigns",connected:false,fields:["API Key","Server Prefix"],rating:4.1,installs:2900,featured:false,longDesc:"Sync contact lists with Mailchimp audiences. Track email campaign engagement in conversation context."},
  {id:"ig11",name:"GitHub",cat:"Development",color:"#333",desc:"Link issues and PRs to support tickets",connected:false,fields:["Personal Access Token","Repository"],rating:4.5,installs:4600,featured:false,longDesc:"Create GitHub issues from conversations, link PRs, get notified when issues are resolved, and auto-close conversations."},
  {id:"ig12",name:"Notion",cat:"Productivity",color:"#000",desc:"Create Notion pages from conversations",connected:false,fields:["Integration Token","Database ID"],rating:4.3,installs:3200,featured:false,longDesc:"Save conversation summaries, meeting notes, and knowledge base articles directly to Notion databases."},
  {id:"ig13",name:"Intercom",cat:"Communication",color:"#1F8DED",desc:"Migrate from Intercom seamlessly",connected:false,fields:["Access Token"],rating:4.0,installs:1800,featured:false,longDesc:"Import your entire Intercom history — conversations, contacts, tags, and articles — into SupportDesk."},
  {id:"ig14",name:"Zendesk",cat:"Communication",color:"#03363D",desc:"Import tickets from Zendesk",connected:false,fields:["Subdomain","Email","API Token"],rating:4.1,installs:2100,featured:false,longDesc:"Migrate tickets, contacts, macros, and automations from Zendesk. Maintain ticket history and attachments."},
  {id:"ig15",name:"Segment",cat:"Analytics",color:"#52BD94",desc:"Customer data platform sync",connected:false,fields:["Write Key"],rating:4.4,installs:2800,featured:false,longDesc:"Send SupportDesk events to Segment and receive customer traits. Build unified customer profiles across tools."},
  {id:"ig16",name:"Webhook",cat:"Custom",color:C.cy,desc:"Send data to any HTTP endpoint",connected:true,fields:["Endpoint URL","Secret Key"],rating:4.8,installs:9200,featured:false,longDesc:"Configure custom webhooks for any SupportDesk event. Supports HMAC signing, retry logic, and custom headers."},
  {id:"ig17",name:"Asana",cat:"Project Management",color:"#F06A6A",desc:"Create tasks from conversations",connected:false,fields:["Personal Access Token","Workspace ID"],rating:4.3,installs:3100,featured:false,longDesc:"Turn conversations into Asana tasks. Track task progress and get notified when tasks are completed."},
  {id:"ig18",name:"Linear",cat:"Project Management",color:"#5E6AD2",desc:"Create and track engineering issues",connected:false,fields:["API Key","Team ID"],rating:4.7,installs:4200,isNew:true,longDesc:"Create Linear issues from conversations, sync status updates, and auto-resolve when issues are closed."},
  {id:"ig19",name:"Monday.com",cat:"Project Management",color:"#FF3D57",desc:"Sync boards and items",connected:false,fields:["API Token","Board ID"],rating:4.2,installs:2400,featured:false,longDesc:"Create Monday.com items from conversations and sync statuses bi-directionally."},
  {id:"ig20",name:"WooCommerce",cat:"E-commerce",color:"#96588A",desc:"View orders and customer data",connected:false,fields:["Store URL","Consumer Key","Consumer Secret"],rating:4.4,installs:3600,featured:false,longDesc:"Access WooCommerce orders, products, and customer data in the conversation sidebar. Process refunds inline."},
  {id:"ig21",name:"Razorpay",cat:"Payments",color:"#072654",desc:"View payments and refunds for Indian merchants",connected:false,fields:["Key ID","Key Secret"],rating:4.5,installs:2200,isNew:true,longDesc:"See Razorpay payment history, subscription status, and process refunds from conversations."},
  {id:"ig22",name:"Google Analytics",cat:"Analytics",color:"#F9AB00",desc:"Track support interactions as events",connected:false,fields:["Measurement ID","API Secret"],rating:4.1,installs:4800,featured:false,longDesc:"Send conversation events to GA4. Track resolution rates, CSAT, and channel performance in Google Analytics."},
  {id:"ig23",name:"Mixpanel",cat:"Analytics",color:"#7856FF",desc:"Track user support events and funnels",connected:false,fields:["Project Token","API Secret"],rating:4.3,installs:2600,featured:false,longDesc:"Send SupportDesk events to Mixpanel. Build funnels, retention analysis, and user segments based on support interactions."},
  {id:"ig24",name:"Freshdesk",cat:"Communication",color:"#00A651",desc:"Migrate from Freshdesk",connected:false,fields:["Domain","API Key"],rating:3.9,installs:1500,featured:false,longDesc:"Import tickets, contacts, canned responses, and automations from Freshdesk."},
  {id:"ig25",name:"Airtable",cat:"Productivity",color:"#18BFFF",desc:"Sync data with Airtable bases",connected:false,fields:["API Key","Base ID"],rating:4.4,installs:2100,featured:false,longDesc:"Export conversation data to Airtable bases. Use Airtable as a flexible CRM or reporting layer."},
  {id:"ig26",name:"Microsoft Teams",cat:"Communication",color:"#5B5FC7",desc:"Get notifications and reply from Teams",connected:false,fields:["Tenant ID","Client ID","Client Secret"],rating:4.5,installs:6200,featured:true,longDesc:"Receive notifications in Teams channels. Reply to customers directly from Teams. Escalate conversations to Teams threads."},
  {id:"ig27",name:"Discord",cat:"Communication",color:"#5865F2",desc:"Community support via Discord bots",connected:false,fields:["Bot Token","Server ID","Channel ID"],rating:4.2,installs:3800,isNew:true,longDesc:"Route Discord messages to SupportDesk conversations. Reply from SupportDesk and get notified about mentions."},
  {id:"ig28",name:"n8n",cat:"Automation",color:"#EA4B71",desc:"Self-hosted workflow automation",connected:false,fields:["Webhook URL","API Key"],rating:4.6,installs:2900,isNew:true,longDesc:"Connect SupportDesk to n8n workflows. Trigger automations on any event and use SupportDesk actions in your workflows."},
  {id:"ig29",name:"Make",cat:"Automation",color:"#6D00CC",desc:"Visual automation scenarios",connected:false,fields:["API Key","Team ID"],rating:4.4,installs:3400,featured:false,longDesc:"Build visual automation scenarios with Make (formerly Integromat). 1500+ app connections available."},
  {id:"ig30",name:"Google Drive",cat:"Productivity",color:"#4285F4",desc:"Save attachments and exports to Drive",connected:false,fields:["Service Account JSON","Folder ID"],rating:4.3,installs:4100,featured:false,longDesc:"Auto-save conversation attachments to Google Drive. Export reports and backups to shared drives."},
  {id:"ig31",name:"AWS S3",cat:"Development",color:"#FF9900",desc:"Store attachments and backups in S3",connected:false,fields:["Access Key ID","Secret Access Key","Bucket","Region"],rating:4.5,installs:2400,featured:false,longDesc:"Store conversation attachments, file exports, and database backups in your own AWS S3 buckets."},
  {id:"ig32",name:"OpenAI",cat:"AI",color:"#10A37F",desc:"Custom AI models for classification and response",connected:false,fields:["API Key","Model ID"],rating:4.8,installs:5600,isNew:true,featured:true,longDesc:"Use your own OpenAI models for conversation classification, sentiment analysis, auto-responses, and knowledge base search."},
  {id:"ig33",name:"Dropbox",cat:"Productivity",color:"#0061FF",desc:"Share and store files via Dropbox",connected:false,fields:["Access Token","App Key"],rating:4.2,installs:2800,longDesc:"Auto-save conversation attachments to Dropbox. Share files directly from Dropbox in conversations."},
  {id:"ig34",name:"Trello",cat:"Project Management",color:"#0079BF",desc:"Create cards from conversations",connected:false,fields:["API Key","Token","Board ID"],rating:4.3,installs:3200,longDesc:"Turn support conversations into Trello cards. Track progress and get notified on card updates."},
  {id:"ig35",name:"Confluence",cat:"Productivity",color:"#172B4D",desc:"Link knowledge base articles",connected:false,fields:["Domain","Email","API Token"],rating:4.1,installs:2100,longDesc:"Search Confluence pages from conversations. Link KB articles and sync documentation."},
  {id:"ig36",name:"Zendesk Chat",cat:"Communication",color:"#03363D",desc:"Migrate live chat from Zendesk",connected:false,fields:["Account Key","API Token"],rating:3.8,installs:1200,longDesc:"Import Zendesk Chat history, triggers, and agent data into SupportDesk."},
  {id:"ig37",name:"Pipedrive",cat:"CRM",color:"#00B388",desc:"Sync deals and contacts",connected:false,fields:["API Token","Company Domain"],rating:4.4,installs:2900,longDesc:"Two-way sync between Pipedrive and SupportDesk. View deal info in conversations and create deals from support tickets."},
  {id:"ig38",name:"Zoho CRM",cat:"CRM",color:"#E42527",desc:"Contact and ticket sync with Zoho",connected:false,fields:["Client ID","Client Secret","Refresh Token"],rating:4.2,installs:3400,longDesc:"Sync contacts, tickets, and modules between Zoho CRM and SupportDesk bi-directionally."},
  {id:"ig39",name:"BigCommerce",cat:"E-commerce",color:"#34313F",desc:"Order and customer data sync",connected:false,fields:["Store Hash","Access Token"],rating:4.3,installs:1800,longDesc:"View BigCommerce orders in conversations. Process refunds and track shipments."},
  {id:"ig40",name:"PayPal",cat:"Payments",color:"#003087",desc:"View PayPal transactions and disputes",connected:false,fields:["Client ID","Secret","Sandbox Mode"],rating:4.4,installs:3100,longDesc:"See PayPal payment history, refund status, and dispute details in the conversation sidebar."},
  {id:"ig41",name:"Square",cat:"Payments",color:"#006AFF",desc:"Payment and invoice management",connected:false,fields:["Access Token","Location ID"],rating:4.1,installs:1600,longDesc:"View Square payments, invoices, and customer info within support conversations."},
  {id:"ig42",name:"Amplitude",cat:"Analytics",color:"#1D2B3A",desc:"Product analytics integration",connected:false,fields:["API Key","Secret Key"],rating:4.5,installs:2200,isNew:true,longDesc:"Send support events to Amplitude. Analyze how support interactions impact product metrics and retention."},
  {id:"ig43",name:"Datadog",cat:"Analytics",color:"#632CA6",desc:"Monitor support metrics in Datadog",connected:false,fields:["API Key","App Key"],rating:4.6,installs:1900,longDesc:"Push SupportDesk metrics to Datadog dashboards. Set up alerts for SLA breaches and volume spikes."},
  {id:"ig44",name:"Sentry",cat:"Development",color:"#362D59",desc:"Link error reports to conversations",connected:false,fields:["Auth Token","Organization","Project"],rating:4.5,installs:2800,longDesc:"Auto-link Sentry error reports to related support conversations. See stack traces and error context."},
  {id:"ig45",name:"GitLab",cat:"Development",color:"#FC6D26",desc:"Create issues from conversations",connected:false,fields:["Personal Access Token","Project ID"],rating:4.3,installs:2100,longDesc:"Create GitLab issues from support tickets. Sync status and get notified when issues are resolved."},
  {id:"ig46",name:"Vercel",cat:"Development",color:"#000",desc:"Link deployments to support issues",connected:false,fields:["Access Token","Team ID"],rating:4.2,installs:1400,isNew:true,longDesc:"See Vercel deployment status in conversations. Link deployment failures to customer-reported issues."},
  {id:"ig47",name:"Supabase",cat:"Development",color:"#3ECF8E",desc:"Database and auth integration",connected:false,fields:["Project URL","Service Role Key"],rating:4.4,installs:1600,isNew:true,longDesc:"Query Supabase databases from conversations. Look up user data and authentication logs."},
  {id:"ig48",name:"Firebase",cat:"Development",color:"#FFCA28",desc:"User data and push notifications",connected:false,fields:["Project ID","Service Account JSON"],rating:4.3,installs:2400,longDesc:"Look up Firebase user data in conversations. Send push notifications via Firebase Cloud Messaging."},
  {id:"ig49",name:"SendGrid",cat:"Marketing",color:"#1A82E2",desc:"Transactional and marketing emails",connected:false,fields:["API Key"],rating:4.5,installs:3800,longDesc:"Send transactional emails via SendGrid. Track delivery, opens, and clicks from within SupportDesk."},
  {id:"ig50",name:"Brevo",cat:"Marketing",color:"#0B996E",desc:"Email and SMS marketing automation",connected:false,fields:["API Key"],rating:4.2,installs:2100,longDesc:"Sync contacts with Brevo (formerly Sendinblue). Trigger email/SMS workflows from support events."},
  {id:"ig51",name:"Calendly",cat:"Productivity",color:"#006BFF",desc:"Schedule meetings from conversations",connected:false,fields:["Personal Access Token"],rating:4.6,installs:4200,featured:true,longDesc:"Share Calendly links in conversations. Auto-create events when meetings are booked. See upcoming appointments in contact sidebar."},
  {id:"ig52",name:"Typeform",cat:"Productivity",color:"#262627",desc:"Collect feedback with forms",connected:false,fields:["Access Token","Form ID"],rating:4.3,installs:2600,longDesc:"Embed Typeform surveys post-resolution. Sync responses as contact attributes and CSAT data."},
  {id:"ig53",name:"Clearbit",cat:"Data Enrichment",color:"#3E5BF5",desc:"Auto-enrich contact profiles",connected:false,fields:["API Key"],rating:4.7,installs:3200,featured:true,longDesc:"Automatically enrich contacts with company data, job title, social profiles, and technographics from Clearbit."},
  {id:"ig54",name:"FullStory",cat:"Analytics",color:"#448DFC",desc:"Session replays for support context",connected:false,fields:["API Key","Org ID"],rating:4.5,installs:1800,longDesc:"View FullStory session replays linked to support conversations. See exactly what the customer experienced."},
  {id:"ig55",name:"Chargebee",cat:"Payments",color:"#FF6C37",desc:"Subscription billing management",connected:false,fields:["Site","API Key"],rating:4.4,installs:2200,longDesc:"View Chargebee subscription details, invoices, and payment history in conversations. Process upgrades and cancellations."},
  {id:"ig56",name:"Freshsales",cat:"CRM",color:"#3E8EF7",desc:"Sales CRM integration",connected:false,fields:["Domain","API Key"],rating:4.1,installs:1400,longDesc:"Sync contacts and deals with Freshsales. View sales pipeline context in support conversations."},
  {id:"ig57",name:"Webflow",cat:"Development",color:"#4353FF",desc:"Link Webflow forms to conversations",connected:false,fields:["API Token","Site ID"],rating:4.0,installs:1100,isNew:true,longDesc:"Route Webflow form submissions into SupportDesk conversations. Auto-create contacts from form data."},
  {id:"ig58",name:"Aircall",cat:"Communication",color:"#00B388",desc:"Cloud phone system integration",connected:false,fields:["API ID","API Token"],rating:4.5,installs:2600,longDesc:"Sync call logs, voicemails, and recordings from Aircall. Click-to-call from conversations."},
  {id:"ig59",name:"Help Scout",cat:"Communication",color:"#1292EE",desc:"Migrate from Help Scout",connected:false,fields:["API Key"],rating:4.0,installs:980,longDesc:"Import Help Scout mailboxes, conversations, customers, tags, and saved replies into SupportDesk."},
  {id:"ig60",name:"Anthropic",cat:"AI",color:"#D4A574",desc:"Native Claude integration for advanced AI",connected:true,fields:["API Key"],rating:4.9,installs:8400,featured:true,longDesc:"Built-in integration powering AI Copilot, Auto-Reply, Smart Classification, Summarization, and AI Studio tools. Already configured and ready to use."},
  {id:"ig61",name:"Zendesk Sell",cat:"CRM",color:"#03363D",desc:"Sync deals and contacts with Zendesk Sell",connected:false,fields:["API Token","Subdomain"],rating:4.1,installs:1200,longDesc:"Two-way sync contacts, deals, and notes between SupportDesk and Zendesk Sell CRM."},
  {id:"ig62",name:"Copper CRM",cat:"CRM",color:"#F7941D",desc:"Google-native CRM integration",connected:false,fields:["API Key","Email"],rating:4.2,installs:980,longDesc:"Sync contacts and deals from Copper CRM. View customer context in conversations."},
  {id:"ig63",name:"Freshworks CRM",cat:"CRM",color:"#FF5A1F",desc:"Full Freshworks suite integration",connected:false,fields:["API Key","Domain"],rating:4.3,installs:1560,longDesc:"Connect with Freshworks CRM for contact sync, deal tracking, and lifecycle management."},
  {id:"ig64",name:"Magento",cat:"E-commerce",color:"#EE672F",desc:"Adobe Commerce order & customer sync",connected:false,fields:["Store URL","Access Token"],rating:4.3,installs:1880,longDesc:"View Magento orders, process refunds, and access customer purchase history in conversations."},
  {id:"ig65",name:"PrestaShop",cat:"E-commerce",color:"#DF0067",desc:"Sync orders from PrestaShop stores",connected:false,fields:["Store URL","API Key"],rating:4.0,installs:740,longDesc:"Access PrestaShop order data, customer profiles, and product information directly in support conversations."},
  {id:"ig66",name:"Squarespace",cat:"E-commerce",color:"#111",desc:"Squarespace commerce integration",connected:false,fields:["API Key","Site ID"],rating:4.1,installs:1320,longDesc:"View Squarespace orders, manage customers, and track order status from conversations."},
  {id:"ig67",name:"Paddle",cat:"Payments",color:"#FFD43A",desc:"Subscription billing platform",connected:false,fields:["Vendor ID","Auth Code"],rating:4.4,installs:1560,longDesc:"View Paddle subscriptions, process refunds, and see payment history for SaaS customers."},
  {id:"ig68",name:"Recurly",cat:"Payments",color:"#75B73B",desc:"Subscription management platform",connected:false,fields:["API Key","Subdomain"],rating:4.2,installs:920,longDesc:"Access Recurly subscription data, invoices, and manage billing issues from conversations."},
  {id:"ig69",name:"Lemon Squeezy",cat:"Payments",color:"#FFC233",desc:"Digital product payment platform",connected:false,fields:["API Key","Store ID"],rating:4.5,installs:1240,isNew:true,longDesc:"View Lemon Squeezy orders, license keys, and subscription status for digital product support."},
  {id:"ig70",name:"ClickUp",cat:"Project Management",color:"#7B68EE",desc:"All-in-one project management",connected:false,fields:["API Token","Space ID"],rating:4.6,installs:3200,isNew:true,longDesc:"Create ClickUp tasks from conversations, sync statuses, and manage support-related projects."},
  {id:"ig71",name:"Basecamp",cat:"Project Management",color:"#1D2D35",desc:"Project communication hub",connected:false,fields:["Account ID","Access Token"],rating:4.0,installs:780,longDesc:"Create Basecamp to-dos from conversations and post updates to project message boards."},
  {id:"ig72",name:"Todoist",cat:"Productivity",color:"#E44332",desc:"Personal task management",connected:false,fields:["API Token"],rating:4.3,installs:1680,longDesc:"Create Todoist tasks from conversations. Agents can manage their personal support task list."},
  {id:"ig73",name:"Coda",cat:"Productivity",color:"#F46A54",desc:"All-in-one doc collaboration",connected:false,fields:["API Token","Doc ID"],rating:4.2,installs:890,longDesc:"Export conversation data and create structured documents in Coda for knowledge management."},
  {id:"ig74",name:"OneNote",cat:"Productivity",color:"#7719AA",desc:"Microsoft note-taking integration",connected:false,fields:["Client ID","Client Secret"],rating:4.1,installs:1120,longDesc:"Save conversation notes, summaries, and meeting records to OneNote notebooks."},
  {id:"ig75",name:"Evernote",cat:"Productivity",color:"#00A82D",desc:"Note-taking and organization",connected:false,fields:["Developer Token"],rating:3.9,installs:640,longDesc:"Clip conversations and save support notes to Evernote for reference."},
  {id:"ig76",name:"Tableau",cat:"Analytics",color:"#E97627",desc:"Advanced data visualization",connected:false,fields:["Server URL","Personal Access Token"],rating:4.5,installs:1980,longDesc:"Push SupportDesk metrics to Tableau for advanced visualization, custom dashboards, and executive reporting."},
  {id:"ig77",name:"Looker",cat:"Analytics",color:"#4285F4",desc:"Google business intelligence",connected:false,fields:["Client ID","Client Secret","Instance URL"],rating:4.4,installs:1340,longDesc:"Connect to Looker for enterprise-grade analytics dashboards and cross-platform reporting."},
  {id:"ig78",name:"Heap",cat:"Analytics",color:"#5041BC",desc:"Digital insights platform",connected:false,fields:["App ID","API Key"],rating:4.3,installs:1120,longDesc:"Track user behavior across support interactions. Correlate product usage with support needs."},
  {id:"ig79",name:"PostHog",cat:"Analytics",color:"#1D4AFF",desc:"Open-source product analytics",connected:false,fields:["API Key","Host URL"],rating:4.6,installs:2400,isNew:true,longDesc:"Send support events to PostHog. Analyze feature adoption, session replays, and user behavior alongside support data."},
  {id:"ig80",name:"Hotjar",cat:"Analytics",color:"#FD3A5C",desc:"User behavior analytics",connected:false,fields:["Site ID","API Key"],rating:4.2,installs:1560,longDesc:"View Hotjar session recordings linked to support conversations. Understand what users experienced before contacting support."},
  {id:"ig81",name:"BambooHR",cat:"HR",color:"#73C41D",desc:"HR platform for internal support",connected:false,fields:["API Key","Subdomain"],rating:4.3,installs:980,longDesc:"Access employee data for internal IT support. Auto-route tickets based on department."},
  {id:"ig82",name:"Workday",cat:"HR",color:"#0875E1",desc:"Enterprise HR management",connected:false,fields:["Tenant","Client ID","Client Secret"],rating:4.1,installs:640,longDesc:"Sync employee directory for internal helpdesk. Auto-populate user profiles from Workday."},
  {id:"ig83",name:"Okta",cat:"Security",color:"#007DC1",desc:"Identity and access management",connected:false,fields:["Domain","API Token"],rating:4.5,installs:2100,longDesc:"SSO authentication, user provisioning, and secure agent login via Okta."},
  {id:"ig84",name:"Auth0",cat:"Security",color:"#EB5424",desc:"Identity platform",connected:false,fields:["Domain","Client ID","Client Secret"],rating:4.4,installs:1780,longDesc:"Integrate Auth0 for SSO, multi-factor authentication, and secure customer identity verification."},
  {id:"ig85",name:"1Password",cat:"Security",color:"#0572EC",desc:"Team password management",connected:false,fields:["Service Account Token"],rating:4.6,installs:1420,longDesc:"Secure credential storage for integration API keys and shared team passwords."},
  {id:"ig86",name:"Gainsight",cat:"Customer Success",color:"#ED6B23",desc:"Customer success platform",connected:false,fields:["API Key","Domain"],rating:4.4,installs:1340,isNew:true,longDesc:"Sync health scores, track customer journeys, and correlate support interactions with success metrics."},
  {id:"ig87",name:"ChurnZero",cat:"Customer Success",color:"#5B2D8E",desc:"Real-time customer success",connected:false,fields:["API Key","App Key"],rating:4.3,installs:980,longDesc:"Feed support data into churn prediction models. Alert CSMs when at-risk customers contact support."},
  {id:"ig88",name:"Pendo",cat:"Customer Success",color:"#E04F69",desc:"Product analytics & in-app guides",connected:false,fields:["Integration Key"],rating:4.5,installs:1680,longDesc:"View Pendo usage data in conversations. Understand product adoption context during support interactions."},
  {id:"ig89",name:"Snowflake",cat:"Data",color:"#29B5E8",desc:"Cloud data warehouse",connected:false,fields:["Account","Username","Password","Warehouse"],rating:4.6,installs:1980,longDesc:"Stream support data to Snowflake for advanced analytics, ML models, and data warehouse integration."},
  {id:"ig90",name:"BigQuery",cat:"Data",color:"#4285F4",desc:"Google cloud data warehouse",connected:false,fields:["Project ID","Service Account JSON"],rating:4.5,installs:2240,longDesc:"Export conversations, metrics, and event data to BigQuery for SQL analytics and ML pipelines."},
  {id:"ig91",name:"Redshift",cat:"Data",color:"#8C4FFF",desc:"AWS data warehouse",connected:false,fields:["Host","Database","Username","Password"],rating:4.3,installs:1120,longDesc:"Stream support data to Amazon Redshift for enterprise analytics and business intelligence."},
  {id:"ig92",name:"Twitch",cat:"Communication",color:"#9146FF",desc:"Live stream chat support",connected:false,fields:["Client ID","OAuth Token","Channel"],rating:4.0,installs:780,longDesc:"Monitor and respond to Twitch chat messages. Route viewer support requests to SupportDesk conversations."},
  {id:"ig93",name:"WhatsApp Cloud",cat:"Communication",color:"#25D366",desc:"Meta WhatsApp Cloud API",connected:false,fields:["Phone Number ID","Access Token","Business ID"],rating:4.7,installs:4200,isNew:true,featured:true,longDesc:"Direct integration with Meta's WhatsApp Cloud API. Lower costs and faster setup than Business API."},
  {id:"ig94",name:"Tawk.to",cat:"Communication",color:"#03A84E",desc:"Migrate from Tawk.to",connected:false,fields:["API Key","Property ID"],rating:3.9,installs:680,longDesc:"Import chat history, canned responses, and visitor data from Tawk.to into SupportDesk."},
  {id:"ig95",name:"LiveChat",cat:"Communication",color:"#FF5100",desc:"Migrate from LiveChat",connected:false,fields:["API Token","Organization ID"],rating:4.0,installs:920,longDesc:"Import conversation history, agents, canned responses, and tags from LiveChat."},
  {id:"ig96",name:"Power BI",cat:"Analytics",color:"#F2C811",desc:"Microsoft business intelligence",connected:false,fields:["Client ID","Client Secret","Tenant ID"],rating:4.4,installs:1780,longDesc:"Push SupportDesk data to Power BI dashboards for enterprise reporting and executive analytics."},
  {id:"ig97",name:"Retool",cat:"Development",color:"#3D3D3D",desc:"Internal tool builder",connected:false,fields:["API Key"],rating:4.5,installs:1560,isNew:true,longDesc:"Build custom admin panels and internal tools that integrate with SupportDesk data via API."},
  {id:"ig98",name:"Grafana",cat:"Development",color:"#F46800",desc:"Monitoring and observability",connected:false,fields:["API Key","Instance URL"],rating:4.4,installs:1340,longDesc:"Create real-time monitoring dashboards for support metrics, SLA compliance, and system health."},
  {id:"ig99",name:"PagerDuty",cat:"Development",color:"#06AC38",desc:"Incident management",connected:false,fields:["API Key","Service ID"],rating:4.5,installs:1680,longDesc:"Trigger PagerDuty incidents from critical support conversations. Auto-escalate P1 tickets to on-call engineers."},
  {id:"ig100",name:"LaunchDarkly",cat:"Development",color:"#405BFF",desc:"Feature flag management",connected:false,fields:["SDK Key","Project Key"],rating:4.3,installs:980,isNew:true,longDesc:"View feature flag status for customers during support. Check if issues are related to feature rollouts."}
];
const API_KEYS_INIT=[
  {id:"ak1",name:"Production Key",key:"sk_live_4f8a...b2c1",created:"01/02/26",lastUsed:"16/03/26",status:"active",calls:12840,limit:50000,perms:["read","write","webhook"]},
  {id:"ak2",name:"Development Key",key:"sk_test_7d2e...a9f3",created:"15/01/26",lastUsed:"14/03/26",status:"active",calls:3420,limit:10000,perms:["read"]},
  {id:"ak3",name:"Analytics Bot",key:"sk_live_1c9b...e4d7",created:"20/12/25",lastUsed:"10/03/26",status:"revoked",calls:8900,limit:25000,perms:["read","webhook"]}
];
const WH_INIT=[
  {id:"wh1",url:"https://api.acme.com/webhooks/sd",events:["conversation.created","message.created","conversation.resolved"],status:"active",created:"05/01/26",deliveries:4280,failures:12,lastDelivery:"16/03/26 14:22"},
  {id:"wh2",url:"https://hooks.zapier.com/hooks/catch/123",events:["contact.created","contact.updated"],status:"active",created:"20/02/26",deliveries:890,failures:3,lastDelivery:"15/03/26 09:11"},
  {id:"wh3",url:"https://n8n.internal.co/webhook/sd",events:["conversation.created","conversation.resolved","agent.assigned"],status:"paused",created:"01/03/26",deliveries:120,failures:28,lastDelivery:"10/03/26 16:45"}
];
const API_LOGS_INIT=[
  {id:"al1",method:"GET",path:"/v1/conversations",status:200,duration:42,time:"14:22:01",ip:"103.21.58.44"},
  {id:"al2",method:"POST",path:"/v1/messages",status:201,duration:128,time:"14:21:55",ip:"103.21.58.44"},
  {id:"al3",method:"GET",path:"/v1/contacts/ct1",status:200,duration:18,time:"14:21:30",ip:"198.51.100.42"},
  {id:"al4",method:"PUT",path:"/v1/conversations/cv1",status:200,duration:95,time:"14:20:12",ip:"103.21.58.44"},
  {id:"al5",method:"DELETE",path:"/v1/labels/l99",status:404,duration:12,time:"14:19:45",ip:"81.2.69.144"},
  {id:"al6",method:"POST",path:"/v1/webhooks/test",status:200,duration:340,time:"14:18:22",ip:"103.21.58.44"},
  {id:"al7",method:"GET",path:"/v1/agents",status:200,duration:22,time:"14:17:10",ip:"198.51.100.42"},
  {id:"al8",method:"POST",path:"/v1/conversations",status:429,duration:5,time:"14:16:02",ip:"81.2.69.144"},
  {id:"al9",method:"GET",path:"/v1/reports/summary",status:200,duration:890,time:"14:15:00",ip:"103.21.58.44"},
  {id:"al10",method:"POST",path:"/v1/messages",status:500,duration:2100,time:"14:14:30",ip:"81.2.69.144"}
];
const WH_EVENTS={"Conversations":["conversation.created","conversation.resolved","conversation.reopened","conversation.assigned"],"Messages":["message.created","message.updated"],"Contacts":["contact.created","contact.updated","contact.deleted"],"Agents":["agent.status_changed","agent.assigned"]};
const DOC_SECTIONS=["overview","auth","conversations","messages","contacts","agents","webhooks","errors","rate-limits"];

export default function IntegrationsScr(){
  const [itab,setItab]=useState("marketplace");
  const [integs,setIntegs]=useState(INTEG_LIST);
  const [apiKeys,setApiKeys]=useState(API_KEYS_INIT);
  const [webhooks,setWebhooks]=useState(WH_INIT);
  const [logs]=useState(API_LOGS_INIT);
  const [connectModal,setConnectModal]=useState(null);
  const [configModal,setConfigModal]=useState(null);
  const [detailModal,setDetailModal]=useState(null);
  const [showNewKey,setShowNewKey]=useState(false);
  const [showNewWH,setShowNewWH]=useState(false);
  const [whLogs,setWhLogs]=useState(null);
  const [docSec,setDocSec]=useState("overview");
  // AI Integration Recommender
  const [igAi,setIgAi]=useState(null);const [igAiLoad,setIgAiLoad]=useState(false);
  const genIgAi=async()=>{setIgAiLoad(true);try{const connected=integs.filter(i=>i.connected).map(i=>i.name).join(", ");const notConn=integs.filter(i=>!i.connected).slice(0,5).map(i=>i.name).join(", ");const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,system:"You are an integration advisor for a support SaaS. Recommend integrations based on connected tools. 4-5 bullets with specific tool names. No markdown.",messages:[{role:"user",content:`Connected: ${connected}. Not connected: ${notConn}. Total available: ${integs.length}.`}]})});const d=await r.json();setIgAi(d.content?.[0]?.text);}catch{setIgAi("🔗 Connect Slack — your team uses Team Chat heavily, Slack sync would reduce context switching\n📊 Salesforce integration would auto-sync your "+integs.filter(i=>i.connected).length+" CRM contacts\n🤖 Zapier unlocks 5000+ app connections — automate ticket creation from forms\n⚡ You have Jira connected but not Linear — your engineering team may prefer Linear's speed\n💡 Enable Stripe to auto-tag billing conversations with payment status");}setIgAiLoad(false);};
  const [logFilter,setLogFilter]=useState("all");
  const [integFilter,setIntegFilter]=useState("all");
  const [mktSearch,setMktSearch]=useState("");
  const [newKeyName,setNewKeyName]=useState("");
  const [newKeyPerms,setNewKeyPerms]=useState(["read"]);
  const [newWhUrl,setNewWhUrl]=useState("");
  const [newWhEvents,setNewWhEvents]=useState([]);
  const [generatedKey,setGeneratedKey]=useState(null);
  const [connectFields,setConnectFields]=useState({});
  const [testResult,setTestResult]=useState(null);
  const [configTab,setConfigTab]=useState("settings");
  const [integConfigs,setIntegConfigs]=useState(()=>{
    const cfg={};INTEG_LIST.forEach(ig=>{cfg[ig.id]={autoSync:true,syncOnClose:false,twoWay:true,importHistory:false};});return cfg;
  });
  const [editKeyId,setEditKeyId]=useState(null);
  const [editKeyName,setEditKeyName]=useState("");
  const [editWhId,setEditWhId]=useState(null);
  const [editWhUrl,setEditWhUrl]=useState("");

  const cats=[...new Set(integs.map(i=>i.cat))];
  const filteredIntegs=integs.filter(i=>{
    if(integFilter==="all")return true;
    if(integFilter==="connected")return i.connected;
    return i.cat===integFilter;
  });
  const filteredLogs=logs.filter(l=>logFilter==="all"||(logFilter==="2xx"&&l.status<300)||(logFilter==="4xx"&&l.status>=400&&l.status<500)||(logFilter==="5xx"&&l.status>=500));
  const methodColor=m=>({GET:C.g,POST:C.a,PUT:C.y,DELETE:C.r,PATCH:C.p}[m]||C.t3);
  const statusColor=s=>s<300?C.g:s<400?C.a:s<500?C.y:C.r;

  const doConnect=ig=>{
    const vals=connectFields;
    const missing=ig.fields.filter(f=>!vals[f]?.trim());
    if(missing.length)return showT(missing[0]+" is required","error");
    setTestResult("testing");
    setTimeout(()=>{
      setTestResult("success");
      setTimeout(()=>{setIntegs(p=>p.map(x=>x.id===ig.id?{...x,connected:true}:x));setConnectModal(null);setConnectFields({});setTestResult(null);showT(ig.name+" connected!","success");},800);
    },1500);
  };
  const disconnect=id=>{setIntegs(p=>p.map(x=>x.id===id?{...x,connected:false}:x));setConfigModal(null);showT("Disconnected","success");};
  const createKey=()=>{
    if(!newKeyName.trim())return showT("Name required","error");
    const key="sk_live_"+uid()+"..."+uid().slice(0,4);
    setGeneratedKey(key);
    setApiKeys(p=>[{id:"ak"+uid(),name:newKeyName,key,created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),lastUsed:"—",status:"active",calls:0,limit:10000,perms:newKeyPerms},...p]);
  };
  const toggleKey=id=>setApiKeys(p=>p.map(k=>k.id===id?{...k,status:k.status==="active"?"revoked":"active"}:k));
  const createWH=()=>{
    if(!newWhUrl.trim()||!newWhUrl.startsWith("http"))return showT("Valid URL required","error");
    if(!newWhEvents.length)return showT("Select at least one event","error");
    setWebhooks(p=>[{id:"wh"+uid(),url:newWhUrl,events:newWhEvents,status:"active",created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),deliveries:0,failures:0,lastDelivery:"—"},...p]);
    setShowNewWH(false);setNewWhUrl("");setNewWhEvents([]);showT("Webhook created!","success");
  };
  const toggleWH=id=>setWebhooks(p=>p.map(w=>w.id===id?{...w,status:w.status==="active"?"paused":"active"}:w));
  const deleteWH=id=>{setWebhooks(p=>p.filter(w=>w.id!==id));showT("Webhook deleted","success");};
  const toggleWhEvent=ev=>setNewWhEvents(p=>p.includes(ev)?p.filter(e=>e!==ev):[...p,ev]);

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <div style={{padding:"14px 24px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:14}}>
      <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Integrations & API</h2>
      <div style={{flex:1}}/>
      {itab==="api_keys"&&<Btn ch="+ New API Key" v="primary" onClick={()=>{setShowNewKey(true);setGeneratedKey(null);setNewKeyName("");setNewKeyPerms(["read"]);}}/>}
      {itab==="webhooks"&&<Btn ch="+ New Webhook" v="primary" onClick={()=>setShowNewWH(true)}/>}
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,background:C.s1,padding:"0 24px"}}>
      {[["marketplace","Marketplace","integrations"],["integrations","Connected","resolve"],["api_keys","API Keys","settings"],["webhooks","Webhooks","canned"],["api_logs","API Logs","reports"],["docs","Docs","knowledgebase"],["developer","Developer","settings"]].map(([id,lbl,navId])=>(
        <button key={id} onClick={()=>setItab(id)} style={{padding:"11px 16px",fontSize:10.5,fontWeight:700,fontFamily:FM,color:itab===id?C.a:C.t3,borderBottom:`2px solid ${itab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><NavIcon id={navId} s={13} col={itab===id?C.a:C.t3}/>{lbl}</button>
      ))}
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

      {/* ═══ MARKETPLACE ═══ */}
      {itab==="marketplace"&&<>
        {/* AI Integration Recommender */}
        <AiInsight title="INTEGRATION RECOMMENDER" loading={igAiLoad} onRefresh={genIgAi} items={igAi?igAi.split("\n").filter(l=>l.trim()).map(l=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh for AI-powered integration suggestions based on your usage patterns and connected tools."}]}/>
        {/* Hero search */}
        <div style={{background:`linear-gradient(135deg,${C.a}15,${C.p}15)`,border:`1px solid ${C.a}33`,borderRadius:16,padding:"24px",marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,fontFamily:FD,marginBottom:6}}>Integration Marketplace</div>
          <div style={{fontSize:13,color:C.t2,marginBottom:16}}>Connect {integs.length}+ tools to supercharge your support workflow</div>
          <div style={{display:"flex",alignItems:"center",gap:8,maxWidth:480,margin:"0 auto",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"8px 14px"}}>
            <span style={{color:C.t3,fontSize:14}}>⌕</span>
            <input value={mktSearch} onChange={e=>setMktSearch(e.target.value)} placeholder="Search integrations…" style={{flex:1,background:"none",border:"none",fontSize:14,color:C.t1,fontFamily:FB,outline:"none"}}/>
            {mktSearch&&<button onClick={()=>setMktSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:14}}>
            {[{l:integs.length+" Apps",c:C.a},{l:integs.filter(i=>i.connected).length+" Connected",c:C.g},{l:integs.filter(i=>i.isNew).length+" New",c:C.p}].map(s=>(
              <span key={s.l} style={{fontSize:11,fontFamily:FM,color:s.c,fontWeight:700}}>{s.l}</span>
            ))}
          </div>
        </div>

        {/* Search results */}
        {mktSearch?<>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:12}}>Results for "{mktSearch}"</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {integs.filter(ig=>ig.name.toLowerCase().includes(mktSearch.toLowerCase())||ig.cat.toLowerCase().includes(mktSearch.toLowerCase())||ig.desc.toLowerCase().includes(mktSearch.toLowerCase())).map(ig=>(
              <div key={ig.id} onClick={()=>setDetailModal(ig)} style={{background:C.s1,border:`1px solid ${ig.connected?C.g+"44":C.b1}`,borderRadius:14,padding:"16px",cursor:"pointer",transition:"all .15s"}} className="hov">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:36,height:36,borderRadius:9,background:ig.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={ig.name} s={22}/></div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{ig.name}</div><div style={{fontSize:10,color:C.t3}}>{ig.cat}</div></div>
                  {ig.connected&&<Tag text="Connected" color={C.g}/>}
                </div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.4,marginBottom:8}}>{ig.desc}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:10,color:C.y,fontFamily:FM}}>★ {ig.rating}</span>
                  <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{(ig.installs/1000).toFixed(1)}k installs</span>
                </div>
              </div>
            ))}
          </div>
        </>:<>
          {/* Featured */}
          <div style={{fontSize:15,fontWeight:800,fontFamily:FD,marginBottom:12}}>⭐ Featured</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
            {integs.filter(ig=>ig.featured).slice(0,6).map(ig=>(
              <div key={ig.id} onClick={()=>setDetailModal(ig)} className="hov card-lift" style={{background:C.s1,border:`1px solid ${ig.connected?C.g+"44":C.a+"33"}`,borderRadius:14,padding:"16px",cursor:"pointer",transition:"all .15s",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,right:0,width:50,height:50,background:ig.color+"10",borderRadius:"0 0 0 50px"}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:40,height:40,borderRadius:10,background:ig.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={ig.name} s={24}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700}}>{ig.name}</div>
                    <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ig.cat}</div>
                  </div>
                  {ig.connected?<Tag text="Connected" color={C.g}/>:ig.isNew?<Tag text="New" color={C.p}/>:null}
                </div>
                <div style={{fontSize:11.5,color:C.t2,lineHeight:1.4,marginBottom:10}}>{ig.desc}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:10,color:C.y,fontFamily:FM,fontWeight:700}}>★ {ig.rating}</span>
                    <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{(ig.installs/1000).toFixed(1)}k</span>
                  </div>
                  <Btn ch={ig.connected?"Configure":"Install"} v={ig.connected?"ghost":"primary"} sm onClick={e=>{e.stopPropagation();ig.connected?setConfigModal(ig):setConnectModal(ig);}}/>
                </div>
              </div>
            ))}
          </div>

          {/* New arrivals */}
          {integs.some(ig=>ig.isNew)&&<>
            <div style={{fontSize:15,fontWeight:800,fontFamily:FD,marginBottom:12}}>🆕 New Arrivals</div>
            <div style={{display:"flex",gap:12,marginBottom:24,overflowX:"auto",paddingBottom:4}}>
              {integs.filter(ig=>ig.isNew).map(ig=>(
                <div key={ig.id} onClick={()=>setDetailModal(ig)} style={{background:C.s1,border:`1px solid ${C.p}33`,borderRadius:14,padding:"14px 16px",cursor:"pointer",minWidth:220,flexShrink:0}} className="hov">
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:32,height:32,borderRadius:8,background:ig.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={ig.name} s={18}/></div>
                    <div><div style={{fontSize:12,fontWeight:700}}>{ig.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{ig.cat}</div></div>
                    <Tag text="New" color={C.p}/>
                  </div>
                  <div style={{fontSize:10.5,color:C.t2,lineHeight:1.4}}>{ig.desc}</div>
                </div>
              ))}
            </div>
          </>}

          {/* Browse by category */}
          <div style={{fontSize:15,fontWeight:800,fontFamily:FD,marginBottom:12}}>Browse by Category</div>
          {[...new Set(integs.map(i=>i.cat))].map(cat=>{const items=integs.filter(i=>i.cat===cat);return(
            <div key={cat} style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{cat}</span>
                <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>({items.length})</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {items.map(ig=>(
                  <div key={ig.id} onClick={()=>setDetailModal(ig)} style={{background:C.s1,border:`1px solid ${ig.connected?C.g+"33":C.b1}`,borderRadius:12,padding:"12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .12s"}} className="hov">
                    <div style={{width:32,height:32,borderRadius:8,background:ig.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IntegLogo name={ig.name} s={18}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ig.name}</div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:9,color:C.y,fontFamily:FM}}>★{ig.rating}</span>
                        {ig.connected&&<span style={{width:5,height:5,borderRadius:"50%",background:C.g,flexShrink:0}}/>}
                        {ig.isNew&&<Tag text="New" color={C.p}/>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );})}
        </>}
      </>}

      {/* ═══ CONNECTED (previously Integrations) ═══ */}
      {itab==="integrations"&&<>
        <div style={{display:"flex",gap:4,marginBottom:16}}>
          {["all","connected",...cats].map(f=>(
            <button key={f} onClick={()=>setIntegFilter(f)} style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:integFilter===f?C.ad:"transparent",color:integFilter===f?C.a:C.t3,border:`1px solid ${integFilter===f?C.a+"50":C.b1}`,textTransform:"capitalize"}}>{f}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {filteredIntegs.map(ig=>(
            <div key={ig.id} style={{background:C.s1,border:`1px solid ${ig.connected?C.g+"44":C.b1}`,borderRadius:14,padding:"16px",transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:9,background:ig.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={ig.name} s={22}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{ig.name}</div>
                  <div style={{fontSize:10,color:C.t3}}>{ig.cat}</div>
                </div>
                {ig.connected&&<Tag text="Connected" color={C.g}/>}
              </div>
              <div style={{fontSize:11,color:C.t2,lineHeight:1.4,marginBottom:12}}>{ig.desc}</div>
              {ig.connected?
                <Btn ch="Configure" v="ghost" full onClick={()=>{setConfigModal(ig);setConfigTab("settings");}}/>:
                <Btn ch="Connect" v="primary" full onClick={()=>{setConnectModal(ig);setConnectFields({});setTestResult(null);}}/>
              }
            </div>
          ))}
        </div>
      </>}

      {/* ═══ API KEYS ═══ */}
      {itab==="api_keys"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {[{l:"Active Keys",v:apiKeys.filter(k=>k.status==="active").length,c:C.g},{l:"Total API Calls",v:apiKeys.reduce((s,k)=>s+k.calls,0).toLocaleString(),c:C.a},{l:"Avg Calls/Day",v:Math.round(apiKeys.reduce((s,k)=>s+k.calls,0)/30).toLocaleString(),c:C.cy}].map(s=>(
            <div key={s.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{s.l}</div>
              <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1.8fr 2fr 0.8fr 0.8fr 1fr 0.8fr 100px",padding:"9px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Name","Key","Created","Last Used","Usage","Status","Actions"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
          </div>
          {apiKeys.map(k=>(
            <div key={k.id} style={{display:"grid",gridTemplateColumns:"1.8fr 2fr 0.8fr 0.8fr 1fr 0.8fr 100px",padding:"12px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
              <div>{editKeyId===k.id?<div style={{display:"flex",gap:4}}><input value={editKeyName} onChange={e=>setEditKeyName(e.target.value)} style={{background:C.bg,border:`1px solid ${C.a}`,borderRadius:5,padding:"3px 6px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none",width:100}}/><button onClick={()=>{setApiKeys(p=>p.map(x=>x.id===k.id?{...x,name:editKeyName}:x));setEditKeyId(null);showT("Key renamed","success");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer"}}>✓</button></div>:<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12,fontWeight:600}}>{k.name}</span><button onClick={()=>{setEditKeyId(k.id);setEditKeyName(k.name);}} style={{fontSize:10,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>✎</button></div>}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <code style={{fontSize:11,fontFamily:FM,color:C.t2,background:C.bg,padding:"2px 8px",borderRadius:4}}>{k.key}</code>
                <button onClick={()=>{navigator.clipboard?.writeText(k.key);showT("Copied!","success");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer"}}>⎘</button>
              </div>
              <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{k.created}</span>
              <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{k.lastUsed}</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1,height:5,background:C.bg,borderRadius:3,maxWidth:60}}><div style={{width:`${Math.min((k.calls/k.limit)*100,100)}%`,height:"100%",background:k.calls/k.limit>0.8?C.r:k.calls/k.limit>0.5?C.y:C.g,borderRadius:3}}/></div>
                <span style={{fontSize:9,fontFamily:FM,color:C.t3}}>{k.calls.toLocaleString()}/{(k.limit/1000)+"k"}</span>
              </div>
              <Tag text={k.status} color={k.status==="active"?C.g:C.r}/>
              <div style={{display:"flex",gap:3}}>
                <button onClick={()=>toggleKey(k.id)} style={{fontSize:9,color:k.status==="active"?C.r:C.g,background:k.status==="active"?C.rd:C.gd,border:`1px solid ${k.status==="active"?C.r+"44":C.g+"44"}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:FM}}>{k.status==="active"?"Revoke":"Activate"}</button>
                <button onClick={()=>{setApiKeys(p=>p.filter(x=>x.id!==k.id));showT("Key deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:`1px solid ${C.r}44`,borderRadius:5,padding:"3px 6px",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {/* Code examples */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[{l:"curl",c:C.g,code:'curl -X GET \\\n  "https://api.deskapp.io/v1/conversations" \\\n  -H "Authorization: Bearer YOUR_KEY" \\\n  -H "Content-Type: application/json"'},
            {l:"Node.js",c:C.a,code:'const sdk = require("desk-sdk");\nconst client = sdk.init("YOUR_KEY");\n\nconst convs = await client.conversations.list();\nconsole.log(convs.data);'},
            {l:"Python",c:C.y,code:'from desk_sdk '+'im'+'port Client\nclient = Client("YOUR_KEY")\n\nconvs = client.conversations.list()\nfor c in convs:\n    print(c.subject)'}
          ].map(ex=>(
            <div key={ex.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:ex.c,fontFamily:FM}}>{ex.l}</span>
                <button onClick={()=>{navigator.clipboard?.writeText(ex.code);showT("Copied!","success");}} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>Copy</button>
              </div>
              <div style={{padding:"10px 12px",fontFamily:FM,fontSize:10.5,color:ex.c,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{ex.code}</div>
            </div>
          ))}
        </div>
      </>}

      {/* ═══ WEBHOOKS ═══ */}
      {itab==="webhooks"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[{l:"Active Webhooks",v:webhooks.filter(w=>w.status==="active").length,c:C.g},{l:"Total Deliveries",v:webhooks.reduce((s,w)=>s+w.deliveries,0).toLocaleString(),c:C.a},{l:"Failures",v:webhooks.reduce((s,w)=>s+w.failures,0),c:C.r},{l:"Success Rate",v:webhooks.reduce((s,w)=>s+w.deliveries,0)?Math.round((webhooks.reduce((s,w)=>s+w.deliveries,0)-webhooks.reduce((s,w)=>s+w.failures,0))/webhooks.reduce((s,w)=>s+w.deliveries,0)*100)+"%":"—",c:C.g}].map(s=>(
            <div key={s.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{s.l}</div>
              <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2.5fr 1.5fr 0.7fr 0.7fr 0.7fr 120px",padding:"9px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Endpoint","Events","Deliveries","Failures","Status","Actions"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
          </div>
          {webhooks.map(w=>(
            <div key={w.id} style={{display:"grid",gridTemplateColumns:"2.5fr 1.5fr 0.7fr 0.7fr 0.7fr 120px",padding:"12px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
              <div>
                {editWhId===w.id?<div style={{display:"flex",gap:4}}><input value={editWhUrl} onChange={e=>setEditWhUrl(e.target.value)} style={{background:C.bg,border:`1px solid ${C.a}`,borderRadius:5,padding:"3px 6px",fontSize:11,color:C.t1,fontFamily:FM,outline:"none",width:200}}/><button onClick={()=>{setWebhooks(p=>p.map(x=>x.id===w.id?{...x,url:editWhUrl}:x));setEditWhId(null);showT("URL updated","success");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer"}}>✓</button><button onClick={()=>setEditWhId(null)} style={{fontSize:10,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>✕</button></div>:
                <div><div style={{fontSize:12,fontWeight:600,color:C.a,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>{w.url}<button onClick={()=>{setEditWhId(w.id);setEditWhUrl(w.url);}} style={{fontSize:9,color:C.t3,background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✎</button></div><div style={{fontSize:10,color:C.t3,marginTop:2}}>Created {w.created} · Last: {w.lastDelivery}</div></div>}
              </div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{w.events.slice(0,2).map(e=><Tag key={e} text={e.split(".")[1]} color={C.cy}/>)}{w.events.length>2&&<Tag text={"+"+String(w.events.length-2)} color={C.t3}/>}</div>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.g}}>{w.deliveries.toLocaleString()}</span>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:w.failures>20?C.r:w.failures>5?C.y:C.g}}>{w.failures}</span>
              <Tag text={w.status} color={w.status==="active"?C.g:C.y}/>
              <div style={{display:"flex",gap:3}}>
                <button onClick={()=>toggleWH(w.id)} title={w.status==="active"?"Pause":"Resume"} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">{w.status==="active"?"⏸":"▶"}</button>
                <button onClick={()=>setWhLogs(w)} title="View Logs" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov"><NavIcon id="reports" s={10} col={C.t3}/></button>
                <button onClick={()=>{navigator.clipboard?.writeText(w.url);showT("URL copied","success");}} title="Copy URL" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">⎘</button>
                <button onClick={()=>deleteWH(w.id)} title="Delete" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.rd,border:`1px solid ${C.r}44`,cursor:"pointer",color:C.r}}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {/* Signing secret */}
        <div style={{marginTop:16,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>Webhook Signing Secret</div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
            <code style={{fontSize:12,fontFamily:FM,color:C.p,background:C.bg,padding:"6px 12px",borderRadius:6,flex:1}}>whsec_sd8f7g6h5j4k3l2m1n0p9...</code>
            <button onClick={()=>{navigator.clipboard?.writeText("whsec_sd8f7g6h5j4k3l2m1n0p9");showT("Secret copied","success");}} style={{padding:"5px 12px",borderRadius:6,fontSize:10,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>Copy</button>
          </div>
          <div style={{fontSize:11,color:C.t3,lineHeight:1.5}}>Use this secret to verify webhook signatures. Include the X-Signature header in your verification logic.</div>
        </div>
      </>}

      {/* ═══ API LOGS ═══ */}
      {itab==="api_logs"&&<>
        <div style={{display:"flex",gap:4,marginBottom:14}}>
          {["all","2xx","4xx","5xx"].map(f=>(
            <button key={f} onClick={()=>setLogFilter(f)} style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:logFilter===f?C.ad:"transparent",color:logFilter===f?C.a:C.t3,border:`1px solid ${logFilter===f?C.a+"50":C.b1}`}}>{f==="all"?"All":f}</button>
          ))}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"0.6fr 2fr 0.6fr 0.7fr 0.6fr 1fr",padding:"9px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Method","Path","Status","Duration","Time","IP"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
          </div>
          {filteredLogs.map(l=>(
            <div key={l.id} style={{display:"grid",gridTemplateColumns:"0.6fr 2fr 0.6fr 0.7fr 0.6fr 1fr",padding:"10px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:800,fontFamily:FM,color:methodColor(l.method),background:methodColor(l.method)+"15",padding:"2px 8px",borderRadius:4,textAlign:"center"}}>{l.method}</span>
              <span style={{fontSize:12,fontFamily:FM,color:C.a}}>{l.path}</span>
              <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:statusColor(l.status)}}>{l.status}</span>
              <span style={{fontSize:11,fontFamily:FM,color:l.duration>500?C.r:l.duration>100?C.y:C.g}}>{l.duration}ms</span>
              <span style={{fontSize:10,fontFamily:FM,color:C.t3}}>{l.time}</span>
              <span style={{fontSize:10,fontFamily:FM,color:C.t3}}>{l.ip}</span>
            </div>
          ))}
        </div>
      </>}

      {/* ═══ DOCS ═══ */}
      {itab==="docs"&&<div style={{display:"flex",gap:16}}>
        <div style={{width:180,flexShrink:0,position:"sticky",top:0,alignSelf:"flex-start"}}>
          {DOC_SECTIONS.map(s=>(
            <button key={s} onClick={()=>setDocSec(s)} style={{display:"block",width:"100%",padding:"8px 12px",fontSize:11.5,fontWeight:docSec===s?700:400,color:docSec===s?C.a:C.t2,background:docSec===s?C.ad:"transparent",border:"none",borderLeft:`2px solid ${docSec===s?C.a:"transparent"}`,cursor:"pointer",textAlign:"left",fontFamily:FB,marginBottom:1,textTransform:"capitalize"}}>{s.replace("-"," ")}</button>
          ))}
        </div>
        <div style={{flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"20px"}}>
          {docSec==="overview"&&<>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:8}}>API Overview</div>
            <p style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:16}}>The SupportDesk REST API lets you manage conversations, contacts, agents, and more programmatically. All endpoints return JSON and require Bearer token authentication.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[{l:"Base URL",v:"api.supportdesk.io/v1",c:C.a},{l:"Auth",v:"Bearer Token",c:C.g},{l:"Rate Limit",v:"1000 req/min",c:C.y}].map(c2=>(
                <div key={c2.l} style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{c2.l}</div>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:FM,color:c2.c}}>{c2.v}</div>
                </div>
              ))}
            </div>
          </>}
          {docSec==="auth"&&<>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:8}}>Authentication</div>
            <p style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:12}}>Include your API key in the Authorization header as a Bearer token with every request.</p>
            <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"12px",fontFamily:FM,fontSize:11,color:C.g,lineHeight:1.7,marginBottom:14}}>
              {"Authorization: Bearer sk_live_your_key_here"}
            </div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Permission Levels</div>
            {[{p:"read",d:"Read conversations, contacts, agents"},{p:"write",d:"Create/update conversations, contacts"},{p:"webhook",d:"Manage webhook subscriptions"},{p:"admin",d:"Full access including settings"}].map(x=>(
              <div key={x.p} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <Tag text={x.p} color={C.a}/><span style={{fontSize:12,color:C.t2}}>{x.d}</span>
              </div>
            ))}
          </>}
          {(docSec==="conversations"||docSec==="messages"||docSec==="contacts"||docSec==="agents")&&<>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:8,textTransform:"capitalize"}}>{docSec}</div>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
              {[{m:"GET",p:`/v1/${docSec}`,d:`List all ${docSec}`},{m:"GET",p:`/v1/${docSec}/:id`,d:`Get a single ${docSec.slice(0,-1)}`},{m:"POST",p:`/v1/${docSec}`,d:`Create a ${docSec.slice(0,-1)}`},{m:"PUT",p:`/v1/${docSec}/:id`,d:`Update a ${docSec.slice(0,-1)}`},{m:"DELETE",p:`/v1/${docSec}/:id`,d:`Delete a ${docSec.slice(0,-1)}`}].map((ep,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${C.b1}`}}>
                  <span style={{fontSize:10,fontWeight:800,fontFamily:FM,color:methodColor(ep.m),background:methodColor(ep.m)+"15",padding:"2px 8px",borderRadius:4,width:50,textAlign:"center"}}>{ep.m}</span>
                  <code style={{fontSize:11.5,fontFamily:FM,color:C.a}}>{ep.p}</code>
                  <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{ep.d}</span>
                </div>
              ))}
            </div>
          </>}
          {docSec==="webhooks"&&<>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:8}}>Webhooks</div>
            <p style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:12}}>Subscribe to events and receive real-time HTTP POST notifications.</p>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Available Events</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>{Object.values(WH_EVENTS).flat().map(e=><Tag key={e} text={e} color={C.cy}/>)}</div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Payload Format</div>
            <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"12px",fontFamily:FM,fontSize:11,color:C.p,lineHeight:1.6}}>
              {'{ "event": "message.created",'}<br/>{'  "timestamp": "2026-03-16T14:22:01Z",'}<br/>{'  "data": { "id": "msg_123", ... } }'}
            </div>
          </>}
          {docSec==="errors"&&<>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:8}}>Error Codes</div>
            {[{s:400,d:"Bad Request — invalid parameters"},{s:401,d:"Unauthorized — missing/invalid API key"},{s:403,d:"Forbidden — insufficient permissions"},{s:404,d:"Not Found — resource does not exist"},{s:429,d:"Rate Limited — too many requests"},{s:500,d:"Internal Error — server-side issue"}].map(e=>(
              <div key={e.s} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <span style={{fontSize:12,fontWeight:800,fontFamily:FM,color:statusColor(e.s),width:32}}>{e.s}</span>
                <span style={{fontSize:12,color:C.t2}}>{e.d}</span>
              </div>
            ))}
          </>}
          {docSec==="rate-limits"&&<>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:8}}>Rate Limits</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[{p:"Starter",l:"100/min",c:C.t3},{p:"Pro",l:"1,000/min",c:C.a},{p:"Enterprise",l:"10,000/min",c:C.p}].map(x=>(
                <div key={x.p} style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:4}}>{x.p}</div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:x.c}}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Rate Limit Headers</div>
            <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"12px",fontFamily:FM,fontSize:11,color:C.y,lineHeight:1.7}}>
              {"X-RateLimit-Limit: 1000"}<br/>{"X-RateLimit-Remaining: 847"}<br/>{"X-RateLimit-Reset: 1710600000"}
            </div>
          </>}
        </div>
      </div>}
    </div>

    {/* ═══ CONNECT MODAL ═══ */}
    {connectModal&&<Mdl title={"Connect "+connectModal.name} onClose={()=>{setConnectModal(null);setTestResult(null);}} w={460}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:40,height:40,borderRadius:10,background:connectModal.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={connectModal.name} s={26}/></div>
        <div><div style={{fontSize:14,fontWeight:700}}>{connectModal.name}</div><div style={{fontSize:11,color:C.t3}}>{connectModal.desc}</div></div>
      </div>
      {connectModal.fields.map(f=>(
        <Fld key={f} label={f}><Inp val={connectFields[f]||""} set={v=>setConnectFields(p=>({...p,[f]:v}))} ph={"Enter "+f.toLowerCase()}/></Fld>
      ))}
      {testResult==="success"&&<div style={{padding:"12px",background:C.gd,border:`1px solid ${C.g}44`,borderRadius:10,marginBottom:12,display:"flex",gap:8,alignItems:"center"}}><span style={{color:C.g,fontSize:16}}>✓</span><span style={{fontSize:12,color:C.g}}>Connection successful! API verified.</span></div>}
      {testResult==="testing"&&<div style={{display:"flex",gap:8,alignItems:"center",padding:"12px 0"}}><Spin/><span style={{fontSize:12,color:C.t2}}>Testing connection…</span></div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>{setConnectModal(null);setTestResult(null);}}/>
        <Btn ch={testResult==="testing"?"Testing…":"Test & Connect"} v="primary" disabled={testResult==="testing"} onClick={()=>doConnect(connectModal)}/>
      </div>
    </Mdl>}

    {/* ═══ CONFIGURE MODAL ═══ */}
    {configModal&&<Mdl title={"Configure "+configModal.name} onClose={()=>setConfigModal(null)} w={500}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 12px",background:C.s1,borderRadius:10,border:`1px solid ${configModal.color}33`}}>
        <div style={{width:36,height:36,borderRadius:9,background:configModal.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={configModal.name} s={22}/></div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{configModal.name}</div><div style={{fontSize:11,color:C.t3}}>{configModal.desc}</div></div>
        <Tag text="Connected" color={C.g}/>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,marginBottom:14}}>
        {["settings","activity","danger"].map(t=>(
          <button key={t} onClick={()=>setConfigTab(t)} style={{flex:1,padding:"9px",fontSize:11,fontWeight:700,fontFamily:FM,color:configTab===t?C.a:C.t3,borderBottom:`2px solid ${configTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>
      {configTab==="settings"&&<div>
        {[{k:"autoSync",l:"Auto-sync contacts",d:"Sync contact data automatically on schedule"},{k:"syncOnClose",l:"Sync on conversation close",d:"Push updates when a conversation is resolved"},{k:"twoWay",l:"Two-way sync",d:"Changes in either system update the other"},{k:"importHistory",l:"Import historical data",d:"Pull existing records on first connect"}].map(opt=>(
          <div key={opt.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <div><div style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{opt.l}</div><div style={{fontSize:10.5,color:C.t3,marginTop:2}}>{opt.d}</div></div>
            <Toggle val={integConfigs[configModal.id]?.[opt.k]||false} set={v=>{setIntegConfigs(p=>({...p,[configModal.id]:{...p[configModal.id],[opt.k]:v}}));showT(opt.l+(v?" enabled":" disabled"),"success");}}/>
          </div>
        ))}
        <div style={{marginTop:14,display:"flex",gap:8}}>
          <Btn ch="Force Sync Now" v="primary" full onClick={()=>showT("Sync started for "+configModal.name+"…","info")}/>
          <Btn ch="View Sync Logs" v="ghost" full onClick={()=>setConfigTab("activity")}/>
        </div>
      </div>}
      {configTab==="activity"&&<div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{l:"Total Syncs",v:"248",c:C.a},{l:"Last Sync",v:"2 min ago",c:C.g},{l:"Errors",v:"3",c:C.r}].map(s=>(
            <div key={s.l} style={{flex:1,textAlign:"center",padding:"10px",background:C.s1,borderRadius:8,border:`1px solid ${C.b1}`}}>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{s.l}</div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FM,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        {[{t:"16/03/26 14:22",e:"Synced 12 contacts",s:"success"},{t:"16/03/26 10:15",e:"Webhook received — new deal created",s:"success"},{t:"15/03/26 18:30",e:"Sync failed — rate limited (429)",s:"error"},{t:"15/03/26 14:00",e:"Synced 8 contacts, 3 deals",s:"success"},{t:"15/03/26 09:00",e:"Full sync completed (142 records)",s:"success"},{t:"14/03/26 22:10",e:"Webhook delivery failed — timeout",s:"error"}].map((ev,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:ev.s==="success"?C.g:C.r,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontSize:12,color:C.t1}}>{ev.e}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:1}}>{ev.t}</div></div>
            {ev.s==="error"&&<button onClick={()=>showT("Retrying…","info")} style={{fontSize:9,color:C.y,background:C.yd,border:`1px solid ${C.y}44`,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontFamily:FM}}>Retry</button>}
          </div>
        ))}
      </div>}
      {configTab==="danger"&&<div>
        <div style={{padding:"14px",background:C.rd,border:`1px solid ${C.r}44`,borderRadius:10,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.r,marginBottom:6}}>Disconnect {configModal.name}</div>
          <div style={{fontSize:11.5,color:C.t2,lineHeight:1.5}}>This will stop all syncs and remove saved credentials. Data already synced will not be deleted from either system.</div>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",marginBottom:14}}>
          <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:6}}>CONNECTED SINCE</div>
          <div style={{fontSize:13,color:C.t1}}>January 15, 2026 — 71 days ago</div>
        </div>
        <Btn ch={"Disconnect "+configModal.name} v="danger" full onClick={()=>disconnect(configModal.id)}/>
      </div>}
    </Mdl>}

    {/* ═══ NEW API KEY MODAL ═══ */}
    {showNewKey&&<Mdl title="Create API Key" onClose={()=>{setShowNewKey(false);setGeneratedKey(null);}} w={480}>
      {!generatedKey?<>
        <Fld label="Key Name"><Inp val={newKeyName} set={setNewKeyName} ph="e.g. Production Key"/></Fld>
        <Fld label="Permissions">
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["read","write","webhook","admin"].map(p=>(
              <button key={p} onClick={()=>setNewKeyPerms(pr=>pr.includes(p)?pr.filter(x=>x!==p):[...pr,p])} style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,fontFamily:FM,cursor:"pointer",background:newKeyPerms.includes(p)?C.a+"18":"transparent",color:newKeyPerms.includes(p)?C.a:C.t3,border:`1px solid ${newKeyPerms.includes(p)?C.a+"55":C.b1}`}}>{p}</button>
            ))}
          </div>
        </Fld>
        <Btn ch="Generate Key" v="primary" full onClick={createKey}/>
      </>:<>
        <div style={{padding:"14px",background:C.gd,border:`1px solid ${C.g}44`,borderRadius:10,marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.g,marginBottom:6}}>API Key Generated</div>
          <code style={{fontSize:13,fontFamily:FM,color:C.t1,display:"block",marginBottom:8,wordBreak:"break-all"}}>{generatedKey}</code>
          <button onClick={()=>{navigator.clipboard?.writeText(generatedKey);showT("Key copied!","success");}} style={{padding:"6px 16px",borderRadius:6,fontSize:11,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>Copy Key</button>
        </div>
        <div style={{padding:"10px",background:C.yd,border:`1px solid ${C.y}44`,borderRadius:8,fontSize:11,color:C.y}}>⚠ This key will only be shown once. Save it securely now.</div>
        <div style={{marginTop:12}}><Btn ch="Done" v="primary" full onClick={()=>{setShowNewKey(false);setGeneratedKey(null);}}/></div>
      </>}
    </Mdl>}

    {/* ═══ NEW WEBHOOK MODAL ═══ */}
    {showNewWH&&<Mdl title="New Webhook" onClose={()=>setShowNewWH(false)} w={520}>
      <Fld label="Endpoint URL"><Inp val={newWhUrl} set={setNewWhUrl} ph="https://api.yoursite.com/webhooks"/></Fld>
      <Fld label="Events">
        {Object.entries(WH_EVENTS).map(([group,evts])=>(
          <div key={group} style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,marginBottom:6}}>{group}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {evts.map(ev=>(
                <button key={ev} onClick={()=>toggleWhEvent(ev)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontFamily:FM,cursor:"pointer",background:newWhEvents.includes(ev)?C.cy+"18":"transparent",color:newWhEvents.includes(ev)?C.cy:C.t3,border:`1px solid ${newWhEvents.includes(ev)?C.cy+"55":C.b1}`}}>{ev}</button>
              ))}
            </div>
          </div>
        ))}
      </Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNewWH(false)}/><Btn ch="Create Webhook" v="primary" onClick={createWH}/></div>
    </Mdl>}

    {/* ═══ WEBHOOK LOGS MODAL ═══ */}
    {whLogs&&<Mdl title={"Logs — "+whLogs.url.slice(0,40)} onClose={()=>setWhLogs(null)} w={560}>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        <div style={{textAlign:"center",flex:1,padding:"8px",background:C.s1,borderRadius:8}}><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>Deliveries</div><div style={{fontSize:18,fontWeight:800,fontFamily:FM,color:C.g}}>{whLogs.deliveries}</div></div>
        <div style={{textAlign:"center",flex:1,padding:"8px",background:C.s1,borderRadius:8}}><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>Failures</div><div style={{fontSize:18,fontWeight:800,fontFamily:FM,color:C.r}}>{whLogs.failures}</div></div>
        <div style={{textAlign:"center",flex:1,padding:"8px",background:C.s1,borderRadius:8}}><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>Success Rate</div><div style={{fontSize:18,fontWeight:800,fontFamily:FM,color:whLogs.deliveries?C.g:C.t3}}>{whLogs.deliveries?Math.round((whLogs.deliveries-whLogs.failures)/whLogs.deliveries*100):0}%</div></div>
      </div>
      {[{t:"14:22:01",ev:"message.created",s:200,d:"42ms"},{t:"14:21:30",ev:"conversation.resolved",s:200,d:"65ms"},{t:"14:20:15",ev:"message.created",s:200,d:"38ms"},{t:"14:18:00",ev:"contact.updated",s:500,d:"2100ms"},{t:"14:15:45",ev:"conversation.created",s:200,d:"55ms"}].map((log,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.b1}22`}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:log.s<400?C.g:C.r,flexShrink:0}}/>
          <span style={{fontSize:11,fontFamily:FM,color:C.t3,width:60}}>{log.t}</span>
          <Tag text={log.ev.split(".")[1]} color={C.cy}/>
          <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:statusColor(log.s)}}>{log.s}</span>
          <span style={{fontSize:10,fontFamily:FM,color:C.t3,marginLeft:"auto"}}>{log.d}</span>
          <button onClick={()=>showT("Event replayed","success")} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>Replay</button>
        </div>
      ))}
      <div style={{marginTop:12}}><Btn ch="Send Test Delivery" v="primary" full onClick={()=>showT("Test webhook sent — 200 OK","success")}/></div>
    </Mdl>}

    {/* ═══ APP DETAIL MODAL ═══ */}
    {detailModal&&<div onClick={e=>e.target===e.currentTarget&&setDetailModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:16,width:600,maxWidth:"95vw",maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:13,background:detailModal.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><IntegLogo name={detailModal.name} s={32}/></div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20,fontWeight:800,fontFamily:FD}}>{detailModal.name}</span>
              {detailModal.isNew&&<Tag text="New" color={C.p}/>}
              {detailModal.connected&&<Tag text="Connected" color={C.g}/>}
            </div>
            <div style={{fontSize:12,color:C.t3,fontFamily:FM,marginTop:3}}>{detailModal.cat}</div>
          </div>
          <button onClick={()=>setDetailModal(null)} style={{background:"none",border:"none",color:C.t3,fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {/* Stats row */}
          <div style={{display:"flex",gap:16,marginBottom:20}}>
            {[{l:"Rating",v:<span>★ {detailModal.rating}</span>,c:C.y},{l:"Installs",v:(detailModal.installs/1000).toFixed(1)+"k",c:C.a},{l:"Category",v:detailModal.cat,c:C.cy},{l:"Status",v:detailModal.connected?"Connected":"Not installed",c:detailModal.connected?C.g:C.t3}].map(s=>(
              <div key={s.l} style={{flex:1,textAlign:"center",padding:"12px",background:C.s1,borderRadius:10,border:`1px solid ${C.b1}`}}>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{s.l}</div>
                <div style={{fontSize:15,fontWeight:700,fontFamily:FM,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          {/* Description */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:8}}>About</div>
            <p style={{fontSize:13,color:C.t2,lineHeight:1.7}}>{detailModal.longDesc||detailModal.desc}</p>
          </div>
          {/* Permissions */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:8}}>Required Permissions</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Read Conversations","Read Contacts","Write Messages","Webhook Events"].map(p=>(
                <div key={p} style={{padding:"6px 12px",borderRadius:8,background:C.s1,border:`1px solid ${C.b1}`,fontSize:11,color:C.t2,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{color:C.g,fontSize:10}}>✓</span>{p}
                </div>
              ))}
            </div>
          </div>
          {/* Credentials */}
          {detailModal.fields?.length>0&&<div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:8}}>Required Credentials</div>
            <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
              {detailModal.fields.map((f,i)=>(
                <div key={f} style={{padding:"10px 14px",borderBottom:i<detailModal.fields.length-1?`1px solid ${C.b1}`:"none",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:C.y}}><NavIcon id="settings" s={12} col={C.y}/></span>
                  <span style={{fontSize:12,color:C.t2}}>{f}</span>
                </div>
              ))}
            </div>
          </div>}
          {/* Rating breakdown */}
          <div>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:8}}>Ratings</div>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:32,fontWeight:800,fontFamily:FD,color:C.y}}>{detailModal.rating}</div>
                <div style={{fontSize:10,color:C.t3}}>out of 5</div>
              </div>
              <div style={{flex:1}}>
                {[5,4,3,2,1].map(r=>{const pct=r===5?Math.round(detailModal.rating*12):r===4?Math.round((5-detailModal.rating)*20):r===3?8:r===2?3:1;return(
                  <div key={r} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:12}}>{r}</span>
                    <div style={{flex:1,height:6,background:C.bg,borderRadius:3}}><div style={{width:pct+"%",height:"100%",background:C.y,borderRadius:3}}/></div>
                  </div>
                );})}
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:10,justifyContent:"flex-end"}}>
          {detailModal.connected?<>
            <Btn ch="Configure" v="ghost" onClick={()=>{setDetailModal(null);setConfigModal(detailModal);}}/>
            <Btn ch="Disconnect" v="danger" onClick={()=>{setIntegs(p=>p.map(x=>x.id===detailModal.id?{...x,connected:false}:x));setDetailModal(null);showT("Disconnected","success");}}/>
          </>:<>
            <Btn ch="Cancel" v="ghost" onClick={()=>setDetailModal(null)}/>
            <Btn ch="Install & Connect" v="primary" onClick={()=>{setDetailModal(null);setConnectModal(detailModal);}}/>
          </>}
        </div>
      </div>
    </div>}
      {itab==="developer"&&<DevConsoleScr/>}
  </div>;
}


