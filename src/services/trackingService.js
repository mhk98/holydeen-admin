import { apiRequest } from "../utils/apiClient";

let initializationPromise = null;
// Dashboard previews must not send real events to the live pixels / Conversions API.
let trackingSuspended = false;

export function setTrackingSuspended(value) {
  trackingSuspended = Boolean(value);
}
let trackingConfig = { metaPixels: [], tiktokPixels: [], googleAds: [] };

const META_EVENT_NAMES = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Search: "Search",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  AddToCart: "AddToCart",
  Lead: "Lead",
  Contact: "Contact",
  Purchase: "Purchase",
};

const TIKTOK_EVENT_NAMES = {
  PageView: "Pageview",
  ViewContent: "ViewContent",
  Search: "Search",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  AddToCart: "AddToCart",
  Lead: "SubmitForm",
  Contact: "Contact",
  Purchase: "CompletePayment",
};

const GOOGLE_EVENT_NAMES = {
  ViewContent: "view_item",
  Search: "search",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  AddPaymentInfo: "add_payment_info",
  Lead: "generate_lead",
  Contact: "contact",
  Purchase: "purchase",
};

function createEventId(eventName) {
  if (globalThis.crypto?.randomUUID)
    return `${eventName}.${globalThis.crypto.randomUUID()}`;
  return `${eventName}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
}

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || ""
  );
}

function setCookie(name, value, days = 90) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function getStorage(key) {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function setStorage(key, val) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, val);
    sessionStorage.setItem(key, val);
  } catch {}
}

function getOrInitFbc() {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");
  const cookieFbc = getCookie("_fbc");
  const storedFbc = getStorage("_fbc");

  if (fbclid) {
    setStorage("fbclid", fbclid);
    if (cookieFbc && cookieFbc.endsWith(`.${fbclid}`)) {
      setStorage("_fbc", cookieFbc);
      return cookieFbc;
    }
    if (storedFbc && storedFbc.endsWith(`.${fbclid}`)) {
      setCookie("_fbc", storedFbc);
      return storedFbc;
    }
    const newFbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", newFbc);
    setStorage("_fbc", newFbc);
    return newFbc;
  }

  if (cookieFbc && /^fb\.1\.\d+\..+$/.test(cookieFbc)) {
    setStorage("_fbc", cookieFbc);
    return cookieFbc;
  }

  if (storedFbc && /^fb\.1\.\d+\..+$/.test(storedFbc)) {
    setCookie("_fbc", storedFbc);
    return storedFbc;
  }

  const storedFbclid = getStorage("fbclid");
  if (storedFbclid) {
    const recoveredFbc = `fb.1.${Date.now()}.${storedFbclid}`;
    setCookie("_fbc", recoveredFbc);
    setStorage("_fbc", recoveredFbc);
    return recoveredFbc;
  }

  return undefined;
}

function getOrInitFbp() {
  if (typeof window === "undefined") return undefined;
  const cookieFbp = getCookie("_fbp");
  if (cookieFbp && /^fb\.1\.\d+\.\d+$/.test(cookieFbp)) {
    setStorage("_fbp", cookieFbp);
    return cookieFbp;
  }

  const storedFbp = getStorage("_fbp");
  if (storedFbp && /^fb\.1\.\d+\.\d+$/.test(storedFbp)) {
    setCookie("_fbp", storedFbp);
    return storedFbp;
  }

  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  const newFbp = `fb.1.${Date.now()}.${random}`;
  setCookie("_fbp", newFbp);
  setStorage("_fbp", newFbp);
  return newFbp;
}

function getClickData() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const ttclid = params.get("ttclid");
  if (ttclid) setStorage("ttclid", ttclid);
  const gclid = params.get("gclid");
  if (gclid) setStorage("gclid", gclid);
  const gbraid = params.get("gbraid");
  if (gbraid) setStorage("gbraid", gbraid);
  const wbraid = params.get("wbraid");
  if (wbraid) setStorage("wbraid", wbraid);

  return {
    deviceId: getTrackingDeviceId() || undefined,
    fbp: getOrInitFbp(),
    fbc: getOrInitFbc(),
    ttp: getCookie("_ttp") || getStorage("_ttp") || undefined,
    ttclid: ttclid || getStorage("ttclid") || undefined,
    gclid: gclid || getStorage("gclid") || undefined,
    gbraid: gbraid || getStorage("gbraid") || undefined,
    wbraid: wbraid || getStorage("wbraid") || undefined,
  };
}

// Same key the landing page order form uses, so external_id stays stable per browser.
const DEVICE_ID_KEY = "holydeen_device_id";
const TRACKING_USER_KEY = "holydeen_tracking_user";
const REMEMBERED_FIELDS = ["name", "firstName", "lastName", "phone", "email", "address", "district", "city", "zip", "customerId"];

function getTrackingDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return "";
  }
}

function getKnownUserData() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TRACKING_USER_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

// Details typed into the order form are reused on later PageView/ViewContent events.
function rememberUserData(userData = {}) {
  if (typeof window === "undefined" || !userData.phone) return;
  const known = getKnownUserData();
  REMEMBERED_FIELDS.forEach((field) => {
    const value = userData[field];
    if (value !== undefined && value !== null && value !== "") known[field] = value;
  });
  try {
    localStorage.setItem(TRACKING_USER_KEY, JSON.stringify(known));
  } catch {
    // Storage blocked (private mode); matching falls back to this event's own data.
  }
}

function toInternationalPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^00/, "");
  if (/^8801\d{9}$/.test(digits)) return digits;
  if (/^01\d{9}$/.test(digits)) return `88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `880${digits}`;
  return "";
}

const cleanGeo = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "");

// Manual advanced matching payload; the pixel normalises and hashes these itself.
function buildAdvancedMatching(userData = {}) {
  const parts = String(userData.name || "").trim().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  const district = String(userData.district || "").toLowerCase();
  const city = cleanGeo(userData.city || (district === "inside" ? "dhaka" : district === "outside" ? "" : district));
  const email = String(userData.email || "").trim().toLowerCase();
  const matching = {
    ph: toInternationalPhone(userData.phone),
    em: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    fn: String(userData.firstName || parts[0] || "").toLowerCase(),
    ln: String(userData.lastName || parts.slice(1).join(" ") || "").toLowerCase(),
    ct: city,
    st: city === "dhaka" ? "dhaka" : "",
    zp: /^\d{4}$/.test(String(userData.zip || "")) ? String(userData.zip) : "",
    country: "bd",
    external_id: getTrackingDeviceId(),
  };
  return Object.fromEntries(Object.entries(matching).filter(([, value]) => value));
}

let lastMatchingKey = "";

// Re-running init with the same pixel id is how Meta updates advanced matching after load.
function applyAdvancedMatching() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  const matching = buildAdvancedMatching(getKnownUserData());
  const key = JSON.stringify(matching);
  if (key === lastMatchingKey) return;
  lastMatchingKey = key;
  trackingConfig.metaPixels.forEach((pixel) => window.fbq("init", pixel.pixelsId, matching));
}

function installMetaPixel() {
  if (typeof window === "undefined") return;
  if (!window.fbq) {
    const fbq = function fbq(...args) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }
  if (!document.querySelector("script[data-holydeen-meta-pixel]")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.dataset.holydeenMetaPixel = "true";
    document.head.appendChild(script);
  }
}

function installTiktokPixel() {
  if (typeof window === "undefined" || window.ttq) return;
  const ttq = (window.ttq = []);
  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];
  ttq.setAndDefer = (target, method) => {
    target[method] = (...args) => target.push([method, ...args]);
  };
  ttq.methods.forEach((method) => ttq.setAndDefer(ttq, method));
  ttq.instance = (pixelCode) => {
    const instance = ttq._i?.[pixelCode] || [];
    ttq.methods.forEach((method) => ttq.setAndDefer(instance, method));
    return instance;
  };
  ttq.load = (pixelCode, options = {}) => {
    ttq._i = ttq._i || {};
    ttq._i[pixelCode] = [];
    ttq._i[pixelCode]._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._t = ttq._t || {};
    ttq._t[pixelCode] = Date.now();
    ttq._o = ttq._o || {};
    ttq._o[pixelCode] = options;
    const script = document.createElement("script");
    script.async = true;
    script.src = `${ttq._i[pixelCode]._u}?sdkid=${encodeURIComponent(pixelCode)}&lib=ttq`;
    script.dataset.holydeenTiktokPixel = pixelCode;
    document.head.appendChild(script);
  };
}

function installGoogleTag(conversionId) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
  if (!document.querySelector("script[data-holydeen-google-tag]")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(conversionId)}`;
    script.dataset.holydeenGoogleTag = "true";
    document.head.appendChild(script);
    window.gtag("js", new Date());
  }
}

export async function initializeTracking() {
  if (initializationPromise) return initializationPromise;
  initializationPromise = apiRequest("/tracking/config")
    .then((response) => {
      trackingConfig = {
        metaPixels: Array.isArray(response?.data?.metaPixels)
          ? response.data.metaPixels
          : [],
        tiktokPixels: Array.isArray(response?.data?.tiktokPixels)
          ? response.data.tiktokPixels
          : [],
        googleAds: Array.isArray(response?.data?.googleAds)
          ? response.data.googleAds
          : [],
      };

      if (trackingConfig.metaPixels.length) {
        installMetaPixel();
        applyAdvancedMatching();
      }
      if (trackingConfig.tiktokPixels.length) {
        installTiktokPixel();
        trackingConfig.tiktokPixels.forEach((pixel) =>
          window.ttq.load(pixel.pixelCode),
        );
      }
      trackingConfig.googleAds.forEach((config, index) => {
        if (index === 0) installGoogleTag(config.conversionId);
        window.gtag?.("config", config.conversionId);
      });
      return trackingConfig;
    })
    .catch((error) => {
      initializationPromise = null;
      throw error;
    });
  return initializationPromise;
}

function trackInBrowser(eventName, eventId, customData) {
  const metaEventName = META_EVENT_NAMES[eventName] || eventName;
  trackingConfig.metaPixels.forEach((pixel) => {
    window.fbq?.("trackSingle", pixel.pixelsId, metaEventName, customData, {
      eventID: eventId,
    });
  });

  const tiktokEventName = TIKTOK_EVENT_NAMES[eventName] || eventName;
  trackingConfig.tiktokPixels.forEach((pixel) => {
    window.ttq
      ?.instance(pixel.pixelCode)
      ?.track(tiktokEventName, { ...customData, event_id: eventId });
  });

  if (eventName === "Purchase") {
    trackingConfig.googleAds.forEach((config) => {
      if (!config.conversionId || !config.conversionLabel) return;
      window.gtag?.("event", "conversion", {
        send_to: `${config.conversionId}/${config.conversionLabel}`,
        value: customData.value,
        currency: customData.currency || "BDT",
        transaction_id: customData.order_id || eventId,
      });
    });
  }

  const googleEventName = GOOGLE_EVENT_NAMES[eventName];
  if (googleEventName) {
    trackingConfig.googleAds.forEach((config) => {
      if (!config.conversionId) return;
      window.gtag?.("event", googleEventName, {
        value: customData.value,
        currency: customData.currency || "BDT",
        items: (customData.content_ids || []).map((item) => ({
          item_id: String(item),
          item_name: customData.content_name || "",
          quantity: customData.num_items || 1,
        })),
      });
    });
  }
}

export function getTrackingClickData() {
  return getClickData();
}

export async function trackMarketingEvent(
  eventName,
  { userData = {}, customData = {}, eventId: suppliedEventId, server = true, enabled = true } = {},
) {
  if (!enabled || trackingSuspended) return null;
  try {
    await initializeTracking();
    if (!enabled || trackingSuspended) return null;
    const eventId = suppliedEventId || createEventId(eventName);
    rememberUserData(userData);
    applyAdvancedMatching();
    trackInBrowser(eventName, eventId, customData);
    if (!server) return eventId;
    const clickData = getClickData();
    const payloadUserData = {
      ...getKnownUserData(),
      ...clickData,
      ...userData,
      country: userData.country || "bd",
    };
    const response = await apiRequest("/tracking/events", {
      method: "POST",
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        referrerUrl: document.referrer || undefined,
        userData: payloadUserData,
        customData: {
          ...customData,
          contents:
            customData.contents ||
            (customData.content_ids && customData.content_ids.length > 0
              ? customData.content_ids.map((id) => ({
                  id: String(id),
                  quantity: customData.num_items || 1,
                  item_price: customData.value ? Number(customData.value) : 0,
                }))
              : undefined),
        },
      }),
    });
    const failures = response?.data?.results?.filter((item) => !item.ok && !item.skipped) || [];
    if (failures.length) console.warn("Marketing delivery failed", failures.map(({ platform, status }) => ({ platform, status })));
    return failures.length ? null : eventId;
  } catch (error) {
    console.warn(`Marketing event "${eventName}" failed`, error);
    return null;
  }
}

export function resetTrackingForTests() {
  initializationPromise = null;
  trackingConfig = { metaPixels: [], tiktokPixels: [], googleAds: [] };
}