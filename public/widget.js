(function () {
  'use strict';

  var ORIGIN = 'https://www.groupsor.co.uk';
  try {
    if (document.currentScript && document.currentScript.src) {
      ORIGIN = new URL(document.currentScript.src).origin;
    }
  } catch (e) {}

  function safeHttpsUrl(url, fallback) {
    if (!url) return fallback;
    try {
      var parsed = new URL(url, ORIGIN);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
    } catch (e) {}
    return fallback;
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }

  function formatLabel(slug) {
    if (!slug) return '';
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function sanitizeMaxHeight(raw) {
    if (!raw) return '430px';
    var val = raw.trim().toLowerCase();
    if (val === 'none' || val === '0' || val === 'auto') return 'none';
    if (/^\d{2,4}(px|vh|rem|em)$/.test(val)) return val;
    if (/^\d{2,4}$/.test(val)) return val + 'px';
    return '430px';
  }

  function buildStyles(theme, layout, maxHeightCss) {
    var isDark = theme === 'dark';
    var autoCss =
      theme === 'auto'
        ? '@media (prefers-color-scheme: dark) { .gs-wrap { --gs-bg:#111827; --gs-card:#1f2937; --gs-border:#374151; --gs-text:#f9fafb; --gs-muted:#9ca3af; --gs-pill:#111827; --gs-hover:#263244; --gs-scroll:#4b5563; } }'
        : '';

    var scrollRules =
      maxHeightCss !== 'none'
        ? 'max-height:' + maxHeightCss + '; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--gs-scroll) transparent;'
        : '';

    return (
      '.gs-wrap {' +
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
      '  --gs-green: #25D366;' +
      '  --gs-green-dark: #128C7E;' +
      (isDark
        ? '  --gs-bg:#111827; --gs-card:#1f2937; --gs-border:#374151; --gs-text:#f9fafb; --gs-muted:#9ca3af; --gs-pill:#111827; --gs-hover:#263244; --gs-scroll:#4b5563;'
        : '  --gs-bg:#ffffff; --gs-card:#f9fafb; --gs-border:#e5e7eb; --gs-text:#111827; --gs-muted:#6b7280; --gs-pill:#eef2f7; --gs-hover:#f3f4f6; --gs-scroll:#cbd5e1;') +
      '  background: var(--gs-bg);' +
      '  color: var(--gs-text);' +
      '  border: 1px solid var(--gs-border);' +
      '  border-radius: 12px;' +
      '  overflow: hidden;' +
      '  box-sizing: border-box;' +
      '  width: 100%;' +
      '}' +
      autoCss +
      '.gs-wrap *, .gs-wrap *::before, .gs-wrap *::after { box-sizing: border-box; }' +
      '.gs-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 14px; border-bottom:1px solid var(--gs-border); background:var(--gs-card); }' +
      '.gs-brand { display:flex; align-items:center; gap:8px; font-weight:700; font-size:14px; color:var(--gs-text); text-decoration:none; }' +
      '.gs-dot { width:9px; height:9px; border-radius:50%; background:var(--gs-green); flex-shrink:0; }' +
      '.gs-more { font-size:12px; font-weight:600; color:var(--gs-green-dark); text-decoration:none; white-space:nowrap; }' +
      '.gs-more:hover { text-decoration:underline; }' +
      '.gs-body { padding:10px; ' +
      scrollRules +
      (layout === 'grid'
        ? 'display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:10px;'
        : 'display:flex; flex-direction:column; gap:8px;') +
      '}' +
      '.gs-body::-webkit-scrollbar { width:6px; }' +
      '.gs-body::-webkit-scrollbar-track { background:transparent; }' +
      '.gs-body::-webkit-scrollbar-thumb { background:var(--gs-scroll); border-radius:999px; }' +
      '.gs-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border:1px solid var(--gs-border); border-radius:10px; background:var(--gs-card); transition:background .15s ease; }' +
      '.gs-item:hover { background:var(--gs-hover); }' +
      '.gs-avatar { width:40px; height:40px; border-radius:8px; object-fit:cover; flex-shrink:0; background:var(--gs-pill); border:1px solid var(--gs-border); }' +
      '.gs-info { flex:1; min-width:0; }' +
      '.gs-title { display:block; font-size:13px; font-weight:600; color:var(--gs-text); text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.gs-title:hover { color:var(--gs-green-dark); text-decoration:underline; }' +
      '.gs-meta { display:flex; align-items:center; gap:6px; margin-top:3px; font-size:11px; color:var(--gs-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.gs-tag { background:var(--gs-pill); padding:1px 6px; border-radius:4px; font-weight:500; }' +
      '.gs-btn { flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; padding:6px 11px; border-radius:7px; background:var(--gs-green); color:#ffffff; font-size:12px; font-weight:700; text-decoration:none; transition:opacity .15s ease; }' +
      '.gs-btn:hover { opacity:.9; }' +
      '.gs-load-wrap { padding:8px 10px; border-top:1px solid var(--gs-border); background:var(--gs-bg); display:none; justify-content:center; }' +
      '.gs-load-wrap.visible { display:flex; }' +
      '.gs-load-btn { width:100%; padding:8px 14px; border-radius:8px; border:1px solid var(--gs-border); background:var(--gs-card); color:var(--gs-text); font-size:12px; font-weight:600; cursor:pointer; transition:background .15s ease, border-color .15s ease; }' +
      '.gs-load-btn:hover:not(:disabled) { background:var(--gs-hover); border-color:var(--gs-green); color:var(--gs-green-dark); }' +
      '.gs-load-btn:disabled { opacity:.6; cursor:not-allowed; }' +
      '.gs-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 14px; border-top:1px solid var(--gs-border); background:var(--gs-card); font-size:11px; color:var(--gs-muted); }' +
      '.gs-foot a { color:var(--gs-green-dark); font-weight:600; text-decoration:none; }' +
      '.gs-foot a:hover { text-decoration:underline; }' +
      '.gs-empty { padding:18px; text-align:center; font-size:13px; color:var(--gs-muted); grid-column:1 / -1; }'
    );
  }

  function appendGroupCards(body, groups, directJoin) {
    groups.forEach(function (g) {
      var item = createEl('div', 'gs-item');

      var img = document.createElement('img');
      img.className = 'gs-avatar';
      img.alt = g.title || 'WhatsApp Group';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.src = safeHttpsUrl(g.imageUrl, ORIGIN + '/groupsor_logo.png');
      img.onerror = function () {
        img.onerror = null;
        img.src = ORIGIN + '/groupsor_logo.png';
      };

      var info = createEl('div', 'gs-info');
      var link = createEl('a', 'gs-title', g.title || 'WhatsApp Group');
      link.href = safeHttpsUrl(g.groupsorUrl, ORIGIN);
      link.target = '_blank';
      link.rel = 'noopener';

      var meta = createEl('div', 'gs-meta');
      if (g.category) {
        meta.appendChild(createEl('span', 'gs-tag', formatLabel(g.category)));
      }
      if (g.country && g.country !== 'other') {
        meta.appendChild(createEl('span', '', g.country.toUpperCase()));
      }

      info.appendChild(link);
      info.appendChild(meta);

      var joinBtn = createEl('a', 'gs-btn', 'Join');
      joinBtn.href = safeHttpsUrl(directJoin ? g.joinUrl : g.groupsorUrl, ORIGIN);
      joinBtn.target = '_blank';
      joinBtn.rel = 'noopener nofollow';

      item.appendChild(img);
      item.appendChild(info);
      item.appendChild(joinBtn);
      body.appendChild(item);
    });
  }

  function renderWidget(container) {
    if (container.getAttribute('data-gs-loaded') === 'true') return;
    container.setAttribute('data-gs-loaded', 'true');

    var category = (container.getAttribute('data-category') || 'all').trim();
    var country = (container.getAttribute('data-country') || 'all').trim();
    var type = (container.getAttribute('data-type') || 'all').trim();
    var q = (container.getAttribute('data-q') || '').trim();
    var limit = container.getAttribute('data-limit') || '6';
    var theme = (container.getAttribute('data-theme') || 'light').toLowerCase();
    var layout = (container.getAttribute('data-layout') || 'list').toLowerCase();
    var titleText = container.getAttribute('data-title') || 'Active WhatsApp Groups';
    var directJoin = container.getAttribute('data-direct-join') === 'true';
    var enableLoadMore = container.getAttribute('data-load-more') !== 'false';
    var maxHeightCss = sanitizeMaxHeight(container.getAttribute('data-max-height'));

    var currentPage = 1;
    var isLoading = false;

    var root = container.shadowRoot || container.attachShadow({ mode: 'open' });
    root.textContent = '';

    var style = document.createElement('style');
    style.textContent = buildStyles(theme, layout, maxHeightCss);
    root.appendChild(style);

    var wrap = createEl('div', 'gs-wrap');
    root.appendChild(wrap);

    var head = createEl('div', 'gs-head');
    var brand = createEl('a', 'gs-brand');
    brand.href = ORIGIN;
    brand.target = '_blank';
    brand.rel = 'noopener';
    brand.appendChild(createEl('span', 'gs-dot'));
    brand.appendChild(createEl('span', '', titleText));

    var viewAll = createEl('a', 'gs-more', 'View All →');
    viewAll.href =
      category && category !== 'all'
        ? ORIGIN + '/category/' + encodeURIComponent(category)
        : ORIGIN;
    viewAll.target = '_blank';
    viewAll.rel = 'noopener';

    head.appendChild(brand);
    head.appendChild(viewAll);
    wrap.appendChild(head);

    var body = createEl('div', 'gs-body');
    body.appendChild(createEl('div', 'gs-empty', 'Loading active WhatsApp groups...'));
    wrap.appendChild(body);

    var loadWrap = createEl('div', 'gs-load-wrap');
    var loadBtn = createEl('button', 'gs-load-btn', 'Load More Groups');
    loadBtn.type = 'button';
    loadWrap.appendChild(loadBtn);
    wrap.appendChild(loadWrap);

    var foot = createEl('div', 'gs-foot');
    var poweredWrap = createEl('span', '', 'Powered by ');
    var poweredLink = createEl('a', '', 'Groupsor');
    poweredLink.href = ORIGIN;
    poweredLink.target = '_blank';
    poweredLink.rel = 'noopener';
    poweredWrap.appendChild(poweredLink);

    var submitLink = createEl('a', '', '+ Submit Group');
    submitLink.href = ORIGIN + '/submit';
    submitLink.target = '_blank';
    submitLink.rel = 'noopener';

    foot.appendChild(poweredWrap);
    foot.appendChild(submitLink);
    wrap.appendChild(foot);

    function fetchPage(pageNum, append) {
      if (isLoading) return;
      isLoading = true;
      loadBtn.disabled = true;
      if (append) {
        loadBtn.textContent = 'Loading more...';
      }

      var params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (country && country !== 'all') params.set('country', country);
      if (type && type !== 'all') params.set('type', type);
      if (q) params.set('q', q);
      params.set('limit', limit);
      params.set('page', String(pageNum));

      fetch(ORIGIN + '/api/public/groups?' + params.toString())
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!append) {
            body.textContent = '';
          }
          var groups = (data && Array.isArray(data.groups)) ? data.groups : [];
          if (!append && groups.length === 0) {
            body.appendChild(createEl('div', 'gs-empty', 'No groups found for this filter yet.'));
            loadWrap.classList.remove('visible');
            return;
          }

          appendGroupCards(body, groups, directJoin);
          if (append && groups.length > 0 && typeof body.scrollBy === 'function') {
            body.scrollBy({ top: 140, behavior: 'smooth' });
          }

          if (enableLoadMore && data && data.hasMore) {
            loadWrap.classList.add('visible');
            loadBtn.textContent = 'Load More (' + limit + ' more)';
          } else {
            loadWrap.classList.remove('visible');
          }
        })
        .catch(function () {
          if (!append) {
            body.textContent = '';
            body.appendChild(createEl('div', 'gs-empty', 'Unable to load groups right now.'));
          } else {
            loadBtn.textContent = 'Retry Load More';
          }
        })
        .finally(function () {
          isLoading = false;
          loadBtn.disabled = false;
        });
    }

    loadBtn.addEventListener('click', function () {
      currentPage += 1;
      fetchPage(currentPage, true);
    });

    fetchPage(1, false);
  }

  function initAll() {
    var nodes = document.querySelectorAll('#groupsor-widget, .groupsor-widget');
    for (var i = 0; i < nodes.length; i++) {
      renderWidget(nodes[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
