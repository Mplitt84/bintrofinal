import { AsyncLocalStorage } from "node:async_hooks";
import { Readable, PassThrough } from "node:stream";
import "react";
import { RouterProvider } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import { defineHandlerCallback, renderRouterToStream } from "@tanstack/react-router/ssr/server";
function StartServer(props) {
  return /* @__PURE__ */ jsx(RouterProvider, { router: props.router });
}
var defaultStreamHandler = defineHandlerCallback(({ request, router, responseHeaders }) => renderRouterToStream({
  request,
  router,
  responseHeaders,
  children: /* @__PURE__ */ jsx(StartServer, { router })
}));
const NullProtoObj = /* @__PURE__ */ (() => {
  const e = function() {
  };
  return e.prototype = /* @__PURE__ */ Object.create(null), Object.freeze(e.prototype), e;
})();
function lazyInherit(target, source, sourceKey) {
  for (const key of [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)]) {
    if (key === "constructor") continue;
    const targetDesc = Object.getOwnPropertyDescriptor(target, key);
    const desc = Object.getOwnPropertyDescriptor(source, key);
    let modified = false;
    if (desc.get) {
      modified = true;
      desc.get = targetDesc?.get || function() {
        return this[sourceKey][key];
      };
    }
    if (desc.set) {
      modified = true;
      desc.set = targetDesc?.set || function(value) {
        this[sourceKey][key] = value;
      };
    }
    if (!targetDesc?.value && typeof desc.value === "function") {
      modified = true;
      desc.value = function(...args) {
        return this[sourceKey][key](...args);
      };
    }
    if (modified) Object.defineProperty(target, key, desc);
  }
}
const _needsNormRE = /(?:(?:^|\/)(?:\.|\.\.|%2e|%2e\.|\.%2e|%2e%2e)(?:\/|$))|[\\^#"<>{}`\x80-\uffff]/i;
const _searchNeedsNormRE = /[#"'<>]/;
const FastURL = /* @__PURE__ */ (() => {
  const NativeURL = globalThis.URL;
  const FastURL2 = class URL {
    #url;
    #href;
    #protocol;
    #host;
    #pathname;
    #search;
    #searchParams;
    #pos;
    constructor(url) {
      if (typeof url === "string") {
        const isOriginForm = url[0] === "/";
        if (isOriginForm && !_searchNeedsNormRE.test(url)) this.#href = url;
        else this.#url = new NativeURL(isOriginForm ? `http://localhost${url}` : url);
      } else if (_needsNormRE.test(url.pathname) || url.search && _searchNeedsNormRE.test(url.search)) this.#url = new NativeURL(`${url.protocol || "http:"}//${url.host || "localhost"}${url.pathname}${url.search || ""}`);
      else {
        this.#protocol = url.protocol;
        this.#host = url.host;
        this.#pathname = url.pathname;
        this.#search = url.search;
      }
    }
    static [Symbol.hasInstance](val) {
      return val instanceof NativeURL;
    }
    get _url() {
      if (this.#url) return this.#url;
      this.#url = new NativeURL(this.href);
      this.#href = void 0;
      this.#protocol = void 0;
      this.#host = void 0;
      this.#pathname = void 0;
      this.#search = void 0;
      this.#searchParams = void 0;
      this.#pos = void 0;
      return this.#url;
    }
    get href() {
      if (this.#url) return this.#url.href;
      if (!this.#href) this.#href = `${this.#protocol || "http:"}//${this.#host || "localhost"}${this.#pathname || "/"}${this.#search || ""}`;
      return this.#href;
    }
    #getPos() {
      if (!this.#pos) {
        const url = this.href;
        const protoIndex = url.indexOf("://");
        const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);
        const qIndex = pathnameIndex === -1 ? -1 : url.indexOf("?", pathnameIndex);
        this.#pos = [
          protoIndex,
          pathnameIndex,
          qIndex
        ];
      }
      return this.#pos;
    }
    get pathname() {
      if (this.#url) return this.#url.pathname;
      if (this.#pathname === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.pathname;
        this.#pathname = this.href.slice(pathnameIndex, queryIndex === -1 ? void 0 : queryIndex);
      }
      return this.#pathname;
    }
    get search() {
      if (this.#url) return this.#url.search;
      if (this.#search === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.search;
        const url = this.href;
        this.#search = queryIndex === -1 || queryIndex === url.length - 1 ? "" : url.slice(queryIndex);
      }
      return this.#search;
    }
    get searchParams() {
      if (this.#url) return this.#url.searchParams;
      if (!this.#searchParams) this.#searchParams = new URLSearchParams(this.search);
      return this.#searchParams;
    }
    get protocol() {
      if (this.#url) return this.#url.protocol;
      if (this.#protocol === void 0) {
        const [protocolIndex] = this.#getPos();
        if (protocolIndex === -1) return this._url.protocol;
        const url = this.href;
        this.#protocol = url.slice(0, protocolIndex + 1);
      }
      return this.#protocol;
    }
    toString() {
      return this.href;
    }
    toJSON() {
      return this.href;
    }
  };
  lazyInherit(FastURL2.prototype, NativeURL.prototype, "_url");
  Object.setPrototypeOf(FastURL2.prototype, NativeURL.prototype);
  Object.setPrototypeOf(FastURL2, NativeURL);
  return FastURL2;
})();
const NodeResponse = /* @__PURE__ */ (() => {
  const NativeResponse = globalThis.Response;
  const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
  class NodeResponse2 {
    #body;
    #init;
    #headers;
    #response;
    constructor(body, init) {
      this.#body = body;
      this.#init = init;
    }
    static [Symbol.hasInstance](val) {
      return val instanceof NativeResponse;
    }
    get status() {
      return this.#response?.status || this.#init?.status || 200;
    }
    get statusText() {
      return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
    }
    get headers() {
      if (this.#response) return this.#response.headers;
      if (this.#headers) return this.#headers;
      const initHeaders = this.#init?.headers;
      return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
    }
    get ok() {
      if (this.#response) return this.#response.ok;
      const status = this.status;
      return status >= 200 && status < 300;
    }
    get _response() {
      if (this.#response) return this.#response;
      let body = this.#body;
      if (body && typeof body.pipe === "function" && !(body instanceof Readable)) {
        const stream = new PassThrough();
        body.pipe(stream);
        const abort = body.abort;
        if (abort) stream.once("close", () => abort());
        body = stream;
      }
      this.#response = new NativeResponse(body, this.#headers ? {
        ...this.#init,
        headers: this.#headers
      } : this.#init);
      this.#init = void 0;
      this.#headers = void 0;
      this.#body = void 0;
      return this.#response;
    }
    _toNodeResponse() {
      const status = this.status;
      const statusText = this.statusText;
      let body;
      let contentType;
      let contentLength;
      if (this.#response) body = this.#response.body;
      else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
      else if (typeof this.#body === "string") {
        body = this.#body;
        contentType = "text/plain; charset=UTF-8";
        contentLength = Buffer.byteLength(this.#body);
      } else if (this.#body instanceof ArrayBuffer) {
        body = Buffer.from(this.#body);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Uint8Array) {
        body = this.#body;
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof DataView) {
        body = Buffer.from(this.#body.buffer);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Blob) {
        body = this.#body.stream();
        contentType = this.#body.type;
        contentLength = this.#body.size;
      } else if (typeof this.#body.pipe === "function") body = this.#body;
      else body = this._response.body;
      const headers = [];
      const initHeaders = this.#init?.headers;
      const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders) : void 0);
      let hasContentTypeHeader;
      let hasContentLength;
      if (headerEntries) for (const [key, value] of headerEntries) {
        const lowerKey = typeof key === "string" ? key.toLowerCase() : String(key);
        if (Array.isArray(value)) for (const v of value) headers.push(lowerKey, v);
        else headers.push(lowerKey, value);
        if (lowerKey === "content-type") hasContentTypeHeader = true;
        else if (lowerKey === "content-length") hasContentLength = true;
      }
      if (contentType && !hasContentTypeHeader) headers.push("content-type", contentType);
      if (contentLength && !hasContentLength) headers.push("content-length", String(contentLength));
      this.#init = void 0;
      this.#headers = void 0;
      this.#response = void 0;
      this.#body = void 0;
      return {
        status,
        statusText,
        headers,
        body
      };
    }
  }
  lazyInherit(NodeResponse2.prototype, NativeResponse.prototype, "_response");
  Object.setPrototypeOf(NodeResponse2, NativeResponse);
  Object.setPrototypeOf(NodeResponse2.prototype, NativeResponse.prototype);
  return NodeResponse2;
})();
function decodePathname(pathname) {
  return decodeURI(pathname.includes("%25") ? pathname.replace(/%25/g, "%2525") : pathname);
}
const kEventNS = "h3.internal.event.";
const kEventRes = /* @__PURE__ */ Symbol.for(`${kEventNS}res`);
const kEventResHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.headers`);
const kEventResErrHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.err.headers`);
var H3Event = class {
  app;
  req;
  url;
  context;
  static __is_event__ = true;
  constructor(req, context, app) {
    this.context = context || req.context || new NullProtoObj();
    this.req = req;
    this.app = app;
    const _url = req._url;
    const url = _url && _url instanceof URL ? _url : new FastURL(req.url);
    if (url.pathname.includes("%")) url.pathname = decodePathname(url.pathname);
    this.url = url;
  }
  get res() {
    return this[kEventRes] ||= new H3EventResponse();
  }
  get runtime() {
    return this.req.runtime;
  }
  waitUntil(promise) {
    this.req.waitUntil?.(promise);
  }
  toString() {
    return `[${this.req.method}] ${this.req.url}`;
  }
  toJSON() {
    return this.toString();
  }
  get node() {
    return this.req.runtime?.node;
  }
  get headers() {
    return this.req.headers;
  }
  get path() {
    return this.url.pathname + this.url.search;
  }
  get method() {
    return this.req.method;
  }
};
var H3EventResponse = class {
  status;
  statusText;
  get headers() {
    return this[kEventResHeaders] ||= new Headers();
  }
  get errHeaders() {
    return this[kEventResErrHeaders] ||= new Headers();
  }
};
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) return defaultStatusCode;
  if (typeof statusCode === "string") statusCode = +statusCode;
  if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
  return statusCode;
}
var HTTPError = class HTTPError2 extends Error {
  get name() {
    return "HTTPError";
  }
  status;
  statusText;
  headers;
  cause;
  data;
  body;
  unhandled;
  static isError(input) {
    return input instanceof Error && input?.name === "HTTPError";
  }
  static status(status, statusText, details) {
    return new HTTPError2({
      ...details,
      statusText,
      status
    });
  }
  constructor(arg1, arg2) {
    let messageInput;
    let details;
    if (typeof arg1 === "string") {
      messageInput = arg1;
      details = arg2;
    } else details = arg1;
    const status = sanitizeStatusCode(details?.status || details?.statusCode || details?.cause?.status || details?.cause?.statusCode, 500);
    const statusText = sanitizeStatusMessage(details?.statusText || details?.statusMessage || details?.cause?.statusText || details?.cause?.statusMessage);
    const message = messageInput || details?.message || details?.cause?.message || details?.statusText || details?.statusMessage || [
      "HTTPError",
      status,
      statusText
    ].filter(Boolean).join(" ");
    super(message, { cause: details });
    this.cause = details;
    this.status = status;
    this.statusText = statusText || void 0;
    const rawHeaders = details?.headers || details?.cause?.headers;
    this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
    this.unhandled = details?.unhandled ?? details?.cause?.unhandled ?? void 0;
    this.data = details?.data;
    this.body = details?.body;
  }
  get statusCode() {
    return this.status;
  }
  get statusMessage() {
    return this.statusText;
  }
  toJSON() {
    const unhandled = this.unhandled;
    return {
      status: this.status,
      statusText: this.statusText,
      unhandled,
      message: unhandled ? "HTTPError" : this.message,
      data: unhandled ? void 0 : this.data,
      ...unhandled ? void 0 : this.body
    };
  }
};
function isJSONSerializable(value, _type) {
  if (value === null || value === void 0) return true;
  if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
  if (typeof value.toJSON === "function") return true;
  if (Array.isArray(value)) return true;
  if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
  if (value instanceof NullProtoObj) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
  if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
  const response = prepareResponse(val, event, config);
  if (typeof response?.then === "function") return toResponse(response, event, config);
  const { onResponse } = config;
  return onResponse ? Promise.resolve(onResponse(response, event)).then(() => response) : response;
}
var HTTPResponse = class {
  #headers;
  #init;
  body;
  constructor(body, init) {
    this.body = body;
    this.#init = init;
  }
  get status() {
    return this.#init?.status || 200;
  }
  get statusText() {
    return this.#init?.statusText || "OK";
  }
  get headers() {
    return this.#headers ||= new Headers(this.#init?.headers);
  }
};
function prepareResponse(val, event, config, nested) {
  if (val === kHandled) return new NodeResponse(null);
  if (val === kNotFound) val = new HTTPError({
    status: 404,
    message: `Cannot find any route matching [${event.req.method}] ${event.url}`
  });
  if (val && val instanceof Error) {
    const isHTTPError = HTTPError.isError(val);
    const error = isHTTPError ? val : new HTTPError(val);
    if (!isHTTPError) {
      error.unhandled = true;
      if (val?.stack) error.stack = val.stack;
    }
    if (error.unhandled && !config.silent) console.error(error);
    const { onError } = config;
    const errHeaders = event[kEventRes]?.[kEventResErrHeaders];
    return onError && !nested ? Promise.resolve(onError(error, event)).catch((error2) => error2).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug, errHeaders);
  }
  const preparedRes = event[kEventRes];
  const preparedHeaders = preparedRes?.[kEventResHeaders];
  event[kEventRes] = void 0;
  if (!(val instanceof Response)) {
    const res = prepareResponseBody(val, event, config);
    const status = res.status || preparedRes?.status;
    return new NodeResponse(nullBody(event.req.method, status) ? null : res.body, {
      status,
      statusText: res.statusText || preparedRes?.statusText,
      headers: res.headers && preparedHeaders ? mergeHeaders$1(res.headers, preparedHeaders) : res.headers || preparedHeaders
    });
  }
  if (!preparedHeaders || nested || !val.ok) return val;
  try {
    mergeHeaders$1(val.headers, preparedHeaders, val.headers);
    return val;
  } catch {
    return new NodeResponse(nullBody(event.req.method, val.status) ? null : val.body, {
      status: val.status,
      statusText: val.statusText,
      headers: mergeHeaders$1(val.headers, preparedHeaders)
    });
  }
}
function mergeHeaders$1(base, overrides, target = new Headers(base)) {
  for (const [name, value] of overrides) if (name === "set-cookie") target.append(name, value);
  else target.set(name, value);
  return target;
}
const frozen = (name) => (...args) => {
  throw new Error(`Headers are frozen (${name} ${args.join(", ")})`);
};
var FrozenHeaders = class extends Headers {
  set = frozen("set");
  append = frozen("append");
  delete = frozen("delete");
};
const emptyHeaders = /* @__PURE__ */ new FrozenHeaders({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new FrozenHeaders({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
  if (val === null || val === void 0) return {
    body: "",
    headers: emptyHeaders
  };
  const valType = typeof val;
  if (valType === "string") return { body: val };
  if (val instanceof Uint8Array) {
    event.res.headers.set("content-length", val.byteLength.toString());
    return { body: val };
  }
  if (val instanceof HTTPResponse || val?.constructor?.name === "HTTPResponse") return val;
  if (isJSONSerializable(val, valType)) return {
    body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
    headers: jsonHeaders
  };
  if (valType === "bigint") return {
    body: val.toString(),
    headers: jsonHeaders
  };
  if (val instanceof Blob) {
    const headers = new Headers({
      "content-type": val.type,
      "content-length": val.size.toString()
    });
    let filename = val.name;
    if (filename) {
      filename = encodeURIComponent(filename);
      headers.set("content-disposition", `filename="${filename}"; filename*=UTF-8''${filename}`);
    }
    return {
      body: val.stream(),
      headers
    };
  }
  if (valType === "symbol") return { body: val.toString() };
  if (valType === "function") return { body: `${val.name}()` };
  return { body: val };
}
function nullBody(method, status) {
  return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug, errHeaders) {
  let headers = error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : new Headers(jsonHeaders);
  if (errHeaders) headers = mergeHeaders$1(headers, errHeaders);
  return new NodeResponse(JSON.stringify({
    ...error.toJSON(),
    stack: debug && error.stack ? error.stack.split("\n").map((l) => l.trim()) : void 0
  }, void 0, debug ? 2 : void 0), {
    status: error.status,
    statusText: error.statusText,
    headers
  });
}
var GLOBAL_EVENT_STORAGE_KEY = /* @__PURE__ */ Symbol.for("tanstack-start:event-storage");
var globalObj$1 = globalThis;
if (!globalObj$1[GLOBAL_EVENT_STORAGE_KEY]) globalObj$1[GLOBAL_EVENT_STORAGE_KEY] = new AsyncLocalStorage();
var eventStorage = globalObj$1[GLOBAL_EVENT_STORAGE_KEY];
function isPromiseLike(value) {
  return (typeof value === "object" || typeof value === "function") && value !== null && typeof value.then === "function";
}
function getSetCookieValues(headers) {
  const headersWithSetCookie = headers;
  if (typeof headersWithSetCookie.getSetCookie === "function") return headersWithSetCookie.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}
function mergeEventResponseHeaders(response, event) {
  if (response.ok) return;
  const eventSetCookies = getSetCookieValues(event.res.headers);
  if (eventSetCookies.length === 0) return;
  const responseSetCookies = getSetCookieValues(response.headers);
  response.headers.delete("set-cookie");
  for (const cookie of responseSetCookies) response.headers.append("set-cookie", cookie);
  for (const cookie of eventSetCookies) response.headers.append("set-cookie", cookie);
}
function finalizeResponse(value, event) {
  const response = ensureResponse(value);
  mergeEventResponseHeaders(response, event);
  return response;
}
function finalizeMaybeResponse(value, event) {
  if (isPromiseLike(value)) return Promise.resolve(value).then((resolved) => finalizeResponse(resolved, event), (error) => finalizeResponse(handleResponseError(error), event));
  return finalizeResponse(value, event);
}
function ensureResponse(value) {
  if (value instanceof Response) return value;
  return new Response("Internal Server Error", { status: 500 });
}
function handleResponseError(error) {
  if (error instanceof Response) return error;
  if (error instanceof Error) throw error;
  return new Response("Internal Server Error", { status: 500 });
}
function requestHandler(handler) {
  return (request, requestOpts) => {
    let h3Event;
    try {
      h3Event = new H3Event(request);
    } catch (error) {
      if (error instanceof URIError) return new Response(null, {
        status: 400,
        statusText: "Bad Request"
      });
      throw error;
    }
    let response;
    try {
      response = eventStorage.run({ h3Event }, () => handler(request, requestOpts));
    } catch (error) {
      response = handleResponseError(error);
    }
    return toResponse(finalizeMaybeResponse(response, h3Event), h3Event);
  };
}
function getH3Event() {
  const event = eventStorage.getStore();
  if (!event) throw new Error(`No StartEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
  return event.h3Event;
}
function getRequest() {
  return getH3Event().req;
}
function getResponse() {
  return getH3Event().res;
}
var HEADERS = { TSS_SHELL: "X-TSS_SHELL" };
function isNotFound(obj) {
  return obj?.isNotFound === true;
}
const rootRouteId = "__root__";
function redirect(opts) {
  opts.statusCode = opts.statusCode || opts.code || 307;
  const headers = new Headers(opts.headers);
  if (opts.href && headers.get("Location") === null) headers.set("Location", opts.href);
  const response = new Response(null, {
    status: opts.statusCode,
    headers
  });
  response.options = opts;
  if (opts.throw) throw response;
  return response;
}
function isRedirect(obj) {
  return obj instanceof Response && !!obj.options;
}
function parseRedirect(obj) {
  if (obj !== null && typeof obj === "object" && obj.isSerializedRedirect) return redirect(obj);
}
function dehydrateSsrMatchId(id) {
  return id.replaceAll("/", "#");
}
function createSieveCache(max) {
  const cache = /* @__PURE__ */ new Map();
  let hand;
  let newest;
  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return;
      entry.visited = true;
      return entry.value;
    },
    set(key, value) {
      const existing = cache.get(key);
      if (existing) {
        existing.value = value;
        return;
      }
      if (cache.size >= max) {
        let node = hand?.next().value;
        while (!node || node.visited) {
          if (node) node.visited = false;
          else hand = cache.values();
          node = hand.next().value;
        }
        if (node === newest) hand = void 0;
        cache.delete(node.key);
      }
      const entry = {
        key,
        value,
        visited: false
      };
      newest = entry;
      cache.set(key, entry);
    },
    clear() {
      cache.clear();
      hand = void 0;
      newest = void 0;
    }
  };
}
function invariant() {
  throw new Error("Invariant failed");
}
function executeRewriteInput(rewrite, url) {
  const res = rewrite?.input?.({ url });
  if (res) {
    if (typeof res === "string") return new URL(res);
    else if (res instanceof URL) return res;
  }
  return url;
}
var stateIndexKey = "__TSR_index";
var protocolRelativePrefix = /^[\x00-\x20]*(?:[\\/][\t\n\r]*){2,}/;
function normalizeProtocolRelative(url) {
  const match = protocolRelativePrefix.exec(url);
  return match ? "/" + url.slice(match[0].length) : url;
}
function normalizeHref(href) {
  if (/[\x00-\x1f\x7f]/.test(href)) href = href.replace(/[\x00-\x1f\x7f]/g, (character) => "	\n\r".includes(character) ? "" : encodeURIComponent(character));
  return normalizeProtocolRelative(href);
}
var noop = () => {
};
var ServerHistory = class {
  constructor(location) {
    this.location = location;
  }
  get length() {
    return 1;
  }
  get subscribers() {
    return this._subscribers ??= /* @__PURE__ */ new Set();
  }
  subscribe() {
    return noop;
  }
  push() {
  }
  replace() {
  }
  go() {
  }
  back() {
  }
  forward() {
  }
  canGoBack() {
    return false;
  }
  createHref(href) {
    return normalizeHref(href);
  }
  block() {
    return noop;
  }
  flush() {
  }
  destroy() {
  }
  notify() {
  }
  _getBlockers() {
    return [];
  }
};
function createServerHistory(href) {
  return new ServerHistory(parseHref(href, void 0));
}
function parseHref(href, state) {
  const sanitizedHref = normalizeHref(href);
  const hashIndex = sanitizedHref.indexOf("#");
  const searchIndex = sanitizedHref.indexOf("?");
  if (!state) {
    const key = createRandomKey();
    state = {
      [stateIndexKey]: 0,
      key,
      __TSR_key: key
    };
  }
  return {
    href: sanitizedHref,
    pathname: sanitizedHref.slice(0, hashIndex > -1 ? searchIndex > -1 ? Math.min(hashIndex, searchIndex) : hashIndex : searchIndex > -1 ? searchIndex : sanitizedHref.length),
    hash: hashIndex > -1 ? sanitizedHref.slice(hashIndex) : "",
    search: searchIndex > -1 ? sanitizedHref.slice(searchIndex, hashIndex === -1 ? void 0 : hashIndex) : "",
    state
  };
}
function createRandomKey() {
  return (Math.random() + 1).toString(36).slice(7);
}
function _getRenderedMatches(matches) {
  const end = matches.findIndex((match) => match.status !== "success" || match._notFound) + 1;
  return end && end < matches.length ? matches.slice(0, end) : matches;
}
function observeLate(callback, value) {
  if (!callback) return;
  try {
    const result = callback(value);
    if (result !== void 0) Promise.resolve(result).catch(() => {
    });
  } catch {
  }
}
function waitForReason(value, signal, onLate, onLateError) {
  const promise = Promise.resolve(value);
  if (signal.aborted) {
    promise.then((result) => observeLate(onLate, result), (error) => observeLate(onLateError, error));
    return Promise.reject(signal.reason);
  }
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then((result) => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) observeLate(onLate, result);
      else resolve(result);
    }, (error) => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) observeLate(onLateError, error);
      else reject(error);
    });
  });
}
function isPromise(value) {
  return Boolean(value && typeof value === "object" && typeof value.then === "function");
}
const PATH_UNSAFE_RE = /[\x00-\x1f\x7f"<>`{}]/g;
function sanitizePathSegment(segment) {
  return segment.replace(PATH_UNSAFE_RE, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
}
function decodeSegment(segment) {
  let decoded;
  try {
    decoded = decodeURI(segment);
  } catch {
    decoded = segment.replaceAll(/%[0-9A-F]{2}/gi, (match) => {
      try {
        return decodeURI(match);
      } catch {
        return match;
      }
    });
  }
  return sanitizePathSegment(decoded);
}
function getUrlScheme(url) {
  if (url[0] === "/") return;
  if (!url.includes(":")) return;
  return /^[\x00-\x20]*([a-z][a-z\d+.\t\n\r-]*:)/i.exec(url)?.[1]?.replace(/[\t\n\r]/g, "").toLowerCase();
}
const protocolRelativePrefixRegex = /^[\x00-\x20]*[\\/][\t\n\r]*[\\/]/;
function isDangerousProtocol(url, allowlist) {
  if (!url) return false;
  if (protocolRelativePrefixRegex.test(url)) return true;
  const scheme = getUrlScheme(url);
  return scheme ? !allowlist.has(scheme) : false;
}
function decodePath(path) {
  if (!path) return path;
  let result = path;
  if (/[%\\\x00-\x1f\x7f]/.test(path)) {
    const re = /%25|%5C/gi;
    let cursor = 0;
    let match;
    result = "";
    while (null !== (match = re.exec(path))) {
      result += decodeSegment(path.slice(cursor, match.index)) + match[0];
      cursor = re.lastIndex;
    }
    result += decodeSegment(cursor ? path.slice(cursor) : path);
  }
  return result;
}
function getAssetCrossOrigin(assetCrossOrigin, kind) {
  return;
}
function getManifestScriptFormat(manifest2) {
  return manifest2?.scriptFormat ?? "module";
}
function getScriptPreloadAttrs(manifest2, link, assetCrossOrigin) {
  const preloadLink = resolveManifestAssetLink(link);
  const crossOrigin = getAssetCrossOrigin() ?? preloadLink.crossOrigin;
  return {
    ...getManifestScriptFormat(manifest2) === "iife" ? {
      rel: "preload",
      as: "script"
    } : { rel: "modulepreload" },
    href: preloadLink.href,
    ...crossOrigin ? { crossOrigin } : {}
  };
}
function resolveManifestAssetLink(link) {
  if (typeof link === "string") return {
    href: link,
    crossOrigin: void 0
  };
  return link;
}
function getStylesheetHref(asset) {
  return resolveManifestCssLink(asset).href;
}
function resolveManifestCssLink(link) {
  if (typeof link === "string") return {
    href: link,
    crossOrigin: void 0
  };
  return link;
}
function createInlineCssStyleAsset(css) {
  return {
    attrs: { suppressHydrationWarning: true },
    children: css
  };
}
function createInlineCssPlaceholderAsset() {
  return { attrs: { suppressHydrationWarning: true } };
}
function createSerializationAdapter(opts) {
  return opts;
}
const SYM_ASYNC_ITERATOR = Symbol.asyncIterator;
const SYM_HAS_INSTANCE = Symbol.hasInstance;
const SYM_IS_CONCAT_SPREADABLE = Symbol.isConcatSpreadable;
const SYM_ITERATOR = Symbol.iterator;
const SYM_MATCH = Symbol.match;
const SYM_MATCH_ALL = Symbol.matchAll;
const SYM_REPLACE = Symbol.replace;
const SYM_SEARCH = Symbol.search;
const SYM_SPECIES = Symbol.species;
const SYM_SPLIT = Symbol.split;
const SYM_TO_PRIMITIVE = Symbol.toPrimitive;
const SYM_TO_STRING_TAG = Symbol.toStringTag;
const SYM_UNSCOPABLES = Symbol.unscopables;
const TEMPORAL_TYPE_NAME = {
  [0]: "Instant",
  [1]: "Duration",
  [2]: "PlainDate",
  [3]: "PlainDateTime",
  [4]: "PlainMonthDay",
  [5]: "PlainTime",
  [6]: "PlainYearMonth",
  [7]: "ZonedDateTime"
};
const SYMBOL_REF = {
  [0]: SYM_ASYNC_ITERATOR,
  [1]: SYM_HAS_INSTANCE,
  [2]: SYM_IS_CONCAT_SPREADABLE,
  [3]: SYM_ITERATOR,
  [4]: SYM_MATCH,
  [5]: SYM_MATCH_ALL,
  [6]: SYM_REPLACE,
  [7]: SYM_SEARCH,
  [8]: SYM_SPECIES,
  [9]: SYM_SPLIT,
  [10]: SYM_TO_PRIMITIVE,
  [11]: SYM_TO_STRING_TAG,
  [12]: SYM_UNSCOPABLES
};
function createSymbolStringTable() {
  const result = {};
  for (let i = 0; i <= 12; i++) result[i] = SYMBOL_REF[i].description;
  return result;
}
const SYMBOL_STRING = /* @__PURE__ */ createSymbolStringTable();
function createInverseSymbolTable() {
  const result = {};
  for (let i = 0; i <= 12; i++) result[SYMBOL_REF[i]] = i;
  return result;
}
const INV_SYMBOL_REF = /* @__PURE__ */ createInverseSymbolTable();
const CONSTANT_STRING = {
  [2]: "!0",
  [3]: "!1",
  [1]: "void 0",
  [0]: "null",
  [4]: "-0",
  [5]: "1/0",
  [6]: "-1/0",
  [7]: "0/0"
};
const CONSTANT_VAL = {
  [2]: true,
  [3]: false,
  [1]: void 0,
  [0]: null,
  [4]: -0,
  [5]: Infinity,
  [6]: -Infinity,
  [7]: NaN
};
const ERROR_CONSTRUCTOR = {
  [0]: Error,
  [1]: EvalError,
  [2]: RangeError,
  [3]: ReferenceError,
  [4]: SyntaxError,
  [5]: TypeError,
  [6]: URIError
};
function createErrorConstructorStringTable() {
  const result = {};
  for (let i = 0; i <= 6; i++) result[i] = ERROR_CONSTRUCTOR[i].name;
  return result;
}
const ERROR_CONSTRUCTOR_STRING = /* @__PURE__ */ createErrorConstructorStringTable();
function createSerovalNode(t, i, s, c, m, p, e, a, f, b, o, l) {
  if (c === void 0 && m === void 0 && p === void 0 && e === void 0 && a === void 0 && f === void 0 && b === void 0 && o === void 0 && l === void 0) return {
    t,
    i,
    s
  };
  return {
    t,
    i,
    s,
    c,
    m,
    p,
    e,
    a,
    f,
    b,
    o,
    l
  };
}
function createConstantNode(value) {
  return createSerovalNode(2, void 0, value);
}
const TRUE_NODE = /* @__PURE__ */ createConstantNode(2);
const FALSE_NODE = /* @__PURE__ */ createConstantNode(3);
const UNDEFINED_NODE = /* @__PURE__ */ createConstantNode(1);
const NULL_NODE = /* @__PURE__ */ createConstantNode(0);
const NEG_ZERO_NODE = /* @__PURE__ */ createConstantNode(4);
const INFINITY_NODE = /* @__PURE__ */ createConstantNode(5);
const NEG_INFINITY_NODE = /* @__PURE__ */ createConstantNode(6);
const NAN_NODE = /* @__PURE__ */ createConstantNode(7);
const MIN_JSON_STRINGIFY_LENGTH = 64;
const NEEDS_ESCAPE = /["\\\n\r\b\t\f<\u2028\u2029]/;
const JSON_ESCAPE_DIFFERENCES = /[\x00-\x07\x0b\x0e-\x1f\ud800-\udfff]/;
const LESS_THAN = /</g;
const LINE_SEPARATOR = /\u2028/g;
const PARAGRAPH_SEPARATOR = /\u2029/g;
function escapeCharCode(code) {
  switch (code) {
    case 34:
      return '\\"';
    case 92:
      return "\\\\";
    case 10:
      return "\\n";
    case 13:
      return "\\r";
    case 8:
      return "\\b";
    case 9:
      return "\\t";
    case 12:
      return "\\f";
    case 60:
      return "\\x3C";
    case 8232:
      return "\\u2028";
    case 8233:
      return "\\u2029";
    default:
      return;
  }
}
function serializeString(input) {
  const str = "" + input;
  if (!NEEDS_ESCAPE.test(str)) return str;
  if (str.length >= MIN_JSON_STRINGIFY_LENGTH && !JSON_ESCAPE_DIFFERENCES.test(str)) {
    let result2 = JSON.stringify(str).slice(1, -1);
    if (result2.includes("<")) result2 = result2.replace(LESS_THAN, "\\x3C");
    if (result2.includes("\u2028")) result2 = result2.replace(LINE_SEPARATOR, "\\u2028");
    if (result2.includes("\u2029")) result2 = result2.replace(PARAGRAPH_SEPARATOR, "\\u2029");
    return result2;
  }
  let result = "";
  let lastPos = 0;
  let replacement;
  for (let i = 0, len = str.length; i < len; i++) {
    replacement = escapeCharCode(str.charCodeAt(i));
    if (replacement) {
      result += str.slice(lastPos, i) + replacement;
      lastPos = i + 1;
    }
  }
  return result + str.slice(lastPos);
}
const JSON_COMPATIBLE = /^(?:[^"\\\x00-\x1f]|\\["\\nrbtf])*$/;
const ESCAPE_SEQUENCE = /(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g;
function deserializeString(str) {
  if (typeof str !== "string") return str.replace(ESCAPE_SEQUENCE, deserializeString);
  let index = str.indexOf("\\");
  if (index === -1) return str;
  if (JSON_COMPATIBLE.test(str)) return JSON.parse('"' + str + '"');
  let result = "";
  let lastPos = 0;
  const last = str.length - 1;
  while (index !== -1 && index < last) {
    let replacement;
    let length = 2;
    switch (str.charCodeAt(index + 1)) {
      case 92:
        replacement = "\\";
        break;
      case 34:
        replacement = '"';
        break;
      case 110:
        replacement = "\n";
        break;
      case 114:
        replacement = "\r";
        break;
      case 98:
        replacement = "\b";
        break;
      case 116:
        replacement = "	";
        break;
      case 102:
        replacement = "\f";
        break;
      case 120:
        if (str.startsWith("3C", index + 2)) {
          replacement = "<";
          length = 4;
        }
        break;
      case 117:
        if (str.startsWith("2028", index + 2)) {
          replacement = "\u2028";
          length = 6;
        } else if (str.startsWith("2029", index + 2)) {
          replacement = "\u2029";
          length = 6;
        }
    }
    if (replacement) {
      result += str.slice(lastPos, index) + replacement;
      lastPos = index + length;
      index = str.indexOf("\\", lastPos);
    } else index = str.indexOf("\\", index + 1);
  }
  return result + str.slice(lastPos);
}
const STEP_ERROR_CODES = {
  parsing: 1,
  serialization: 2,
  deserialization: 3
};
function getErrorMessageProd(type) {
  return `Seroval Error (step: ${STEP_ERROR_CODES[type]})`;
}
var SerovalError = class extends Error {
  constructor(type, cause) {
    super(getErrorMessageProd(type));
    this.cause = cause;
  }
};
var SerovalParserError = class extends SerovalError {
  constructor(cause) {
    super("parsing", cause);
  }
};
var SerovalSerializationError = class extends SerovalError {
  constructor(cause) {
    super("serialization", cause);
  }
};
var SerovalDeserializationError = class extends SerovalError {
  constructor(cause) {
    super("deserialization", cause);
  }
};
function getSpecificErrorMessage(code) {
  return `Seroval Error (specific: ${code})`;
}
var SerovalUnsupportedTypeError = class extends Error {
  constructor(value) {
    super(getSpecificErrorMessage(1));
    this.value = value;
  }
};
var SerovalUnsupportedNodeError = class extends Error {
  constructor(node) {
    super(getSpecificErrorMessage(2));
  }
};
var SerovalMissingPluginError = class extends Error {
  constructor(tag) {
    super(getSpecificErrorMessage(3));
  }
};
var SerovalMissingInstanceError = class extends Error {
  constructor(tag) {
    super(getSpecificErrorMessage(4));
  }
};
var SerovalMissingReferenceForIdError = class extends Error {
  constructor(id) {
    super(getSpecificErrorMessage(6));
  }
};
var SerovalUnknownTypedArrayError = class extends Error {
  constructor(name) {
    super(getSpecificErrorMessage(7));
  }
};
var SerovalMalformedNodeError = class extends Error {
  constructor(node) {
    super(getSpecificErrorMessage(8));
  }
};
var SerovalConflictedNodeIdError = class extends Error {
  constructor(node) {
    super(getSpecificErrorMessage(9));
  }
};
var SerovalDepthLimitError = class extends Error {
  constructor(limit) {
    super(getSpecificErrorMessage(10));
  }
};
function getErrorConstructor(error) {
  for (let i = 1; i <= 6; i++) if (error instanceof ERROR_CONSTRUCTOR[i]) return i;
  return 0;
}
function getErrorOptions(error, features) {
  const options = /* @__PURE__ */ Object.create(null);
  const construct = ERROR_CONSTRUCTOR_STRING[getErrorConstructor(error)];
  if (error.name !== construct) options.name = error.name;
  else if (error.constructor.name !== construct) options.name = error.constructor.name;
  for (const name of Object.getOwnPropertyNames(error)) if (name !== "name" && name !== "message" && (name !== "stack" || features & 4)) options[name] = error[name];
  return options;
}
function getObjectFlag(obj) {
  if (Object.isExtensible(obj)) return 0;
  if (Object.isFrozen(obj)) return 3;
  if (Object.isSealed(obj)) return 2;
  return 1;
}
function getTypedArrayConstructor(name) {
  switch (name) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new SerovalUnknownTypedArrayError(name);
  }
}
let typedArrayNameGetter;
function getTypedArrayName(value) {
  if (!typedArrayNameGetter) typedArrayNameGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Int8Array.prototype), Symbol.toStringTag).get;
  return typedArrayNameGetter.call(value);
}
let typedArrayGetters;
let dataViewGetters;
function getAccessor(proto, key) {
  return Object.getOwnPropertyDescriptor(proto, key).get;
}
function getViewGetters(proto, lengthKey) {
  return {
    buffer: getAccessor(proto, "buffer"),
    byteOffset: getAccessor(proto, "byteOffset"),
    byteLength: getAccessor(proto, "byteLength"),
    length: getAccessor(proto, lengthKey)
  };
}
function readArrayBufferView(value, isDataView) {
  let getters;
  if (isDataView) getters = dataViewGetters ?? (dataViewGetters = getViewGetters(DataView.prototype, "byteLength"));
  else getters = typedArrayGetters ?? (typedArrayGetters = getViewGetters(Object.getPrototypeOf(Int8Array.prototype), "length"));
  return {
    buffer: getters.buffer.call(value),
    byteOffset: getters.byteOffset.call(value),
    byteLength: getters.byteLength.call(value),
    length: getters.length.call(value)
  };
}
function createNumberNode(value) {
  switch (value) {
    case Number.POSITIVE_INFINITY:
      return INFINITY_NODE;
    case Number.NEGATIVE_INFINITY:
      return NEG_INFINITY_NODE;
  }
  if (value !== value) return NAN_NODE;
  if (Object.is(value, -0)) return NEG_ZERO_NODE;
  return createSerovalNode(0, void 0, value);
}
function createStringNode(value) {
  return createSerovalNode(1, void 0, serializeString(value));
}
function createBigIntNode(current) {
  return createSerovalNode(3, void 0, "" + current);
}
function createIndexedValueNode(id) {
  return createSerovalNode(4, id);
}
const getDateTime = Date.prototype.getTime;
const getDateISOString = Date.prototype.toISOString;
function createDateNode(id, current) {
  const timestamp = getDateTime.call(current);
  return createSerovalNode(5, id, timestamp === timestamp ? getDateISOString.call(current) : "");
}
function createTemporalNode(id, type, temporalClass, current) {
  return createSerovalNode(36, id, temporalClass.prototype.toString.call(current), type);
}
const getRegExpSource = Object.getOwnPropertyDescriptor(RegExp.prototype, "source").get;
const getRegExpFlags = Object.getOwnPropertyDescriptor(RegExp.prototype, "flags").get;
function createRegExpNode(id, current) {
  return createSerovalNode(6, id, void 0, serializeString(getRegExpSource.call(current)), getRegExpFlags.call(current));
}
function createWKSymbolNode(id, current) {
  return createSerovalNode(17, id, INV_SYMBOL_REF[current]);
}
function createReferenceNode(id, referenceId) {
  return createSerovalNode(18, id, serializeString(referenceId));
}
function createPluginNode(id, tag, value) {
  return createSerovalNode(25, id, value, serializeString(tag));
}
function createArrayNode(id, current, parsedItems) {
  return createSerovalNode(9, id, void 0, void 0, void 0, void 0, void 0, parsedItems, void 0, void 0, getObjectFlag(current));
}
function createBoxedNode(id, boxed) {
  return createSerovalNode(21, id, void 0, void 0, void 0, void 0, void 0, void 0, boxed);
}
const MAX_TYPED_ARRAY_LENGTH = 1e6;
function assertArrayHoles(current) {
  const len = current.length;
  if (len > MAX_TYPED_ARRAY_LENGTH && len - Object.keys(current).length > MAX_TYPED_ARRAY_LENGTH) throw new SerovalUnsupportedTypeError(current);
}
function createViewNode(type, id, current, view, buffer) {
  const isDataView = type === 20;
  const size = view.length;
  if (size > MAX_TYPED_ARRAY_LENGTH) throw new SerovalUnsupportedTypeError(current);
  return createSerovalNode(type, id, void 0, isDataView ? void 0 : getTypedArrayName(current), void 0, void 0, void 0, void 0, buffer, view.byteOffset, void 0, size);
}
function createErrorNode(type, id, current, options) {
  return createSerovalNode(type, id, getErrorConstructor(current), void 0, serializeString(current.message), options);
}
function createSetNode(id, items) {
  return createSerovalNode(7, id, void 0, void 0, void 0, void 0, void 0, items);
}
function createIteratorFactoryInstanceNode(type, factory, items) {
  return createSerovalNode(type, void 0, void 0, void 0, void 0, void 0, void 0, [factory, items]);
}
function createStreamConstructorNode(id, factory, sequence, live) {
  return createSerovalNode(31, id, void 0, void 0, void 0, void 0, void 0, sequence, factory, void 0, void 0, live);
}
function createStreamEventNode(type, id, parsed) {
  return createSerovalNode(type, id, void 0, void 0, void 0, void 0, void 0, void 0, parsed);
}
function createSequenceNode(id, sequence, throwAt, doneAt) {
  return createSerovalNode(35, id, throwAt, void 0, void 0, void 0, void 0, sequence, void 0, void 0, void 0, doneAt);
}
const BRAND = /* @__PURE__ */ Symbol("LiveStream");
function isLiveStream(value) {
  return value != null && value[BRAND] === true;
}
var OpaqueReference = class {
  constructor(value, replacement) {
    this.value = value;
    this.replacement = replacement;
  }
};
const PROMISE_CONSTRUCTOR = () => {
  const resolver = {
    p: 0,
    s: 0,
    f: 0
  };
  resolver.p = new Promise((resolve, reject) => {
    resolver.s = resolve;
    resolver.f = reject;
  });
  return resolver;
};
const PROMISE_SUCCESS = (resolver, data) => {
  resolver.s(data);
  resolver.p.s = 1;
  resolver.p.v = data;
};
const PROMISE_FAILURE = (resolver, data) => {
  resolver.f(data);
  resolver.p.s = 2;
  resolver.p.v = data;
};
const SERIALIZED_PROMISE_CONSTRUCTOR = /* @__PURE__ */ PROMISE_CONSTRUCTOR.toString();
const SERIALIZED_PROMISE_SUCCESS = /* @__PURE__ */ PROMISE_SUCCESS.toString();
const SERIALIZED_PROMISE_FAILURE = /* @__PURE__ */ PROMISE_FAILURE.toString();
const STREAM_CONSTRUCTOR = (live) => {
  const buffer = [];
  const listeners = [];
  let alive = true;
  let success = false;
  let count = 0;
  const internal = {
    flush(value, mode, x) {
      live > 1 || buffer.push(value);
      for (x = 0; x < count; x++) {
        const listener = listeners[x];
        if (listener) listener[mode](value);
      }
    },
    up(listener, x, z, current) {
      for (x = 0, z = buffer.length; x < z; x++) {
        current = buffer[x];
        if (!alive && x === z - 1) listener[success ? "return" : "throw"](current);
        else listener.next(current);
      }
    },
    on(listener, temp = 0) {
      if (live > 1) throw new Error("Stream consumed");
      let subscribed = alive;
      if (alive) {
        for (temp = 0; temp < count; temp++) if (!listeners[temp]) break;
        if (temp === count) count++;
        listeners[temp] = listener;
      }
      internal.up(listener);
      if (live) {
        live = 2;
        buffer.length = 0;
      }
      return () => {
        if (alive && subscribed) {
          subscribed = false;
          listeners[temp] = void 0;
          while (count > 0 && !listeners[count - 1]) count--;
          listeners.length = count;
        }
      };
    }
  };
  return {
    __SEROVAL_STREAM__: true,
    on(listener) {
      return internal.on(listener);
    },
    next(value) {
      if (alive) internal.flush(value, "next");
    },
    throw(value) {
      if (alive) {
        internal.flush(value, "throw");
        alive = false;
        success = false;
        listeners.length = 0;
      }
    },
    return(value) {
      if (alive) {
        internal.flush(value, "return");
        alive = false;
        success = true;
        listeners.length = 0;
      }
    }
  };
};
const SERIALIZED_STREAM_CONSTRUCTOR = /* @__PURE__ */ STREAM_CONSTRUCTOR.toString();
const ITERATOR_CONSTRUCTOR = (symbol) => (sequence) => () => {
  let index = 0;
  const instance = {
    [symbol]() {
      return instance;
    },
    next() {
      if (index > sequence.d) return {
        done: true,
        value: void 0
      };
      const currentIndex = index++;
      const data = sequence.v[currentIndex];
      if (currentIndex === sequence.t) throw data;
      return {
        done: currentIndex === sequence.d,
        value: data
      };
    }
  };
  return instance;
};
const SERIALIZED_ITERATOR_CONSTRUCTOR = /* @__PURE__ */ ITERATOR_CONSTRUCTOR.toString();
const ASYNC_ITERATOR_CONSTRUCTOR = (symbol, createPromise) => (stream) => () => {
  let count = 0;
  let doneAt = -1;
  let isThrow = false;
  const buffer = [];
  const pending = [];
  const internal = { finalize(i = 0, len = pending.length) {
    for (; i < len; i++) pending[i].s({
      done: true,
      value: void 0
    });
  } };
  stream.on({
    next(value) {
      const temp = pending.shift();
      if (temp) temp.s({
        done: false,
        value
      });
      buffer.push(value);
    },
    throw(value) {
      const temp = pending.shift();
      if (temp) temp.f(value);
      internal.finalize();
      doneAt = buffer.length;
      isThrow = true;
      buffer.push(value);
    },
    return(value) {
      const temp = pending.shift();
      if (temp) temp.s({
        done: true,
        value
      });
      internal.finalize();
      doneAt = buffer.length;
      buffer.push(value);
    }
  });
  const instance = {
    [symbol]() {
      return instance;
    },
    next() {
      if (doneAt === -1) {
        const index2 = count++;
        if (index2 >= buffer.length) {
          const temp = createPromise();
          pending.push(temp);
          return temp.p;
        }
        return {
          done: false,
          value: buffer[index2]
        };
      }
      if (count > doneAt) return {
        done: true,
        value: void 0
      };
      const index = count++;
      const value = buffer[index];
      if (index !== doneAt) return {
        done: false,
        value
      };
      if (isThrow) throw value;
      return {
        done: true,
        value
      };
    }
  };
  return instance;
};
const SERIALIZED_ASYNC_ITERATOR_CONSTRUCTOR = /* @__PURE__ */ ASYNC_ITERATOR_CONSTRUCTOR.toString();
const ARRAY_BUFFER_CONSTRUCTOR = (b64) => {
  const decoded = atob(b64);
  const length = decoded.length;
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) arr[i] = decoded.charCodeAt(i);
  return arr.buffer;
};
const SERIALIZED_ARRAY_BUFFER_CONSTRUCTOR = /* @__PURE__ */ ARRAY_BUFFER_CONSTRUCTOR.toString();
var Sequence = class {
  constructor(values, throwAt, doneAt) {
    this.v = values;
    this.t = throwAt;
    this.d = doneAt;
  }
};
function isSequence(value) {
  return value instanceof Sequence;
}
function createSequence(values, throwAt, doneAt) {
  return new Sequence(values, throwAt, doneAt);
}
function createSequenceFromIterable(source) {
  const values = [];
  let throwsAt = -1;
  let doneAt = -1;
  const iterator = source[SYM_ITERATOR]();
  for (; ; ) try {
    const value = iterator.next();
    values.push(value.value);
    if (value.done) {
      doneAt = values.length - 1;
      break;
    }
  } catch (error) {
    throwsAt = values.length;
    doneAt = throwsAt;
    values.push(error);
    break;
  }
  return createSequence(values, throwsAt, doneAt);
}
const createIterator = /* @__PURE__ */ ITERATOR_CONSTRUCTOR(SYM_ITERATOR);
function sequenceToIterator(sequence) {
  return createIterator(sequence);
}
const ITERATOR = {};
const ASYNC_ITERATOR = {};
const SPECIAL_REFS = {
  [0]: {},
  [1]: {},
  [2]: {},
  [3]: {},
  [4]: {},
  [5]: {}
};
const SPECIAL_REF_STRING = {
  [0]: "[]",
  [1]: SERIALIZED_PROMISE_CONSTRUCTOR,
  [2]: SERIALIZED_PROMISE_SUCCESS,
  [3]: SERIALIZED_PROMISE_FAILURE,
  [4]: SERIALIZED_STREAM_CONSTRUCTOR,
  [5]: SERIALIZED_ARRAY_BUFFER_CONSTRUCTOR
};
var Stream = class {
  constructor(live) {
    this.buffer = [];
    this.listeners = [];
    this.alive = true;
    this.success = false;
    this.count = 0;
    this.live = live;
  }
  flush(value, mode) {
    this.live > 1 || this.buffer.push(value);
    for (let x = 0; x < this.count; x++) this.listeners[x]?.[mode](value);
  }
  replay(listener) {
    for (let x = 0, z = this.buffer.length; x < z; x++) {
      const current = this.buffer[x];
      if (!this.alive && x === z - 1) listener[this.success ? "return" : "throw"](current);
      else listener.next(current);
    }
  }
  on(listener) {
    if (this.live > 1) throw new Error("Stream consumed");
    let subscribed = this.alive;
    let temp = 0;
    if (subscribed) {
      for (; temp < this.count; temp++) if (!this.listeners[temp]) break;
      if (temp === this.count) this.count++;
      this.listeners[temp] = listener;
    }
    this.replay(listener);
    if (this.live) {
      this.live = 2;
      this.buffer.length = 0;
    }
    return () => {
      if (this.alive && subscribed) {
        subscribed = false;
        this.listeners[temp] = void 0;
        while (this.count > 0 && !this.listeners[this.count - 1]) this.count--;
        this.listeners.length = this.count;
      }
    };
  }
  /**
  * Returns the events of a stream that has ended, without subscribing, so a
  * live receiver is not consumed. The last value is the `return` or `throw`
  * value. Returns `undefined` while the stream is open, or when a live
  * receiver was already consumed and has no events left.
  * @internal
  */
  endedEvents() {
    if (this.alive || this.live > 1) return void 0;
    return {
      values: this.buffer.slice(),
      success: this.success
    };
  }
  next(value) {
    if (this.alive) this.flush(value, "next");
  }
  throw(value) {
    if (this.alive) {
      this.flush(value, "throw");
      this.alive = false;
      this.success = false;
      this.listeners.length = 0;
    }
  }
  return(value) {
    if (this.alive) {
      this.flush(value, "return");
      this.alive = false;
      this.success = true;
      this.listeners.length = 0;
    }
  }
};
function isStream(value) {
  return value instanceof Stream || isLiveStream(value);
}
function createStream() {
  return new Stream();
}
const createAsyncIterable = /* @__PURE__ */ ASYNC_ITERATOR_CONSTRUCTOR(SYM_ASYNC_ITERATOR, PROMISE_CONSTRUCTOR);
function streamToAsyncIterable(stream) {
  return createAsyncIterable(stream);
}
async function promiseToResult(current) {
  try {
    return [1, await current];
  } catch (e) {
    return [0, e];
  }
}
function encodeArrayBuffer$1(current) {
  const bytes = new Uint8Array(current);
  if (typeof bytes.toBase64 === "function") return bytes.toBase64();
  let result = "";
  for (let i = 0, len = bytes.length; i < len; i++) result += String.fromCharCode(bytes[i]);
  return btoa(result);
}
const MIN_NATIVE_BASE64_LENGTH = 512;
function encodeArrayBuffer(current) {
  if (typeof Buffer !== "undefined") return Buffer.from(current).toString("base64");
  return encodeArrayBuffer$1(current);
}
function decodeArrayBuffer(source) {
  if (source.length < MIN_NATIVE_BASE64_LENGTH || typeof Buffer === "undefined") return ARRAY_BUFFER_CONSTRUCTOR(source);
  const decoded = atob(source);
  const buffer = new ArrayBuffer(decoded.length);
  Buffer.from(buffer).write(decoded, "latin1");
  return buffer;
}
function createPlugin(plugin) {
  return plugin;
}
function dedupePlugins(deduped, plugins) {
  for (let i = 0, len = plugins.length; i < len; i++) {
    const current = plugins[i];
    if (!deduped.has(current)) {
      deduped.add(current);
      if (current.extends) dedupePlugins(deduped, current.extends);
    }
  }
}
const RESOLVED_PLUGINS = /* @__PURE__ */ new WeakMap();
function matchResolved(resolved, plugins, added) {
  for (let i = 0, len = plugins.length; i < len; i++) {
    const current = plugins[i];
    if (current === resolved[added]) {
      added++;
      if (current.extends) {
        added = matchResolved(resolved, current.extends, added);
        if (added === -1) return -1;
      }
    } else {
      const index = resolved.indexOf(current);
      if (index === -1 || index >= added) return -1;
    }
  }
  return added;
}
function resolvePlugins(plugins) {
  if (plugins) {
    const cached = RESOLVED_PLUGINS.get(plugins);
    if (cached && matchResolved(cached, plugins, 0) === cached.length) return cached;
    const deduped = /* @__PURE__ */ new Set();
    dedupePlugins(deduped, plugins);
    const resolved = [...deduped];
    RESOLVED_PLUGINS.set(plugins, resolved);
    return resolved;
  }
}
function getPlainObjectPlugins(plugins) {
  if (plugins) {
    for (let i = 0, len = plugins.length; i < len; i++) if (plugins[i].skipPlainObjects) {
      const result = plugins.filter((plugin) => !plugin.skipPlainObjects);
      return result.length ? result : void 0;
    }
  }
  return plugins;
}
const REFERENCES_KEY = "__SEROVAL_REFS__";
const GLOBAL_CONTEXT_R = `self.$R`;
function getCrossReferenceHeader(id) {
  return `(${GLOBAL_CONTEXT_R}=${GLOBAL_CONTEXT_R}||{})["${serializeString(id)}"]=[]`;
}
const REFERENCE = /* @__PURE__ */ new Map();
const INV_REFERENCE = /* @__PURE__ */ new Map();
function hasReference(id) {
  return INV_REFERENCE.has(id);
}
function getReferenceID(value) {
  return REFERENCE.get(value);
}
function getReference(id) {
  if (hasReference(id)) return INV_REFERENCE.get(id);
  throw new SerovalMissingReferenceForIdError(id);
}
function createBaseParserContext(options) {
  return {
    plugins: options.plugins,
    plainObjectPlugins: getPlainObjectPlugins(options.plugins),
    marked: /* @__PURE__ */ new Set(),
    features: 127 ^ (options.disabledFeatures ?? 0),
    refs: options.refs ?? /* @__PURE__ */ new Map(),
    depthLimit: options.depthLimit || 1e3,
    compactArrayBufferViews: options.compactArrayBufferViews ?? false
  };
}
function getObjectPlugins(ctx, current, currentClass) {
  return currentClass === Object && Object.getPrototypeOf(current) === Object.prototype ? ctx.plainObjectPlugins : ctx.plugins;
}
function markParserRef(ctx, id) {
  ctx.marked.add(id);
}
function createIndexForValue(ctx, current) {
  const id = ctx.refs.size;
  ctx.refs.set(current, id);
  return id;
}
function rollbackRefs(refs, size) {
  if (refs.size > size) {
    for (const [value, id] of refs) if (id >= size) refs.delete(value);
  }
}
function getNodeForIndexedValue(ctx, current) {
  const registeredId = ctx.refs.get(current);
  if (registeredId != null) {
    markParserRef(ctx, registeredId);
    return createIndexedValueNode(registeredId);
  }
  return createIndexForValue(ctx, current);
}
function getReferenceNode(ctx, current) {
  const indexed = getNodeForIndexedValue(ctx, current);
  if (typeof indexed !== "number") return indexed;
  const referenceId = getReferenceID(current);
  return referenceId === void 0 ? indexed : createReferenceNode(indexed, referenceId);
}
function parseWellKnownSymbol(ctx, current) {
  const ref = getReferenceNode(ctx, current);
  if (typeof ref !== "number") return ref;
  if (current in INV_SYMBOL_REF) return createWKSymbolNode(ref, current);
  throw new SerovalUnsupportedTypeError(current);
}
function parseSpecialReference(ctx, ref) {
  const result = getNodeForIndexedValue(ctx, SPECIAL_REFS[ref]);
  if (typeof result !== "number") return result;
  return createSerovalNode(26, result, ref);
}
function parseIteratorFactory(ctx) {
  const result = getNodeForIndexedValue(ctx, ITERATOR);
  if (typeof result !== "number") return result;
  return createSerovalNode(27, result, void 0, void 0, void 0, void 0, void 0, void 0, parseWellKnownSymbol(ctx, SYM_ITERATOR));
}
function parseAsyncIteratorFactory(ctx) {
  const result = getNodeForIndexedValue(ctx, ASYNC_ITERATOR);
  if (typeof result !== "number") return result;
  return createSerovalNode(29, result, void 0, void 0, void 0, void 0, void 0, [parseSpecialReference(ctx, 1), parseWellKnownSymbol(ctx, SYM_ASYNC_ITERATOR)]);
}
function getTemporalType(currentClass) {
  switch (currentClass) {
    case Temporal.Instant:
      return 0;
    case Temporal.Duration:
      return 1;
    case Temporal.PlainDate:
      return 2;
    case Temporal.PlainDateTime:
      return 3;
    case Temporal.PlainMonthDay:
      return 4;
    case Temporal.PlainTime:
      return 5;
    case Temporal.PlainYearMonth:
      return 6;
    case Temporal.ZonedDateTime:
      return 7;
    default:
      return;
  }
}
function getObjectClass(current) {
  const proto = Object.getPrototypeOf(current);
  if (proto === null) return void 0;
  if (proto === Object.prototype) return Object;
  const currentClass = proto.constructor;
  if (typeof currentClass !== "function" || currentClass === Object || currentClass.prototype === proto) return currentClass;
  return proto;
}
function getObjectKind(current, currentClass, features) {
  switch (currentClass) {
    case Object:
      return 1;
    case void 0:
      return 2;
    case Date:
      return 3;
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return 4;
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return 6;
    case ArrayBuffer:
      return 7;
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return 8;
    case DataView:
      return 10;
    case Map:
      return 11;
    case Set:
      return 12;
  }
  if (currentClass === Promise || current instanceof Promise) return 13;
  if (features & 32 && currentClass === RegExp) return 14;
  if (features & 16 && (currentClass === BigInt64Array || currentClass === BigUint64Array)) return 9;
  if (features & 1 && typeof AggregateError !== "undefined" && (currentClass === AggregateError || current instanceof AggregateError)) return 5;
  if (features & 64 && typeof Temporal !== "undefined" && getTemporalType(currentClass) != null) return 15;
  if (ArrayBuffer.isView(current)) {
    const name = getTypedArrayName(current);
    if (name === void 0) return 10;
    if (name !== "BigInt64Array" && name !== "BigUint64Array") return 8;
    if (features & 16) return 9;
  }
  if (current instanceof Error) return 4;
  if (SYM_ITERATOR in current || SYM_ASYNC_ITERATOR in current) return 16;
  return 0;
}
function createObjectNode(id, current, empty, record) {
  return createSerovalNode(empty ? 11 : 10, id, void 0, void 0, void 0, record, void 0, void 0, void 0, void 0, getObjectFlag(current));
}
function parseMapSentinel(ctx) {
  return parseSpecialReference(ctx, 0);
}
function createMapNode(id, sentinel, k, v) {
  return createSerovalNode(8, id, void 0, void 0, void 0, void 0, {
    k,
    v
  }, void 0, sentinel);
}
function createPromiseConstructorNode(ctx, id, resolver) {
  return createSerovalNode(22, id, resolver, void 0, void 0, void 0, void 0, void 0, parseSpecialReference(ctx, 1));
}
function getArrayBufferView(ctx, view) {
  if (!ctx.compactArrayBufferViews) return view;
  return {
    buffer: new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice().buffer,
    byteOffset: 0,
    byteLength: view.byteLength,
    length: view.length
  };
}
function createArrayBufferNode(ctx, id, current) {
  return createSerovalNode(19, id, encodeArrayBuffer(current), void 0, void 0, void 0, void 0, void 0, parseSpecialReference(ctx, 5));
}
function createAsyncParserContext(options) {
  return { base: createBaseParserContext(options) };
}
function ignoreRejection$1() {
}
function handleChildPromises(values) {
  for (const value of values) if (value instanceof Promise) Promise.prototype.then.call(value, void 0, ignoreRejection$1);
}
async function parseItems$1(ctx, depth, current) {
  assertArrayHoles(current);
  const len = current.length;
  const nodes = new Array(len);
  const values = new Array(len);
  const present = new Array(len);
  for (let i = 0; i < len; i++) {
    present[i] = i in current;
    if (present[i]) values[i] = current[i];
  }
  handleChildPromises(values);
  for (let i = 0, node; i < len; i++) if (present[i]) {
    node = parseValueAsync(ctx, depth, values[i]);
    nodes[i] = node instanceof Promise ? await node : node;
  } else nodes[i] = 0;
  return nodes;
}
async function parseArray$1(ctx, depth, id, current) {
  return createArrayNode(id, current, await parseItems$1(ctx, depth, current));
}
async function parseProperties$1(ctx, depth, properties) {
  const keys = Object.keys(properties);
  const len = keys.length;
  const keyNodes = new Array(len);
  const valueNodes = new Array(len);
  const values = new Array(len);
  for (let i = 0; i < len; i++) values[i] = properties[keys[i]];
  handleChildPromises(values);
  for (let i = 0, node; i < len; i++) {
    keyNodes[i] = serializeString(keys[i]);
    node = parseValueAsync(ctx, depth, values[i]);
    valueNodes[i] = node instanceof Promise ? await node : node;
  }
  if (SYM_ITERATOR in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_ITERATOR));
    valueNodes.push(createIteratorFactoryInstanceNode(28, parseIteratorFactory(ctx.base), await parseAsync(ctx, depth, createSequenceFromIterable(properties))));
  }
  if (SYM_ASYNC_ITERATOR in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_ASYNC_ITERATOR));
    valueNodes.push(createIteratorFactoryInstanceNode(30, parseAsyncIteratorFactory(ctx.base), await parseAsyncIterable$1(ctx, depth, properties)));
  }
  if (SYM_TO_STRING_TAG in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_TO_STRING_TAG));
    valueNodes.push(createStringNode(properties[SYM_TO_STRING_TAG]));
  }
  if (SYM_IS_CONCAT_SPREADABLE in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_IS_CONCAT_SPREADABLE));
    valueNodes.push(properties[SYM_IS_CONCAT_SPREADABLE] ? TRUE_NODE : FALSE_NODE);
  }
  return {
    k: keyNodes,
    v: valueNodes
  };
}
async function parsePlainObject$1(ctx, depth, id, current, empty) {
  return createObjectNode(id, current, empty, await parseProperties$1(ctx, depth, current));
}
async function parseBoxed$1(ctx, depth, id, current) {
  const node = parseValueAsync(ctx, depth, current.valueOf());
  return createBoxedNode(id, node instanceof Promise ? await node : node);
}
async function parseView$1(ctx, depth, type, id, current) {
  const view = getArrayBufferView(ctx.base, readArrayBufferView(current, type === 20));
  return createViewNode(type, id, current, view, await parseAsync(ctx, depth, view.buffer));
}
async function parseError$1(ctx, depth, type, id, current) {
  const options = getErrorOptions(current, ctx.base.features);
  return createErrorNode(type, id, current, options ? await parseProperties$1(ctx, depth, options) : void 0);
}
async function parseMap$1(ctx, depth, id, current) {
  const sentinel = parseMapSentinel(ctx.base);
  const entries = [...current.entries()];
  const keyNodes = new Array(entries.length);
  const valueNodes = new Array(entries.length);
  const keys = new Array(entries.length);
  const values = new Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    keys[i] = entries[i][0];
    values[i] = entries[i][1];
  }
  handleChildPromises(keys);
  handleChildPromises(values);
  for (let i = 0, node; i < entries.length; i++) {
    node = parseValueAsync(ctx, depth, keys[i]);
    keyNodes[i] = node instanceof Promise ? await node : node;
    node = parseValueAsync(ctx, depth, values[i]);
    valueNodes[i] = node instanceof Promise ? await node : node;
  }
  return createMapNode(id, sentinel, keyNodes, valueNodes);
}
async function parseSet$1(ctx, depth, id, current) {
  const values = [...current.keys()];
  const items = new Array(values.length);
  handleChildPromises(values);
  for (let i = 0, node; i < values.length; i++) {
    node = parseValueAsync(ctx, depth, values[i]);
    items[i] = node instanceof Promise ? await node : node;
  }
  return createSetNode(id, items);
}
async function parsePlugin$1(ctx, depth, id, current, currentPlugins) {
  if (currentPlugins) for (let i = 0, len = currentPlugins.length; i < len; i++) {
    const plugin = currentPlugins[i];
    if (plugin.parse.async && plugin.test(current)) return createPluginNode(id, plugin.tag, await plugin.parse.async(current, {
      parse: (value) => parseAsync(ctx, depth, value),
      parseStreamSource(source) {
        if (depth >= ctx.base.depthLimit) throw new SerovalDepthLimitError(ctx.base.depthLimit);
        return parseAsyncIterable$1(ctx, depth + 1, source);
      }
    }, { id }));
  }
}
async function parsePromise$1(ctx, depth, id, current) {
  const [status, result] = await promiseToResult(current);
  return createSerovalNode(12, id, status, void 0, void 0, void 0, void 0, void 0, await parseAsync(ctx, depth, result));
}
function parseStreamHandle(depth, id, current, resolve, reject) {
  const sequence = [];
  let unparsed = 0;
  let ended = false;
  let settled = false;
  const fail = (error) => {
    if (!settled) {
      settled = true;
      try {
        cleanup(error);
      } catch {
      }
      reject(error);
    }
  };
  const handle = (type) => (value, accept) => {
    if (settled) return;
    markParserRef(this.base, id);
    const slot = sequence.push(void 0) - 1;
    unparsed++;
    if (type !== 32) ended = true;
    parseAsync(this, depth, value).then((data) => {
      if (!settled) {
        sequence[slot] = createStreamEventNode(type, id, data);
        unparsed--;
        accept?.();
        if (ended && unparsed === 0) {
          settled = true;
          try {
            cleanup();
          } catch (error) {
            reject(error);
            return;
          }
          resolve(sequence);
        }
      }
    }, fail);
  };
  const listener = {
    next: handle(32),
    throw: handle(33),
    return: handle(34)
  };
  const cleanup = isLiveStream(current) ? current.pump(listener) : current.on(listener);
}
async function parseStream$1(ctx, depth, id, current) {
  return createStreamConstructorNode(id, parseSpecialReference(ctx.base, 4), await new Promise(parseStreamHandle.bind(ctx, depth, id, current)));
}
async function parseAsyncIterable$1(ctx, depth, current) {
  const id = createIndexForValue(ctx.base, {});
  const reference = parseSpecialReference(ctx.base, 4);
  const iterator = current[SYM_ASYNC_ITERATOR]();
  const sequence = [];
  for (; ; ) {
    let result;
    markParserRef(ctx.base, id);
    try {
      result = await iterator.next();
    } catch (error) {
      sequence.push(createStreamEventNode(33, id, await parseAsync(ctx, depth, error)));
      break;
    }
    let parsed;
    try {
      parsed = await parseAsync(ctx, depth, result.value);
    } catch (error) {
      Promise.resolve().then(() => iterator.return?.()).catch(() => {
      });
      throw error;
    }
    sequence.push(createStreamEventNode(result.done ? 34 : 32, id, parsed));
    if (result.done) break;
  }
  return createStreamConstructorNode(id, reference, sequence);
}
async function parseSequence$1(ctx, depth, id, current) {
  const len = current.v.length;
  const nodes = new Array(len);
  for (let i = 0, node; i < len; i++) {
    node = parseValueAsync(ctx, depth, current.v[i]);
    nodes[i] = node instanceof Promise ? await node : node;
  }
  return createSequenceNode(id, nodes, current.t, current.d);
}
async function parseObjectAsync(ctx, depth, id, current) {
  if (Array.isArray(current)) return parseArray$1(ctx, depth, id, current);
  if (isStream(current)) return parseStream$1(ctx, depth, id, current);
  if (isSequence(current)) return parseSequence$1(ctx, depth, id, current);
  const currentClass = getObjectClass(current);
  if (currentClass === OpaqueReference) return parseAsync(ctx, depth, current.replacement);
  const parsed = await parsePlugin$1(ctx, depth, id, current, getObjectPlugins(ctx.base, current, currentClass));
  if (parsed) return parsed;
  if (currentClass === Object) return parsePlainObject$1(ctx, depth, id, current, false);
  switch (getObjectKind(current, currentClass, ctx.base.features)) {
    case 2:
      return parsePlainObject$1(ctx, depth, id, current, true);
    case 3:
      return createDateNode(id, current);
    case 4:
      return parseError$1(ctx, depth, 13, id, current);
    case 5:
      return parseError$1(ctx, depth, 14, id, current);
    case 6:
      return parseBoxed$1(ctx, depth, id, current);
    case 7:
      return createArrayBufferNode(ctx.base, id, current);
    case 8:
      return parseView$1(ctx, depth, 15, id, current);
    case 9:
      return parseView$1(ctx, depth, 16, id, current);
    case 10:
      return parseView$1(ctx, depth, 20, id, current);
    case 11:
      return parseMap$1(ctx, depth, id, current);
    case 12:
      return parseSet$1(ctx, depth, id, current);
    case 13:
      return parsePromise$1(ctx, depth, id, current);
    case 14:
      return createRegExpNode(id, current);
    case 15:
      return createTemporalNode(id, getTemporalType(currentClass), currentClass, current);
    case 16:
      return parsePlainObject$1(ctx, depth, id, current, !!currentClass);
    default:
      throw new SerovalUnsupportedTypeError(current);
  }
}
async function parseFunctionAsync(ctx, depth, current) {
  const ref = getReferenceNode(ctx.base, current);
  if (typeof ref !== "number") return ref;
  const plugin = await parsePlugin$1(ctx, depth, ref, current, ctx.base.plugins);
  if (plugin) return plugin;
  throw new SerovalUnsupportedTypeError(current);
}
function parseValueAsync(ctx, depth, current) {
  if (depth >= ctx.base.depthLimit) throw new SerovalDepthLimitError(ctx.base.depthLimit);
  switch (typeof current) {
    case "boolean":
      return current ? TRUE_NODE : FALSE_NODE;
    case "undefined":
      return UNDEFINED_NODE;
    case "string":
      return createStringNode(current);
    case "number":
      return createNumberNode(current);
    case "bigint":
      return createBigIntNode(current);
    case "object":
      if (current) {
        const ref = getReferenceNode(ctx.base, current);
        return typeof ref === "number" ? parseObjectAsync(ctx, depth + 1, ref, current) : ref;
      }
      return NULL_NODE;
    case "symbol":
      return parseWellKnownSymbol(ctx.base, current);
    case "function":
      return parseFunctionAsync(ctx, depth, current);
    default:
      throw new SerovalUnsupportedTypeError(current);
  }
}
async function parseAsync(ctx, depth, current) {
  return await parseValueAsync(ctx, depth, current);
}
async function parseTopAsync(ctx, current) {
  const refs = ctx.base.refs;
  const size = refs.size;
  try {
    return await parseAsync(ctx, 0, current);
  } catch (error) {
    rollbackRefs(refs, size);
    throw error instanceof SerovalParserError ? error : new SerovalParserError(error);
  }
}
function isValidKey(key) {
  switch (key) {
    case "constructor":
    case "__proto__":
    case "prototype":
    case "__defineGetter__":
    case "__defineSetter__":
    case "__lookupGetter__":
    case "__lookupSetter__":
      return false;
    default:
      return true;
  }
}
function isValidSymbol(symbol) {
  switch (symbol) {
    case SYM_ASYNC_ITERATOR:
    case SYM_IS_CONCAT_SPREADABLE:
    case SYM_TO_STRING_TAG:
    case SYM_ITERATOR:
      return true;
    default:
      return false;
  }
}
const DEFAULT_MAX_BASE64_LENGTH = 1e6;
const MAX_BIGINT_LENGTH = 1e4;
const MAX_REGEXP_SOURCE_LENGTH = 2e4;
function applyObjectFlag(obj, flag) {
  switch (flag) {
    case 3:
      return Object.freeze(obj);
    case 1:
      return Object.preventExtensions(obj);
    case 2:
      return Object.seal(obj);
    default:
      return obj;
  }
}
const DEFAULT_DEPTH_LIMIT = 1e3;
const MAX_REGEXP_PROPERTY_ESCAPES = 32;
const REGEXP_PROPERTY_ESCAPE = /\\[pP]\{/g;
function createBaseDeserializerContext(options) {
  const maxBase64Length = options.maxBase64Length ?? DEFAULT_MAX_BASE64_LENGTH;
  if (!Number.isSafeInteger(maxBase64Length) || maxBase64Length < 0) throw new RangeError("maxBase64Length must be a non-negative safe integer");
  const refs = options.refs ?? /* @__PURE__ */ new Map();
  if (!("types" in refs)) Object.assign(refs, { types: /* @__PURE__ */ new Map() });
  return {
    plugins: options.plugins,
    refs,
    features: options.features ?? 127 ^ (options.disabledFeatures ?? 0),
    depthLimit: options.depthLimit || DEFAULT_DEPTH_LIMIT,
    maxBase64Length,
    regexpPropertyEscapes: MAX_REGEXP_PROPERTY_ESCAPES
  };
}
function createVanillaDeserializerContext(options) {
  return {
    base: createBaseDeserializerContext(options),
    marked: new Set(options.markedRefs)
  };
}
function guardIndexedValue(ctx, id) {
  const node = {
    t: 4,
    i: id
  };
  if (id < 0 || !Number.isInteger(id)) throw new SerovalMalformedNodeError(node);
  if (ctx.refs.has(id)) throw new SerovalConflictedNodeIdError(node);
}
function isThennable(value) {
  return !!value && (typeof value === "object" || typeof value === "function") && "then" in value && typeof value.then === "function";
}
const ignoreRejection = () => {
};
function assignIndexedValue$1(ctx, id, value) {
  guardIndexedValue(ctx.base, id);
  if (value instanceof Promise) value.catch(ignoreRejection);
  const marked = ctx.marked;
  if (!marked || marked.has(id)) ctx.base.refs.set(id, value);
  return value;
}
function deserializeKnownValue(node, record, key) {
  if (Object.hasOwn(record, key)) return record[key];
  throw new SerovalMalformedNodeError(node);
}
function deserializeReference(ctx, node) {
  return assignIndexedValue$1(ctx, node.i, getReference(deserializeString(node.s)));
}
function validateNodeList(node, list) {
  if (!Array.isArray(list)) throw new SerovalMalformedNodeError(node);
}
function deserializeArray(ctx, depth, node) {
  const items = node.a;
  validateNodeList(node, items);
  const len = items.length;
  const result = assignIndexedValue$1(ctx, node.i, new Array(len));
  for (let i = 0, item; i < len; i++) {
    item = items[i];
    if (item) result[i] = deserialize$1(ctx, depth, item);
  }
  applyObjectFlag(result, node.o);
  return result;
}
function assignStringProperty(object, key, value) {
  if (isValidKey(key)) object[key] = value;
  else Object.defineProperty(object, key, {
    value,
    configurable: true,
    enumerable: true,
    writable: true
  });
}
function assignProperty(ctx, depth, object, key, value) {
  if (typeof key === "string") assignStringProperty(object, deserializeString(key), deserialize$1(ctx, depth, value));
  else {
    const actual = deserialize$1(ctx, depth, key);
    switch (typeof actual) {
      case "string":
        assignStringProperty(object, actual, deserialize$1(ctx, depth, value));
        break;
      case "symbol":
        if (isValidSymbol(actual)) object[actual] = deserialize$1(ctx, depth, value);
        break;
      default:
        throw new SerovalMalformedNodeError(key);
    }
  }
}
function assignNodeType(ctx, id, type) {
  ctx.base.refs.types.set(id, type);
}
function validateNodeType(ctx, node, id, type) {
  if (ctx.base.refs.types.get(id) !== type) throw new SerovalMalformedNodeError(node);
}
function deserializeProperties(ctx, depth, node, result) {
  const keys = node.k;
  validateNodeList(node, keys);
  validateNodeList(node, node.v);
  const len = keys.length;
  if (len > 0) for (let i = 0, vals = node.v; i < len; i++) assignProperty(ctx, depth, result, keys[i], vals[i]);
  return result;
}
function deserializeObject(ctx, depth, node) {
  const result = assignIndexedValue$1(ctx, node.i, node.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
  deserializeProperties(ctx, depth, node.p, result);
  applyObjectFlag(result, node.o);
  return result;
}
function deserializeDate(ctx, node) {
  return assignIndexedValue$1(ctx, node.i, new Date(node.s));
}
function deserializeTemporal(ctx, node) {
  if (!(ctx.base.features & 64)) throw new SerovalUnsupportedNodeError(node);
  const construct = Temporal[deserializeKnownValue(node, TEMPORAL_TYPE_NAME, node.c)];
  return assignIndexedValue$1(ctx, node.i, construct.from(node.s));
}
function deserializeRegExp(ctx, node) {
  if (ctx.base.features & 32) {
    const source = deserializeString(node.c);
    if (source.length > MAX_REGEXP_SOURCE_LENGTH) throw new SerovalMalformedNodeError(node);
    if (/[uv]/.test(String(node.m))) {
      const escapes = source.match(REGEXP_PROPERTY_ESCAPE);
      if (escapes) {
        ctx.base.regexpPropertyEscapes -= escapes.length;
        if (ctx.base.regexpPropertyEscapes < 0) throw new SerovalMalformedNodeError(node);
      }
    }
    return assignIndexedValue$1(ctx, node.i, new RegExp(source, node.m));
  }
  throw new SerovalUnsupportedNodeError(node);
}
function deserializeSet(ctx, depth, node) {
  const result = assignIndexedValue$1(ctx, node.i, /* @__PURE__ */ new Set());
  validateNodeList(node, node.a);
  for (let i = 0, items = node.a, len = items.length; i < len; i++) result.add(deserialize$1(ctx, depth, items[i]));
  return result;
}
function deserializeMap(ctx, depth, node) {
  const result = assignIndexedValue$1(ctx, node.i, /* @__PURE__ */ new Map());
  validateNodeList(node, node.e.k);
  validateNodeList(node, node.e.v);
  for (let i = 0, keys = node.e.k, vals = node.e.v, len = keys.length; i < len; i++) result.set(deserialize$1(ctx, depth, keys[i]), deserialize$1(ctx, depth, vals[i]));
  return result;
}
function deserializeArrayBuffer(ctx, node) {
  if (typeof node.s !== "string") throw new SerovalMalformedNodeError(node);
  if (node.s.length > ctx.base.maxBase64Length) throw new RangeError("ArrayBuffer exceeds maxBase64Length (" + ctx.base.maxBase64Length + ")");
  const buffer = decodeArrayBuffer(deserializeString(node.s));
  return assignIndexedValue$1(ctx, node.i, buffer);
}
function deserializeView(ctx, depth, node, construct) {
  const source = deserialize$1(ctx, depth, node.f);
  if (!(source instanceof ArrayBuffer)) throw new SerovalMalformedNodeError(node);
  const offset = node.b ?? 0;
  if (offset < 0 || offset > source.byteLength) throw new SerovalMalformedNodeError(node);
  return assignIndexedValue$1(ctx, node.i, construct ? new construct(source, offset, node.l) : new DataView(source, offset, node.l));
}
function deserializeDictionary(ctx, depth, node, result) {
  if (node.p) {
    const fields = deserializeProperties(ctx, depth, node.p, {});
    Object.defineProperties(result, Object.getOwnPropertyDescriptors(fields));
  }
  return result;
}
function deserializeAggregateError(ctx, depth, node) {
  return deserializeDictionary(ctx, depth, node, assignIndexedValue$1(ctx, node.i, new AggregateError([], deserializeString(node.m))));
}
function deserializeError(ctx, depth, node) {
  const construct = deserializeKnownValue(node, ERROR_CONSTRUCTOR, node.s);
  return deserializeDictionary(ctx, depth, node, assignIndexedValue$1(ctx, node.i, new construct(deserializeString(node.m))));
}
function deserializePromise(ctx, depth, node) {
  const deferred = PROMISE_CONSTRUCTOR();
  const result = assignIndexedValue$1(ctx, node.i, deferred.p);
  const deserialized = deserialize$1(ctx, depth, node.f);
  if (isThennable(deserialized)) throw new SerovalMalformedNodeError(node.f);
  if (node.s) deferred.s(deserialized);
  else deferred.f(deserialized);
  return result;
}
function deserializeBoxed(ctx, depth, node) {
  return assignIndexedValue$1(ctx, node.i, Object(deserialize$1(ctx, depth, node.f)));
}
function deserializePlugin(ctx, depth, node) {
  const currentPlugins = ctx.base.plugins;
  if (currentPlugins) {
    const tag = deserializeString(node.c);
    for (let i = 0, len = currentPlugins.length; i < len; i++) {
      const plugin = currentPlugins[i];
      if (plugin.tag === tag) return assignIndexedValue$1(ctx, node.i, plugin.deserialize(node.s, { deserialize: (current) => deserialize$1(ctx, depth, current) }, { id: node.i }));
    }
  }
  throw new SerovalMissingPluginError(node.c);
}
function deserializePromiseConstructor(ctx, node) {
  const value = assignIndexedValue$1(ctx, node.i, assignIndexedValue$1(ctx, node.s, PROMISE_CONSTRUCTOR()).p);
  assignNodeType(ctx, node.s, 22);
  ctx.base.pending?.add(node.s);
  return value;
}
function deserializePromiseFulfill(ctx, depth, node) {
  const deferred = ctx.base.refs.get(node.i);
  if (deferred) {
    validateNodeType(ctx, node, node.i, 22);
    const deserialized = deserialize$1(ctx, depth, node.a[1]);
    if (isThennable(deserialized)) throw new SerovalMalformedNodeError(node.a[1]);
    if (node.t === 23) deferred.s(deserialized);
    else deferred.f(deserialized);
    ctx.base.pending?.delete(node.i);
    return;
  }
  throw new SerovalMissingInstanceError("Promise");
}
function deserializeIteratorFactoryInstance(ctx, depth, node) {
  deserialize$1(ctx, depth, node.a[0]);
  const source = deserialize$1(ctx, depth, node.a[1]);
  if (!isSequence(source)) throw new SerovalMalformedNodeError(node.a[1]);
  return sequenceToIterator(source);
}
function deserializeAsyncIteratorFactoryInstance(ctx, depth, node) {
  deserialize$1(ctx, depth, node.a[0]);
  const source = deserialize$1(ctx, depth, node.a[1]);
  if (!isStream(source)) throw new SerovalMalformedNodeError(node.a[1]);
  return streamToAsyncIterable(source);
}
function deserializeStreamConstructor(ctx, depth, node) {
  const result = assignIndexedValue$1(ctx, node.i, new Stream(node.l === 1 ? 1 : void 0));
  assignNodeType(ctx, node.i, 31);
  ctx.base.pending?.add(node.i);
  const items = node.a;
  validateNodeList(node, items);
  const len = items.length;
  if (len) for (let i = 0; i < len; i++) deserialize$1(ctx, depth, items[i]);
  return result;
}
function deserializeStreamCall(ctx, depth, node, method) {
  const deferred = ctx.base.refs.get(node.i);
  if (deferred) {
    validateNodeType(ctx, node, node.i, 31);
    deferred[method](deserialize$1(ctx, depth, node.f));
    if (method !== "next") ctx.base.pending?.delete(node.i);
    return;
  }
  throw new SerovalMissingInstanceError("Stream");
}
function deserializeIteratorFactory(ctx, depth, node) {
  deserialize$1(ctx, depth, node.f);
}
function deserializeAsyncIteratorFactory(ctx, depth, node) {
  deserialize$1(ctx, depth, node.a[1]);
}
function isSequenceIndex(value, size) {
  return Number.isInteger(value) && value >= -1 && value < size;
}
function deserializeSequence(ctx, depth, node) {
  validateNodeList(node, node.a);
  const size = node.a.length;
  if (!(isSequenceIndex(node.s, size) && isSequenceIndex(node.l, size))) throw new SerovalMalformedNodeError(node);
  const result = assignIndexedValue$1(ctx, node.i, createSequence([], node.s, node.l));
  assignNodeType(ctx, node.i, 35);
  for (let i = 0; i < size; i++) result.v[i] = deserialize$1(ctx, depth, node.a[i]);
  return result;
}
function deserialize$1(ctx, depth, node) {
  if (depth > ctx.base.depthLimit) throw new SerovalDepthLimitError(ctx.base.depthLimit);
  depth += 1;
  switch (node.t) {
    case 2:
      return deserializeKnownValue(node, CONSTANT_VAL, node.s);
    case 0:
      return Number(node.s);
    case 1:
      return deserializeString(String(node.s));
    case 3:
      if (String(node.s).length > MAX_BIGINT_LENGTH) throw new SerovalMalformedNodeError(node);
      return BigInt(node.s);
    case 4:
      return ctx.base.refs.get(node.i);
    case 18:
      return deserializeReference(ctx, node);
    case 9:
      return deserializeArray(ctx, depth, node);
    case 10:
    case 11:
      return deserializeObject(ctx, depth, node);
    case 5:
      return deserializeDate(ctx, node);
    case 6:
      return deserializeRegExp(ctx, node);
    case 7:
      return deserializeSet(ctx, depth, node);
    case 8:
      return deserializeMap(ctx, depth, node);
    case 19:
      return deserializeArrayBuffer(ctx, node);
    case 16:
    case 15:
      return deserializeView(ctx, depth, node, getTypedArrayConstructor(node.c));
    case 20:
      return deserializeView(ctx, depth, node);
    case 14:
      return deserializeAggregateError(ctx, depth, node);
    case 13:
      return deserializeError(ctx, depth, node);
    case 12:
      return deserializePromise(ctx, depth, node);
    case 17:
      return deserializeKnownValue(node, SYMBOL_REF, node.s);
    case 21:
      return deserializeBoxed(ctx, depth, node);
    case 25:
      return deserializePlugin(ctx, depth, node);
    case 22:
      return deserializePromiseConstructor(ctx, node);
    case 23:
    case 24:
      return deserializePromiseFulfill(ctx, depth, node);
    case 28:
      return deserializeIteratorFactoryInstance(ctx, depth, node);
    case 30:
      return deserializeAsyncIteratorFactoryInstance(ctx, depth, node);
    case 31:
      return deserializeStreamConstructor(ctx, depth, node);
    case 32:
      return deserializeStreamCall(ctx, depth, node, "next");
    case 33:
      return deserializeStreamCall(ctx, depth, node, "throw");
    case 34:
      return deserializeStreamCall(ctx, depth, node, "return");
    case 27:
      return deserializeIteratorFactory(ctx, depth, node);
    case 29:
      return deserializeAsyncIteratorFactory(ctx, depth, node);
    case 35:
      return deserializeSequence(ctx, depth, node);
    case 36:
      return deserializeTemporal(ctx, node);
    default:
      throw new SerovalUnsupportedNodeError(node);
  }
}
function deserializeTop(ctx, node) {
  ctx.base.regexpPropertyEscapes = MAX_REGEXP_PROPERTY_ESCAPES;
  try {
    return deserialize$1(ctx, 0, node);
  } catch (error) {
    throw new SerovalDeserializationError(error);
  }
}
const RETURN = () => T;
const IS_MODERN = /* @__PURE__ */ (/* @__PURE__ */ RETURN.toString()).includes("=>");
function createFunction(parameters, body) {
  if (IS_MODERN) return (parameters.length === 1 ? parameters[0] : "(" + parameters.join(",") + ")") + "=>" + (body.startsWith("{") ? "(" + body + ")" : body);
  return "function(" + parameters.join(",") + "){return " + body + "}";
}
function createEffectfulFunction(parameters, body) {
  if (IS_MODERN) return (parameters.length === 1 ? parameters[0] : "(" + parameters.join(",") + ")") + "=>{" + body + "}";
  return "function(" + parameters.join(",") + "){" + body + "}";
}
const REF_START_CHARS = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_";
const REF_START_CHARS_LEN = 34;
const REF_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_";
const REF_CHARS_LEN = 64;
function getIdentifier(index) {
  let mod = index % REF_START_CHARS_LEN;
  let ref = REF_START_CHARS[mod];
  index = (index - mod) / REF_START_CHARS_LEN;
  while (index > 0) {
    mod = index % REF_CHARS_LEN;
    ref += REF_CHARS[mod];
    index = (index - mod) / REF_CHARS_LEN;
  }
  return ref;
}
function isValidIdentifier(name) {
  const len = name.length;
  for (let i = 0; i < len; i++) {
    const code = name.charCodeAt(i);
    if (!(code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 && i > 0 || code === 95 || code === 36)) return false;
  }
  return len > 0;
}
function getAssignmentExpression(assignment) {
  switch (assignment.t) {
    case 0:
      return assignment.s + "=" + assignment.v;
    case 2:
      return assignment.s + ".set(" + assignment.k + "," + assignment.v + ")";
    case 1:
      return assignment.s + ".add(" + assignment.v + ")";
    case 3:
      return assignment.s + ".delete(" + assignment.k + ")";
    case 4:
      return "Object.defineProperty(" + assignment.s + ',"__proto__",{value:' + assignment.k + ",configurable:!0,enumerable:!0,writable:!0})";
  }
}
const MAX_ASSIGNMENT_CHAIN_LENGTH = 100;
function resolveAssignments(assignments, chainValues = true) {
  if (!assignments.length) return void 0;
  let previous = assignments[0];
  let expression = getAssignmentExpression(previous);
  let result = "";
  let chainLength = 1;
  for (let index = 1, length = assignments.length; index < length; index++) {
    const assignment = assignments[index];
    if (chainLength === MAX_ASSIGNMENT_CHAIN_LENGTH) {
      result += expression + ",";
      expression = getAssignmentExpression(assignment);
      chainLength = 0;
    } else if (chainValues && assignment.t === 0 && previous.t === 0 && assignment.v === previous.v) expression = assignment.s + "=" + expression;
    else if (assignment.t === 2 && previous.t === 2 && assignment.s === previous.s) expression += ".set(" + assignment.k + "," + assignment.v + ")";
    else if (assignment.t === 1 && previous.t === 1 && assignment.s === previous.s) expression += ".add(" + assignment.v + ")";
    else if (assignment.t === 3 && previous.t === 2 && assignment.s === previous.s) expression += ".delete(" + assignment.k + ")";
    else {
      result += expression + ",";
      expression = getAssignmentExpression(assignment);
      chainLength = 0;
    }
    chainLength++;
    previous = assignment;
  }
  return result + expression + ",";
}
const NULL_CONSTRUCTOR = "Object.create(null)";
const SET_CONSTRUCTOR = "new Set";
const MAP_CONSTRUCTOR = "new Map";
const PROMISE_RESOLVE = "Promise.resolve";
const PROMISE_REJECT = "Promise.reject";
const OBJECT_FLAG_CONSTRUCTOR = {
  [3]: "Object.freeze",
  [2]: "Object.seal",
  [1]: "Object.preventExtensions",
  [0]: void 0
};
function createBaseSerializerContext(mode, options) {
  return {
    mode,
    plugins: options.plugins,
    features: options.features,
    marked: Array.isArray(options.markedRefs) ? new Set(options.markedRefs) : options.markedRefs,
    stack: [],
    flags: [],
    assignments: [],
    assignAll: !options.assignSharedRefsOnly
  };
}
function createCrossSerializerContext(options) {
  return {
    mode: 2,
    base: createBaseSerializerContext(2, options),
    state: options
  };
}
function getVanillaRefParam(state, index) {
  let actualIndex = state.valid.get(index);
  if (actualIndex == null) {
    actualIndex = state.valid.size;
    state.valid.set(index, actualIndex);
  }
  let identifier = state.vars[actualIndex];
  if (identifier == null) {
    identifier = getIdentifier(actualIndex);
    state.vars[actualIndex] = identifier;
  }
  return identifier;
}
function getCrossRefParam(id) {
  return "$R[" + id + "]";
}
function getRefParam(ctx, id) {
  return ctx.mode === 1 ? getVanillaRefParam(ctx.state, id) : getCrossRefParam(id);
}
function markSerializerRef(ctx, id) {
  ctx.marked.add(id);
}
function isSerializerRefMarked(ctx, id) {
  return ctx.marked.has(id);
}
function pushObjectFlag(ctx, flag, id) {
  if (flag !== 0) {
    markSerializerRef(ctx.base, id);
    ctx.base.flags.push({
      type: flag,
      value: getRefParam(ctx, id)
    });
  }
}
function resolveFlags(ctx) {
  let result = "";
  for (let i = 0, current = ctx.flags, len = current.length; i < len; i++) {
    const flag = current[i];
    result += OBJECT_FLAG_CONSTRUCTOR[flag.type] + "(" + flag.value + "),";
  }
  return result;
}
function resolvePatches(ctx) {
  const assignments = resolveAssignments(ctx.assignments);
  const flags = resolveFlags(ctx);
  if (assignments) {
    if (flags) return assignments + flags;
    return assignments;
  }
  return flags;
}
function createAssignment(ctx, source, value) {
  ctx.assignments.push({
    t: 0,
    s: source,
    k: void 0,
    v: value
  });
}
function createAddAssignment(ctx, ref, value) {
  ctx.base.assignments.push({
    t: 1,
    s: getRefParam(ctx, ref),
    k: void 0,
    v: value
  });
}
function createSetAssignment(ctx, ref, key, value) {
  ctx.base.assignments.push({
    t: 2,
    s: getRefParam(ctx, ref),
    k: key,
    v: value
  });
}
function createDeleteAssignment(ctx, ref, key) {
  ctx.base.assignments.push({
    t: 3,
    s: getRefParam(ctx, ref),
    k: key,
    v: void 0
  });
}
function createArrayAssign(ctx, ref, index, value) {
  createAssignment(ctx.base, getRefParam(ctx, ref) + "[" + index + "]", value);
}
function createObjectAssign(ctx, ref, key, value) {
  if (key === "__proto__") {
    ctx.base.assignments.push({
      t: 4,
      s: getRefParam(ctx, ref),
      k: value,
      v: void 0
    });
    return;
  }
  createAssignment(ctx.base, getRefParam(ctx, ref) + "." + key, value);
}
function createSequenceAssign(ctx, ref, index, value) {
  createAssignment(ctx.base, getRefParam(ctx, ref) + ".v[" + index + "]", value);
}
function getKeyKind(key) {
  const first = key.charCodeAt(0);
  if (first >= 48 && first <= 57) {
    const check = Number(key);
    return check >= 0 && check.toString() === key ? 2 : 0;
  }
  if (key === "Infinity") return 2;
  return isValidIdentifier(key) ? 1 : 0;
}
function isIndexedValueInStack(ctx, node) {
  return node.t === 4 && ctx.stack.includes(node.i);
}
function hasMarkedNode(ctx, node) {
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) if (hasMarkedNode(ctx, node[i])) return true;
    return false;
  }
  if (node == null || typeof node !== "object") return false;
  const current = node;
  if (current.t !== 4 && typeof current.i === "number" && isSerializerRefMarked(ctx, current.i)) return true;
  for (const key in current) if (hasMarkedNode(ctx, current[key])) return true;
  return false;
}
function assignIndexedValue(ctx, index, value) {
  if (!ctx.base.assignAll && !isSerializerRefMarked(ctx.base, index)) return value;
  return getRefParam(ctx, index) + "=" + value;
}
function serializeReference(node) {
  return REFERENCES_KEY + '.get("' + node.s + '")';
}
function serializeArrayItem(ctx, id, item, index) {
  if (item) {
    if (isIndexedValueInStack(ctx.base, item)) {
      markSerializerRef(ctx.base, id);
      createArrayAssign(ctx, id, index, getRefParam(ctx, item.i));
      return "";
    }
    return serialize$1(ctx, item);
  }
  return "";
}
function serializeArray(ctx, node) {
  const id = node.i;
  const list = node.a;
  const len = list.length;
  if (len > 0) {
    ctx.base.stack.push(id);
    let values = serializeArrayItem(ctx, id, list[0], 0);
    let isHoley = values === "";
    for (let i = 1, item; i < len; i++) {
      item = serializeArrayItem(ctx, id, list[i], i);
      values += "," + item;
      isHoley = item === "";
    }
    ctx.base.stack.pop();
    pushObjectFlag(ctx, node.o, node.i);
    return "[" + values + (isHoley ? ",]" : "]");
  }
  return "[]";
}
function serializeProperty(ctx, source, key, val) {
  if (typeof key === "string") {
    const kind = getKeyKind(key);
    if (isIndexedValueInStack(ctx.base, val)) {
      const refParam = getRefParam(ctx, val.i);
      markSerializerRef(ctx.base, source.i);
      createKeyAssign(ctx, source.i, kind, key, refParam);
      return "";
    }
    if (key !== "__proto__") return (kind === 0 ? '"' + key + '"' : key) + ":" + serialize$1(ctx, val);
    return '["' + key + '"]:' + serialize$1(ctx, val);
  }
  return "[" + serialize$1(ctx, key) + "]:" + serialize$1(ctx, val);
}
function serializeProperties(ctx, source, record) {
  const keys = record.k;
  const len = keys.length;
  if (len > 0) {
    const values = record.v;
    ctx.base.stack.push(source.i);
    let result = serializeProperty(ctx, source, keys[0], values[0]);
    for (let i = 1, item; i < len; i++) {
      item = serializeProperty(ctx, source, keys[i], values[i]);
      result += (item && result && ",") + item;
    }
    ctx.base.stack.pop();
    return "{" + result + "}";
  }
  return "{}";
}
function serializeObject(ctx, node) {
  pushObjectFlag(ctx, node.o, node.i);
  return serializeProperties(ctx, node, node.p);
}
function serializeWithObjectAssign(ctx, source, value, serialized) {
  const fields = serializeProperties(ctx, source, value);
  if (fields !== "{}") return "Object.assign(" + serialized + "," + fields + ")";
  return serialized;
}
function serializeStringKeyAssignment(ctx, source, mainAssignments, key, value) {
  const base = ctx.base;
  const serialized = serialize$1(ctx, value);
  const parentAssignment = base.assignments;
  if (!isIndexedValueInStack(base, value)) base.assignments = mainAssignments;
  createKeyAssign(ctx, source.i, getKeyKind(key), key, serialized);
  base.assignments = parentAssignment;
}
function createKeyAssign(ctx, ref, kind, key, value) {
  if (kind === 1) createObjectAssign(ctx, ref, key, value);
  else createArrayAssign(ctx, ref, kind === 2 ? key : '"' + key + '"', value);
}
function serializeAssignment(ctx, source, mainAssignments, key, value) {
  if (typeof key === "string") serializeStringKeyAssignment(ctx, source, mainAssignments, key, value);
  else {
    const base = ctx.base;
    const parent = base.stack;
    base.stack = [];
    const serialized = serialize$1(ctx, value);
    base.stack = parent;
    const parentAssignment = base.assignments;
    base.assignments = mainAssignments;
    createArrayAssign(ctx, source.i, serialize$1(ctx, key), serialized);
    base.assignments = parentAssignment;
  }
}
function serializeAssignments(ctx, source, node) {
  const keys = node.k;
  const len = keys.length;
  if (len > 0) {
    const mainAssignments = [];
    const values = node.v;
    ctx.base.stack.push(source.i);
    for (let i = 0; i < len; i++) serializeAssignment(ctx, source, mainAssignments, keys[i], values[i]);
    ctx.base.stack.pop();
    return resolveAssignments(mainAssignments, false);
  }
}
function serializeDictionary(ctx, node, init) {
  if (node.p) {
    const base = ctx.base;
    if (base.features & 8 && !node.p.k.includes("__proto__")) init = serializeWithObjectAssign(ctx, node, node.p, init);
    else {
      markSerializerRef(base, node.i);
      const assignments = serializeAssignments(ctx, node, node.p);
      if (assignments) return "(" + assignIndexedValue(ctx, node.i, init) + "," + assignments + getRefParam(ctx, node.i) + ")";
    }
  }
  return init;
}
function serializeNullConstructor(ctx, node) {
  pushObjectFlag(ctx, node.o, node.i);
  return serializeDictionary(ctx, node, NULL_CONSTRUCTOR);
}
function serializeDate(node) {
  return 'new Date("' + serializeString(node.s) + '")';
}
function serializeTemporal(ctx, node) {
  if (ctx.base.features & 64) return "Temporal." + TEMPORAL_TYPE_NAME[node.c] + '.from("' + serializeString(node.s) + '")';
  throw new SerovalUnsupportedNodeError(node);
}
function serializeRegExp(ctx, node) {
  if (ctx.base.features & 32) {
    if (node.c.includes("\\x3C")) return 'new RegExp("' + node.c + '","' + node.m + '")';
    return "/" + deserializeString(node.c) + "/" + node.m;
  }
  throw new SerovalUnsupportedNodeError(node);
}
function serializeSetItem(ctx, id, item) {
  const base = ctx.base;
  if (isIndexedValueInStack(base, item)) {
    markSerializerRef(base, id);
    createAddAssignment(ctx, id, getRefParam(ctx, item.i));
    return "";
  }
  return serialize$1(ctx, item);
}
function serializeSet(ctx, node) {
  let serialized = SET_CONSTRUCTOR;
  const items = node.a;
  const size = items.length;
  const id = node.i;
  if (size > 0) {
    ctx.base.stack.push(id);
    let result = serializeSetItem(ctx, id, items[0]);
    for (let i = 1, item; i < size; i++) {
      item = serializeSetItem(ctx, id, items[i]);
      result += (item && result && ",") + item;
    }
    ctx.base.stack.pop();
    if (result) serialized += "([" + result + "])";
  }
  return serialized;
}
function serializeMapEntry(ctx, id, key, val, getSentinel) {
  const base = ctx.base;
  if (isIndexedValueInStack(base, key)) {
    const keyRef = getRefParam(ctx, key.i);
    markSerializerRef(base, id);
    if (isIndexedValueInStack(base, val)) {
      createSetAssignment(ctx, id, keyRef, getRefParam(ctx, val.i));
      return "";
    }
    if (val.t !== 4 && val.i != null && hasMarkedNode(base, val)) {
      markSerializerRef(base, val.i);
      const sentinel = getSentinel();
      const serialized = "(" + serialize$1(ctx, val) + ",[" + sentinel + "," + sentinel + "])";
      createSetAssignment(ctx, id, keyRef, getRefParam(ctx, val.i));
      createDeleteAssignment(ctx, id, sentinel);
      return serialized;
    }
    const parent = base.stack;
    base.stack = [];
    createSetAssignment(ctx, id, keyRef, serialize$1(ctx, val));
    base.stack = parent;
    return "";
  }
  if (isIndexedValueInStack(base, val)) {
    const valueRef = getRefParam(ctx, val.i);
    markSerializerRef(base, id);
    if (key.t !== 4 && key.i != null && hasMarkedNode(base, key)) {
      markSerializerRef(base, key.i);
      const sentinel = getSentinel();
      const serialized = "(" + serialize$1(ctx, key) + ",[" + sentinel + "," + sentinel + "])";
      createSetAssignment(ctx, id, getRefParam(ctx, key.i), valueRef);
      createDeleteAssignment(ctx, id, sentinel);
      return serialized;
    }
    const parent = base.stack;
    base.stack = [];
    createSetAssignment(ctx, id, serialize$1(ctx, key), valueRef);
    base.stack = parent;
    return "";
  }
  return "[" + serialize$1(ctx, key) + "," + serialize$1(ctx, val) + "]";
}
function serializeMap(ctx, node) {
  let serialized = MAP_CONSTRUCTOR;
  const keys = node.e.k;
  const size = keys.length;
  const id = node.i;
  const sentinel = node.f;
  let sentinelRef;
  const getSentinel = () => {
    if (sentinelRef == null) {
      sentinelRef = getRefParam(ctx, sentinel.i);
      if (ctx.mode === 1) ctx.state.sentinels.add(ctx.state.valid.get(sentinel.i));
    }
    return sentinelRef;
  };
  const base = ctx.base;
  if (size > 0) {
    const vals = node.e.v;
    base.stack.push(id);
    let result = serializeMapEntry(ctx, id, keys[0], vals[0], getSentinel);
    for (let i = 1, item; i < size; i++) {
      item = serializeMapEntry(ctx, id, keys[i], vals[i], getSentinel);
      result += (item && result && ",") + item;
    }
    base.stack.pop();
    if (result) serialized += "([" + result + "])";
  }
  if (ctx.mode === 2 && sentinel.t === 26) {
    markSerializerRef(base, sentinel.i);
    serialized = "(" + serialize$1(ctx, sentinel) + "," + serialized + ")";
  }
  return serialized;
}
function serializeArrayBuffer(ctx, node) {
  return getConstructor(ctx, node.f) + '("' + node.s + '")';
}
function serializeView(ctx, node) {
  return "new " + (node.t === 20 ? "DataView" : node.c) + "(" + serialize$1(ctx, node.f) + "," + +node.b + "," + +node.l + ")";
}
function serializeAggregateError(ctx, node) {
  const id = node.i;
  ctx.base.stack.push(id);
  const serialized = serializeDictionary(ctx, node, 'new AggregateError([],"' + node.m + '")');
  ctx.base.stack.pop();
  return serialized;
}
function serializeError(ctx, node) {
  return serializeDictionary(ctx, node, "new " + ERROR_CONSTRUCTOR_STRING[node.s] + '("' + node.m + '")');
}
function serializePromise(ctx, node) {
  let serialized;
  const fulfilled = node.f;
  const id = node.i;
  const promiseConstructor = node.s ? PROMISE_RESOLVE : PROMISE_REJECT;
  const base = ctx.base;
  if (isIndexedValueInStack(base, fulfilled)) {
    const ref = getRefParam(ctx, fulfilled.i);
    serialized = promiseConstructor + (node.s ? "().then(" + createFunction([], ref) + ")" : "().catch(" + createEffectfulFunction([], "throw " + ref) + ")");
  } else {
    base.stack.push(id);
    const result = serialize$1(ctx, fulfilled);
    base.stack.pop();
    serialized = promiseConstructor + "(" + result + ")";
  }
  return serialized;
}
function serializeBoxed(ctx, node) {
  return "Object(" + serialize$1(ctx, node.f) + ")";
}
function getConstructor(ctx, node) {
  const current = serialize$1(ctx, node);
  return node.t === 4 ? current : "(" + current + ")";
}
function serializePromiseConstructor(ctx, node) {
  if (ctx.mode === 1) throw new SerovalUnsupportedNodeError(node);
  return "(" + assignIndexedValue(ctx, node.s, getConstructor(ctx, node.f) + "()") + ").p";
}
function serializePromiseResult(ctx, node) {
  if (ctx.mode === 1) throw new SerovalUnsupportedNodeError(node);
  return getConstructor(ctx, node.a[0]) + "(" + getRefParam(ctx, node.i) + "," + serialize$1(ctx, node.a[1]) + ")";
}
function serializePlugin(ctx, node) {
  const currentPlugins = ctx.base.plugins;
  if (currentPlugins) for (let i = 0, len = currentPlugins.length; i < len; i++) {
    const plugin = currentPlugins[i];
    if (plugin.tag === node.c) return plugin.serialize(node.s, { serialize: (current) => serialize$1(ctx, current) }, { id: node.i });
  }
  throw new SerovalMissingPluginError(node.c);
}
function serializeIteratorFactory(ctx, node) {
  let result = "";
  let initialized = false;
  if (node.f.t !== 4) {
    markSerializerRef(ctx.base, node.f.i);
    result = "(" + serialize$1(ctx, node.f) + ",";
    initialized = true;
  }
  result += assignIndexedValue(ctx, node.i, "(" + SERIALIZED_ITERATOR_CONSTRUCTOR + ")(" + getRefParam(ctx, node.f.i) + ")");
  if (initialized) result += ")";
  return result;
}
function serializeIteratorFactoryInstance(ctx, node) {
  return getConstructor(ctx, node.a[0]) + "(" + serialize$1(ctx, node.a[1]) + ")";
}
function serializeAsyncIteratorFactory(ctx, node) {
  const promise = node.a[0];
  const symbol = node.a[1];
  const base = ctx.base;
  let result = "";
  if (promise.t !== 4) {
    markSerializerRef(base, promise.i);
    result += "(" + serialize$1(ctx, promise);
  }
  if (symbol.t !== 4) {
    markSerializerRef(base, symbol.i);
    result += (result ? "," : "(") + serialize$1(ctx, symbol);
  }
  if (result) result += ",";
  const iterator = assignIndexedValue(ctx, node.i, "(" + SERIALIZED_ASYNC_ITERATOR_CONSTRUCTOR + ")(" + getRefParam(ctx, symbol.i) + "," + getRefParam(ctx, promise.i) + ")");
  if (result) return result + iterator + ")";
  return iterator;
}
function serializeStreamConstructor(ctx, node) {
  const result = assignIndexedValue(ctx, node.i, getConstructor(ctx, node.f) + (node.l === 1 ? "(1)" : "()"));
  const len = node.a.length;
  if (len) {
    let values = serialize$1(ctx, node.a[0]);
    for (let i = 1; i < len; i++) values += "," + serialize$1(ctx, node.a[i]);
    return "(" + result + "," + values + "," + getRefParam(ctx, node.i) + ")";
  }
  return result;
}
function serializeStreamCall(ctx, node, method) {
  return getRefParam(ctx, node.i) + "." + method + "(" + serialize$1(ctx, node.f) + ")";
}
function serializeSequenceItem(ctx, id, index, item) {
  const base = ctx.base;
  if (isIndexedValueInStack(base, item)) {
    markSerializerRef(base, id);
    createSequenceAssign(ctx, id, index, getRefParam(ctx, item.i));
    return "";
  }
  return serialize$1(ctx, item);
}
function serializeSequence(ctx, node) {
  const items = node.a;
  const size = items.length;
  const id = node.i;
  if (size > 0) {
    ctx.base.stack.push(id);
    let result = serializeSequenceItem(ctx, id, 0, items[0]);
    for (let i = 1, item; i < size; i++) {
      item = serializeSequenceItem(ctx, id, i, items[i]);
      result += (item && result && ",") + item;
    }
    ctx.base.stack.pop();
    if (result) return "{__SEROVAL_SEQUENCE__:!0,v:[" + result + "],t:" + +node.s + ",d:" + +node.l + "}";
  }
  return "{__SEROVAL_SEQUENCE__:!0,v:[],t:-1,d:0}";
}
function serializeAssignable(ctx, node) {
  switch (node.t) {
    case 17:
      return SYMBOL_STRING[node.s];
    case 18:
      return serializeReference(node);
    case 9:
      return serializeArray(ctx, node);
    case 10:
      return serializeObject(ctx, node);
    case 11:
      return serializeNullConstructor(ctx, node);
    case 5:
      return serializeDate(node);
    case 6:
      return serializeRegExp(ctx, node);
    case 7:
      return serializeSet(ctx, node);
    case 8:
      return serializeMap(ctx, node);
    case 19:
      return serializeArrayBuffer(ctx, node);
    case 16:
    case 15:
    case 20:
      return serializeView(ctx, node);
    case 14:
      return serializeAggregateError(ctx, node);
    case 13:
      return serializeError(ctx, node);
    case 12:
      return serializePromise(ctx, node);
    case 21:
      return serializeBoxed(ctx, node);
    case 22:
      return serializePromiseConstructor(ctx, node);
    case 25:
      return serializePlugin(ctx, node);
    case 26:
      return SPECIAL_REF_STRING[node.s];
    case 35:
      return serializeSequence(ctx, node);
    case 36:
      return serializeTemporal(ctx, node);
    default:
      throw new SerovalUnsupportedNodeError(node);
  }
}
function serialize$1(ctx, node) {
  switch (node.t) {
    case 2:
      return CONSTANT_STRING[node.s];
    case 0:
      return "" + node.s;
    case 1:
      return '"' + node.s + '"';
    case 3:
      return node.s + "n";
    case 4:
      return getRefParam(ctx, node.i);
    case 23:
    case 24:
      return serializePromiseResult(ctx, node);
    case 27:
      return serializeIteratorFactory(ctx, node);
    case 28:
    case 30:
      return serializeIteratorFactoryInstance(ctx, node);
    case 29:
      return serializeAsyncIteratorFactory(ctx, node);
    case 31:
      return serializeStreamConstructor(ctx, node);
    case 32:
      return serializeStreamCall(ctx, node, "next");
    case 33:
      return serializeStreamCall(ctx, node, "throw");
    case 34:
      return serializeStreamCall(ctx, node, "return");
    default:
      return assignIndexedValue(ctx, node.i, serializeAssignable(ctx, node));
  }
}
function serializeCross(ctx, tree) {
  const result = serialize$1(ctx, tree);
  const id = tree.i;
  if (id == null) return result;
  const patches = resolvePatches(ctx.base);
  const ref = getRefParam(ctx, id);
  let body = result;
  if (patches) {
    if (!ctx.base.assignAll && !result.startsWith(ref + "=")) body = ref + "=" + result;
    body = "(" + body + "," + patches + ref + ")";
  }
  const scopeId = ctx.state.scopeId;
  if (scopeId == null) {
    if (tree.t === 10 && !patches) return "(" + body + ")";
    return body;
  }
  return "(" + createFunction(["$R"], body) + ')($R["' + serializeString(scopeId) + '"])';
}
function wrapSerializationError(error) {
  return error instanceof SerovalSerializationError ? error : new SerovalSerializationError(error);
}
function serializeTopCross(ctx, tree) {
  try {
    return serializeCross(ctx, tree);
  } catch (error) {
    throw wrapSerializationError(error);
  }
}
function parseItems(ctx, depth, current) {
  assertArrayHoles(current);
  const len = current.length;
  const nodes = new Array(len);
  for (let i = 0; i < len; i++) if (i in current) nodes[i] = parseSOS(ctx, depth, current[i]);
  else nodes[i] = 0;
  return nodes;
}
function parseArray(ctx, depth, id, current) {
  return createArrayNode(id, current, parseItems(ctx, depth, current));
}
function parseProperties(ctx, depth, properties) {
  const keys = Object.keys(properties);
  const len = keys.length;
  const keyNodes = new Array(len);
  const valueNodes = new Array(len);
  for (let i = 0, key; i < len; i++) {
    key = keys[i];
    keyNodes[i] = serializeString(key);
    valueNodes[i] = parseSOS(ctx, depth, properties[key]);
  }
  if (SYM_ITERATOR in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_ITERATOR));
    valueNodes.push(createIteratorFactoryInstanceNode(28, parseIteratorFactory(ctx.base), parseSOS(ctx, depth, createSequenceFromIterable(properties))));
  }
  if (SYM_ASYNC_ITERATOR in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_ASYNC_ITERATOR));
    valueNodes.push(createIteratorFactoryInstanceNode(30, parseAsyncIteratorFactory(ctx.base), parseAsyncIterable(ctx, depth, properties)));
  }
  if (SYM_TO_STRING_TAG in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_TO_STRING_TAG));
    valueNodes.push(createStringNode(properties[SYM_TO_STRING_TAG]));
  }
  if (SYM_IS_CONCAT_SPREADABLE in properties) {
    keyNodes.push(parseWellKnownSymbol(ctx.base, SYM_IS_CONCAT_SPREADABLE));
    valueNodes.push(properties[SYM_IS_CONCAT_SPREADABLE] ? TRUE_NODE : FALSE_NODE);
  }
  return {
    k: keyNodes,
    v: valueNodes
  };
}
function parseAsyncIterable(ctx, depth, current) {
  if (ctx.type !== 2) throw new SerovalUnsupportedTypeError(current);
  const id = createIndexForValue(ctx.base, {});
  const result = createStreamConstructorNode(id, parseSpecialReference(ctx.base, 4), []);
  ctx.state.iterable(ctx, depth, id, current);
  return result;
}
function parsePlainObject(ctx, depth, id, current, empty) {
  return createObjectNode(id, current, empty, parseProperties(ctx, depth, current));
}
function parseBoxed(ctx, depth, id, current) {
  return createBoxedNode(id, parseSOS(ctx, depth, current.valueOf()));
}
function parseView(ctx, depth, type, id, current) {
  const view = getArrayBufferView(ctx.base, readArrayBufferView(current, type === 20));
  return createViewNode(type, id, current, view, parseSOS(ctx, depth, view.buffer));
}
function parseError(ctx, depth, type, id, current) {
  const options = getErrorOptions(current, ctx.base.features);
  return createErrorNode(type, id, current, options ? parseProperties(ctx, depth, options) : void 0);
}
function parseMap(ctx, depth, id, current) {
  const sentinel = parseMapSentinel(ctx.base);
  const keyNodes = new Array(current.size);
  const valueNodes = new Array(current.size);
  let i = 0;
  for (const [key, value] of current.entries()) {
    keyNodes[i] = parseSOS(ctx, depth, key);
    valueNodes[i] = parseSOS(ctx, depth, value);
    i++;
  }
  return createMapNode(id, sentinel, keyNodes, valueNodes);
}
function parseSet(ctx, depth, id, current) {
  const items = new Array(current.size);
  let i = 0;
  for (const item of current.keys()) items[i++] = parseSOS(ctx, depth, item);
  return createSetNode(id, items);
}
function parseEndedStream(ctx, depth, id, current) {
  const events = current.endedEvents();
  if (!events) throw new SerovalUnsupportedTypeError(current);
  const values = events.values;
  const last = values.length - 1;
  const sequence = new Array(values.length);
  if (last >= 0) markParserRef(ctx.base, id);
  for (let i = 0; i <= last; i++) sequence[i] = createStreamEventNode(i < last ? 32 : events.success ? 34 : 33, id, parseSOS(ctx, depth, values[i]));
  return sequence;
}
function parseStream(ctx, depth, id, current) {
  const reference = parseSpecialReference(ctx.base, 4);
  if (ctx.type === 2) {
    const result = createStreamConstructorNode(id, reference, []);
    ctx.state.stream(ctx, depth, id, current);
    return result;
  }
  return createStreamConstructorNode(id, reference, parseEndedStream(ctx, depth, id, current));
}
function parseLiveStream(ctx, depth, id, current) {
  if (ctx.type !== 2) throw new SerovalUnsupportedTypeError(current);
  const result = createStreamConstructorNode(id, parseSpecialReference(ctx.base, 4), [], 1);
  ctx.state.live(ctx, depth, id, current);
  return result;
}
function parsePromise(ctx, depth, id, current) {
  if (ctx.type !== 2) throw new SerovalUnsupportedTypeError(current);
  const resolver = createIndexForValue(ctx.base, {});
  ctx.state.promise(ctx, resolver, depth, current);
  return createPromiseConstructorNode(ctx.base, id, resolver);
}
function parsePluginSync(ctx, depth, id, current, currentPlugins) {
  for (let i = 0, len = currentPlugins.length; i < len; i++) {
    const plugin = currentPlugins[i];
    if (plugin.parse.sync && plugin.test(current)) return createPluginNode(id, plugin.tag, plugin.parse.sync(current, { parse: (value) => parseSOS(ctx, depth, value) }, { id }));
  }
}
function parsePlugin(ctx, depth, id, current, currentPlugins) {
  if (currentPlugins) return ctx.type === 1 ? parsePluginSync(ctx, depth, id, current, currentPlugins) : ctx.state.plugin(ctx, depth, id, current, currentPlugins);
}
function parseSequence(ctx, depth, id, current) {
  const len = current.v.length;
  const nodes = new Array(len);
  for (let i = 0; i < len; i++) nodes[i] = parseSOS(ctx, depth, current.v[i]);
  return createSequenceNode(id, nodes, current.t, current.d);
}
function parseObjectPhase2(ctx, depth, id, current, currentClass) {
  if (currentClass === Object) return parsePlainObject(ctx, depth, id, current, false);
  switch (getObjectKind(current, currentClass, ctx.base.features)) {
    case 2:
      return parsePlainObject(ctx, depth, id, current, true);
    case 3:
      return createDateNode(id, current);
    case 4:
      return parseError(ctx, depth, 13, id, current);
    case 5:
      return parseError(ctx, depth, 14, id, current);
    case 6:
      return parseBoxed(ctx, depth, id, current);
    case 7:
      return createArrayBufferNode(ctx.base, id, current);
    case 8:
      return parseView(ctx, depth, 15, id, current);
    case 9:
      return parseView(ctx, depth, 16, id, current);
    case 10:
      return parseView(ctx, depth, 20, id, current);
    case 11:
      return parseMap(ctx, depth, id, current);
    case 12:
      return parseSet(ctx, depth, id, current);
    case 13:
      return parsePromise(ctx, depth, id, current);
    case 14:
      return createRegExpNode(id, current);
    case 15:
      return createTemporalNode(id, getTemporalType(currentClass), currentClass, current);
    case 16:
      return parsePlainObject(ctx, depth, id, current, !!currentClass);
    default:
      throw new SerovalUnsupportedTypeError(current);
  }
}
function parseObject(ctx, depth, id, current) {
  if (Array.isArray(current)) return parseArray(ctx, depth, id, current);
  if (isLiveStream(current)) return parseLiveStream(ctx, depth, id, current);
  if (current instanceof Stream) return parseStream(ctx, depth, id, current);
  if (isSequence(current)) return parseSequence(ctx, depth, id, current);
  const currentClass = getObjectClass(current);
  if (currentClass === OpaqueReference) return parseSOS(ctx, depth, current.replacement);
  const parsed = parsePlugin(ctx, depth, id, current, getObjectPlugins(ctx.base, current, currentClass));
  if (parsed) return parsed;
  return parseObjectPhase2(ctx, depth, id, current, currentClass);
}
function parseFunction(ctx, depth, current) {
  const ref = getReferenceNode(ctx.base, current);
  if (typeof ref !== "number") return ref;
  const plugin = parsePlugin(ctx, depth, ref, current, ctx.base.plugins);
  if (plugin) return plugin;
  throw new SerovalUnsupportedTypeError(current);
}
function parseSOS(ctx, depth, current) {
  if (depth >= ctx.base.depthLimit) throw new SerovalDepthLimitError(ctx.base.depthLimit);
  switch (typeof current) {
    case "boolean":
      return current ? TRUE_NODE : FALSE_NODE;
    case "undefined":
      return UNDEFINED_NODE;
    case "string":
      return createStringNode(current);
    case "number":
      return createNumberNode(current);
    case "bigint":
      return createBigIntNode(current);
    case "object":
      if (current) {
        const ref = getReferenceNode(ctx.base, current);
        return typeof ref === "number" ? parseObject(ctx, depth + 1, ref, current) : ref;
      }
      return NULL_NODE;
    case "symbol":
      return parseWellKnownSymbol(ctx.base, current);
    case "function":
      return parseFunction(ctx, depth, current);
    default:
      throw new SerovalUnsupportedTypeError(current);
  }
}
function createStreamParsePluginContext(ctx, depth) {
  const state = ctx.state;
  function parse(current) {
    state.parsing++;
    try {
      return parseSOS(ctx, depth, current);
    } finally {
      state.parsing--;
      if (!state.alive) releaseParserValues(ctx);
    }
  }
  return {
    parse,
    parseStreamSource(current) {
      state.parsing++;
      try {
        if (depth >= ctx.base.depthLimit) throw new SerovalDepthLimitError(ctx.base.depthLimit);
        const id = createIndexForValue(ctx.base, {});
        const node = createStreamConstructorNode(id, parseSpecialReference(ctx.base, 4), [], 1);
        iterateAsync(ctx, depth + 1, id, current, true);
        return node;
      } finally {
        state.parsing--;
        if (!state.alive) releaseParserValues(ctx);
      }
    },
    parseWithError(current) {
      try {
        return parse(current);
      } catch (error) {
        stopStreamParse(ctx, 1, error);
        return;
      }
    },
    isAlive: () => state.alive,
    pushPendingState: () => {
      pushPendingState(ctx);
    },
    popPendingState: () => {
      popPendingState(ctx);
    },
    onParse(node) {
      if (state.alive) {
        state.queue.push({
          node,
          initial: false,
          accept: void 0,
          refs: ctx.base.refs.size
        });
        drainOutput(ctx);
      }
    },
    onError(error) {
      stopStreamParse(ctx, 1, error);
    },
    addCleanup(callback) {
      addCleanup(ctx, callback);
    }
  };
}
function getStreamParsePluginContext(ctx, depth) {
  const contexts = ctx.state.pluginContexts;
  return contexts[depth] ?? (contexts[depth] = createStreamParsePluginContext(ctx, depth));
}
function addCleanup(ctx, callback) {
  if (ctx.state.alive) ctx.state.cleanups.push(callback);
  else callback();
}
function parsePluginStream(ctx, depth, id, current, currentPlugins) {
  for (let i = 0, len = currentPlugins.length; i < len; i++) {
    const plugin = currentPlugins[i];
    if (plugin.parse.stream && plugin.test(current)) return createPluginNode(id, plugin.tag, plugin.parse.stream(current, getStreamParsePluginContext(ctx, depth), { id }));
  }
}
function streamListener(ctx, depth, id, subscription) {
  const handle = (type, terminal) => (value, accept) => {
    let failure = void 0;
    if (ctx.state.alive) try {
      failure = parseEvent(ctx, depth, value, createStreamEventNode.bind(null, type, id), accept);
    } catch (error) {
      if (!subscription?.active) throw error;
      subscription.failure ?? (subscription.failure = { value: error });
      failure = error;
    }
    if (terminal && !accept) popPendingState(ctx);
    return failure;
  };
  return {
    next: handle(32, false),
    throw: handle(33, true),
    return: handle(34, true),
    done() {
      popPendingState(ctx);
    },
    error(reason) {
      if (ctx.state.alive) stopStreamParse(ctx, 1, reason);
    }
  };
}
function subscribeStream(ctx, depth, id, current) {
  pushPendingState(ctx);
  const subscription = {
    active: true,
    failure: void 0
  };
  let cleanup;
  try {
    cleanup = current.on(streamListener(ctx, depth, id, subscription));
  } finally {
    subscription.active = false;
  }
  try {
    addCleanup(ctx, cleanup);
  } catch (error) {
    subscription.failure ?? (subscription.failure = { value: error });
  }
  const failure = subscription.failure;
  subscription.failure = void 0;
  if (failure) throw failure.value;
}
function consumeLiveStream(ctx, depth, id, current) {
  const cancel = current.pump(streamListener(ctx, depth, id));
  pushPendingState(ctx);
  addCleanup(ctx, () => {
    cancel(ctx.state.reason);
  });
}
function wrapPromiseResult(ctx, type, id, node) {
  return createSerovalNode(type, id, void 0, void 0, void 0, void 0, void 0, [parseSpecialReference(ctx.base, type === 23 ? 2 : 3), node]);
}
function handlePromise(type, id, depth, data) {
  if (this.state.alive) parseEvent(this, depth, data, wrapPromiseResult.bind(null, this, type, id), void 0);
  popPendingState(this);
}
function watchPromise(ctx, resolver, depth, current) {
  pushPendingState(ctx);
  let settled = false;
  current.then((data) => {
    if (!settled) {
      settled = true;
      handlePromise.call(ctx, 23, resolver, depth, data);
    }
  }, (data) => {
    if (!settled) {
      settled = true;
      handlePromise.call(ctx, 24, resolver, depth, data);
    }
  });
}
function returnIterator(iterator) {
  Promise.resolve().then(() => iterator.return?.()).catch(() => {
  });
}
function iterateAsync(ctx, depth, id, current, forwardReason) {
  const iterator = current[SYM_ASYNC_ITERATOR]();
  const listener = streamListener(ctx, depth, id);
  let active = true;
  function stop() {
    if (active) {
      active = false;
      if (forwardReason) try {
        Promise.resolve(iterator.return?.(ctx.state.reason)).catch(() => {
        });
      } catch {
      }
      else returnIterator(iterator);
    }
  }
  function pull() {
    if (active) iterator.next().then((result) => {
      if (active) {
        if (result.done) {
          active = false;
          listener.return(result.value, void 0);
        } else if (listener.next(result.value, pull) !== void 0) {
          stop();
          listener.done();
        }
      }
    }, (error) => {
      if (active) {
        active = false;
        listener.throw(error, void 0);
      }
    });
  }
  pushPendingState(ctx);
  addCleanup(ctx, stop);
  pull();
}
function createStreamParserState(options) {
  return {
    alive: true,
    pending: 0,
    parsing: 0,
    queue: [],
    head: 0,
    writing: false,
    inFlight: void 0,
    reason: void 0,
    starting: false,
    onParse: options.onParse,
    onError: options.onError,
    onDone: options.onDone,
    cleanups: [],
    pluginContexts: [],
    stream: subscribeStream,
    live: consumeLiveStream,
    promise: watchPromise,
    iterable: iterateAsync,
    plugin: parsePluginStream
  };
}
function createStreamParserContext(options) {
  return {
    type: 2,
    base: createBaseParserContext(options),
    state: createStreamParserState(options)
  };
}
function pushPendingState(ctx) {
  if (ctx.state.alive) ctx.state.pending++;
}
function popPendingState(ctx) {
  if (ctx.state.alive) {
    ctx.state.pending--;
    checkStreamParse(ctx);
  }
}
function parseEvent(ctx, depth, value, wrap, accept) {
  const state = ctx.state;
  const record = {
    node: void 0,
    initial: false,
    accept,
    refs: ctx.base.refs.size
  };
  let failure;
  state.queue.push(record);
  state.parsing++;
  try {
    record.node = wrap(parseSOS(ctx, depth, value));
  } catch (error) {
    failure = { value: error };
  } finally {
    state.parsing--;
    if (!state.alive) releaseParserValues(ctx);
  }
  if (failure) stopStreamParse(ctx, 1, failure.value);
  else drainOutput(ctx);
  return failure?.value;
}
function takeRecord(state) {
  const record = state.queue[state.head];
  state.queue[state.head++] = void 0;
  if (state.head === state.queue.length) {
    state.queue.length = 0;
    state.head = 0;
  } else if (state.head > 1024 && state.head * 2 > state.queue.length) {
    state.queue.splice(0, state.head);
    state.head = 0;
  }
  return record;
}
function drainOutput(ctx) {
  const state = ctx.state;
  if (state.writing || state.parsing > 0) return;
  while (state.alive && state.head < state.queue.length) {
    const record = takeRecord(state);
    if (!record.node) continue;
    let pending;
    state.writing = true;
    state.inFlight = record;
    state.parsing++;
    try {
      if (!state.onParse) throw new Error("Stream output callback is unavailable");
      const result = state.onParse(record.node, record.initial);
      if (result !== null && (typeof result === "object" || typeof result === "function")) {
        const then = Reflect.get(result, "then");
        if (typeof then === "function") pending = new Promise((resolve, reject) => {
          Reflect.apply(then, result, [resolve, reject]);
        });
      }
    } catch (error) {
      releaseRecord(record);
      stopStreamParse(ctx, 1, error);
      return;
    } finally {
      state.parsing--;
      if (!state.alive) releaseParserValues(ctx);
    }
    record.node = void 0;
    if (pending) {
      if (!state.alive) releaseRecord(record);
      pending.then(() => {
        state.writing = false;
        state.inFlight = void 0;
        if (state.alive) {
          const accept2 = record.accept;
          releaseRecord(record);
          accept2?.();
          drainOutput(ctx);
        }
      }, (error) => {
        state.writing = false;
        state.inFlight = void 0;
        releaseRecord(record);
        stopStreamParse(ctx, 1, error);
      });
      return;
    }
    if (!state.alive) {
      releaseRecord(record);
      return;
    }
    state.writing = false;
    state.inFlight = void 0;
    const accept = record.accept;
    releaseRecord(record);
    accept?.();
  }
  checkStreamParse(ctx);
}
function checkStreamParse(ctx) {
  const state = ctx.state;
  if (state.alive && state.parsing === 0 && state.pending <= 0 && state.head === state.queue.length && !state.writing) stopStreamParse(ctx, 0);
}
function startStreamParse(ctx, current) {
  const state = ctx.state;
  let parsed;
  let failure;
  const refs = ctx.base.refs;
  const size = refs.size;
  state.starting = true;
  try {
    state.parsing++;
    try {
      parsed = parseSOS(ctx, 0, current);
    } catch (error) {
      failure = { value: error };
    } finally {
      state.parsing--;
      if (!state.alive) releaseParserValues(ctx);
    }
    if (failure) {
      rollbackRefs(refs, size);
      if (state.alive) stopStreamParse(ctx, 1, failure.value);
      else throw failure.value;
    } else if (parsed && state.alive) {
      state.queue.unshift({
        node: parsed,
        initial: true,
        accept: void 0,
        refs: size
      });
      drainOutput(ctx);
    }
  } finally {
    state.starting = false;
  }
}
function runCleanups(state) {
  const cleanups = state.cleanups;
  let failure;
  state.cleanups = [];
  for (const record of state.queue) if (record) releaseRecord(record);
  state.queue.length = 0;
  state.head = 0;
  if (state.inFlight) releaseRecord(state.inFlight);
  state.inFlight = void 0;
  for (let i = 0, len = cleanups.length; i < len; i++) try {
    cleanups[i]();
  } catch (error) {
    failure ?? (failure = { value: error });
  }
  if (failure) throw failure.value;
}
function releaseRecord(record) {
  record.node = void 0;
  record.accept = void 0;
}
function releaseParserValues(ctx) {
  ctx.base.refs = /* @__PURE__ */ new Map();
  ctx.base.marked.clear();
  ctx.base.plugins = void 0;
  ctx.base.plainObjectPlugins = void 0;
  ctx.state.pluginContexts = [];
  if (ctx.state.parsing === 0) ctx.state.reason = void 0;
}
function stopStreamParse(ctx, mode, reason) {
  const state = ctx.state;
  if (state.alive) {
    state.alive = false;
    const unsent = state.queue[state.head];
    if (mode !== 0 && unsent) rollbackRefs(ctx.base.refs, unsent.refs);
    const onError = state.onError;
    const onDone = state.onDone;
    if (mode === 1 && !onError && !(reason instanceof SerovalParserError)) reason = new SerovalParserError(reason);
    state.reason = reason;
    state.onParse = void 0;
    state.onError = void 0;
    state.onDone = void 0;
    state.writing = false;
    state.parsing++;
    let failure;
    try {
      if (mode === 1) {
        if (onError) onError(reason);
        else if (state.starting) throw reason;
      } else if (mode === 0) onDone?.();
    } catch (error) {
      failure = { value: error };
    }
    try {
      runCleanups(state);
    } catch (error) {
      failure ?? (failure = { value: error });
    } finally {
      state.parsing--;
      releaseParserValues(ctx);
      state.pending = 0;
    }
    if (failure) throw failure.value;
  }
}
function destroyStreamParse(ctx, reason) {
  stopStreamParse(ctx, 2, reason);
}
async function toCrossJSONAsync(source, options = {}) {
  const plugins = resolvePlugins(options.plugins);
  return await parseTopAsync(createAsyncParserContext({
    compactArrayBufferViews: options.compactArrayBufferViews,
    depthLimit: options.depthLimit,
    plugins,
    disabledFeatures: options.disabledFeatures,
    refs: options.refs
  }), source);
}
function crossSerializeStream(source, options) {
  const plugins = resolvePlugins(options.plugins);
  const onSerialize = options.onSerialize;
  const scopeId = options.scopeId;
  const ctx = createStreamParserContext({
    compactArrayBufferViews: options.compactArrayBufferViews,
    depthLimit: options.depthLimit,
    plugins,
    refs: options.refs,
    disabledFeatures: options.disabledFeatures,
    onParse(node, initial) {
      const serial = createCrossSerializerContext({
        plugins,
        features: ctx.base.features,
        scopeId,
        markedRefs: ctx.base.marked
      });
      return onSerialize(serializeTopCross(serial, node), initial);
    },
    onError: options.onError,
    onDone: options.onDone
  });
  startStreamParse(ctx, source);
  return destroyStreamParse.bind(null, ctx);
}
function toCrossJSONStream(source, options) {
  const plugins = resolvePlugins(options.plugins);
  const ctx = createStreamParserContext({
    compactArrayBufferViews: options.compactArrayBufferViews,
    plugins,
    refs: options.refs,
    disabledFeatures: options.disabledFeatures,
    depthLimit: options.depthLimit,
    onParse: options.onParse,
    onError: options.onError,
    onDone: options.onDone
  });
  startStreamParse(ctx, source);
  return destroyStreamParse.bind(null, ctx);
}
function fromJSON(source, options = {}) {
  const plugins = resolvePlugins(options.plugins);
  const disabledFeatures = options.disabledFeatures ?? 0;
  const sourceFeatures = source.f ?? 127;
  return deserializeTop(createVanillaDeserializerContext({
    depthLimit: options.depthLimit,
    maxBase64Length: options.maxBase64Length,
    plugins,
    markedRefs: source.m,
    features: sourceFeatures & ~disabledFeatures,
    disabledFeatures
  }), source.t);
}
// @__NO_SIDE_EFFECTS__
function makeSerovalPlugin(serializationAdapter) {
  return /* @__PURE__ */ createPlugin({
    tag: "$TSR/t/" + serializationAdapter.key,
    test: serializationAdapter.test,
    parse: {
      sync(value, ctx) {
        return { v: ctx.parse(serializationAdapter.toSerializable(value)) };
      },
      async async(value, ctx) {
        return { v: await ctx.parse(serializationAdapter.toSerializable(value)) };
      },
      stream(value, ctx) {
        return { v: ctx.parse(serializationAdapter.toSerializable(value)) };
      }
    },
    serialize: void 0,
    deserialize(node, ctx) {
      return serializationAdapter.fromSerializable(ctx.deserialize(node.v));
    }
  });
}
var RawStream = class {
  constructor(stream, options) {
    this.stream = stream;
    this.hint = options?.hint ?? "binary";
  }
};
async function getStartManifest(matchedRoutes) {
  const { tsrStartManifest } = await import("./assets/_tanstack-start-manifest_v-Bv4bcFoH.js");
  const startManifest = tsrStartManifest();
  let routes = startManifest.routes;
  routes[rootRouteId];
  const manifestRoutes = {};
  for (const k in routes) {
    const v = routes[k];
    const result = {};
    if (v.preloads && v.preloads.length > 0) result.preloads = v.preloads;
    if (v.scripts && v.scripts.length > 0) result.scripts = v.scripts;
    if (v.css?.length) result.css = v.css;
    if (result.preloads || result.scripts || result.css) manifestRoutes[k] = result;
  }
  return {
    ...startManifest.scriptFormat ? { scriptFormat: startManifest.scriptFormat } : {},
    ...startManifest.inlineCss ? { inlineCss: startManifest.inlineCss } : {},
    routes: manifestRoutes
  };
}
const manifest = {
  "03296ffa8e7c6513d87844145725c5215c0fad9b462343edb1da327e7019172f": {
    functionName: "readSpokenProduct_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "04a3d82ebea9236975adab4fd578664123a041a305022b75d2336bb795ab8feb": {
    functionName: "logSalesReport_createServerFn_handler",
    importer: () => import("./assets/import.functions-DZQRrFsU.js")
  },
  "04be2dc3eebc2a4becde65112b9afb13adb203a17735c09bba4c8e90f72e118e": {
    functionName: "linkBarcodeToProduct_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "08ccd14865d516fb455ca8ecc85f1226b605386556c7d4af3e3f54106e04aeb3": {
    functionName: "getInsights_createServerFn_handler",
    importer: () => import("./assets/insights.functions-BdoSalEB.js")
  },
  "0b508838fc462dd380fc8fc0ca7b8b04751230c28fd33cada81ad988012d63c1": {
    functionName: "openPaymentPortal_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "0cab1653405c989dbe1a925b0e1a6ca0a0f3152f416a3bb686cb270ded1ac2d1": {
    functionName: "removeProductCategories_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "0d694f5a8da3fad061ec4b881739a2d409b465c25ef86a11befd05d0ec15e2a0": {
    functionName: "undoMovement_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "14a0f7ff335f0a1bc922563407a7e578abcdef957f4a28aac6db963311b18ba0": {
    functionName: "squareImportCatalog_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "1620febdb4067bb98e7d350594ac5c9c4eab48bbbcf9c68b5a33d1dc39131b6c": {
    functionName: "parseImport_createServerFn_handler",
    importer: () => import("./assets/import.functions-DZQRrFsU.js")
  },
  "1687560e98c420e589f15a5fc2d2cc5d10a436e40b36b3eb6abb8c02197449b8": {
    functionName: "createProduct_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "1925026b1c10db48c12f4e2bc0a90574b72aeb87e7330a3827a67fccd409c630": {
    functionName: "getSmartPars_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "194c5168bd712f8f142a6f6ad5cd46cacabf49dfc5921685e597138fadc45421": {
    functionName: "getConnectionRequests_createServerFn_handler",
    importer: () => import("./assets/connections.functions-DHBeQ-0q.js")
  },
  "1ad1730f395b5a8a4dc266d462ed91565b3e66792291cdcf5ab21e2547b6aa89": {
    functionName: "pausePlan_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "20025aaed2bc46dd8065664de0ce970c35cdc9ed6fdd8acc5179a688172eafce": {
    functionName: "applyImport_createServerFn_handler",
    importer: () => import("./assets/import.functions-DZQRrFsU.js")
  },
  "20723f37bc41103cd0144c7d0ce7e18d7b6062cfa212b7e82904cb65ec8c2434": {
    functionName: "squareSendCounts_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "20bf5a75a4edbf48b80a16a026d0cb79a2129e64cd6f72053b979ac9b7e42f31": {
    functionName: "estimateImportPrices_createServerFn_handler",
    importer: () => import("./assets/import.functions-DZQRrFsU.js")
  },
  "20d79206e108af8af93f7352ca3356dfe4a8a4369025a42b9d95cddb42846a5d": {
    functionName: "setSquareRetailCategories_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "2b4b237bff79856c01bb15351d679549b72f1cb75bc34ff6ae694c5c4ee39a0b": {
    functionName: "getCalendarFeedPath_createServerFn_handler",
    importer: () => import("./assets/calendar.functions-fSoNHKzx.js")
  },
  "3af6d1532c5910dfeaf1944cfd3ea22a6cfe5d6d2cd58a6f7be05c8a845b4581": {
    functionName: "approveStockCount_createServerFn_handler",
    importer: () => import("./assets/counts.functions-fzdf4VMT.js")
  },
  "3bea34e8c3b0fbfe52545d91d30315224f93624ae4b9e5a4801b9e9893879d01": {
    functionName: "getBillingHistory_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "3d2ac9b271549c34af9ee5dce1a7ea2b1a3bcbe29eebf79877cd5d28f2f53ae2": {
    functionName: "getStats_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "3d6c39e18a4a9218d6622b186dcc7152b9c7b750c35ece382031bb9b8abbd6e5": {
    functionName: "editCalendarEvent_createServerFn_handler",
    importer: () => import("./assets/calendar.functions-fSoNHKzx.js")
  },
  "43cc7a8edb98bd999075fb69ecbbb34bb9603d834247277daa3e9d5bdad38a20": {
    functionName: "saveAccountDetails_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "473a0c24e2e34c7b181501451d8fbc96ec6351ec3f1c69ffa77bf41f657e6af8": {
    functionName: "bulkUpdateProducts_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "49853aa174a5c462bef69456eecd66b5c7039e75c14d31a2cee30b492f4762b3": {
    functionName: "createExpense_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "4b1d7b597eabf67b74428f099b57382fd027b27eb2c3e57e1cdd6f8ed9bbd37f": {
    functionName: "editExpense_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "4e453ef218bcaad133228783bdf43d236b2b5149aa3f05827d95d14448ef80ee": {
    functionName: "recordProductMovement_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "59cca0435fb18284b1ca3d80b0a4eb25f62f617a7027a7fce94638dbe403bad2": {
    functionName: "resumePlan_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "5e9cc7bed4be53338cc819999df27b71a3b7f2e251a871bec2af6e8aacdf1c05": {
    functionName: "undoPars_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "5f35fa34e4a2d5a018c585948359b6a403cc4a51937689b89e57232a7e0373b4": {
    functionName: "readStockPhotoFn_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "6067ddb4ac537c8fa1023b6006799e98d4516de28d608cb0a2d2d868ea54c330": {
    functionName: "saveMonthBudget_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "60c53bd292604ab49247ff833410708f26f67d1a410b06ea0fc1e42757d81427": {
    functionName: "getBudgetOverview_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "61950064fb434c615d35ae38d62948d8050d86d3f1eb9fde646f08b2d3c1d55a": {
    functionName: "squareSyncSales_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "6467c210f1ed57f198690a8612b51bcdd7d4197117c6faf1fc3ad1ba62c8ca56": {
    functionName: "mergeProducts_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "6a3e722c6decd120d655deff6e327fd1bb25f2de144af22924707b3586e10156": {
    functionName: "checkWebPrice_createServerFn_handler",
    importer: () => import("./assets/insights.functions-BdoSalEB.js")
  },
  "6dc7bab5a0f94bd3275b2c76fec2fa343f66b7aadb9fe590a1d9e79cabf926c5": {
    functionName: "emailPurchaseOrder_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "70a49bef360b5fee1216cae4408b5adaa514ef6d444589a51890f9fe5b87f134": {
    functionName: "getCountHistory_createServerFn_handler",
    importer: () => import("./assets/counts.functions-fzdf4VMT.js")
  },
  "7230639abe8c0164ddf5e85cd8ab6e7ee157f506a9ba2fe42176a6c72ac33fcc": {
    functionName: "mergeCategories_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "739f1912b13ae2d1e9d0af1e4adb44800b626440c5bad7fbe3aa6b25465176b4": {
    functionName: "updateProduct_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "7822646cdc4c07d7fe54cfea331ae87fad27976b90595edf54479615467c2220": {
    functionName: "sendSetupTestEmail_createServerFn_handler",
    importer: () => import("./assets/setup.functions-DsxBbTse.js")
  },
  "79714bd1315f8ca197b45f48ebcb30c863035c6713c2eaebe0af06fbf3799920": {
    functionName: "saveProductCategories_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "7c5f50af97d50b9ab72780ff530d7d3ad36556de9a7937ff5bf96acb584a9d3c": {
    functionName: "bulkDeleteProducts_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "7ce8966b25cd7f0cfcd5b0b9291d73f2a93896642781b7129af2f7d4efe27a0b": {
    functionName: "listProductCategories_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "7ea615c7b8d6e00557d0d359a13f245370ea95ccc774d34cda10fcaa53ba1d50": {
    functionName: "removeExpense_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "7fef2669d1d6f3e9fdccdfbabede084b9e0823ba1f054366dd5ae9501cff565b": {
    functionName: "quickbooksPushMonth_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "8354b80e0ab29cbb323d00a85f10147647b566a9a1f39be7b061b767cd620249": {
    functionName: "listExpenses_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "877e4e27227a92db358a8d6d55b5295a38b2fb78c1b6aa8e3174209fdf9b131e": {
    functionName: "deleteCategory_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "8a5cdce2e3594cdbb1763bc5ca5a423c0e06b3456788d6a0864c260d8d214b84": {
    functionName: "sendInsightReportNow_createServerFn_handler",
    importer: () => import("./assets/insights.functions-BdoSalEB.js")
  },
  "8dd7a7a2cddcfe3bde69e3b6a2141d3a9ad49f42632f598e1f6b54be9a908306": {
    functionName: "confirmPrices_createServerFn_handler",
    importer: () => import("./assets/insights.functions-BdoSalEB.js")
  },
  "8faec6748de68f1cf8ce6bfd57ca19807095ec135ffc3d4cdb0c2cb0363337c5": {
    functionName: "searchProducts_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "9177352979bdd25707a8e28d888613648e8d2c1f2e94ce02c00f6c99b6afb802": {
    functionName: "applyWebPrice_createServerFn_handler",
    importer: () => import("./assets/insights.functions-BdoSalEB.js")
  },
  "94dc5d50022411a6f751d02b53efd5d2a75c57a40aaded921d36dec0e85d3213": {
    functionName: "saveCounts_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "96f04bf3fed34aecfd38cecaae8c2d98736f6c1e6a67aceefa2043d3f0ab4245": {
    functionName: "getCategoryList_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "98e7a6e61ac171aec6645c9a7bce643b01f8d83c6ee3fd69c2e152c87fd47a16": {
    functionName: "addTeamMember_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "a85d992ef0dd5f80187a82d58000361d4951db8ac255a3fc40c2c2ad1ade692a": {
    functionName: "getSquareRetailCategories_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "a974410b51934831b8bced98077808c30b4018bf4410fda89228573e360ae3d9": {
    functionName: "readReceiptPhoto_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "afea1878bf48c9086830abe85f18bb485adeac1742249bf8e1bfb35363956c8f": {
    functionName: "getAccount_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "b06120bf660a285feb8c23b17355192686a94b8f95623ceae33570d7526402b4": {
    functionName: "getIntegrations_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "b0755821f285543af9317e907f849527e2025919870fab838916fc903fd55bdc": {
    functionName: "getInsightSummary_createServerFn_handler",
    importer: () => import("./assets/insights.functions-BdoSalEB.js")
  },
  "b426e6454f76618fb04a0e57c79174475f6d80f701b87711ee5aa288a5097fd1": {
    functionName: "getRecentMovements_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "b51509cfb38ef861d7d9c37a0e23bafbfd2120e92db5cadd0f0564ea6c62aef1": {
    functionName: "cancelSavedOrder_createServerFn_handler",
    importer: () => import("./assets/orders.functions-sCUKRURV.js")
  },
  "b76fbe18471cd9060d1161ee22d718be183f5851c634a1406326b22726b2ede7": {
    functionName: "selectPlan_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "b7e30bce2fc5d1eebff98f88a86621160f723f372d28f56a55320b6f5e113e6b": {
    functionName: "requestConnection_createServerFn_handler",
    importer: () => import("./assets/connections.functions-DHBeQ-0q.js")
  },
  "be6f8faa1b358b37786ef5ba3aa6ac47e341db0ae1b72c22975b3a3e562abc82": {
    functionName: "lookupBarcodeDetails_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "bf70584d5b142e730fe2deaddb2a3ab4cbe99677bb068fc921318e35c498f523": {
    functionName: "parseSalesReport_createServerFn_handler",
    importer: () => import("./assets/import.functions-DZQRrFsU.js")
  },
  "c14f2e2425a97dd2b7fe28324db104a92512246cd40a47f2918e9adcd6661d1d": {
    functionName: "receiveDeliveryFn_createServerFn_handler",
    importer: () => import("./assets/orders.functions-sCUKRURV.js")
  },
  "c25a68e26f74554b1b179308fba30707ad90eeaf434a3e5f00ab8ec420ffbd3e": {
    functionName: "cancelSubscription_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  },
  "c33f3e8f2d91dfc1479d0a17451f929c733f6c5e03e49d9073b2aadc07ae0be4": {
    functionName: "readLabelPhoto_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "c728e1641680bb1e244ecbe094379db36ff732fc76318b2a6e4de1f0f2e82b44": {
    functionName: "getDuplicateGroups_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "c99eae04126c4837f668644332b10e45598e6bab6fce5175259446c534e8becc": {
    functionName: "getCategoryGroups_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "cee688b920afcb247e533bef8972f2caef04ad0aedf980b312a4aae716be36db": {
    functionName: "disconnect_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "d01f692499371e7e595b4b8de4522fd0640e38219158e89b6abb9e16cf52a436": {
    functionName: "addCalendarEvents_createServerFn_handler",
    importer: () => import("./assets/calendar.functions-fSoNHKzx.js")
  },
  "d2eb947b190bba465fbef4ff0d9f99bd3795e54e602970ea5d986889b4a3d83c": {
    functionName: "setPars_createServerFn_handler",
    importer: () => import("./assets/tidy.functions-Bx9vMiOT.js")
  },
  "d5932e99bf7f053e64a594d1fdf362428a631d07022086bdcf6f0a1e038509d3": {
    functionName: "getMovementsSince_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "d8417f701b27e33db653c9f29e66202992c3a531f6ce27af902b7c5611920a07": {
    functionName: "removeCalendarEvent_createServerFn_handler",
    importer: () => import("./assets/calendar.functions-fSoNHKzx.js")
  },
  "d8c3d79a53d1d22a9c01e5728ba1973940ce39c40e8db772763db1acb4541fa3": {
    functionName: "removeTeamMember_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "d970acd5d7af08a73c0ba47640fdc8328ef797f7c17c2c8f8e1b3374967e974f": {
    functionName: "getBusinessProfile_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "dd1d8a58bbc30e8a725bc36307dceba1dd9bf6b9019d1c90affe42d2e63539e3": {
    functionName: "saveSentOrder_createServerFn_handler",
    importer: () => import("./assets/orders.functions-sCUKRURV.js")
  },
  "de608114b50d09a009d436bb8aea3edac098b1a6367204486c56b9a251a539ee": {
    functionName: "scanMovement_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "e05fc2fa0ed66607af2fc2fccf41b61c3153608b3b0e488870282e4d9929064e": {
    functionName: "suggestProduct_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "e3cddd74ca07b524e465399894018ec004151db4484866ec05390653eea5fbb7": {
    functionName: "deleteProduct_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "e69c8c8b0366f38ebfbd47e7ce0d88323949432c4f643959422c476707ca5071": {
    functionName: "emailBelowPar_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "e85c248ec3b804eb7e73c9e7df38322438247f357e6811aa2511e14b9c0d2d9b": {
    functionName: "applyReceiptPrices_createServerFn_handler",
    importer: () => import("./assets/import.functions-DZQRrFsU.js")
  },
  "ea3d7bea8c20602600fdb60763c4be2316202d598de73f0a4277d084c37c355f": {
    functionName: "listProducts_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "ea9f790698f1189cb2e2cf233b4ddd8e322b014389ba3ee23a7125e6aaaaf206": {
    functionName: "runSetupCheck_createServerFn_handler",
    importer: () => import("./assets/setup.functions-DsxBbTse.js")
  },
  "f07945f68743a5a7d6c010091d42d30bd9a75215321a513ae562b81c0f674590": {
    functionName: "getOrders_createServerFn_handler",
    importer: () => import("./assets/orders.functions-sCUKRURV.js")
  },
  "f4c024d9a3eed139097ac8eda8cbd4a30e614f60477534a0ab157167c8019fcb": {
    functionName: "lookupBarcode_createServerFn_handler",
    importer: () => import("./assets/inventory.functions-BfBKupIG.js")
  },
  "f58d1793ee2723bf0402eab4bd8f5a7dc554805eb2915147a259f18b58527477": {
    functionName: "updateBusinessProfile_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "f61d34714fb847548ce8ac02dc39c8f7402907e44e82cf47e337f1bcaf53d121": {
    functionName: "getCountLines_createServerFn_handler",
    importer: () => import("./assets/counts.functions-fzdf4VMT.js")
  },
  "fae8e846587193e222a59fc22c1b526e3a4e748ce7615bc55c083b2922766d02": {
    functionName: "listTeamMembers_createServerFn_handler",
    importer: () => import("./assets/business.functions-CFb5axgz.js")
  },
  "fb2642136d6b78e714db8653b5c190b16782fb5dee0febafe5407086cd6baadc": {
    functionName: "listCalendarEvents_createServerFn_handler",
    importer: () => import("./assets/calendar.functions-fSoNHKzx.js")
  },
  "fe93a3ad77c54a209c7c8881b54a5c6ae2b24476e2d00d3d589e925a6176595c": {
    functionName: "lockInFounding_createServerFn_handler",
    importer: () => import("./assets/account.functions-BIyvG9nv.js")
  }
};
async function getServerFnById(id, access) {
  const serverFnInfo = manifest[id];
  if (!serverFnInfo) {
    throw new Error("Server function info not found for " + id);
  }
  const fnModule = serverFnInfo.module ??= await serverFnInfo.importer();
  if (!fnModule) {
    throw new Error("Server function module not resolved for " + id);
  }
  const action = fnModule[serverFnInfo.functionName];
  if (!action) {
    throw new Error("Server function module export not resolved for serverFn ID: " + id);
  }
  return action;
}
var TSS_FORMDATA_CONTEXT = "__TSS_CONTEXT";
var TSS_SERVER_FUNCTION = /* @__PURE__ */ Symbol.for("TSS_SERVER_FUNCTION");
var TSS_SERVER_FUNCTION_FACTORY = /* @__PURE__ */ Symbol.for("TSS_SERVER_FUNCTION_FACTORY");
var X_TSS_SERIALIZED = "x-tss-serialized";
var X_TSS_RAW_RESPONSE = "x-tss-raw";
var TSS_CONTENT_TYPE_FRAMED = "application/x-tss-framed";
var FRAME_TYPE_JSON = 0;
var FRAME_TYPE_CHUNK = 1;
var FRAME_TYPE_END = 2;
var FRAME_TYPE_ERROR = 3;
var FRAME_HEADER_SIZE = 9;
var MAX_FRAME_PAYLOAD_SIZE = 16777216;
var MAX_FRAMED_STREAMS = 1024;
var TSS_CONTENT_TYPE_FRAMED_VERSIONED = `${TSS_CONTENT_TYPE_FRAMED}; v=1`;
var GLOBAL_STORAGE_KEY = /* @__PURE__ */ Symbol.for("tanstack-start:start-storage-context");
var globalObj = globalThis;
if (!globalObj[GLOBAL_STORAGE_KEY]) globalObj[GLOBAL_STORAGE_KEY] = new AsyncLocalStorage();
var startStorage = globalObj[GLOBAL_STORAGE_KEY];
async function runWithStartContext(context, fn) {
  return startStorage.run(context, fn);
}
function getStartContext(opts) {
  const context = startStorage.getStore();
  if (!context && opts?.throwIfNotFound !== false) throw new Error(`No Start context found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
  return context;
}
var getStartOptions = () => getStartContext().startOptions;
function splitSetCookieString(cookiesString) {
  if (Array.isArray(cookiesString)) return cookiesString.flatMap((c) => splitSetCookieString(c));
  if (typeof cookiesString !== "string") return [];
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) pos += 1;
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else pos = lastComma + 1;
      } else pos += 1;
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
  }
  return cookiesStrings;
}
function toHeadersInstance(init) {
  if (init instanceof Headers) return init;
  else if (Array.isArray(init)) return new Headers(init);
  else if (typeof init === "object") return new Headers(init);
  else return null;
}
function mergeHeaders(...headers) {
  return headers.reduce((acc, header) => {
    const headersInstance = toHeadersInstance(header);
    if (!headersInstance) return acc;
    for (const [key, value] of headersInstance.entries()) if (key === "set-cookie") splitSetCookieString(value).forEach((cookie) => acc.append("set-cookie", cookie));
    else acc.set(key, value);
    return acc;
  }, new Headers());
}
const ShallowErrorPlugin = /* @__PURE__ */ createPlugin({
  tag: "$TSR/Error",
  test(value) {
    return value instanceof Error;
  },
  parse: {
    sync(value, ctx) {
      return { message: ctx.parse(value.message) };
    },
    async async(value, ctx) {
      return { message: await ctx.parse(value.message) };
    },
    stream(value, ctx) {
      return { message: ctx.parse(value.message) };
    }
  },
  serialize(node, ctx) {
    return "new Error(" + ctx.serialize(node.message) + ")";
  },
  deserialize(node, ctx) {
    return new Error(ctx.deserialize(node.message));
  }
});
function toBase64(bytes) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 32768) chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)));
  return btoa(chunks.join(""));
}
function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
const textDecoder = /* @__PURE__ */ new TextDecoder("utf-8", {
  fatal: true,
  ignoreBOM: true
});
function encodeText(value) {
  try {
    return "t" + textDecoder.decode(value);
  } catch {
    return "b" + toBase64(value);
  }
}
const textEncoder$3 = /* @__PURE__ */ new TextEncoder();
function decodeText(value) {
  const data = value.slice(1);
  return value[0] === "t" ? textEncoder$3.encode(data) : fromBase64(data);
}
function pumpEncodedStream(readable, encode, signal) {
  const stream = createStream();
  const reader = readable.getReader();
  let active = true;
  const release = () => {
    active = false;
    reader.releaseLock();
  };
  const stop = (reason) => {
    if (!active) return false;
    reader.cancel(reason).catch(() => {
    });
    release();
    return true;
  };
  (async () => {
    try {
      while (active) {
        const { done, value } = await reader.read();
        if (!active) return;
        if (done) {
          release();
          stream.return(void 0);
          return;
        }
        stream.next(encode(value));
      }
    } catch (error) {
      if (stop(error)) stream.throw(error);
    }
  })();
  return [stream, stop];
}
function fromEncodedStream(source, decode) {
  let unsubscribe;
  let done = false;
  return new ReadableStream({
    start(controller) {
      const dispose = source.on({
        next(value) {
          if (done) return;
          try {
            controller.enqueue(decode(value));
          } catch (error) {
            done = true;
            const stop = unsubscribe;
            unsubscribe = void 0;
            stop?.();
            controller.error(error);
          }
        },
        throw(error) {
          if (!done) {
            done = true;
            unsubscribe = void 0;
            controller.error(error);
          }
        },
        return() {
          if (!done) {
            done = true;
            unsubscribe = void 0;
            controller.close();
          }
        }
      });
      if (done) dispose();
      else unsubscribe = dispose;
    },
    cancel() {
      const dispose = unsubscribe;
      unsubscribe = void 0;
      dispose?.();
    }
  });
}
// @__NO_SIDE_EFFECTS__
function createRawStreamJSONPlugin(signal) {
  return /* @__PURE__ */ createPlugin({
    tag: "tss/RawStream",
    test: (value) => value instanceof RawStream,
    parse: { async: async (value, ctx) => {
      const text = await ctx.parse(value.hint === "text");
      const [stream] = pumpEncodedStream(value.stream, value.hint === "text" ? encodeText : toBase64);
      return {
        text,
        stream: await ctx.parse(stream)
      };
    } },
    serialize: void 0,
    deserialize: void 0
  });
}
const RawStreamJSONPlugin = /* @__PURE__ */ createRawStreamJSONPlugin();
const RawStreamJSONDeserializePlugin = /* @__PURE__ */ createPlugin({
  tag: "tss/RawStream",
  test: () => false,
  parse: {},
  serialize: void 0,
  deserialize(node, ctx) {
    return fromEncodedStream(ctx.deserialize(node.stream), ctx.deserialize(node.text) ? decodeText : fromBase64);
  }
});
const CLAIMED = /* @__PURE__ */ new WeakSet();
function claim(value) {
  if (CLAIMED.has(value)) throw new Error("Expected a value used by one plugin value only.");
  CLAIMED.add(value);
  return value;
}
const READABLE_STREAM_FACTORY = {};
const READABLE_STREAM_FACTORY_CONSTRUCTOR = (stream) => new ReadableStream({ start(controller) {
  stream.on({
    next(value) {
      try {
        controller.enqueue(value);
      } catch (_error) {
      }
    },
    throw(value) {
      controller.error(value);
    },
    return() {
      try {
        controller.close();
      } catch (_error) {
      }
    }
  });
} });
const ReadableStreamFactoryPlugin = /* @__PURE__ */ createPlugin({
  tag: "seroval-plugins/web/ReadableStreamFactory",
  test(value) {
    return value === READABLE_STREAM_FACTORY;
  },
  parse: {
    sync() {
      return READABLE_STREAM_FACTORY;
    },
    async async() {
      return await Promise.resolve(READABLE_STREAM_FACTORY);
    },
    stream() {
      return READABLE_STREAM_FACTORY;
    }
  },
  serialize() {
    return READABLE_STREAM_FACTORY_CONSTRUCTOR.toString();
  },
  deserialize() {
    return READABLE_STREAM_FACTORY;
  }
});
function toAsyncIterable(value) {
  return { [Symbol.asyncIterator]() {
    const reader = value.getReader();
    let active = true;
    let reading = false;
    const release = () => {
      try {
        reader.releaseLock();
      } catch {
      }
    };
    return {
      async next() {
        if (!active) return {
          done: true,
          value: void 0
        };
        reading = true;
        let result;
        try {
          result = await reader.read();
        } catch (error) {
          reading = false;
          release();
          if (!active) return {
            done: true,
            value: void 0
          };
          active = false;
          throw error;
        }
        reading = false;
        if (!active || result.done) {
          active = false;
          release();
          return {
            done: true,
            value: void 0
          };
        }
        return result;
      },
      return(reason) {
        if (active) {
          active = false;
          try {
            reader.cancel(reason).catch(() => {
            });
          } catch {
          }
          if (!reading) release();
        }
        return Promise.resolve({
          done: true,
          value: void 0
        });
      }
    };
  } };
}
const ReadableStreamPlugin = /* @__PURE__ */ createPlugin({
  tag: "seroval/plugins/web/ReadableStream",
  extends: [ReadableStreamFactoryPlugin],
  skipPlainObjects: true,
  test(value) {
    if (typeof ReadableStream === "undefined") return false;
    return value instanceof ReadableStream;
  },
  parse: {
    async async(value, ctx) {
      return {
        factory: await ctx.parse(READABLE_STREAM_FACTORY),
        stream: await ctx.parseStreamSource(toAsyncIterable(value))
      };
    },
    stream(value, ctx) {
      return {
        factory: ctx.parse(READABLE_STREAM_FACTORY),
        stream: ctx.parseStreamSource(toAsyncIterable(value))
      };
    }
  },
  serialize(node, ctx) {
    return "(" + ctx.serialize(node.factory) + ")(" + ctx.serialize(node.stream) + ")";
  },
  deserialize(node, ctx) {
    const stream = ctx.deserialize(node.stream);
    if (!isStream(stream)) throw new Error("Expected a stream source.");
    return READABLE_STREAM_FACTORY_CONSTRUCTOR(claim(stream));
  }
});
// @__NO_SIDE_EFFECTS__
function createDefaultSerovalPlugins(signal) {
  return [
    ShallowErrorPlugin,
    RawStreamJSONPlugin,
    ReadableStreamPlugin
  ];
}
const defaultSerovalPlugins = /* @__PURE__ */ createDefaultSerovalPlugins();
const defaultSerovalDeserializerPlugins = [RawStreamJSONDeserializePlugin, ...defaultSerovalPlugins];
// @__NO_SIDE_EFFECTS__
function createRawStreamRPCPlugin(onRawStream) {
  let nextStreamId = 1;
  return /* @__PURE__ */ createPlugin({
    tag: "tss/RawStream",
    test(value) {
      return value instanceof RawStream;
    },
    parse: { stream(value, ctx) {
      const streamId = nextStreamId++;
      onRawStream(streamId, value.stream);
      return { streamId: ctx.parse(streamId) };
    } },
    serialize: void 0,
    deserialize: void 0
  });
}
function getSerovalPlugins(routerPlugins) {
  return [...getStartOptions()?.serializationAdapters?.map(makeSerovalPlugin) ?? [], ...routerPlugins];
}
var textEncoder$2 = new TextEncoder();
var EMPTY_PAYLOAD = /* @__PURE__ */ new Uint8Array(0);
var MAX_ERROR_MESSAGE_CODE_UNITS = 4096;
function encodeFrame(type, streamId, payload) {
  if (payload.byteLength > MAX_FRAME_PAYLOAD_SIZE) throw new RangeError(`Frame payload exceeds ${MAX_FRAME_PAYLOAD_SIZE} bytes`);
  const frame = new Uint8Array(FRAME_HEADER_SIZE + payload.length);
  frame[0] = type;
  frame[1] = streamId >>> 24 & 255;
  frame[2] = streamId >>> 16 & 255;
  frame[3] = streamId >>> 8 & 255;
  frame[4] = streamId & 255;
  frame[5] = payload.length >>> 24 & 255;
  frame[6] = payload.length >>> 16 & 255;
  frame[7] = payload.length >>> 8 & 255;
  frame[8] = payload.length & 255;
  frame.set(payload, FRAME_HEADER_SIZE);
  return frame;
}
function encodeErrorPayload(error) {
  const originalMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const message = originalMessage.length > MAX_ERROR_MESSAGE_CODE_UNITS ? `${originalMessage.slice(0, MAX_ERROR_MESSAGE_CODE_UNITS)}…` : originalMessage;
  return textEncoder$2.encode(message);
}
function createMultiplexedStream(recordStream, options = {}) {
  let controller;
  let stopped = false;
  let activePumps = 0;
  let wakeDemand;
  let admission;
  const readers = /* @__PURE__ */ new Set();
  const pendingRawStreams = /* @__PURE__ */ new Set();
  const abortOutput = () => errorOutput(options.signal?.reason);
  const wakeAdmission = () => {
    const wake = wakeDemand;
    wakeDemand = void 0;
    wake?.();
  };
  const cancelReader = (reader, reason) => {
    reader.cancel(reason).catch(() => {
    });
  };
  const cancelStream = (stream, reason) => {
    stream.cancel(reason).catch(() => {
    });
  };
  const stop = (reason) => {
    if (stopped) return false;
    stopped = [reason];
    options.signal?.removeEventListener("abort", abortOutput);
    wakeAdmission();
    for (const reader of readers) cancelReader(reader, reason);
    for (const stream of pendingRawStreams) cancelStream(stream, reason);
    pendingRawStreams.clear();
    return true;
  };
  const errorOutput = (error) => {
    if (!stop(error)) return;
    try {
      controller.error(error);
    } catch {
    }
  };
  const waitForDemand = async () => {
    while (!stopped && (controller.desiredSize ?? 0) <= 0) await new Promise((resolve) => {
      wakeDemand = resolve;
    });
    return !stopped;
  };
  const admitFrame = (type, streamId, payload) => {
    if (stopped) return false;
    if (!admission && (controller.desiredSize ?? 0) > 0) {
      controller.enqueue(encodeFrame(type, streamId, payload));
      return true;
    }
    const runAdmission = async () => {
      if (!await waitForDemand()) return false;
      controller.enqueue(encodeFrame(type, streamId, payload));
      return true;
    };
    const result = admission ? admission.then(runAdmission) : runAdmission();
    const clearAdmission = () => {
      if (admission === tail) admission = void 0;
    };
    const tail = result.then(clearAdmission, clearAdmission);
    admission = tail;
    return result;
  };
  const maybeClose = () => {
    if (activePumps !== 0 || !stop()) return;
    try {
      controller.close();
    } catch {
    }
  };
  const startPump = (pump) => {
    activePumps++;
    pump().then(() => {
      activePumps--;
      maybeClose();
    }, (error) => {
      activePumps--;
      errorOutput(error);
    });
  };
  async function pumpRawStream(streamId, stream) {
    const reader = stream.getReader();
    readers.add(reader);
    try {
      while (!stopped) {
        const { done, value } = await reader.read();
        if (stopped) return;
        if (done) {
          const frameAdmission = admitFrame(FRAME_TYPE_END, streamId, EMPTY_PAYLOAD);
          if (frameAdmission !== true) await frameAdmission;
          return;
        }
        if (!(value instanceof Uint8Array)) throw new TypeError("RawStream chunks must be Uint8Array");
        let offset = 0;
        do {
          const chunk = value.byteLength <= MAX_FRAME_PAYLOAD_SIZE ? value : value.subarray(offset, offset + MAX_FRAME_PAYLOAD_SIZE);
          const frameAdmission = admitFrame(FRAME_TYPE_CHUNK, streamId, chunk);
          if (frameAdmission !== true && (frameAdmission === false || !await frameAdmission)) return;
          offset += MAX_FRAME_PAYLOAD_SIZE;
        } while (offset < value.byteLength);
      }
    } catch (error) {
      if (!stopped) {
        const frameAdmission = admitFrame(FRAME_TYPE_ERROR, streamId, encodeErrorPayload(error));
        if (frameAdmission !== true) await frameAdmission;
      }
    } finally {
      readers.delete(reader);
      reader.releaseLock();
    }
  }
  async function pumpRecords() {
    const reader = recordStream.getReader();
    readers.add(reader);
    try {
      while (!stopped) {
        const { done, value } = await reader.read();
        if (stopped) {
          if (!done) for (const registration of value.rawStreams) cancelStream(registration.stream, stopped[0]);
          return;
        }
        if (done) return;
        for (const registration of value.rawStreams) pendingRawStreams.add(registration.stream);
        const frameAdmission = admitFrame(FRAME_TYPE_JSON, 0, value.json);
        if (frameAdmission !== true && (frameAdmission === false || !await frameAdmission)) return;
        for (const registration of value.rawStreams) {
          pendingRawStreams.delete(registration.stream);
          startPump(pumpRawStream.bind(void 0, registration.id, registration.stream));
        }
      }
    } catch (error) {
      if (!stopped) errorOutput(error);
    } finally {
      readers.delete(reader);
      reader.releaseLock();
    }
  }
  return new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      if (options.signal?.aborted) {
        cancelStream(recordStream, options.signal.reason);
        errorOutput(options.signal.reason);
        return;
      }
      options.signal?.addEventListener("abort", abortOutput, { once: true });
      startPump(pumpRecords);
    },
    pull() {
      wakeAdmission();
    },
    cancel(reason) {
      if (stop(reason)) options.onCancel?.(reason);
    }
  });
}
function isSafeKey(key) {
  return key !== "__proto__" && key !== "constructor" && key !== "prototype";
}
function safeObjectMerge(target, source) {
  const result = /* @__PURE__ */ Object.create(null);
  if (target) {
    for (const key of Object.keys(target)) if (isSafeKey(key)) result[key] = target[key];
  }
  if (source && typeof source === "object") {
    for (const key of Object.keys(source)) if (isSafeKey(key)) result[key] = source[key];
  }
  return result;
}
function createNullProtoObject(source) {
  if (!source) return /* @__PURE__ */ Object.create(null);
  const obj = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(source)) if (isSafeKey(key)) obj[key] = source[key];
  return obj;
}
var getStartContextServerOnly = getStartContext;
var createServerFn = (options, __opts) => {
  const resolvedOptions = __opts || options || {};
  if (typeof resolvedOptions.method === "undefined") resolvedOptions.method = "GET";
  const setValidator = (validator) => {
    return createServerFn(void 0, {
      ...resolvedOptions,
      validator,
      inputValidator: validator
    });
  };
  const res = {
    options: resolvedOptions,
    middleware: (middleware) => {
      const newMiddleware = [...resolvedOptions.middleware || []];
      middleware.forEach((item) => {
        if (TSS_SERVER_FUNCTION_FACTORY in item) {
          if (item.options.middleware) newMiddleware.push(...item.options.middleware);
        } else newMiddleware.push(item);
      });
      const res2 = createServerFn(void 0, {
        ...resolvedOptions,
        middleware: newMiddleware
      });
      res2[TSS_SERVER_FUNCTION_FACTORY] = true;
      return res2;
    },
    validator: setValidator,
    inputValidator: setValidator,
    handler: (...args) => {
      const [extractedFn, serverFn] = args;
      const newOptions = {
        ...resolvedOptions,
        extractedFn,
        serverFn
      };
      const resolvedMiddleware = [...newOptions.middleware || [], serverFnBaseToMiddleware(newOptions)];
      extractedFn.method = resolvedOptions.method;
      return Object.assign(async (opts) => {
        const result = await executeMiddleware$1(resolvedMiddleware, "client", {
          ...extractedFn,
          ...newOptions,
          data: opts?.data,
          headers: opts?.headers,
          signal: opts?.signal,
          fetch: opts?.fetch,
          context: createNullProtoObject()
        });
        const redirect2 = parseRedirect(result.error);
        if (redirect2) throw redirect2;
        if (result.error) throw result.error;
        return result.result;
      }, {
        ...extractedFn,
        method: resolvedOptions.method,
        __executeServer: async (opts) => {
          const startContext = getStartContextServerOnly();
          const serverContextAfterGlobalMiddlewares = startContext.contextAfterGlobalMiddlewares;
          const ctx = {
            ...extractedFn,
            data: opts.data,
            method: opts.method ?? resolvedOptions.method,
            serverFnMeta: extractedFn.serverFnMeta,
            context: safeObjectMerge(opts.context, serverContextAfterGlobalMiddlewares),
            request: startContext.request
          };
          return await executeMiddleware$1(resolvedMiddleware, "server", ctx).then((d) => ({
            result: d.result,
            error: d.error,
            context: d.sendContext
          }));
        }
      });
    }
  };
  const fun = (options2) => {
    return createServerFn(void 0, {
      ...resolvedOptions,
      ...options2
    });
  };
  return Object.assign(fun, res);
};
async function executeMiddleware$1(middlewares, env, opts) {
  let flattenedMiddlewares = flattenMiddlewares([...getStartOptions()?.functionMiddleware || [], ...middlewares]);
  if (env === "server") {
    const startContext = getStartContextServerOnly({ throwIfNotFound: false });
    if (startContext?.executedRequestMiddlewares) flattenedMiddlewares = flattenedMiddlewares.filter((m) => !startContext.executedRequestMiddlewares.has(m));
  }
  const callNextMiddleware = async (ctx) => {
    const nextMiddleware = flattenedMiddlewares.shift();
    if (!nextMiddleware) return ctx;
    try {
      let validator = "validator" in nextMiddleware.options ? nextMiddleware.options.validator : void 0;
      if (!validator && "inputValidator" in nextMiddleware.options) validator = nextMiddleware.options.inputValidator;
      if (validator && env === "server") ctx.data = await execValidator(validator, ctx.data);
      let middlewareFn = void 0;
      if (env === "client") {
        if ("client" in nextMiddleware.options) middlewareFn = nextMiddleware.options.client;
      } else if ("server" in nextMiddleware.options) middlewareFn = nextMiddleware.options.server;
      if (middlewareFn) {
        const userNext = async (userCtx = {}) => {
          const nextCtx = {
            ...ctx,
            ...userCtx,
            context: safeObjectMerge(ctx.context, userCtx.context),
            sendContext: safeObjectMerge(ctx.sendContext, userCtx.sendContext),
            headers: mergeHeaders(ctx.headers, userCtx.headers),
            _callSiteFetch: ctx._callSiteFetch,
            fetch: ctx._callSiteFetch ?? userCtx.fetch ?? ctx.fetch,
            result: userCtx.result !== void 0 ? userCtx.result : userCtx instanceof Response ? userCtx : ctx.result,
            error: userCtx.error ?? ctx.error
          };
          const result2 = await callNextMiddleware(nextCtx);
          if (result2.error) throw result2.error;
          return result2;
        };
        const result = await middlewareFn({
          ...ctx,
          next: userNext
        });
        if (isRedirect(result)) return {
          ...ctx,
          error: result
        };
        if (result instanceof Response) return {
          ...ctx,
          result
        };
        if (!result) throw new Error("User middleware returned undefined. You must call next() or return a result in your middlewares.");
        return result;
      }
      return callNextMiddleware(ctx);
    } catch (error) {
      return {
        ...ctx,
        error
      };
    }
  };
  return callNextMiddleware({
    ...opts,
    headers: opts.headers || {},
    sendContext: opts.sendContext || {},
    context: opts.context || createNullProtoObject(),
    _callSiteFetch: opts.fetch
  });
}
function flattenMiddlewares(middlewares, maxDepth = 100) {
  const seen = /* @__PURE__ */ new Set();
  const flattened = [];
  const recurse = (middleware, depth) => {
    if (depth > maxDepth) throw new Error(`Middleware nesting depth exceeded maximum of ${maxDepth}. Check for circular references.`);
    middleware.forEach((m) => {
      if (m.options.middleware) recurse(m.options.middleware, depth + 1);
      if (!seen.has(m)) {
        seen.add(m);
        flattened.push(m);
      }
    });
  };
  recurse(middlewares, 0);
  return flattened;
}
async function execValidator(validator, input) {
  if (validator == null) return {};
  if ("~standard" in validator) {
    const result = await validator["~standard"].validate(input);
    if (result.issues) throw new Error(JSON.stringify(result.issues, void 0, 2));
    return result.value;
  }
  if ("parse" in validator) return validator.parse(input);
  if (typeof validator === "function") return validator(input);
  throw new Error("Invalid validator type!");
}
function serverFnBaseToMiddleware(options) {
  return {
    "~types": void 0,
    options: {
      inputValidator: options.validator ?? options.inputValidator,
      client: async ({ next, sendContext, fetch, ...ctx }) => {
        const payload = {
          ...ctx,
          context: sendContext,
          fetch
        };
        return next(await options.extractedFn?.(payload));
      },
      server: async ({ next, ...ctx }) => {
        const result = await options.serverFn?.(ctx);
        return next({
          ...ctx,
          result
        });
      }
    }
  };
}
var createMiddleware = (options, __opts) => {
  const resolvedOptions = {
    type: "request",
    ...__opts || options
  };
  const setValidator = (validator) => {
    return createMiddleware({}, Object.assign(resolvedOptions, {
      validator,
      inputValidator: validator
    }));
  };
  return {
    options: resolvedOptions,
    middleware: (middleware) => {
      return createMiddleware({}, Object.assign(resolvedOptions, { middleware }));
    },
    validator: setValidator,
    inputValidator: setValidator,
    client: (client) => {
      return createMiddleware({}, Object.assign(resolvedOptions, { client }));
    },
    server: (server2) => {
      return createMiddleware({}, Object.assign(resolvedOptions, { server: server2 }));
    }
  };
};
var innerCreateCsrfMiddleware = (opts = {}) => {
  const middleware = createMiddleware().server(async (ctx) => {
    const csrfCtx = ctx;
    if (opts.filter && !await opts.filter(csrfCtx)) return ctx.next();
    if (await isCsrfRequestAllowed(opts, csrfCtx)) return ctx.next();
    return getFailureResponse(opts, csrfCtx);
  });
  return middleware;
};
var createCsrfMiddleware = innerCreateCsrfMiddleware;
async function isCsrfRequestAllowed(opts, ctx) {
  const result = await getCsrfRequestValidationResult(opts, ctx);
  return result === true || result === void 0 && opts.allowRequestsWithoutOriginCheck === true;
}
async function getCsrfRequestValidationResult(opts, ctx) {
  const fetchSite = ctx.request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null) return matchValue(opts.secFetchSite ?? "same-origin", fetchSite, ctx);
  const origin = ctx.request.headers.get("Origin");
  if (origin !== null) {
    if (opts.origin) return matchValue(opts.origin, origin, ctx);
    return origin === new URL(ctx.request.url).origin;
  }
  const referer = ctx.request.headers.get("Referer");
  if (referer === null || opts.referer === false) return;
  if (typeof opts.referer === "function") return opts.referer(referer, ctx);
  if (opts.origin) {
    const refererOrigin = getOriginFromUrl(referer);
    return refererOrigin !== void 0 && matchValue(opts.origin, refererOrigin, ctx);
  }
  return isRefererSameOrigin(referer, new URL(ctx.request.url).origin);
}
async function matchValue(matcher, value, ctx) {
  if (typeof matcher === "function") return matcher(value, ctx);
  if (Array.isArray(matcher)) return matcher.includes(value);
  return value === matcher;
}
function getOriginFromUrl(url) {
  try {
    return new URL(url).origin;
  } catch {
    return;
  }
}
function isRefererSameOrigin(referer, requestOrigin) {
  if (referer === requestOrigin) return true;
  if (!referer.startsWith(requestOrigin)) return false;
  if (referer.length === requestOrigin.length) return true;
  const code = referer.charCodeAt(requestOrigin.length);
  return code === 47 || code === 63 || code === 35;
}
async function getFailureResponse(opts, ctx) {
  if (typeof opts.failureResponse === "function") return opts.failureResponse(ctx);
  return opts.failureResponse?.clone() ?? new Response("Forbidden", {
    status: 403
  });
}
const GLOBAL_TSR = "$_TSR";
// @__NO_SIDE_EFFECTS__
function makeSsrSerovalPlugin(serializationAdapter, tracker) {
  return /* @__PURE__ */ createPlugin({
    tag: "$TSR/t/" + serializationAdapter.key,
    test: serializationAdapter.test,
    parse: { stream(value, ctx) {
      return { v: ctx.parse(serializationAdapter.toSerializable(value)) };
    } },
    serialize(node, ctx) {
      if (tracker) tracker.didRun = true;
      return GLOBAL_TSR + '.t.get("' + serializationAdapter.key + '")(' + ctx.serialize(node.v) + ")";
    },
    deserialize: void 0
  });
}
var tsrScript_default = "self.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete self.$_TSR,delete self.$R.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]}";
const textEncoder$1 = new TextEncoder();
const DOCUMENT_CLOSE = "</body></html>";
const SCRIPT_CLOSE = "<\/script>";
textEncoder$1.encode(DOCUMENT_CLOSE);
textEncoder$1.encode(SCRIPT_CLOSE);
function encodeIntoBoundedChunk(source, sourceOffset, output, outputOffset = 0) {
  return textEncoder$1.encodeInto(sourceOffset === 0 ? source : source.slice(sourceOffset), outputOffset === 0 ? output : output.subarray(outputOffset));
}
const encoder = new TextEncoder();
const SOURCE_SEPARATOR = ";";
const MAX_INITIAL_SOURCE_CODE_UNITS = 16384;
const MAX_BACKLOG_CODE_UNITS = 16777216;
const MAX_BACKLOG_SOURCES = 4096;
const MIN_OUTPUT_BYTES = 256;
const MAX_DIRECT_CODE_UNITS = 16384;
const MAX_HYDRATION_OUTPUT_CHUNK_BYTES = 65536;
const MAX_DYNAMIC_RECORD_CODE_UNITS = MAX_HYDRATION_OUTPUT_CHUNK_BYTES;
const STREAM_PART_ATTRIBUTE = "data-tsr-stream-part";
const INITIAL_CLEANUP_SOURCE = `{let s=document.currentScript,p;while((p=s.previousElementSibling)&&p.hasAttribute('${STREAM_PART_ATTRIBUTE}'))p.remove();s.remove()}`;
const INITIAL_CLEANUP_SUFFIX = SOURCE_SEPARATOR + INITIAL_CLEANUP_SOURCE;
const DYNAMIC_CLOSE_SOURCE = "document.currentScript.remove()<\/script>";
const HYDRATION_SCRIPT_BOUNDARY_SOURCE = "document.currentScript.remove();/*$tsr-stream-boundary*/";
const HYDRATION_SCRIPT_BOUNDARY_SUFFIX = ";/*$tsr-stream-boundary*/<\/script>";
encoder.encode(HYDRATION_SCRIPT_BOUNDARY_SUFFIX);
const ROUTER_PREFIX = GLOBAL_TSR + ".router=";
const PROMISE_PREFIX = GLOBAL_TSR + ".p(()=>";
const DEFAULT_INITIAL_SOURCES = [getCrossReferenceHeader("tsr"), tsrScript_default];
const HydrationScriptOutputState = {
  Waiting: 0,
  Ready: 1,
  Active: 2,
  Done: 3,
  Failed: 4
};
function escapeAttribute(value) {
  return value.replace(/[&"'<>]/g, (char) => `&#${char.charCodeAt(0)};`);
}
function createInitialTags(sources, nonce) {
  const before = [];
  for (const source of sources) {
    if (!source) continue;
    const previous = before[before.length - 1];
    if (previous?.children && previous.children.length + 1 + source.length <= MAX_INITIAL_SOURCE_CODE_UNITS) previous.children += SOURCE_SEPARATOR + source;
    else before.push({
      tag: "script",
      attrs: {
        nonce,
        [STREAM_PART_ATTRIBUTE]: ""
      },
      children: source
    });
  }
  const lastHydrationTag = before[before.length - 1];
  if (lastHydrationTag) {
    const lastSource = lastHydrationTag.children;
    if (lastSource.length + INITIAL_CLEANUP_SUFFIX.length <= MAX_INITIAL_SOURCE_CODE_UNITS) lastHydrationTag.children = lastSource + INITIAL_CLEANUP_SUFFIX;
    else before.push({
      tag: "script",
      attrs: {
        nonce,
        [STREAM_PART_ATTRIBUTE]: ""
      },
      children: INITIAL_CLEANUP_SOURCE
    });
  }
  return {
    before,
    boundary: {
      tag: "script",
      attrs: { nonce },
      children: HYDRATION_SCRIPT_BOUNDARY_SOURCE
    }
  };
}
var HydrationScriptsOwner = class {
  constructor(nonce, initialSources) {
    this.nonce = nonce;
    this.queuedSources = [];
    this.queuedSourceHead = 0;
    this.initialTaken = false;
    this.barrierLifted = false;
    this.producerDone = false;
    this.retainedSources = 0;
    this.regularCodeUnits = 0;
    this.hasOversizedSource = false;
    this.segmentIndex = 0;
    this.closingSegmentIndex = 0;
    this.source = "";
    this.sourceOffset = 0;
    this.outputCapacity = MIN_OUTPUT_BYTES;
    this.outputState = HydrationScriptOutputState.Waiting;
    this.takeInitialHydrationScriptTags = this.takeInitialHydrationScriptTags.bind(this);
    const seedSources = initialSources ?? DEFAULT_INITIAL_SOURCES;
    for (const seedSource of seedSources) {
      if (!this.account(seedSource)) break;
      this.queuedSources.push(seedSource);
    }
  }
  get state() {
    return this.outputState;
  }
  get error() {
    return this.outputError;
  }
  notify() {
    try {
      this.listener?.();
    } catch (listenerError) {
      console.error("Hydration script output listener error:", listenerError);
    }
  }
  refresh(notifyChange = true) {
    const next = this.outputState === HydrationScriptOutputState.Failed ? HydrationScriptOutputState.Failed : this.active ? HydrationScriptOutputState.Active : typeof this.consumer === "object" && this.initialTaken && this.barrierLifted && !this.queueIsEmpty() ? HydrationScriptOutputState.Ready : this.producerDone && this.initialTaken && this.queueIsEmpty() ? HydrationScriptOutputState.Done : HydrationScriptOutputState.Waiting;
    if (this.outputState !== next) {
      this.outputState = next;
      if (notifyChange) this.notify();
    }
  }
  clearTimeoutIfSet() {
    if (this.timeout !== void 0) {
      clearTimeout(this.timeout);
      this.timeout = void 0;
    }
  }
  queueIsEmpty() {
    return this.queuedSourceHead === this.queuedSources.length;
  }
  clearQueue() {
    this.queuedSources = [];
    this.queuedSourceHead = 0;
  }
  dropBufferedOutput() {
    this.clearQueue();
    this.active = void 0;
    this.retainedSources = 0;
    this.regularCodeUnits = 0;
    this.hasOversizedSource = false;
    this.segmentIndex = 0;
    this.closingSegmentIndex = 0;
    this.source = "";
    this.sourceOffset = 0;
    this.outputCapacity = MIN_OUTPUT_BYTES;
    this.opening = void 0;
  }
  fail(reason) {
    if (this.consumer === "cleaned" || this.outputState === HydrationScriptOutputState.Failed) return;
    this.outputError = reason;
    this.clearTimeoutIfSet();
    this.dropBufferedOutput();
    this.outputState = HydrationScriptOutputState.Failed;
    this.notify();
  }
  rejectBacklog(kind) {
    this.fail(/* @__PURE__ */ new Error(`SSR hydration backlog exceeded maximum ${kind} count`));
    return false;
  }
  account(nextSource) {
    if (this.retainedSources === MAX_BACKLOG_SOURCES) return this.rejectBacklog("source-part");
    if (nextSource.length > MAX_BACKLOG_CODE_UNITS) {
      if (this.hasOversizedSource) return this.rejectBacklog("code-unit");
      this.hasOversizedSource = true;
    } else if (this.regularCodeUnits + nextSource.length > MAX_BACKLOG_CODE_UNITS) return this.rejectBacklog("code-unit");
    else this.regularCodeUnits += nextSource.length;
    this.retainedSources++;
    return true;
  }
  releaseSource(part) {
    this.retainedSources--;
    if (part.length > MAX_BACKLOG_CODE_UNITS) this.hasOversizedSource = false;
    else this.regularCodeUnits -= part.length;
  }
  releaseAccounting(batch) {
    for (const part of batch) if (part !== void 0) this.releaseSource(part);
  }
  liftBarrier() {
    if (this.consumer !== "cleaned" && !this.barrierLifted) {
      this.barrierLifted = true;
      this.refresh();
    }
  }
  producerCanWrite() {
    return this.consumer !== "cleaned" && this.outputState !== HydrationScriptOutputState.Failed && !this.producerDone;
  }
  pushSource(nextSource) {
    if (!this.producerCanWrite()) return false;
    if (this.account(nextSource)) {
      this.queuedSources.push(nextSource);
      if (this.initialTaken) this.refresh();
    } else return false;
    return this.producerCanWrite();
  }
  takeQueuedBatch(batchLength) {
    if (this.queuedSourceHead === 0 && batchLength === this.queuedSources.length) {
      const batch2 = this.queuedSources;
      this.clearQueue();
      return batch2;
    }
    const end = this.queuedSourceHead + batchLength;
    const batch = this.queuedSources.slice(this.queuedSourceHead, end);
    for (let index = this.queuedSourceHead; index < end; index++) this.queuedSources[index] = void 0;
    this.queuedSourceHead = end;
    if (this.queueIsEmpty()) this.clearQueue();
    else if (this.queuedSourceHead >= 1024 && this.queuedSourceHead >= this.queuedSources.length - this.queuedSourceHead) {
      this.queuedSources = this.queuedSources.slice(this.queuedSourceHead);
      this.queuedSourceHead = 0;
    }
    return batch;
  }
  release(batch) {
    this.releaseAccounting(batch);
    this.active = void 0;
    this.source = "";
    this.sourceOffset = 0;
    this.refresh(false);
  }
  advanceSource() {
    const batch = this.active;
    if (this.segmentIndex > 0 && this.segmentIndex < this.closingSegmentIndex) {
      const partIndex = this.segmentIndex - 1 >> 1;
      if (this.segmentIndex % 2 === 1) {
        const part = batch[partIndex];
        if (part !== void 0) {
          this.releaseSource(part);
          batch[partIndex] = void 0;
        }
      }
    }
    this.segmentIndex++;
    if (this.segmentIndex < this.closingSegmentIndex) {
      const partIndex = this.segmentIndex - 1 >> 1;
      this.source = this.segmentIndex % 2 === 1 ? batch[partIndex] : SOURCE_SEPARATOR;
    } else if (this.segmentIndex === this.closingSegmentIndex) this.source = DYNAMIC_CLOSE_SOURCE;
    else this.release(batch);
    this.sourceOffset = 0;
  }
  pullActive() {
    const bytes = new Uint8Array(this.outputCapacity);
    let offset = 0;
    while (this.active) if (this.sourceOffset === this.source.length) this.advanceSource();
    else if (offset === bytes.length) break;
    else {
      const result = encodeIntoBoundedChunk(this.source, this.sourceOffset, bytes, offset);
      if (result.read === 0) break;
      this.sourceOffset += result.read;
      offset += result.written;
    }
    if (offset === 0) throw new Error("SSR router script record produced no output");
    if (offset === bytes.length) return bytes;
    return offset * 2 < bytes.length ? bytes.slice(0, offset) : bytes.subarray(0, offset);
  }
  pullReady() {
    const scriptOpening = this.opening ??= this.nonce ? `<script nonce="${escapeAttribute(this.nonce)}">` : "<script>";
    let codeUnits = scriptOpening.length + 40;
    let batchLength = 0;
    for (let index = this.queuedSourceHead; index < this.queuedSources.length; index++) {
      const part = this.queuedSources[index];
      const nextCodeUnits = codeUnits + 1 + part.length;
      if (batchLength > 0 && nextCodeUnits > MAX_DYNAMIC_RECORD_CODE_UNITS) break;
      codeUnits = nextCodeUnits;
      batchLength++;
      if (codeUnits > MAX_DYNAMIC_RECORD_CODE_UNITS) break;
    }
    const batch = this.takeQueuedBatch(batchLength);
    if (codeUnits <= MAX_DIRECT_CODE_UNITS) {
      const joined = batch.length === 1 ? batch[0] : batch.join(SOURCE_SEPARATOR);
      const bytes = encoder.encode(scriptOpening + joined + ";document.currentScript.remove()<\/script>");
      this.release(batch);
      return bytes;
    }
    this.active = batch;
    this.segmentIndex = 0;
    this.closingSegmentIndex = (batch.length << 1) + 1;
    this.source = scriptOpening;
    this.sourceOffset = 0;
    this.outputCapacity = Math.max(MIN_OUTPUT_BYTES, Math.min(MAX_HYDRATION_OUTPUT_CHUNK_BYTES, codeUnits));
    this.outputState = HydrationScriptOutputState.Active;
    return this.pullActive();
  }
  pullChunk() {
    if (this.outputState !== HydrationScriptOutputState.Ready && this.outputState !== HydrationScriptOutputState.Active) throw new Error("Hydration script output is not ready");
    try {
      return this.outputState === HydrationScriptOutputState.Ready ? this.pullReady() : this.pullActive();
    } catch (cause) {
      this.fail(cause);
      throw cause;
    }
  }
  subscribe(onChange) {
    if (this.consumer === "cleaned") return () => {
    };
    if (this.listener) throw new Error("SSR hydration output already has a subscriber");
    this.listener = onChange;
    return () => {
      if (this.listener === onChange) this.listener = void 0;
    };
  }
  pushSerializedSource(data, initial, wrap) {
    let serialized = initial ? ROUTER_PREFIX + data : data;
    if (wrap) serialized = PROMISE_PREFIX + serialized + ")";
    return this.pushSource(serialized);
  }
  finish() {
    if (!this.pushSource("$_TSR.e()")) return;
    this.producerDone = true;
    this.clearTimeoutIfSet();
    this.refresh();
  }
  takeInitialHydrationScriptTags() {
    if (this.consumer === "cleaned" || this.outputState === HydrationScriptOutputState.Failed || this.initialTaken) return;
    const sources = this.queuedSources;
    const tags = createInitialTags(sources, this.nonce);
    this.initialTaken = true;
    this.releaseAccounting(sources);
    sources.length = 0;
    this.queuedSourceHead = 0;
    this.refresh();
    return tags;
  }
  /**
  * Opt this request out of hydration output entirely (for example a
  * `hydrate: false` page). Drops the queued bootstrap sources, marks the
  * producer done, and makes the fast pass-through path reservable without
  * a rendered `<Scripts>` boundary. Must run before the initial take and
  * before serialization produces output.
  */
  disableHydration() {
    if (this.consumer === "cleaned" || this.outputState === HydrationScriptOutputState.Failed) return;
    if (this.initialTaken || this.consumer !== void 0 || this.producerDone) {
      invariant();
    }
    this.releaseAccounting(this.queuedSources);
    this.clearQueue();
    this.initialTaken = true;
    this.barrierLifted = true;
    this.producerDone = true;
    this.refresh();
  }
  isInitialTaken() {
    return this.initialTaken;
  }
  skipInitialTake() {
    if (this.consumer !== "cleaned" && !this.initialTaken) {
      this.initialTaken = true;
      this.refresh();
    }
  }
  claimOutput() {
    if (this.consumer === "cleaned") throw new Error("SSR hydration script output is already cleaned up");
    if (this.consumer !== void 0) throw new Error("SSR hydration script output already has a consumer");
    this.consumer = this;
    this.refresh(false);
    return this;
  }
  reserveFastPath(output) {
    const ownsConsumer = this.consumer === output;
    if (this.outputState === HydrationScriptOutputState.Failed || !this.producerDone || !this.initialTaken || !this.queueIsEmpty() || this.active || !ownsConsumer) return false;
    this.consumer = "fast-path";
    return true;
  }
  startSerializationTimeout(timeoutMs) {
    if (this.consumer === "cleaned" || this.outputState === HydrationScriptOutputState.Failed || this.producerDone || this.timeout !== void 0) return;
    this.timeout = setTimeout(() => {
      this.timeout = void 0;
      if (this.consumer !== "cleaned" && this.outputState !== HydrationScriptOutputState.Failed && !this.producerDone) {
        console.error("Serialization timeout after app render finished");
        this.fail(/* @__PURE__ */ new Error("Serialization timeout after app render finished"));
      }
    }, timeoutMs);
  }
  cleanup() {
    if (this.consumer === "cleaned") return;
    this.consumer = "cleaned";
    this.clearTimeoutIfSet();
    this.dropBufferedOutput();
    this.listener = void 0;
    this.outputError = void 0;
    this.producerDone = true;
    this.outputState = HydrationScriptOutputState.Done;
  }
};
function createHydrationScripts(nonce, initialSources) {
  return new HydrationScriptsOwner(nonce, initialSources);
}
const nodeBuffer = globalThis.Buffer;
const toBase64Fast = nodeBuffer ? (bytes) => nodeBuffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64") : toBase64;
const BINARY_FACTORY = () => {
};
const TEXT_FACTORY = () => {
};
const FACTORY_BINARY = `((s,u=1)=>new ReadableStream({start(c,f){f=s.on({next(b){const d=atob(b),a=new Uint8Array(d.length);for(let i=0;i<d.length;i++)a[i]=d.charCodeAt(i);c.enqueue(a)},throw(e){s=u=0;c.error(e)},return(){s=u=0;c.close()}});u=u&&f},cancel(){u&&u()}}))`;
const FACTORY_TEXT = `((s,u=1,e=new TextEncoder)=>new ReadableStream({start(c,f){f=s.on({next(v){const x=v.slice(1);if(v[0]==='t')c.enqueue(e.encode(x));else{const d=atob(x),a=new Uint8Array(d.length);for(let i=0;i<d.length;i++)a[i]=d.charCodeAt(i);c.enqueue(a)}},throw(x){s=u=0;c.error(x)},return(){s=u=0;c.close()}});u=u&&f},cancel(){u&&u()}}))`;
function makeFactoryPlugin(tag, sentinel, source) {
  return createPlugin({
    tag,
    test(value) {
      return value === sentinel;
    },
    parse: { stream() {
      return {};
    } },
    serialize() {
      return source;
    },
    deserialize: void 0
  });
}
const RawStreamSSRPlugin = /* @__PURE__ */ createPlugin({
  tag: "tss/RawStream",
  extends: [/* @__PURE__ */ makeFactoryPlugin("tss/RawStreamFactory", BINARY_FACTORY, FACTORY_BINARY), /* @__PURE__ */ makeFactoryPlugin("tss/RawStreamFactoryText", TEXT_FACTORY, FACTORY_TEXT)],
  test(value) {
    return value instanceof RawStream;
  },
  parse: { stream(value, ctx) {
    const text = value.hint === "text";
    const factory = ctx.parse(text ? TEXT_FACTORY : BINARY_FACTORY);
    const [stream, stop] = pumpEncodedStream(value.stream, text ? encodeText : toBase64Fast);
    ctx.addCleanup(stop);
    return {
      factory,
      stream: ctx.parse(stream)
    };
  } },
  serialize(node, ctx) {
    return "(" + ctx.serialize(node.factory) + ")(" + ctx.serialize(node.stream) + ")";
  },
  deserialize: void 0
});
const ssrSerovalPlugins = [
  ShallowErrorPlugin,
  RawStreamSSRPlugin,
  ReadableStreamPlugin
];
function dehydrateMatch(match) {
  const dehydratedMatch = {
    i: dehydrateSsrMatchId(match.id),
    u: match.updatedAt,
    s: match.status
  };
  for (const [key, shorthand] of [
    ["__beforeLoadContext", "b"],
    ["loaderData", "l"],
    ["error", "e"],
    ["ssr", "ssr"]
  ]) if (match[key] !== void 0) dehydratedMatch[shorthand] = match[key];
  if (match._notFound) dehydratedMatch.g = true;
  return dehydratedMatch;
}
function disposeSerializationSafely(dispose) {
  try {
    dispose?.();
  } catch (err) {
    console.error("Error disposing SSR serialization:", err);
  }
}
function notifyAndClearListeners(listeners, errorMessage, arg) {
  const pending = listeners.slice();
  listeners.length = 0;
  for (const listener of pending) try {
    listener(arg);
  } catch (error) {
    console.error(errorMessage, error);
  }
}
const MANIFEST_CACHE_SIZE = 100;
const manifestCaches = /* @__PURE__ */ new WeakMap();
function getManifestCache(manifest2) {
  const cache = manifestCaches.get(manifest2);
  if (cache) return cache;
  const newCache = createSieveCache(MANIFEST_CACHE_SIZE);
  manifestCaches.set(manifest2, newCache);
  return newCache;
}
function getInlineCssForPreparedRoutes(manifest2, preparedRoutes) {
  const styles = manifest2.inlineCss?.styles;
  const hrefs = preparedRoutes.inlineCssHrefs;
  if (!styles || !hrefs?.length) return;
  let css = "";
  for (const href of hrefs) css += styles[href];
  return css;
}
function getInlineCssAssetForPreparedRoutes(manifest2, preparedRoutes) {
  const css = getInlineCssForPreparedRoutes(manifest2, preparedRoutes);
  return css === void 0 ? void 0 : createInlineCssStyleAsset(css);
}
function getMatchedRoutesCacheKey(matches) {
  let cacheKey = "";
  for (let i = 0; i < matches.length; i++) cacheKey += (i === 0 ? "" : "\0") + matches[i].routeId;
  return cacheKey;
}
function getPreparedMatchedManifestRoutes(manifest2, matches, cacheKey) {
  {
    const cached = getManifestCache(manifest2).get(cacheKey);
    if (cached) return cached;
  }
  const preparedRoutes = prepareMatchedManifestRoutes(manifest2, matches);
  getManifestCache(manifest2).set(cacheKey, preparedRoutes);
  return preparedRoutes;
}
function prepareMatchedManifestRoutes(manifest2, matches) {
  const inlineStyles = manifest2.inlineCss?.styles;
  const routes = {};
  if (!inlineStyles) {
    for (const match of matches) {
      const route = manifest2.routes[match.routeId];
      if (route) routes[match.routeId] = route;
    }
    return {
      routes,
      hasStrippedRoutes: false
    };
  }
  const inlineCssHrefs = [];
  const seenInlineCssHrefs = /* @__PURE__ */ new Set();
  let hasStrippedRoutes = false;
  for (const match of matches) {
    const routeId = match.routeId;
    const route = manifest2.routes[routeId];
    if (!route) continue;
    const nextRoute = stripInlinedStylesheetAssetsFromRoute(inlineStyles, route, inlineCssHrefs, seenInlineCssHrefs);
    if (nextRoute !== route) hasStrippedRoutes = true;
    routes[routeId] = nextRoute;
  }
  return {
    routes,
    hasStrippedRoutes,
    ...inlineCssHrefs.length ? { inlineCssHrefs } : {}
  };
}
function stripInlinedStylesheetAssetsFromRoute(inlineStyles, route, inlineCssHrefs, seenInlineCssHrefs) {
  const css = route.css;
  if (!css) return route;
  if (css.length === 0) {
    const nextRoute2 = { ...route };
    delete nextRoute2.css;
    return nextRoute2;
  }
  let cssLinks;
  for (let i = 0; i < css.length; i++) {
    const link = css[i];
    const href = getStylesheetHref(link);
    if (inlineStyles[href] === void 0) {
      if (cssLinks) cssLinks.push(link);
      continue;
    }
    if (!seenInlineCssHrefs.has(href)) {
      seenInlineCssHrefs.add(href);
      inlineCssHrefs.push(href);
    }
    if (!cssLinks) cssLinks = css.slice(0, i);
  }
  if (!cssLinks) return route;
  if (cssLinks.length > 0) return {
    ...route,
    css: cssLinks
  };
  const nextRoute = { ...route };
  delete nextRoute.css;
  return nextRoute;
}
function hasRouteAssets(route) {
  return !!route.scripts?.length || !!route.css?.length;
}
function hasRequestAssets(assets) {
  return !!assets && (!!assets.preloads?.length || hasRouteAssets(assets));
}
function mergeRequestAssetsIntoRootRoute(rootRoute, requestAssets) {
  const preloads = requestAssets?.preloads?.length ? [...requestAssets.preloads, ...rootRoute?.preloads ?? []] : rootRoute?.preloads;
  const scripts = requestAssets?.scripts?.length ? [...requestAssets.scripts, ...rootRoute?.scripts ?? []] : rootRoute?.scripts;
  const cssLinks = requestAssets?.css?.length ? [...requestAssets.css, ...rootRoute?.css ?? []] : rootRoute?.css;
  return {
    ...rootRoute ?? {},
    ...preloads?.length ? { preloads } : {},
    ...scripts?.length ? { scripts } : {},
    ...cssLinks?.length ? { css: cssLinks } : {}
  };
}
function composeManifest(scriptFormat, inlineStyle, routes, requestAssets) {
  const base = {
    ...scriptFormat ? { scriptFormat } : {},
    ...inlineStyle ? { inlineStyle } : {},
    routes
  };
  if (!hasRequestAssets(requestAssets)) return base;
  return {
    ...base,
    routes: {
      ...routes,
      [rootRouteId]: mergeRequestAssetsIntoRootRoute(routes[rootRouteId], requestAssets)
    }
  };
}
function attachRouterServerSsrUtils({ router, manifest: manifest2, getRequestAssets }) {
  let memoizedPreparedManifest;
  router.ssr = { get manifest() {
    if (!manifest2) return manifest2;
    const requestAssets = getRequestAssets?.();
    const hasAssets = hasRequestAssets(requestAssets);
    if (!hasAssets && !manifest2.inlineCss) return manifest2;
    let inlineCssAsset;
    let routes = manifest2.routes;
    if (manifest2.inlineCss) {
      const matches = _getRenderedMatches(router.stores.matches.get());
      const cacheKey = getMatchedRoutesCacheKey(matches);
      if (memoizedPreparedManifest?.cacheKey === cacheKey) {
        inlineCssAsset = memoizedPreparedManifest.inlineCssAsset;
        routes = memoizedPreparedManifest.routes;
      } else {
        const preparedManifest = getPreparedMatchedManifestRoutes(manifest2, matches, cacheKey);
        inlineCssAsset = getInlineCssAssetForPreparedRoutes(manifest2, preparedManifest);
        if (preparedManifest.hasStrippedRoutes) routes = {
          ...manifest2.routes,
          ...preparedManifest.routes
        };
        memoizedPreparedManifest = {
          cacheKey,
          inlineCssAsset,
          routes
        };
      }
    }
    return composeManifest(manifest2.scriptFormat, inlineCssAsset, routes, hasAssets ? requestAssets : void 0);
  } };
  let dehydrationPhase = "idle";
  let renderFinished = false;
  const renderFinishedListeners = [];
  const cleanupListeners = [];
  let cleanupStarted = false;
  let settled = false;
  let disposeSerialization;
  const hydrationScripts = createHydrationScripts(router.options.ssr?.nonce);
  const serverSsr = {
    hydrationScripts,
    dehydrate: async (opts) => {
      if (dehydrationPhase !== "idle") {
        invariant();
      }
      opts?.signal?.throwIfAborted();
      dehydrationPhase = "started";
      let matchesToDehydrate = _getRenderedMatches(router.stores.matches.get());
      if (router.isShell()) matchesToDehydrate = matchesToDehydrate.slice(0, 1);
      const matches = matchesToDehydrate.map(dehydrateMatch);
      let manifestToDehydrate = void 0;
      if (manifest2) {
        const cacheKey = getMatchedRoutesCacheKey(matchesToDehydrate);
        const preparedManifest = getPreparedMatchedManifestRoutes(manifest2, matchesToDehydrate, cacheKey);
        manifestToDehydrate = composeManifest(manifest2.scriptFormat, preparedManifest.inlineCssHrefs ? createInlineCssPlaceholderAsset() : void 0, preparedManifest.routes, opts?.requestAssets);
      }
      const dehydratedRouter = {
        manifest: manifestToDehydrate,
        matches
      };
      const dehydrate = router.options.dehydrate;
      const dehydratedData = dehydrate ? opts?.signal ? await waitForReason(dehydrate.call(router.options), opts.signal) : await dehydrate.call(router.options) : void 0;
      opts?.signal?.throwIfAborted();
      if (cleanupStarted) return;
      if (dehydratedData !== void 0) dehydratedRouter.dehydratedData = dehydratedData;
      const trackPlugins = { didRun: false };
      const serializationAdapters = router.options.serializationAdapters;
      const plugins = serializationAdapters ? [...serializationAdapters.map((adapter) => /* @__PURE__ */ makeSsrSerovalPlugin(adapter, trackPlugins)), ...ssrSerovalPlugins] : ssrSerovalPlugins;
      let serializationCompleteSignaled = false;
      let initialSerialized = false;
      const completeScriptSerialization = (result) => {
        if (serializationCompleteSignaled || cleanupStarted) return;
        serializationCompleteSignaled = true;
        const dispose2 = disposeSerialization;
        disposeSerialization = void 0;
        if (result === true) {
          settled = true;
          hydrationScripts.finish();
        } else if (result) hydrationScripts.fail(result.error);
        if (dispose2) queueMicrotask(() => disposeSerializationSafely(dispose2));
      };
      let synchronousFailure;
      const dispose = crossSerializeStream(dehydratedRouter, {
        refs: /* @__PURE__ */ new Map(),
        plugins,
        onSerialize: (data, initial) => {
          if (serializationCompleteSignaled || cleanupStarted) return;
          initialSerialized ||= initial;
          if (!hydrationScripts.pushSerializedSource(data, initial, trackPlugins.didRun)) completeScriptSerialization(false);
        },
        onError: (err) => {
          if (serializationCompleteSignaled || cleanupStarted) return;
          console.error("Serialization error:", err);
          synchronousFailure = { error: err };
          completeScriptSerialization({ error: err });
        },
        scopeId: "tsr",
        onDone: () => {
          if (initialSerialized) completeScriptSerialization(true);
        }
      });
      if (cleanupStarted || serializationCompleteSignaled) disposeSerializationSafely(dispose);
      else disposeSerialization = dispose;
      if (synchronousFailure) throw synchronousFailure.error;
    },
    onRenderFinished: (listener) => {
      if (cleanupStarted) return;
      if (renderFinished) {
        try {
          listener();
        } catch (error) {
          console.error("Error in render finished listener:", error);
        }
        return;
      }
      renderFinishedListeners.push(listener);
    },
    onCleanup: (listener) => {
      if (cleanupStarted) {
        try {
          listener(settled);
        } catch (error) {
          console.error("Error in SSR cleanup listener:", error);
        }
        return;
      }
      cleanupListeners.push(listener);
    },
    setRenderFinished: () => {
      if (cleanupStarted || renderFinished) return;
      renderFinished = true;
      hydrationScripts.liftBarrier();
      notifyAndClearListeners(renderFinishedListeners, "Error in render finished listener:", void 0);
    },
    disableHydration: () => {
      if (cleanupStarted || dehydrationPhase === "disabled") return;
      if (dehydrationPhase !== "idle") {
        invariant();
      }
      hydrationScripts.disableHydration();
      dehydrationPhase = "disabled";
    },
    takeInitialHydrationScriptTags: hydrationScripts.takeInitialHydrationScriptTags,
    cleanup() {
      if (cleanupStarted) return;
      cleanupStarted = true;
      hydrationScripts.cleanup();
      const dispose = disposeSerialization;
      disposeSerialization = void 0;
      disposeSerializationSafely(dispose);
      notifyAndClearListeners(cleanupListeners, "Error in SSR cleanup listener:", settled);
      renderFinishedListeners.length = 0;
      router.ssr = void 0;
      router.serverSsr = void 0;
    }
  };
  router.serverSsr = serverSsr;
  for (const listener of router.serverSsrLifecycle?.onServerSsrAttach ?? []) try {
    listener(serverSsr);
  } catch (err) {
    console.error("SSR attach listener error:", err);
  }
}
function getNormalizedURL(url, base) {
  if (typeof url === "string") url = url.replace("\\", "%5C");
  const rawUrl = new URL(url, base);
  const handledProtocolRelativeURL = rawUrl.pathname.startsWith("//");
  const decodedPathname = decodePath(handledProtocolRelativeURL ? rawUrl.pathname.replace(/^\/+/, "/") : rawUrl.pathname);
  const searchParams = new URLSearchParams(rawUrl.search);
  const normalizedHref = decodedPathname + (searchParams.size > 0 ? "?" : "") + searchParams.toString() + rawUrl.hash;
  return {
    url: new URL(normalizedHref, rawUrl.origin),
    handledProtocolRelativeURL
  };
}
function isSsrResponse(value) {
  if (typeof value !== "object" || value === null || !("response" in value) || !(value.response instanceof Response) || !("serverSsrCleanup" in value)) return false;
  if (value.serverSsrCleanup === "none") return true;
  return value.serverSsrCleanup === "stream" && "dispose" in value && typeof value.dispose === "function";
}
function normalizeSsrResponse(result) {
  if (result instanceof Response) return {
    response: result,
    serverSsrCleanup: "none"
  };
  if (isSsrResponse(result)) return result;
  throw new TypeError("Expected a Response from the SSR handler");
}
function cancelResponseBody(response, reason) {
  const body = response.body;
  if (!body) return;
  body.cancel(reason).catch(console.error);
}
function disposeSsrResponse(result, reason) {
  const response = normalizeSsrResponse(result);
  if (response.serverSsrCleanup === "stream") response.dispose(reason);
  else cancelResponseBody(response.response, reason);
}
function bindSsrResponseToRequest(router, result, signal) {
  const ssrResponse = normalizeSsrResponse(result);
  if (ssrResponse.serverSsrCleanup !== "stream") {
    if (signal.aborted) disposeSsrResponse(result, signal.reason);
    return ssrResponse;
  }
  const abort = () => {
    disposeSsrResponse(ssrResponse, signal.reason);
  };
  if (signal.aborted) {
    abort();
    return ssrResponse;
  }
  const serverSsr = router?.serverSsr;
  if (serverSsr?.hydrationScripts.requestSignal === signal) {
    serverSsr.onCleanup(() => {
      if (signal.aborted) abort();
    });
    return ssrResponse;
  }
  signal.addEventListener("abort", abort, { once: true });
  if (!serverSsr) return ssrResponse;
  serverSsr.onCleanup(() => {
    signal.removeEventListener("abort", abort);
  });
  return ssrResponse;
}
function replaceSsrResponse(result, response, reason) {
  disposeSsrResponse(result, reason);
  return {
    response,
    serverSsrCleanup: "none"
  };
}
function stripSsrResponseBody(result, reason) {
  const ssrResponse = normalizeSsrResponse(result);
  disposeSsrResponse(ssrResponse, reason);
  return {
    response: new Response(null, ssrResponse.response),
    serverSsrCleanup: "none"
  };
}
var serovalPlugins = void 0;
var FORM_DATA_CONTENT_TYPES = ["multipart/form-data", "application/x-www-form-urlencoded"];
var MAX_PAYLOAD_SIZE = 1e6;
var MAX_PENDING_SERIALIZATION_RECORDS = 1024;
var MAX_PENDING_SERIALIZATION_BYTES = 33554432;
var textEncoder = new TextEncoder();
function encodeSerializationRecord(value) {
  return textEncoder.encode(JSON.stringify(value));
}
function exceedsPendingSerializationLimit(record, recordCount, pendingBytes) {
  return recordCount >= MAX_PENDING_SERIALIZATION_RECORDS || pendingBytes + record.byteLength > MAX_PENDING_SERIALIZATION_BYTES;
}
function runSerializationCleanup(dispose) {
  try {
    dispose();
  } catch {
  }
}
function cancelRawStream(stream, reason) {
  stream.cancel(reason).catch(() => {
  });
}
var handleServerAction = async ({ request, context, serverFnId }) => {
  const methodUpper = request.method.toUpperCase();
  const url = new URL(request.url);
  const action = await getServerFnById(serverFnId);
  if (action.method && methodUpper !== action.method) return new Response(`expected ${action.method} method. Got ${methodUpper}`, {
    status: 405,
    headers: { Allow: action.method }
  });
  const isServerFn = request.headers.get("x-tsr-serverFn") === "true";
  serovalPlugins ??= getSerovalPlugins(defaultSerovalDeserializerPlugins);
  const contentType = request.headers.get("Content-Type");
  try {
    let res;
    if (FORM_DATA_CONTENT_TYPES.some((type) => contentType && contentType.includes(type))) {
      if (methodUpper === "GET") {
        if (false) ;
        invariant();
      }
      const formData = await request.formData();
      const serializedContext = formData.get(TSS_FORMDATA_CONTEXT);
      formData.delete(TSS_FORMDATA_CONTEXT);
      const params = {
        context,
        data: formData,
        method: methodUpper
      };
      if (typeof serializedContext === "string") try {
        const parsedContext = JSON.parse(serializedContext);
        const deserializedContext = fromJSON(parsedContext, { plugins: serovalPlugins });
        if (typeof deserializedContext === "object" && deserializedContext) params.context = safeObjectMerge(deserializedContext, context);
      } catch (e) {
        if (false) ;
      }
      res = await action(params);
    } else if (methodUpper === "GET") {
      const payloadParam = url.searchParams.get("payload");
      if (payloadParam && payloadParam.length > MAX_PAYLOAD_SIZE) throw new Error("Payload too large");
      const payload = payloadParam ? fromJSON(JSON.parse(payloadParam), { plugins: serovalPlugins }) : void 0;
      res = await action({
        data: payload?.data,
        context: safeObjectMerge(payload?.context, context),
        method: methodUpper
      });
    } else {
      const payload = contentType?.includes("application/json") ? fromJSON(await request.json(), { plugins: serovalPlugins }) : void 0;
      res = await action({
        data: payload?.data,
        context: safeObjectMerge(payload?.context, context),
        method: methodUpper
      });
    }
    const unwrapped = res.error !== void 0 ? res.error : res.result;
    if (isNotFound(res)) res = isNotFoundResponse(res);
    if (!isServerFn && (unwrapped instanceof Response || unwrapped === null || typeof unwrapped !== "object")) return unwrapped;
    if (unwrapped instanceof Response) {
      if (isRedirect(unwrapped)) return unwrapped;
      unwrapped.headers.set(X_TSS_RAW_RESPONSE, "true");
      return unwrapped;
    }
    return serializeResult(res, request.signal, serovalPlugins);
  } catch (error) {
    if (error instanceof Response) return error;
    if (isNotFound(error)) return isNotFoundResponse(error);
    console.error("Server Fn Error!", error);
    const serializedError = JSON.stringify(await toCrossJSONAsync(error, {
      refs: /* @__PURE__ */ new Map(),
      plugins: serovalPlugins
    }));
    const response = getResponse();
    const headers = {
      "Content-Type": "application/json",
      [X_TSS_SERIALIZED]: "true"
    };
    try {
      return new Response(serializedError, {
        status: response.status ?? 500,
        statusText: response.statusText,
        headers
      });
    } catch {
      return new Response(serializedError, {
        status: 500,
        statusText: "",
        headers
      });
    }
  }
};
function serializeResult(res, signal, plugins) {
  const alsResponse = getResponse();
  const initialRecords = [];
  let initialBytes = 0;
  const pendingRawStreams = [];
  let done = false;
  let initialParsed = false;
  let serializationFailure;
  let disposeSerialization;
  let onParse = (value, initial) => {
    if (serializationFailure) return;
    initialParsed ||= initial;
    const record = encodeSerializationRecord(value);
    if (exceedsPendingSerializationLimit(record, initialRecords.length, initialBytes)) {
      serializationFailure = [/* @__PURE__ */ new Error("Server function serialization exceeded its pending output limit")];
      return;
    }
    initialRecords.push(record);
    initialBytes += record.byteLength;
  };
  let onDone = () => {
    if (initialParsed) done = true;
  };
  let onError = (error) => {
    serializationFailure ??= [error];
  };
  const rawStreamPlugin = /* @__PURE__ */ createRawStreamRPCPlugin((id, stream) => {
    if (serializationFailure) {
      cancelRawStream(stream, serializationFailure[0]);
      return;
    }
    if (id > MAX_FRAMED_STREAMS) {
      const error = /* @__PURE__ */ new Error(`Too many raw streams in framed response (max ${MAX_FRAMED_STREAMS})`);
      cancelRawStream(stream, error);
      onError(error);
      return;
    }
    pendingRawStreams.push({
      id,
      stream
    });
  });
  const dispose = toCrossJSONStream(res, {
    refs: /* @__PURE__ */ new Map(),
    plugins: [rawStreamPlugin, ...plugins],
    onParse(value, initial) {
      onParse(value, initial);
    },
    onDone() {
      onDone();
    },
    onError: (error) => {
      onError(error);
    }
  });
  if (serializationFailure) {
    runSerializationCleanup(dispose);
    for (const registration of pendingRawStreams) cancelRawStream(registration.stream, serializationFailure[0]);
    throw serializationFailure[0];
  }
  if (!done) disposeSerialization = dispose;
  if (done && pendingRawStreams.length === 0 && initialRecords.length === 1) return new Response(initialRecords[0], {
    status: alsResponse.status,
    statusText: alsResponse.statusText,
    headers: {
      "Content-Type": "application/json",
      [X_TSS_SERIALIZED]: "true"
    }
  });
  if (done && initialRecords.length === 1) {
    const json = initialRecords[0];
    if (json.byteLength > MAX_FRAME_PAYLOAD_SIZE) {
      const error = /* @__PURE__ */ new Error("Server function serialization exceeded its pending output limit");
      for (const registration of pendingRawStreams) cancelRawStream(registration.stream, error);
      throw error;
    }
    const rawStreams = pendingRawStreams.splice(0);
    initialRecords.length = 0;
    return createFramedResponse(new ReadableStream({
      start(controller) {
        controller.enqueue({
          json,
          rawStreams
        });
        controller.close();
      },
      cancel(reason) {
        for (const registration of rawStreams) cancelRawStream(registration.stream, reason);
      }
    }), { signal });
  }
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const recordAbortController = new AbortController();
  let pendingBytes = 0;
  const pendingRecords = /* @__PURE__ */ new Set();
  const abortRecordStream = (error) => {
    if (serializationFailure) return;
    serializationFailure = [error];
    const disposeCurrentSerialization = disposeSerialization;
    disposeSerialization = void 0;
    for (const registration of pendingRawStreams.splice(0)) cancelRawStream(registration.stream, error);
    for (const record of pendingRecords) for (const registration of record.rawStreams) cancelRawStream(registration.stream, error);
    pendingRecords.clear();
    recordAbortController.abort(error);
    writer.abort(error).catch(() => {
    });
    if (disposeCurrentSerialization) runSerializationCleanup(disposeCurrentSerialization);
  };
  const writeRecord = (json, rawStreams) => {
    if (serializationFailure) {
      for (const registration of rawStreams) cancelRawStream(registration.stream, serializationFailure[0]);
      return false;
    }
    if (json.byteLength > MAX_FRAME_PAYLOAD_SIZE || exceedsPendingSerializationLimit(json, pendingRecords.size, pendingBytes)) {
      const error = /* @__PURE__ */ new Error("Server function serialization exceeded its pending output limit");
      for (const registration of rawStreams) cancelRawStream(registration.stream, error);
      onError(error);
      return false;
    }
    pendingBytes += json.byteLength;
    const record = {
      json,
      rawStreams
    };
    pendingRecords.add(record);
    writer.write(record).then(() => {
      pendingRecords.delete(record);
      pendingBytes -= json.byteLength;
    }, (error) => {
      const stillOwned = pendingRecords.delete(record);
      pendingBytes -= json.byteLength;
      if (stillOwned) for (const registration of rawStreams) cancelRawStream(registration.stream, error);
    });
    return true;
  };
  onParse = (value) => {
    if (serializationFailure) return;
    writeRecord(encodeSerializationRecord(value), pendingRawStreams.splice(0));
  };
  onDone = () => {
    if (serializationFailure) return;
    disposeSerialization = void 0;
    writer.close().catch(() => {
    });
  };
  onError = (error) => {
    abortRecordStream(error);
  };
  const initialRawStreams = pendingRawStreams.splice(0);
  for (let index = 0; index < initialRecords.length; index++) {
    const isLast = index === initialRecords.length - 1;
    if (!writeRecord(initialRecords[index], isLast ? initialRawStreams : [])) {
      if (!isLast) for (const registration of initialRawStreams) cancelRawStream(registration.stream, serializationFailure[0]);
      initialRecords.length = 0;
      throw serializationFailure[0];
    }
  }
  initialRecords.length = 0;
  if (done) onDone();
  writer.closed.catch((error) => {
    abortRecordStream(error);
  });
  return createFramedResponse(readable, {
    signal: AbortSignal.any([recordAbortController.signal, signal]),
    onCancel: abortRecordStream
  });
  function createFramedResponse(records, options) {
    const multiplexedStream = createMultiplexedStream(records, options);
    try {
      return new Response(multiplexedStream, {
        status: alsResponse.status,
        statusText: alsResponse.statusText,
        headers: {
          "Content-Type": TSS_CONTENT_TYPE_FRAMED_VERSIONED,
          [X_TSS_SERIALIZED]: "true"
        }
      });
    } catch (error) {
      cancelRawStream(multiplexedStream, error);
      throw error;
    }
  }
}
function isNotFoundResponse(error) {
  const { headers, ...rest } = error;
  const response = new Response(JSON.stringify(rest), {
    status: 404,
    headers
  });
  response.headers.set("Content-Type", "application/json");
  return response;
}
var LINK_PARAM_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
var PRELOAD_AS_VALUES = /* @__PURE__ */ new Set([
  "fetch",
  "font",
  "image",
  "script",
  "style",
  "track"
]);
function buildLinkParam(name, value) {
  if (value === void 0) return name;
  if (LINK_PARAM_TOKEN_RE.test(value)) return `${name}=${value}`;
  return `${name}=${JSON.stringify(value)}`;
}
function serializeEarlyHint(hint) {
  const parts = [`<${hint.href}>`, buildLinkParam("rel", hint.rel)];
  if (hint.as) parts.push(buildLinkParam("as", hint.as));
  if (hint.crossOrigin !== void 0) parts.push(buildLinkParam("crossorigin", hint.crossOrigin || void 0));
  if (hint.type) parts.push(buildLinkParam("type", hint.type));
  if (hint.integrity) parts.push(buildLinkParam("integrity", hint.integrity));
  if (hint.referrerPolicy) parts.push(buildLinkParam("referrerpolicy", hint.referrerPolicy));
  if (hint.fetchPriority) parts.push(buildLinkParam("fetchpriority", hint.fetchPriority));
  return parts.join("; ");
}
function getStringAttr(attrs, name, fallbackName) {
  const value = attrs?.[name] ?? (fallbackName ? attrs?.[fallbackName] : void 0);
  return typeof value === "string" ? value : void 0;
}
function getPreloadAs(attrs) {
  const as = getStringAttr(attrs, "as");
  return as && PRELOAD_AS_VALUES.has(as) ? as : void 0;
}
function addEarlyHintFetchAttrs(hint, attrs) {
  const crossOrigin = getStringAttr(attrs, "crossOrigin", "crossorigin");
  const type = getStringAttr(attrs, "type");
  const integrity = getStringAttr(attrs, "integrity");
  const referrerPolicy = getStringAttr(attrs, "referrerPolicy", "referrerpolicy");
  const fetchPriority = getStringAttr(attrs, "fetchPriority", "fetchpriority");
  if (crossOrigin !== void 0) hint.crossOrigin = crossOrigin;
  if (type) hint.type = type;
  if (integrity) hint.integrity = integrity;
  if (referrerPolicy) hint.referrerPolicy = referrerPolicy;
  if (fetchPriority) hint.fetchPriority = fetchPriority;
}
function linkAttrsToEarlyHint(attrs) {
  const href = getStringAttr(attrs, "href");
  const rel = getStringAttr(attrs, "rel");
  if (!href || !rel) return void 0;
  const relTokens = rel.split(/\s+/);
  let hintRel;
  let hintAs;
  if (relTokens.includes("modulepreload")) {
    hintRel = "modulepreload";
    hintAs = "script";
  } else if (relTokens.includes("stylesheet")) {
    hintRel = "preload";
    hintAs = "style";
  } else if (relTokens.includes("preload")) {
    hintAs = getPreloadAs(attrs);
    if (!hintAs) return void 0;
    hintRel = "preload";
  } else if (relTokens.includes("preconnect")) {
    hintRel = "preconnect";
    hintAs = void 0;
  } else if (relTokens.includes("dns-prefetch")) {
    hintRel = "dns-prefetch";
    hintAs = void 0;
  }
  if (!hintRel) return void 0;
  const hint = {
    href,
    rel: hintRel
  };
  if (hintAs) hint.as = hintAs;
  addEarlyHintFetchAttrs(hint, attrs);
  return hint;
}
function collectStaticHintsFromManifest(manifest2, matchedRoutes) {
  const hints = [];
  for (const route of matchedRoutes) {
    const routeManifest = manifest2.routes[route.id];
    if (!routeManifest) continue;
    for (const link of routeManifest.preloads ?? []) {
      const attrs = getScriptPreloadAttrs(manifest2, link);
      const hint = {
        href: attrs.href,
        rel: attrs.rel,
        as: "script"
      };
      if (attrs.crossOrigin !== void 0) hint.crossOrigin = attrs.crossOrigin;
      hints.push(hint);
    }
    for (const link of routeManifest.css ?? []) {
      const stylesheetHref = getStylesheetHref(link);
      if (manifest2.inlineCss?.styles[stylesheetHref] !== void 0) continue;
      const resolvedLink = resolveManifestCssLink(link);
      const hint = {
        href: stylesheetHref,
        rel: "preload",
        as: "style"
      };
      if (resolvedLink.crossOrigin !== void 0) hint.crossOrigin = resolvedLink.crossOrigin;
      hints.push(hint);
    }
  }
  return hints;
}
function collectDynamicHintsFromMatches(matches) {
  const hints = [];
  for (const match of matches) {
    const links = match.links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      const hint = linkAttrsToEarlyHint(link);
      if (hint) hints.push(hint);
    }
  }
  return hints;
}
function createEarlyHintsEvent(opts) {
  const nextHints = [];
  const nextLinks = [];
  for (const hint of opts.hints) {
    const link = serializeEarlyHint(hint);
    if (opts.sentLinks.has(link)) continue;
    opts.sentLinks.add(link);
    opts.sentHints.push(hint);
    nextHints.push(hint);
    nextLinks.push(link);
  }
  if (!nextHints.length && opts.phase !== "dynamic") return void 0;
  return {
    phase: opts.phase,
    hints: nextHints,
    links: nextLinks,
    allHints: opts.sentHints.slice(),
    allLinks: Array.from(opts.sentLinks)
  };
}
function createResponseLinkHeaderEntries(opts) {
  for (const hint of opts.hints) {
    const link = serializeEarlyHint(hint);
    if (opts.sentLinks.has(link)) continue;
    opts.sentLinks.add(link);
    opts.entries.push({
      phase: opts.phase,
      hint,
      link
    });
  }
}
function getResponseLinkHeaderEntries(opts) {
  if (!opts.filter) return opts.entries.map((entry) => entry.link);
  try {
    const links = [];
    for (const entry of opts.entries) if (opts.filter(entry)) links.push(entry.link);
    return links;
  } catch (err) {
    console.error("Error filtering response Link headers:", err);
    return [];
  }
}
function notifyEarlyHints(phase, event, onEarlyHints) {
  try {
    const result = onEarlyHints(event);
    if (result) Promise.resolve(result).catch((err) => {
      console.error(`Error sending ${phase} early hints:`, err);
    });
  } catch (err) {
    console.error(`Error sending ${phase} early hints:`, err);
  }
}
function getResponseLinkHeaderFilter(responseLinkHeader) {
  if (typeof responseLinkHeader !== "object") return;
  return responseLinkHeader.filter;
}
function appendResponseLinkHeaders(opts) {
  for (const link of getResponseLinkHeaderEntries(opts)) opts.responseHeaders.append("Link", link);
}
function collectResponseLinkHeaderEntries(opts) {
  for (let index = 0; index < opts.event.hints.length; index++) opts.entries.push({
    phase: opts.phase,
    hint: opts.event.hints[index],
    link: opts.event.links[index]
  });
}
function collectEarlyHintsPhase(opts) {
  const event = opts.onEarlyHints ? createEarlyHintsEvent({
    phase: opts.phase,
    hints: opts.hints,
    sentLinks: opts.sentLinks,
    sentHints: opts.sentHints
  }) : void 0;
  if (event) notifyEarlyHints(opts.phase, event, opts.onEarlyHints);
  if (!opts.responseLinkHeaderEntries) return;
  if (event) {
    collectResponseLinkHeaderEntries({
      phase: opts.phase,
      event,
      entries: opts.responseLinkHeaderEntries
    });
    return;
  }
  createResponseLinkHeaderEntries({
    phase: opts.phase,
    hints: opts.hints,
    sentLinks: opts.sentLinks,
    entries: opts.responseLinkHeaderEntries
  });
}
function createEarlyHintsCollector(opts) {
  if (!opts?.onEarlyHints && !opts?.responseLinkHeader) return;
  const sentLinks = /* @__PURE__ */ new Set();
  const sentHints = opts.onEarlyHints ? new Array() : void 0;
  const responseLinkHeaderEntries = opts.responseLinkHeader ? new Array() : void 0;
  const responseLinkHeaderFilter = getResponseLinkHeaderFilter(opts.responseLinkHeader);
  return {
    collectStatic: ({ manifest: manifest2, matchedRoutes }) => {
      if (!matchedRoutes?.length) return;
      collectEarlyHintsPhase({
        phase: "static",
        hints: collectStaticHintsFromManifest(manifest2, matchedRoutes),
        sentLinks,
        sentHints,
        onEarlyHints: opts.onEarlyHints,
        responseLinkHeaderEntries
      });
    },
    collectDynamic: (matches) => {
      collectEarlyHintsPhase({
        phase: "dynamic",
        hints: collectDynamicHintsFromMatches(matches),
        sentLinks,
        sentHints,
        onEarlyHints: opts.onEarlyHints,
        responseLinkHeaderEntries
      });
    },
    appendResponseHeaders: (headers) => {
      if (!responseLinkHeaderEntries?.length) return;
      appendResponseLinkHeaders({
        responseHeaders: headers,
        entries: responseLinkHeaderEntries,
        filter: responseLinkHeaderFilter
      });
    }
  };
}
function normalizeTransformAssetResult(result) {
  if (typeof result === "string") return { href: result };
  return result;
}
function escapeCssString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ").replace(/\r/g, "\\d ").replace(/\f/g, "\\c ");
}
async function transformInlineCssTemplate(options) {
  const { strings, urls } = options.template;
  if (strings.length !== urls.length + 1) throw new Error(`TanStack Start inlineCss template for ${options.stylesheetHref} is invalid`);
  let css = strings[0];
  for (let index = 0; index < urls.length; index++) {
    const transformed = normalizeTransformAssetResult(await options.transformFn({
      kind: "css-url",
      url: urls[index],
      stylesheetHref: options.stylesheetHref
    }));
    css += escapeCssString(transformed.href) + strings[index + 1];
  }
  return css;
}
async function transformInlineCssStyles(inlineCss, transformFn) {
  const transformedStyles = {};
  const transformedEntries = await Promise.all(Object.entries(inlineCss.styles).map(async ([stylesheetHref, css]) => {
    const template = inlineCss.templates?.[stylesheetHref];
    return [stylesheetHref, template ? await transformInlineCssTemplate({
      stylesheetHref,
      template,
      transformFn
    }) : css];
  }));
  for (const [stylesheetHref, css] of transformedEntries) transformedStyles[stylesheetHref] = css;
  return {
    styles: transformedStyles,
    ...inlineCss.templates ? { templates: inlineCss.templates } : {}
  };
}
function resolveTransformAssetsCrossOrigin(config, kind) {
  if (!config) return void 0;
  if (typeof config === "string") return config;
  return config[kind];
}
function isObjectShorthand(transform) {
  return "prefix" in transform;
}
function resolveTransformAssetsConfig(transform) {
  if (typeof transform === "string") {
    const prefix = transform;
    return {
      type: "transform",
      transformFn: ({ url }) => ({ href: `${prefix}${url}` }),
      cache: true
    };
  }
  if (typeof transform === "function") return {
    type: "transform",
    transformFn: transform,
    cache: true
  };
  if (isObjectShorthand(transform)) {
    const { prefix, crossOrigin } = transform;
    return {
      type: "transform",
      transformFn: ({ url, kind }) => {
        const href = `${prefix}${url}`;
        if (kind === "css-url") return { href };
        const co = resolveTransformAssetsCrossOrigin(crossOrigin, kind);
        return co ? {
          href,
          crossOrigin: co
        } : { href };
      },
      cache: true
    };
  }
  if ("createTransform" in transform && transform.createTransform) return {
    type: "createTransform",
    createTransform: transform.createTransform,
    cache: transform.cache !== false
  };
  return {
    type: "transform",
    transformFn: typeof transform.transform === "string" ? (({ url }) => ({ href: `${transform.transform}${url}` })) : transform.transform,
    cache: transform.cache !== false
  };
}
function assignManifestLink(link, next) {
  if (typeof link === "string") return next.crossOrigin ? next : next.href;
  const nextLink = {
    ...link,
    href: next.href
  };
  if (next.crossOrigin) nextLink.crossOrigin = next.crossOrigin;
  else delete nextLink.crossOrigin;
  return nextLink;
}
async function transformManifestAssets(source, transformFn, _opts) {
  const manifest2 = structuredClone(source);
  const inlineCssEnabled = _opts?.inlineCss !== false;
  const scriptTransforms = /* @__PURE__ */ new Map();
  const transformScript = (url) => {
    const cached = scriptTransforms.get(url);
    if (cached) return cached;
    const transformed = Promise.resolve(transformFn({
      url,
      kind: "script"
    })).then(normalizeTransformAssetResult);
    scriptTransforms.set(url, transformed);
    return transformed;
  };
  if (!inlineCssEnabled) delete manifest2.inlineCss;
  else if (manifest2.inlineCss) manifest2.inlineCss = await transformInlineCssStyles(manifest2.inlineCss, transformFn);
  for (const route of Object.values(manifest2.routes)) {
    if (route.preloads?.length) route.preloads = await Promise.all(route.preloads.map(async (link) => {
      const resolved = resolveManifestAssetLink(link);
      const result = await transformScript(resolved.href);
      return assignManifestLink(link, {
        href: result.href,
        crossOrigin: result.crossOrigin
      });
    }));
    if (route.css?.length && !manifest2.inlineCss) route.css = await Promise.all(route.css.map(async (link) => {
      const result = normalizeTransformAssetResult(await transformFn({
        url: resolveManifestCssLink(link).href,
        kind: "stylesheet"
      }));
      return assignManifestLink(link, {
        href: result.href,
        crossOrigin: result.crossOrigin
      });
    }));
    if (route.scripts?.length) for (const script of route.scripts) {
      const src = script.attrs?.src;
      if (typeof src !== "string") continue;
      const result = await transformScript(src);
      script.attrs = {
        ...script.attrs,
        src: result.href
      };
      if (result.crossOrigin) script.attrs.crossOrigin = result.crossOrigin;
      else delete script.attrs.crossOrigin;
    }
  }
  return manifest2;
}
function buildManifest(source, opts) {
  return {
    ...source.scriptFormat ? { scriptFormat: source.scriptFormat } : {},
    ...opts?.inlineCss !== false && source.inlineCss ? { inlineCss: structuredClone(source.inlineCss) } : {},
    routes: { ...source.routes }
  };
}
function getStaticHandlerInlineCssDefault(handlerInlineCss) {
  if (typeof handlerInlineCss === "function") return;
  return handlerInlineCss ?? true;
}
async function resolveInlineCssForRequest(opts) {
  if (opts.requestInlineCss !== void 0) return opts.requestInlineCss;
  if (typeof opts.handlerInlineCss === "function") return await opts.handlerInlineCss({ request: opts.request });
  return opts.handlerInlineCss ?? true;
}
function createCachedBaseManifestLoader(loadBaseManifest) {
  let baseManifestPromise;
  return () => {
    if (!baseManifestPromise) baseManifestPromise = loadBaseManifest().catch((error) => {
      baseManifestPromise = void 0;
      throw error;
    });
    return baseManifestPromise;
  };
}
function createFinalManifestTransformResolver(transformAssets, opts) {
  const transformConfig = transformAssets !== void 0 ? resolveTransformAssetsConfig(transformAssets) : void 0;
  const cache = transformConfig ? transformConfig.cache : true;
  const warmup = !!transformAssets && typeof transformAssets === "object" && "warmup" in transformAssets && transformAssets.warmup === true;
  let cachedCreateTransformPromise;
  const clearCachedCreateTransform = () => {
    cachedCreateTransformPromise = void 0;
  };
  return {
    cache,
    warmup,
    clearCachedCreateTransform,
    getTransformFn: async (ctx) => {
      if (!transformConfig) return void 0;
      if (transformConfig.type !== "createTransform") return transformConfig.transformFn;
      if (!cache || false) return transformConfig.createTransform(ctx);
      if (!cachedCreateTransformPromise) cachedCreateTransformPromise = Promise.resolve(transformConfig.createTransform(ctx)).catch((error) => {
        clearCachedCreateTransform();
        throw error;
      });
      return cachedCreateTransformPromise;
    }
  };
}
function createFinalManifestResolver(opts) {
  const finalManifestCache = /* @__PURE__ */ new Map();
  const transformResolver = createFinalManifestTransformResolver(opts.transformAssets);
  const handlerDefaultInlineCss = getStaticHandlerInlineCssDefault(opts.inlineCss);
  const getRequestManifestOptions = async (requestOpts) => {
    const transformFn = await transformResolver.getTransformFn({
      warmup: false,
      request: requestOpts.request
    });
    const inlineCss = await resolveInlineCssForRequest({
      request: requestOpts.request,
      handlerInlineCss: opts.inlineCss,
      requestInlineCss: requestOpts.requestInlineCss
    });
    return {
      getBaseManifest: requestOpts.getBaseManifest,
      transformFn,
      cache: transformResolver.cache,
      inlineCss
    };
  };
  const resolveRequest = async (requestOpts, cache) => {
    return resolveFinalManifest({
      ...await getRequestManifestOptions(requestOpts),
      finalManifestCache: cache
    });
  };
  return {
    warmup: ({ getBaseManifest: getBaseManifest2 }) => warmupFinalManifest({
      enabled: transformResolver.warmup,
      handlerDefaultInlineCss,
      cache: transformResolver.cache,
      finalManifestCache,
      getBaseManifest: getBaseManifest2,
      getTransformFn: () => transformResolver.getTransformFn({ warmup: true }),
      onError: transformResolver.clearCachedCreateTransform
    }),
    resolveCached: (requestOpts) => resolveRequest(requestOpts, finalManifestCache),
    resolveUncached: (requestOpts) => resolveRequest(requestOpts, void 0)
  };
}
function getFinalManifestCacheKey(inlineCss) {
  return inlineCss ? "inline-css" : "linked-css";
}
function cacheFinalManifestPromise(cachedFinalManifestPromises, cacheKey, promise) {
  const cachedFinalManifestPromise = promise.catch((error) => {
    if (cachedFinalManifestPromises.get(cacheKey) === cachedFinalManifestPromise) cachedFinalManifestPromises.delete(cacheKey);
    throw error;
  });
  cachedFinalManifestPromises.set(cacheKey, cachedFinalManifestPromise);
  return cachedFinalManifestPromise;
}
function getOrCreateCachedFinalManifestPromise(cachedFinalManifestPromises, cacheKey, computeFinalManifest) {
  const cachedFinalManifestPromise = cachedFinalManifestPromises.get(cacheKey);
  if (cachedFinalManifestPromise) return cachedFinalManifestPromise;
  return cacheFinalManifestPromise(cachedFinalManifestPromises, cacheKey, Promise.resolve().then(computeFinalManifest));
}
async function buildFinalManifest(opts) {
  return opts.transformFn ? await transformManifestAssets(opts.base, opts.transformFn, { inlineCss: opts.inlineCss }) : buildManifest(opts.base, { inlineCss: opts.inlineCss });
}
async function resolveFinalManifest(opts) {
  const computeFinalManifest = async () => {
    return buildFinalManifest({
      base: await opts.getBaseManifest(),
      transformFn: opts.transformFn,
      inlineCss: opts.inlineCss
    });
  };
  if (opts.finalManifestCache && (!opts.transformFn || opts.cache)) return getOrCreateCachedFinalManifestPromise(opts.finalManifestCache, getFinalManifestCacheKey(opts.inlineCss), computeFinalManifest);
  return computeFinalManifest();
}
function warmupFinalManifest(opts) {
  if (!opts.enabled || opts.handlerDefaultInlineCss === void 0 || !opts.cache) return;
  const inlineCss = opts.handlerDefaultInlineCss;
  const warmupPromise = getOrCreateCachedFinalManifestPromise(opts.finalManifestCache, getFinalManifestCacheKey(inlineCss), async () => {
    const [base, transformFn] = await Promise.all([opts.getBaseManifest(), opts.getTransformFn()]);
    return buildFinalManifest({
      base,
      transformFn,
      inlineCss
    });
  });
  if (opts.onError) warmupPromise.catch(opts.onError);
  return warmupPromise;
}
var ServerFunctionSerializationAdapter = createSerializationAdapter({
  key: "$TSS/serverfn",
  test: (v) => {
    if (typeof v !== "function") return false;
    if (!(TSS_SERVER_FUNCTION in v)) return false;
    return !!v[TSS_SERVER_FUNCTION];
  },
  toSerializable: ({ serverFnMeta }) => ({ functionId: serverFnMeta.id }),
  fromSerializable: ({ functionId }) => {
    const fn = async (opts, signal) => {
      const serverFn = await getServerFnById(functionId);
      const result = await serverFn({
        data: opts?.data,
        context: opts?.context,
        method: serverFn.method ?? "GET"
      }, signal);
      if (result.error !== void 0) throw result.error;
      return result.result;
    };
    return fn;
  }
});
function getStartResponseHeaders(opts) {
  return mergeHeaders({ "Content-Type": "text/html; charset=utf-8" }, ..._getRenderedMatches(opts.router.stores.matches.get()).map((match) => {
    return match.headers;
  }));
}
var entriesPromise;
var hasWarnedMissingCsrfMiddleware = false;
var defaultCsrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });
var getCachedBaseManifest = createCachedBaseManifestLoader(() => getStartManifest());
var getProdBaseManifest = () => getCachedBaseManifest();
var getBaseManifest = getProdBaseManifest;
var createEarlyHintsForRequest = createEarlyHintsCollector;
async function loadEntries() {
  const [routerEntry, startEntry, pluginAdapters] = await Promise.all([
    import("./assets/router-DYWF8ya6.js").then((n) => n.aa),
    import("./assets/start-HYkvq4Ni.js"),
    import("./assets/empty-plugin-adapters-BFgPZ6_d.js")
  ]);
  return {
    routerEntry,
    startEntry,
    pluginAdapters
  };
}
function getEntries() {
  if (!entriesPromise) entriesPromise = loadEntries();
  return entriesPromise;
}
function warnMissingCsrfMiddlewareOnce() {
  if (hasWarnedMissingCsrfMiddleware) return;
  hasWarnedMissingCsrfMiddleware = true;
  console.warn(`TanStack Start server functions are not protected by the CSRF middleware.

Server functions are same-origin RPC endpoints and should be protected from cross-site requests.

Add the CSRF middleware in src/start.ts:

  const csrfMiddleware = createCsrfMiddleware({
    filter: (ctx) => ctx.handlerType === 'serverFn',
  })

  export const startInstance = createStart(() => ({
    requestMiddleware: [csrfMiddleware],
  }))

If you intentionally handle CSRF another way, disable this warning:

  tanstackStart({
    serverFns: {
      disableCsrfMiddlewareWarning: true,
    },
  })`);
}
var ROUTER_BASEPATH = "/";
var SERVER_FN_BASE = "/_serverFn/";
var IS_PRERENDERING = process.env.TSS_PRERENDERING === "true";
var IS_SHELL_ENV = process.env.TSS_SHELL === "true";
var ERR_NO_RESPONSE = "Internal Server Error";
var ERR_NO_DEFER = "Internal Server Error";
function throwRouteHandlerError() {
  throw new Error(ERR_NO_RESPONSE);
}
function throwIfMayNotDefer() {
  throw new Error(ERR_NO_DEFER);
}
function getResponseFromResult(result) {
  return isSsrResponse(result) || result instanceof Response ? result : result?.response;
}
var responseBodySources = /* @__PURE__ */ new WeakMap();
function disposeResponseResult(result, reason) {
  const response = getResponseFromResult(result);
  if (isSsrResponse(response) || response instanceof Response) disposeSsrResponse(response, reason);
}
function hasResponseBody(value) {
  return value instanceof Response && value.body !== null;
}
function inheritsResponseOwnership(ownership, candidate) {
  return hasResponseBody(candidate) && (candidate.body === ownership.response.body || responseBodySources.get(candidate) === ownership.response);
}
function disposeResponseOwnership(ownership, reason) {
  const { response, sourceBody, streamResponse } = ownership;
  streamResponse?.dispose(reason);
  if (!streamResponse || response.body !== sourceBody) response.body.cancel(reason).catch(() => {
  });
}
function getOwnedResponse(ownership) {
  const { response, sourceBody, streamResponse } = ownership;
  if (!streamResponse) return response;
  if (streamResponse.response === response && response.body === sourceBody) return streamResponse;
  if (response.body === sourceBody) return {
    ...streamResponse,
    response
  };
  return {
    ...streamResponse,
    response,
    dispose(reason) {
      disposeResponseOwnership(ownership, reason);
    }
  };
}
function createLateResponseDisposer(signal) {
  return (result) => disposeResponseResult(result, signal.reason);
}
async function executeMiddleware(middlewares, terminal, ctx, signal, terminalNext) {
  let index = -1;
  let responseOwnership;
  let settled = false;
  const disposeAbandonedResult = createLateResponseDisposer(signal);
  const setResponse = (response) => {
    const ssrResponse = isSsrResponse(response) ? response : void 0;
    const streamResponse = ssrResponse?.serverSsrCleanup === "stream" ? ssrResponse : void 0;
    const exposed = ssrResponse ? ssrResponse.response : response;
    const current = responseOwnership;
    if (settled) {
      if (exposed !== ctx.response) disposeResponseResult(response, "late middleware response");
      return;
    }
    if (current && current.response === exposed) current.streamResponse ??= streamResponse;
    else if (current && inheritsResponseOwnership(current, exposed)) {
      current.response = exposed;
      current.streamResponse ??= streamResponse;
    } else {
      if (current) disposeResponseOwnership(current, "middleware response replaced");
      if (hasResponseBody(exposed)) responseOwnership = {
        response: exposed,
        sourceBody: exposed.body,
        streamResponse
      };
      else responseOwnership = void 0;
    }
    ctx.response = exposed;
  };
  const reconcileCtxResponse = () => {
    if (ctx.response !== responseOwnership?.response) setResponse(ctx.response);
  };
  let nextPromise;
  function next(nextCtx) {
    const result = runNext(nextCtx);
    nextPromise = result;
    return result;
  }
  async function runNext(nextCtx) {
    signal.throwIfAborted();
    if (nextCtx) {
      if (nextCtx.context) ctx.context = safeObjectMerge(ctx.context, nextCtx.context);
      for (const key of Object.keys(nextCtx)) if (key === "response") setResponse(nextCtx.response);
      else if (key !== "context") ctx[key] = nextCtx[key];
    }
    index++;
    const isTerminal = index === middlewares.length;
    const middleware = index < middlewares.length ? middlewares[index] : isTerminal ? terminal : void 0;
    const middlewareNext = isTerminal && terminalNext ? terminalNext : next;
    if (!middleware) return ctx;
    let result;
    try {
      const pending = middleware({
        ...ctx,
        next: middlewareNext
      });
      if (nextPromise && pending === nextPromise) {
        nextPromise = void 0;
        await pending;
        if (signal.aborted) throw signal.reason;
        return ctx;
      } else if (!isPromise(pending)) {
        result = pending;
        signal.throwIfAborted();
      } else result = await waitForReason(pending, signal, disposeAbandonedResult, disposeAbandonedResult);
    } catch (err) {
      reconcileCtxResponse();
      if (signal.aborted) {
        if (result !== void 0) disposeAbandonedResult(result);
        if (err !== signal.reason) disposeAbandonedResult(err);
        throw signal.reason;
      }
      if (err instanceof Response) {
        setResponse(err);
        return ctx;
      }
      throw err;
    }
    if (isTerminal && terminalNext && !result) throwRouteHandlerError();
    reconcileCtxResponse();
    if (result && result !== ctx) {
      const response = getResponseFromResult(result);
      if (response !== void 0 && response !== ctx.response) setResponse(response);
      if (response !== result && result.context && result.context !== ctx.context) ctx.context = safeObjectMerge(ctx.context, result.context);
    }
    return ctx;
  }
  try {
    await runNext();
    const response = ctx.response;
    if (!response) throwRouteHandlerError();
    reconcileCtxResponse();
    if (signal.aborted) throw signal.reason;
    settled = true;
    return responseOwnership ? getOwnedResponse(responseOwnership) : response;
  } catch (err) {
    settled = true;
    if (responseOwnership) disposeResponseOwnership(responseOwnership, signal.aborted ? signal.reason : err);
    throw err;
  }
}
function createStartHandler(cbOrOptions) {
  const handlerOptions = typeof cbOrOptions === "function" ? {} : cbOrOptions;
  const cb = typeof cbOrOptions === "function" ? cbOrOptions : cbOrOptions.handler;
  const finalManifestResolver = createFinalManifestResolver({
    ...handlerOptions
  });
  const resolveManifestForRequest = finalManifestResolver.resolveCached;
  finalManifestResolver.warmup({ getBaseManifest: () => getBaseManifest() });
  const startRequestResolver = async (request, requestOpts) => {
    const signal = request.signal;
    let router;
    let routerPromise;
    let responseOwnsCleanup = false;
    try {
      signal.throwIfAborted();
      const { url, handledProtocolRelativeURL } = getNormalizedURL(request.url);
      const href = url.pathname + url.search + url.hash;
      const origin = url.origin;
      if (handledProtocolRelativeURL) return Response.redirect(url, 308);
      const entries = await waitForReason(getEntries(), signal);
      const isServerFnRequest = !!SERVER_FN_BASE && url.pathname.startsWith(SERVER_FN_BASE);
      const startInstance = entries.startEntry.startInstance;
      let startOptions;
      if (startInstance) {
        const pendingStartOptions = startInstance.getOptions();
        startOptions = isPromise(pendingStartOptions) ? await waitForReason(pendingStartOptions, signal) : pendingStartOptions;
        signal.throwIfAborted();
      } else startOptions = {};
      const { hasPluginAdapters, pluginSerializationAdapters } = entries.pluginAdapters;
      const serializationAdapters = [
        ...startOptions.serializationAdapters || [],
        ...hasPluginAdapters ? pluginSerializationAdapters : [],
        ServerFunctionSerializationAdapter
      ];
      const requestStartOptions = {
        ...startOptions,
        requestMiddleware: startInstance ? startOptions.requestMiddleware : isServerFnRequest ? [defaultCsrfMiddleware] : void 0,
        serializationAdapters
      };
      const flattenedRequestMiddlewares = requestStartOptions.requestMiddleware ? flattenMiddlewares(requestStartOptions.requestMiddleware) : [];
      const executedRequestMiddlewares = new Set(flattenedRequestMiddlewares);
      const getRouter = () => {
        routerPromise ??= (async () => {
          signal.throwIfAborted();
          const requestRouter = await waitForReason(entries.routerEntry.getRouter(), signal);
          let isShell = IS_SHELL_ENV;
          if (IS_PRERENDERING && !isShell) isShell = request.headers.get(HEADERS.TSS_SHELL) === "true";
          const history = createServerHistory(href);
          requestRouter.update({
            history,
            isShell,
            isPrerendering: IS_PRERENDERING,
            origin: requestRouter.options.origin ?? origin,
            defaultSsr: requestStartOptions.defaultSsr,
            serializationAdapters: [...requestStartOptions.serializationAdapters, ...requestRouter.options.serializationAdapters || []],
            basepath: ROUTER_BASEPATH
          });
          router = requestRouter;
          return requestRouter;
        })();
        return routerPromise;
      };
      const handlerType = isServerFnRequest ? "serverFn" : "router";
      const startContext = {
        getRouter,
        startOptions: requestStartOptions,
        request,
        executedRequestMiddlewares,
        handlerType
      };
      let terminal;
      if (isServerFnRequest) {
        if (false) ;
        const serverFnId = url.pathname.slice(SERVER_FN_BASE.length).split("/")[0];
        if (!serverFnId) throw new Error("Invalid server action param for serverFnId");
        terminal = ({ context }) => runWithStartContext({
          ...startContext,
          contextAfterGlobalMiddlewares: context
        }, () => handleServerAction({
          request,
          context: requestOpts?.context,
          serverFnId
        }));
      } else {
        const executeRouter = async (serverContext, matchedRoutes) => {
          if (!/(^|,)\s*(\*\/\*|text\/html)/.test(request.headers.get("Accept") || "*/*")) return normalizeSsrResponse(Response.json({ error: "Only HTML requests are supported here" }, { status: 406 }));
          const manifest2 = await waitForReason(resolveManifestForRequest({
            request,
            requestInlineCss: requestOpts?.inlineCss,
            getBaseManifest: () => getBaseManifest(matchedRoutes)
          }), signal);
          const earlyHints = createEarlyHintsForRequest({
            onEarlyHints: requestOpts?.onEarlyHints,
            responseLinkHeader: requestOpts?.responseLinkHeader
          });
          earlyHints?.collectStatic({
            manifest: manifest2,
            matchedRoutes
          });
          const routerInstance = await getRouter();
          attachRouterServerSsrUtils({
            router: routerInstance,
            manifest: manifest2,
            getRequestAssets: () => getStartContext({ throwIfNotFound: false })?.requestAssets
          });
          routerInstance.options.additionalContext = { serverContext };
          await routerInstance.load({ _signal: signal });
          signal.throwIfAborted();
          if (routerInstance._serverResult?.type === "redirect") return normalizeSsrResponse(routerInstance._serverResult.redirect);
          earlyHints?.collectDynamic(_getRenderedMatches(routerInstance.stores.matches.get()));
          const ctx = getStartContext({ throwIfNotFound: false });
          await routerInstance.serverSsr.dehydrate({
            requestAssets: ctx?.requestAssets,
            signal
          });
          signal.throwIfAborted();
          const responseHeaders = getStartResponseHeaders({ router: routerInstance });
          earlyHints?.appendResponseHeaders(responseHeaders);
          signal.throwIfAborted();
          const disposeLate = createLateResponseDisposer(signal);
          const response = await waitForReason(cb({
            request,
            router: routerInstance,
            responseHeaders
          }), signal, disposeLate, disposeLate);
          return normalizeSsrResponse(response);
        };
        terminal = ({ context }) => runWithStartContext({
          ...startContext,
          contextAfterGlobalMiddlewares: context
        }, () => handleServerRoutes({
          getRouter,
          request,
          url,
          executeRouter,
          context,
          executedRequestMiddlewares
        }));
      }
      const middlewareResponse = await executeMiddleware(flattenedRequestMiddlewares.map((d) => d.options.server), terminal, {
        request,
        pathname: url.pathname,
        handlerType,
        context: createNullProtoObject(requestOpts?.context)
      }, signal);
      let result;
      try {
        result = await handleRedirectResponse(middlewareResponse, getRouter, signal, isServerFnRequest && request.headers.get("x-tsr-serverFn") === "true");
        if (request.method === "HEAD") result = stripSsrResponseBody(result, "HEAD body stripped");
      } catch (error) {
        disposeResponseResult(middlewareResponse, signal.aborted ? signal.reason : error);
        throw error;
      }
      bindSsrResponseToRequest(router, result, signal);
      signal.throwIfAborted();
      responseOwnsCleanup = result.serverSsrCleanup === "stream";
      return result.response;
    } finally {
      if (router?.serverSsr && !responseOwnsCleanup) router.serverSsr.cleanup();
    }
  };
  return requestHandler(startRequestResolver);
}
var relativeRedirectProtocols = /* @__PURE__ */ new Set();
async function handleRedirectResponse(response, getRouter, signal, serializeRedirect) {
  signal.throwIfAborted();
  const ssrResponse = normalizeSsrResponse(response);
  const redirect2 = ssrResponse.response;
  if (!isRedirect(redirect2)) return ssrResponse;
  const opts = redirect2.options;
  const href = redirect2.headers.get("Location") || opts.href;
  if (!href && opts.to && typeof opts.to === "string" && !opts.to.startsWith("/")) throw new Error(`Server side redirects must use absolute paths via the 'href' or 'to' options. The redirect() method's "to" property accepts an internal path only. Use the "href" property to provide an external URL. Received: ${JSON.stringify(opts)}`);
  if (!href && [
    "params",
    "search",
    "hash"
  ].some((d) => typeof opts[d] === "function")) throw new Error(`Server side redirects must use static search, params, and hash values and do not support functional values. Received functional values for: ${Object.keys(opts).filter((d) => typeof opts[d] === "function").map((d) => `"${d}"`).join(", ")}`);
  signal.throwIfAborted();
  if (href && !isDangerousProtocol(href, relativeRedirectProtocols)) {
    opts.href = href;
    redirect2.headers.set("Location", href);
  } else {
    const router = await getRouter();
    signal.throwIfAborted();
    router.resolveRedirect(redirect2);
  }
  if (serializeRedirect) {
    const redirectOptions = { ...opts };
    delete redirectOptions.headers;
    const responseHeaders = new Headers(redirect2.headers);
    responseHeaders.set("content-type", "application/json");
    return replaceSsrResponse(ssrResponse, Response.json({
      ...redirectOptions,
      isSerializedRedirect: true
    }, { headers: responseHeaders }), "redirect response replaced");
  }
  return ssrResponse;
}
function withParsedParams(handler, matchedRoutes) {
  if (!matchedRoutes.some((route) => route.options.params?.parse ?? route.options.parseParams)) return handler;
  return (ctx) => {
    const params = Object.assign(/* @__PURE__ */ Object.create(null), ctx.params);
    for (const route of matchedRoutes) {
      const parse = route.options.params?.parse ?? route.options.parseParams;
      if (parse) Object.assign(params, parse(params));
    }
    return handler({
      ...ctx,
      params
    });
  };
}
async function handleServerRoutes({ getRouter, request, url, executeRouter, context, executedRequestMiddlewares }) {
  const router = await getRouter();
  const pathname = executeRewriteInput(router.rewrite, url).pathname;
  const [matchedRoutes, rawParams, foundRoute] = router.getMatchedRoutes(pathname);
  const isExactMatch = foundRoute && rawParams["**"] === void 0;
  const routeMiddlewares = [];
  let terminalHandler = (ctx) => executeRouter(ctx.context, matchedRoutes);
  let terminalNext;
  for (const route of matchedRoutes) {
    const serverMiddleware = route.options.server?.middleware;
    if (serverMiddleware) {
      const flattened = flattenMiddlewares(serverMiddleware);
      for (const m of flattened) if (!executedRequestMiddlewares.has(m)) routeMiddlewares.push(m.options.server);
    }
  }
  const server2 = foundRoute?.options.server;
  if (server2?.handlers && isExactMatch) {
    const handlers = typeof server2.handlers === "function" ? server2.handlers({ createHandlers: (d) => d }) : server2.handlers;
    const requestMethod = request.method.toUpperCase();
    const handler = requestMethod === "HEAD" ? handlers["HEAD"] ?? handlers["GET"] ?? handlers["ANY"] : handlers[requestMethod] ?? handlers["ANY"];
    if (handler) {
      const mayDefer = !!foundRoute.options.component;
      if (typeof handler !== "function") {
        if (handler.middleware?.length) {
          const handlerMiddlewares = flattenMiddlewares(handler.middleware);
          for (const m of handlerMiddlewares) routeMiddlewares.push(m.options.server);
        }
      }
      const routeHandler = typeof handler === "function" ? handler : handler.handler;
      if (routeHandler) {
        const parsedHandler = withParsedParams(routeHandler, matchedRoutes);
        if (!mayDefer) {
          terminalHandler = parsedHandler;
          terminalNext = throwIfMayNotDefer;
        } else routeMiddlewares.push(parsedHandler);
      }
    }
  }
  const response = await executeMiddleware(routeMiddlewares, terminalHandler, {
    request,
    context,
    params: rawParams,
    pathname,
    handlerType: "router"
  }, request.signal, terminalNext);
  return normalizeSsrResponse(response);
}
const fetch$1 = createStartHandler(defaultStreamHandler);
function createServerEntry(entry) {
  return {
    async fetch(...args) {
      return await entry.fetch(...args);
    }
  };
}
const server = createServerEntry({ fetch: fetch$1 });
export {
  TSS_SERVER_FUNCTION as T,
  getRequest as a,
  createServerFn as c,
  createServerEntry,
  server as default,
  getServerFnById as g
};
