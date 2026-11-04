import { SOURCE_SITE, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/inquiry.mjs';
import { resolveClientGeo } from './geo.mjs';
import { resolveLeadSource } from './lead.mjs';

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function copyOf(form) {
  try {
    return JSON.parse(form.dataset.copy || '{}');
  } catch {
    return {};
  }
}

function isHidden(el) {
  let node = el;
  while (node) {
    if (node.hidden) return true;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    node = node.parentElement;
  }
  return false;
}

function field(formData, ...keys) {
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let turnstilePromise = null;

function loadTurnstile() {
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);
  if (turnstilePromise) return turnstilePromise;
  turnstilePromise = new Promise((resolve, reject) => {
    const done = () => (window.turnstile?.render ? resolve(window.turnstile) : setTimeout(done, 50));
    if (document.getElementById('cf-turnstile-api')) {
      done();
      return;
    }
    const script = document.createElement('script');
    script.id = 'cf-turnstile-api';
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = done;
    script.onerror = () => {
      turnstilePromise = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(script);
  });
  return turnstilePromise;
}

async function insertInquiry(row) {
  const send = (body) => fetch(`${SUPABASE_URL}/rest/v1/contact_inquiries`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  let response = await send(row);
  if (response.ok) return;
  const text = await response.text();
  if (/source_site/i.test(text)) {
    const { source_site, ...rest } = row;
    response = await send(rest);
  } else if (/lead_source/i.test(text) && row.lead_source === 'ai') {
    response = await send({ ...row, lead_source: 'other' });
  } else {
    throw new Error(text.slice(0, 180));
  }
  if (!response.ok) throw new Error((await response.text()).slice(0, 180));
}

function buildRow(form, formData, geo) {
  const company = field(formData, 'company');
  const buyerType = field(formData, 'buyer_type');
  const channel = field(formData, 'channel');
  const product = field(formData, 'product');
  const volume = field(formData, 'volume');
  const phone = field(formData, 'phone', 'your-phone', 'whatsapp');
  const rawMessage = field(formData, 'message');
  const detected = resolveLeadSource();
  const lines = [
    company && `Company: ${company}`,
    buyerType && `Buyer type: ${buyerType}`,
    channel && `Looking for: ${channel}`,
    product && `Product: ${product}`,
    volume && `Volume: ${volume}`,
    phone && `Phone/WhatsApp: ${phone}`,
    rawMessage && `Notes: ${rawMessage}`,
  ].filter(Boolean);
  return {
    name: field(formData, 'name'),
    email: field(formData, 'email').toLowerCase(),
    message: lines.join('\n'),
    company: company || null,
    channel: channel || null,
    product_interest: product || null,
    source_page: window.location.href,
    source_site: (form.dataset.sourceSite || SOURCE_SITE).replace(/^www\./i, '').toLowerCase(),
    user_agent: navigator.userAgent,
    ip_address: geo.ip_address,
    country: geo.country,
    country_code: geo.country_code,
    region: geo.region,
    lead_source: detected.lead_source,
    status: 'new',
    notes: '',
    extra: {
      buyer_type: buyerType || null,
      volume: volume || null,
      phone: phone || null,
      attribution: detected.attribution,
      landing_page: detected.attribution.landing_page || null,
    },
  };
}

// WhatsApp is offered only after a successful inquiry: the link is built here,
// never rendered in the page before submission.
const WA_NUMBER = String(import.meta.env?.PUBLIC_CONTACT_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
const WA_LABEL = 'Chat on WhatsApp';

function clearWhatsAppAfter(form) {
  form.querySelectorAll('[data-wa-after]').forEach((el) => el.remove());
}

function showWhatsAppAfter(form, row, brand) {
  clearWhatsAppAfter(form);
  const parts = [
    `${brand} inquiry`,
    row.name && `Name: ${row.name}`,
    row.email && `Email: ${row.email}`,
    row.product_interest && `Product: ${row.product_interest}`,
    row.extra?.volume && `Volume: ${row.extra.volume}`,
  ].filter(Boolean);
  if (!WA_NUMBER) return;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(parts.join('\n'))}`;
  const wrap = document.createElement('p');
  wrap.className = 'wa-after';
  wrap.dataset.waAfter = '1';
  const link = document.createElement('a');
  link.className = 'btn';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.dataset.cta = 'whatsapp_click';
  link.dataset.ctaPos = 'after_submit';
  link.textContent = WA_LABEL;
  wrap.appendChild(link);
  const status = form.querySelector('.form-message');
  (status?.parentElement || form).appendChild(wrap);
}

function setError(input, message) {
  const slot = input.parentElement?.querySelector('.error-message');
  input.classList.add('invalid');
  if (slot) {
    slot.textContent = message;
    slot.hidden = false;
  }
}

function clearErrors(form) {
  form.querySelectorAll('.error-message').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  const turnstileError = form.querySelector('[data-turnstile-error]');
  if (turnstileError) {
    turnstileError.hidden = true;
    turnstileError.textContent = '';
  }
}

async function ensureWidget(form) {
  const box = form.querySelector('[data-turnstile-widget]');
  const siteKey = form.dataset.turnstileSitekey || '';
  if (!box || !siteKey || isHidden(box) || box.dataset.widgetId) return;
  const copy = copyOf(form);
  try {
    const turnstile = await loadTurnstile();
    if (isHidden(box) || box.dataset.widgetId) return;
    const id = turnstile.render(box, {
      sitekey: siteKey,
      theme: 'light',
      size: 'flexible',
      callback: () => {
        const slot = form.querySelector('[data-turnstile-error]');
        if (slot) slot.hidden = true;
      },
      'expired-callback': () => {
        const slot = form.querySelector('[data-turnstile-error]');
        if (!slot) return;
        slot.textContent = copy.humanExpired;
        slot.hidden = false;
      },
    });
    box.dataset.widgetId = id;
  } catch {
    const slot = form.querySelector('[data-turnstile-error]');
    if (!slot) return;
    slot.textContent = copy.humanLoad;
    slot.hidden = false;
  }
}

function bindOne(form) {
  if (form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  const copy = copyOf(form);
  const product = new URLSearchParams(window.location.search).get('product');
  const productInput = form.querySelector('[name="product"]');
  if (product && productInput && !productInput.value) productInput.value = product;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-message');
    clearErrors(form);
    if (status) status.hidden = true;
    clearWhatsAppAfter(form);
    let valid = true;
    form.querySelectorAll('input, textarea, select').forEach((input) => {
      if (input.type === 'hidden' || input.disabled || input.name === 'website') return;
      const value = input.value.trim();
      if (input.required && !value) {
        valid = false;
        setError(input, input.name === 'message' ? copy.messageRequired : copy.required);
      } else if (input.type === 'email' && value && !validEmail(value)) {
        valid = false;
        setError(input, copy.emailInvalid);
      }
    });
    const honeypot = form.querySelector('[name="website"]');
    if (honeypot?.value.trim()) {
      if (status) {
        status.textContent = copy.fail;
        status.className = 'form-message bad';
        status.hidden = false;
      }
      return;
    }
    const siteKey = form.dataset.turnstileSitekey || '';
    const widget = form.querySelector('[data-turnstile-widget]');
    const token = widget?.dataset.widgetId && window.turnstile?.getResponse
      ? window.turnstile.getResponse(widget.dataset.widgetId)
      : '';
    if (!siteKey || !token) {
      const slot = form.querySelector('[data-turnstile-error]');
      if (slot) {
        slot.textContent = siteKey ? (widget?.querySelector('iframe') ? copy.humanRequired : copy.humanLoad) : copy.humanMissing;
        slot.hidden = false;
      }
      if (siteKey) ensureWidget(form);
      return;
    }
    if (!valid) return;


    const button = form.querySelector('button[type="submit"]');
    const previous = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = copy.sending;
    }
    try {
      const geo = await resolveClientGeo();
      const row = buildRow(form, new FormData(form), geo);
      if (!row.name || !row.email || !row.message.trim()) throw new Error('incomplete');
      await insertInquiry(row);
      if (status) {
        status.textContent = copy.success;
        status.className = 'form-message ok';
        status.hidden = false;
      }
      showWhatsAppAfter(form, row, 'Sheerherb OEM');
      form.dispatchEvent(new CustomEvent('sheer:inquiry-success', {
        bubbles: true,
        detail: { name: row.name, email: row.email, product: row.product_interest, formId: form.id },
      }));
      form.reset();
      if (product && productInput) productInput.value = product;
      if (widget?.dataset.widgetId && window.turnstile) window.turnstile.reset(widget.dataset.widgetId);
    } catch (error) {
      console.error('[inquiry]', error);
      if (status) {
        status.textContent = copy.fail;
        status.className = 'form-message bad';
        status.hidden = false;
      }
      if (widget?.dataset.widgetId && window.turnstile) window.turnstile.reset(widget.dataset.widgetId);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = previous;
      }
    }
  });
}

function armLazyWidget(form) {
  if (form.dataset.widgetArmed === '1') return;
  form.dataset.widgetArmed = '1';
  const start = () => {
    ['focusin', 'pointerdown', 'input'].forEach((type) => form.removeEventListener(type, start));
    ensureWidget(form);
  };
  ['focusin', 'pointerdown', 'input'].forEach((type) => form.addEventListener(type, start, { passive: true }));
}

export function bindInquiryForms({ eager = false } = {}) {
  document.querySelectorAll('form[data-inquiry-form]').forEach((form) => {
    bindOne(form);
    if (eager) ensureWidget(form);
    else armLazyWidget(form);
  });
}

bindInquiryForms();
document.addEventListener('sheer:quote-open', () => bindInquiryForms({ eager: true }));
