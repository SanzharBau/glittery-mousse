/* ============================================================================
   app.js — ДВИЖОК ПЛАТФОРМЫ
   ----------------------------------------------------------------------------
   Здесь лежит то, что одинаково на всех страницах заведения:
     • подстановка фирменных цветов,
     • шапка с фото,
     • верхняя навигация и кнопка ☰,
     • боковое меню с контактами,
     • промо-баннеры,
     • модальное окно брони,
     • появление блоков при прокрутке,
     • подвал сайта.

   Того, что уникально для одной страницы (рисование зала, рисование меню),
   тут нет — оно живёт внутри своей страницы. Правило простое:
   «на всех страницах» → сюда, «только на одной» → в саму страницу.

   Страница подключает движок одной строкой:
       const venue = initVenuePage('hall');   // или 'menu'
   ============================================================================ */


/* ============================================================================
   1. МАЛЕНЬКИЕ ПОМОЩНИКИ
   ============================================================================ */

/* Экранирование текста перед вставкой в HTML.
   Нужно, чтобы имя гостя вида <b> не сломало вёрстку страницы. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* '#2C0A0D' → '44, 10, 13'. Нужно для полупрозрачных цветов в CSS. */
function hexToRgb(hex) {
  var h = String(hex).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var num = parseInt(h, 16);
  if (isNaN(num)) return '0, 0, 0';
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255].join(', ');
}

/* Оставляет в строке только цифры: '+7 (701) 123-45-67' → '77011234567' */
function onlyDigits(text) {
  return String(text || '').replace(/\D/g, '');
}

/* Сегодняшняя дата в формате '2026-08-13' — такой понимает <input type="date"> */
function todayISO() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

/* '2026-08-13' → '13 августа' — чтобы в подтверждении читалось по-человечески */
function prettyDate(iso) {
  var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var p = String(iso).split('-');
  if (p.length !== 3) return iso;
  return Number(p[2]) + ' ' + months[Number(p[1]) - 1];
}

/* Правильное окончание: 1 гость, 2 гостя, 5 гостей */
function guestWord(n) {
  var last = n % 10, two = n % 100;
  if (two >= 11 && two <= 14) return 'гостей';
  if (last === 1) return 'гость';
  if (last >= 2 && last <= 4) return 'гостя';
  return 'гостей';
}


/* ============================================================================
   2. КАКОЕ ЗАВЕДЕНИЕ ПОКАЗЫВАЕМ
   ----------------------------------------------------------------------------
   Берём id из адреса страницы: venue.html?id=circus
   Если id нет или он неизвестен — показываем первое заведение из venues.js,
   чтобы страница не оказалась пустой.
   ============================================================================ */

function getVenueId() {
  var id = new URLSearchParams(window.location.search).get('id');
  if (id && venues[id]) return id;
  return Object.keys(venues)[0];
}

function getVenue() {
  return venues[getVenueId()];
}

/* Собирает ссылку на страницу этого же заведения: pageUrl('menu') → 'menu.html?id=circus' */
function pageUrl(page, venueId) {
  return page + '.html?id=' + (venueId || getVenueId());
}


/* ============================================================================
   3. ФИРМЕННЫЕ ЦВЕТА
   ----------------------------------------------------------------------------
   Правило: имя цвета в venues.js = имя переменной в CSS.
   theme.accent → var(--accent). Добавишь новый цвет в данные —
   он сразу доступен в стилях, ничего связывать вручную не нужно.
   ============================================================================ */

function applyTheme(theme) {
  var root = document.documentElement;

  Object.keys(theme).forEach(function (name) {
    root.style.setProperty('--' + name, theme[name]);

    /* Тот же цвет ещё и в виде «R, G, B» — чтобы в стилях можно было
       задать прозрачность: rgba(var(--accent-rgb), 0.4). */
    root.style.setProperty('--' + name + '-rgb', hexToRgb(theme[name]));
  });

  /* Цвета статусов столов — общие для всех заведений (см. venues.js) */
  Object.keys(tableStatuses).forEach(function (key) {
    root.style.setProperty('--st-' + key, tableStatuses[key].color);
  });
}


/* ============================================================================
   4. ШАПКА С ФОТО
   ============================================================================ */

function renderHero(venue, page) {
  var host = document.getElementById('hero');
  if (!host) return;

  var about = venue.about || {};

  /* У каждой страницы своё фото и своя подпись.
     На странице заведения шапка во весь экран (hero-full) — это
     «представление» ресторана. На меню и в кабинете обычная, чтобы
     не отодвигать содержимое вниз. */
  var photo = page === 'menu' ? venue.menuCover : (about.heroPhoto || venue.cover);
  var sub   = page === 'menu' ? venue.tagline   : (about.tagline || venue.location);

  host.className = 'hero' + (page === 'hall' ? ' hero-full' : '');
  host.innerHTML =
    '<div class="hero-bg" style="background-image:url(\'' + esc(photo) + '\')"></div>' +
    '<div class="hero-overlay"></div>' +
    '<div class="hero-content">' +
      '<div class="hero-emoji">' + esc(venue.emoji) + '</div>' +
      '<h1>' + esc(venue.name) + '</h1>' +
      '<div class="hero-sub">' + esc(sub) + '</div>' +
    '</div>' +
    /* Подсказка прокрутки — только на полноэкранной шапке */
    (page === 'hall' ? '<div class="hero-scroll" aria-hidden="true">&#8595;</div>' : '');
}


/* ============================================================================
   5.5. МЕГА-МЕНЮ
   ----------------------------------------------------------------------------
   Широкая панель с колонками, раскрывается под пунктом шапки.
   Открытие сделано на CSS через :hover по всему пункту — панель лежит
   внутри него, поэтому мышь не «теряет» её по пути. Клик добавлен
   отдельно: на сенсорных экранах наведения не существует.
   ============================================================================ */

function megaMenuHtml() {
  var groups = platform.megamenu || [];
  if (groups.length === 0) return '';

  return '<div class="nav-menu">' + groups.map(function (group, i) {

    /* Колонки: первая с признаком large рисуется крупными ссылками,
       остальные — мелкими. Иконок нет, иерархия только через размер. */
    var columns = (group.columns || []).map(function (column) {
      var links = column.items.map(function (item) {
        return '<a class="mega-item" href="' + esc(item.href) + '">' + esc(item.text) + '</a>';
      }).join('');

      return '<div class="mega-col' + (column.large ? ' large' : '') + '">' +
          '<div class="mega-title">' + esc(column.label) + '</div>' +
          links +
        '</div>';
    }).join('');

    return '<div class="nav-item" data-mega="' + i + '">' +
        '<button class="nav-trigger" type="button" aria-expanded="false">' +
          esc(group.title) + '<span class="chev">&#9662;</span>' +
        '</button>' +
        '<div class="mega"><div class="mega-inner">' + columns + '</div></div>' +
      '</div>';
  }).join('') + '</div>';
}

/* Клик по пункту — для сенсорных экранов, где наведения нет */
function wireMegaMenu(host) {
  var items = host.querySelectorAll('.nav-item');

  items.forEach(function (item) {
    var trigger = item.querySelector('.nav-trigger');

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var wasOpen = item.classList.contains('open');
      items.forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* Клик мимо меню закрывает раскрытый пункт */
  document.addEventListener('click', function (e) {
    if (host.contains(e.target)) return;
    items.forEach(function (item) {
      item.classList.remove('open');
      item.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false');
    });
  });
}


/* ============================================================================
   5. ЛОГОТИП И ВЕРХНЯЯ НАВИГАЦИЯ
   ============================================================================ */

/* Логотип платформы — буква «О» из названия, обыгранная как тарелка:
   внешний круг, кольцо сервировки и точка-место в центре.
   Рисуем кодом, а не картинкой: масштабируется без потери чёткости,
   красится текущим цветом текста и не требует файла в проекте.

   Толщины линий подобраны под мелкий размер (22–28px в шапке): при более
   тонких штрихах внутреннее кольцо на такой величине пропадает совсем. */
var LOGO_SVG =
  '<svg class="logo" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="23"   stroke="currentColor" stroke-width="4.5"/>' +
    '<circle cx="32" cy="32" r="12.5" stroke="currentColor" stroke-width="3" opacity="0.5"/>' +
    '<circle cx="32" cy="32" r="4.5"  fill="currentColor"/>' +
  '</svg>';

/* Крупная версия того же знака — для героя и больших блоков.
   Толщина линий в SVG растёт вместе с размером картинки: значение 2.4
   при отрисовке в 340px превращается в 12 экранных пикселей. Поэтому
   у крупной версии числа заметно меньше — она рисуется тонко и изящно,
   а мелкая в шапке остаётся плотной, иначе там линии пропадают. */
function logoLargeSvg(size) {
  return '<svg class="logo-lg" width="' + size + '" height="' + size + '" ' +
              'viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="23"   stroke="currentColor" stroke-width="0.8"/>' +
    '<circle cx="32" cy="32" r="12.5" stroke="currentColor" stroke-width="0.55" opacity="0.5"/>' +
    '<circle cx="32" cy="32" r="3"    fill="currentColor"/>' +
  '</svg>';
}

/* Знак бренда: логотип + название. Ведёт на главную. */
function brandMarkHtml() {
  return '<a class="brandmark" href="index.html" aria-label="' + esc(platform.name) + '">' +
           LOGO_SVG + '<span>' + esc(platform.name) + '</span>' +
         '</a>';
}

function renderNav(venue, page) {
  var host = document.getElementById('nav');
  if (!host) return;

  var id = venue.id;
  host.className = 'nav';
  host.innerHTML =
    '<div class="nav-left">' +
      '<button class="burger" id="burgerBtn" aria-label="Открыть меню">&#9776;</button>' +
      brandMarkHtml() +
    '</div>' +
    megaMenuHtml() +
    '<div class="nav-right">' +
      '<a href="' + pageUrl('venue', id) + '"' + (page === 'hall' ? ' class="current"' : '') + '>Зал</a>' +
      '<a href="' + pageUrl('menu', id) + '"' + (page === 'menu' ? ' class="current"' : '') + '>Меню</a>' +
    '</div>';

  document.getElementById('burgerBtn').addEventListener('click', openSidebar);
  wireMegaMenu(host);
}


/* ============================================================================
   6. БОКОВОЕ МЕНЮ
   ----------------------------------------------------------------------------
   Показываем только заполненные контакты. Пустая строка в venues.js
   означает «пункта нет» — владелец впишет позже, и он появится сам.
   ============================================================================ */

/* Иконки соцсетей рисуем прямо в разметке (inline SVG), а не картинками:
   так они красятся текущим цветом текста и не требуют отдельных файлов. */
var ICON_INSTAGRAM =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' +
    '<rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5"/>' +
    '<circle cx="12" cy="12" r="4.1"/>' +
    '<circle cx="17.5" cy="6.5" r="1.15" fill="currentColor" stroke="none"/>' +
  '</svg>';

var ICON_WHATSAPP =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
       'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20.6 11.7a8.6 8.6 0 0 1-12.8 7.5L3.4 20.6l1.4-4.3A8.6 8.6 0 1 1 20.6 11.7Z"/>' +
    '<path d="M9.2 8.4c.5-.1.8 0 1 .4l.7 1.5c.1.3 0 .5-.2.7l-.5.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.4 2.1c.3.1.5.1.6-.1l.5-.6c.2-.2.4-.2.7-.1l1.5.7c.3.2.5.4.4.8a2 2 0 0 1-1.9 1.5c-1 0-2.6-.6-4-2s-2-3-2-4a2 2 0 0 1 1.4-1.9Z"/>' +
  '</svg>';

/* Разделы платформы списком — те же данные, что в мега-меню.
   Используются в боковой панели: на телефоне мега-меню скрыто.
   Колонки группы разворачиваем в один плоский список: в узкой панели
   делить ссылки на «крупные» и «мелкие» незачем. */
function platformLinksHtml() {
  return (platform.megamenu || []).map(function (group) {
    var links = (group.columns || []).map(function (column) {
      return column.items.map(function (item) {
        return '<a class="side-plain" href="' + esc(item.href) + '">' + esc(item.text) + '</a>';
      }).join('');
    }).join('');

    return '<div class="side-group-title">' + esc(group.title) + '</div>' + links;
  }).join('');
}

/* Боковая панель для главной страницы: у неё нет заведения, поэтому
   контактов нет — только разделы платформы. */
function renderPlatformSidebar() {
  var backdrop = document.createElement('div');
  backdrop.className = 'side-backdrop';
  backdrop.id = 'sideBackdrop';

  var panel = document.createElement('div');
  panel.className = 'sidebar';
  panel.id = 'sidebar';
  panel.innerHTML =
    '<button class="side-close" id="sideCloseBtn" aria-label="Закрыть меню">&times;</button>' +
    '<div class="side-brand">' + esc(platform.name) + '</div>' +
    platformLinksHtml() +
    '<div class="side-foot">' +
      '<div class="side-foot-title">' + esc(platform.name) + '</div>' +
      '<div class="side-dim">' + esc(platform.tagline) + '</div>' +
    '</div>';

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  document.getElementById('sideCloseBtn').addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);
  window.addEventListener('resize', function () {
    if (panel.classList.contains('open')) positionSidebar();
  });
}

function renderSidebar(venue) {
  var c = venue.contacts || {};
  var id = venue.id;
  var html = '';

  /* --- Крестик и название заведения мелкой подписью --- */
  html +=
    '<button class="side-close" id="sideCloseBtn" aria-label="Закрыть меню">&times;</button>' +
    '<div class="side-brand">' + esc(venue.name) + '</div>';

  /* --- Разделы: крупный жирный текст без плашек --- */
  html +=
    '<nav class="side-nav">' +
      '<a href="' + pageUrl('venue', id) + '">Карта зала</a>' +
      '<a href="' + pageUrl('menu', id) + '">Меню</a>' +
      '<a href="#" id="sideBookBtn">Забронировать стол</a>' +
      '<a href="index.html">Другие заведения</a>' +
    '</nav>' +
    '<div class="side-sep"></div>';

  /* --- Адрес и часы работы одним блоком --- */
  if (c.address) {
    html += '<div class="side-strong">' + esc(c.address) + '</div>';
  }
  if (c.hours) {
    html += '<div class="side-dim">' + esc(c.hours) + '</div>';
  }

  /* --- Телефон крупно.
         Ссылкой tel: делаем только настоящий номер: в заглушке
         «+7 (___) ___-__-__» цифр мало, покажем просто текстом. --- */
  if (c.phone) {
    var phoneDigits = onlyDigits(c.phone);
    html += phoneDigits.length >= 10
      ? '<a class="side-phone" href="tel:+' + phoneDigits + '">' + esc(c.phone) + '</a>'
      : '<div class="side-phone">' + esc(c.phone) + '</div>';
  }

  /* --- Соцсети: только иконки, без подписей --- */
  var icons = '';
  if (c.instagram) {
    var nick = String(c.instagram).replace('@', '');
    icons += '<a href="https://instagram.com/' + esc(nick) + '" target="_blank" rel="noopener" ' +
                'aria-label="Instagram">' + ICON_INSTAGRAM + '</a>';
  }
  if (c.whatsapp) {
    icons += '<a href="https://wa.me/' + onlyDigits(c.whatsapp) + '" target="_blank" rel="noopener" ' +
                'aria-label="WhatsApp">' + ICON_WHATSAPP + '</a>';
  }
  if (icons) html += '<div class="side-icons">' + icons + '</div>';

  if (c.map2gis) {
    html += '<a class="side-link" href="' + esc(c.map2gis) + '" target="_blank" rel="noopener">Как добраться</a>';
  }

  /* --- Разделы платформы.
         На узком экране мега-меню в шапке прячется, и это единственный
         способ до них добраться. --- */
  html += platformLinksHtml();

  /* --- Нижний блок платформы: на референсе тут «Скачайте приложение».
         Приложения у нас нет, поэтому ставим бренд платформы и переход
         к остальным заведениям — тот же смысл, без выдуманного QR-кода. --- */
  html +=
    '<div class="side-foot">' +
      '<div class="side-foot-title">' + esc(platform.name) + '</div>' +
      '<div class="side-dim">' + esc(platform.tagline) + '</div>' +
    '</div>';

  /* --- Вставляем панель и затемнение в страницу --- */
  var backdrop = document.createElement('div');
  backdrop.className = 'side-backdrop';
  backdrop.id = 'sideBackdrop';

  var panel = document.createElement('div');
  panel.className = 'sidebar';
  panel.id = 'sidebar';
  panel.innerHTML = html;

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  /* Закрытие: крестик или клик по затемнению */
  document.getElementById('sideCloseBtn').addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);

  /* «Забронировать стол» — закрываем меню и открываем форму без выбранного стола */
  document.getElementById('sideBookBtn').addEventListener('click', function (e) {
    e.preventDefault();
    closeSidebar();
    openBooking(null);
  });

  /* Экран повернули или изменили размер окна — пересчитываем положение,
     но только если меню открыто. */
  window.addEventListener('resize', function () {
    if (panel.classList.contains('open')) positionSidebar();
  });
}

/* Ставит карточку меню под кнопку ☰.
   Считаем координаты каждый раз при открытии: кнопка живёт в липкой
   навигации, а та стоит то под шапкой, то у верха экрана — в CSS такое
   не пропишешь. */
function positionSidebar() {
  var panel = document.getElementById('sidebar');
  var burger = document.getElementById('burgerBtn');
  if (!panel || !burger) return;

  var box = burger.getBoundingClientRect();
  var gap = 8;      // отступ от кнопки
  var margin = 14;  // минимальный отступ от краёв экрана

  /* Узнаём, какой высоты карточка хочет быть. Снимаем ограничение и
     читаем scrollHeight: панель скрыта через visibility, а не display,
     поэтому размеры у неё честные. */
  panel.style.maxHeight = 'none';
  var wanted = panel.scrollHeight;

  /* Хотим сразу под кнопкой. Но если так карточка вылезет за низ экрана —
     поднимаем ровно настолько, чтобы поместиться, и не выше отступа.
     Это лучше, чем отбрасывать её к самому верху: связь с кнопкой
     сохраняется, и видно её целиком. */
  var top = Math.min(box.bottom + gap, window.innerHeight - wanted - margin);
  if (top < margin) top = margin;

  panel.style.top = top + 'px';
  panel.style.left = Math.max(margin, box.left) + 'px';
  panel.style.maxHeight = (window.innerHeight - top - margin) + 'px';
}

function openSidebar() {
  positionSidebar();
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sideBackdrop').classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sideBackdrop').classList.remove('open');
  document.body.classList.remove('no-scroll');
}


/* ============================================================================
   7. ПРОМО-БАННЕРЫ
   ----------------------------------------------------------------------------
   Одна функция на два места: общая лента на главной и блок «Акции»
   на странице заведения. Разница только в том, показывать ли, чьё это промо.
   ============================================================================ */

/* Собирает промо всех заведений в одну ленту вперемешку.
   Идём по кругу: первое промо каждого заведения, потом вторые, потом третьи.
   Так у всех одинаковые шансы попасть в начало ленты, и порядок не скачет
   при каждой перезагрузке — в отличие от случайной перетасовки. */
function mixAllPromos() {
  var lists = Object.keys(venues).map(function (id) {
    return (venues[id].promos || []).map(function (promo) {
      return { promo: promo, venueId: id };
    });
  });

  var mixed = [];
  var round = 0;
  var addedSomething = true;

  while (addedSomething) {
    addedSomething = false;
    lists.forEach(function (list) {
      if (list[round]) {
        mixed.push(list[round]);
        addedSomething = true;
      }
    });
    round++;
  }
  return mixed;
}

/* Рисует ленту баннеров.
   host     — куда вставлять
   items    — массив { promo, venueId }
   showFrom — писать ли на баннере, из какого он заведения (нужно на главной) */
function renderPromos(host, items, showFrom) {
  if (!host) return;

  if (items.length === 0) {
    host.style.display = 'none';   // акций нет — блок не показываем вовсе
    return;
  }

  var strip = document.createElement('div');
  strip.className = 'promo-strip';

  items.forEach(function (item) {
    var promo = item.promo;
    var venue = venues[item.venueId];

    /* Баннер — ссылка на страницу заведения, которое разместило акцию */
    var card = document.createElement('a');
    card.className = 'promo-card';
    card.href = pageUrl('venue', item.venueId);

    /* Фон плашки берём из промо, цвет заголовка — из темы заведения.
       Именно accentLight: баннер тёмный, и тёмный акцент на нём слился бы. */
    card.style.setProperty('--promo-bg', promo.accent);
    card.style.setProperty('--promo-fg', venue.theme.accentLight || venue.theme.accent);

    card.innerHTML =
      '<div class="promo-top">' +
        (showFrom ? '<span class="promo-venue">' + esc(venue.emoji) + ' ' + esc(venue.name) + '</span>' : '<span></span>') +
        (promo.badge ? '<span class="promo-badge">' + esc(promo.badge) + '</span>' : '') +
      '</div>' +
      '<span class="promo-emoji">' + esc(promo.emoji) + '</span>' +
      '<div class="promo-text">' +
        '<div class="promo-title">' + esc(promo.title) + '</div>' +
        '<div class="promo-subtitle">' + esc(promo.subtitle) + '</div>' +
        (promo.price ? '<div class="promo-price">' + esc(promo.price) + '</div>' : '') +
      '</div>';

    strip.appendChild(card);
  });

  host.appendChild(strip);
}


/* ============================================================================
   8. МОДАЛЬНОЕ ОКНО БРОНИ
   ----------------------------------------------------------------------------
   Пока без сервера: заявка складывается в массив bookings в памяти браузера.
   Когда появится backend — отправку добавим в одном месте, в submitBooking().
   ============================================================================ */

var bookings = [];       // заявки текущей сессии (при перезагрузке страницы очищаются)
var bookingTable = null; // стол, с которого открыли форму (может быть null)

/* Список времени от 10:00 до 23:30 с шагом 30 минут */
function buildTimeList(from, to, step) {
  function toMin(t) { var p = String(t).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function toStr(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  var list = [];
  for (var m = toMin(from); m <= toMin(to); m += step) list.push(toStr(m));
  return list;
}

function createBookingModal(venue) {
  var cfg = venue.booking || {};
  var times = buildTimeList(cfg.timeFrom || '10:00', cfg.timeTo || '23:00', cfg.step || 30);
  var maxGuests = cfg.maxGuests || 10;

  var timeOptions = times.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');

  var guestOptions = '';
  for (var i = 1; i <= maxGuests; i++) {
    guestOptions += '<option value="' + i + '">' + i + ' ' + guestWord(i) + '</option>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'bookingOverlay';
  overlay.innerHTML =
    '<div class="modal">' +
      '<button class="close-btn" id="bookingCloseBtn" aria-label="Закрыть">&times;</button>' +

      /* --- Экран 1: форма --- */
      '<div class="modal-body" id="bookingForm">' +
        '<h2 id="bookingTitle">Бронирование стола</h2>' +
        '<div class="modal-sub" id="bookingSub"></div>' +

        '<div class="row2">' +
          '<div class="field">' +
            '<label for="bkDate">Дата</label>' +
            '<input type="date" id="bkDate">' +
          '</div>' +
          '<div class="field">' +
            '<label for="bkTime">Время</label>' +
            '<select id="bkTime">' + timeOptions + '</select>' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label for="bkGuests">Гостей</label>' +
          '<select id="bkGuests">' + guestOptions + '</select>' +
        '</div>' +

        '<div class="field">' +
          '<label for="bkName">Имя</label>' +
          '<input type="text" id="bkName" placeholder="Как к вам обращаться" autocomplete="name">' +
        '</div>' +

        '<div class="field">' +
          '<label for="bkPhone">Телефон</label>' +
          '<input type="tel" id="bkPhone" placeholder="+7 701 234 56 78" autocomplete="tel">' +
        '</div>' +

        '<div class="form-error" id="bookingError"></div>' +
        '<button class="btn" id="bookingSubmit">Отправить заявку</button>' +
      '</div>' +

      /* --- Экран 2: подтверждение --- */
      '<div class="done" id="bookingDone" style="display:none">' +
        '<div class="tick">&#127881;</div>' +
        '<h2>Заявка принята</h2>' +
        '<p>Администратор свяжется с вами для подтверждения.</p>' +
        '<div class="done-box" id="bookingSummary"></div>' +
        '<button class="btn btn-ghost" id="bookingDoneBtn">Готово</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  /* Закрытие: крестик, клик по тёмному фону, кнопка «Готово» */
  document.getElementById('bookingCloseBtn').addEventListener('click', closeBooking);
  document.getElementById('bookingDoneBtn').addEventListener('click', closeBooking);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeBooking();
  });

  document.getElementById('bookingSubmit').addEventListener('click', function () {
    submitBooking(venue);
  });
}

/* Открыть форму. table — объект стола из venues.js или null (бронь без выбора стола) */
function openBooking(table) {
  bookingTable = table;
  var venue = getVenue();

  document.getElementById('bookingTitle').textContent =
    table ? 'Бронь стола ' + table.id : 'Бронирование стола';

  document.getElementById('bookingSub').textContent =
    table ? (table.view + ' · ' + table.seats + ' ' + guestWord(table.seats) + ' · ' + venue.name)
          : (venue.name + ' · ' + venue.location);

  /* Значения по умолчанию: сегодня, и столько гостей, сколько мест за столом */
  var dateInput = document.getElementById('bkDate');
  dateInput.value = todayISO();
  dateInput.min = todayISO();   // прошлую дату выбрать нельзя
  if (table) document.getElementById('bkGuests').value = String(table.seats);

  document.getElementById('bookingError').textContent = '';
  document.getElementById('bookingForm').style.display = '';
  document.getElementById('bookingDone').style.display = 'none';

  document.getElementById('bookingOverlay').classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeBooking() {
  document.getElementById('bookingOverlay').classList.remove('open');
  document.body.classList.remove('no-scroll');
}

/* Проверка полей и «отправка» заявки */
function submitBooking(venue) {
  var date   = document.getElementById('bkDate').value;
  var time   = document.getElementById('bkTime').value;
  var guests = Number(document.getElementById('bkGuests').value);
  var name   = document.getElementById('bkName').value.trim();
  var phone  = document.getElementById('bkPhone').value.trim();
  var errorBox = document.getElementById('bookingError');

  /* Показать ошибку и остановить отправку */
  function showError(text) { errorBox.textContent = text; return false; }

  /* --- Проверки по порядку: первая же ошибка останавливает отправку --- */
  if (!date)                          return showError('Выберите дату');
  if (date < todayISO())              return showError('Эта дата уже прошла');
  if (name.length < 2)                return showError('Введите имя');
  if (onlyDigits(phone).length < 10)  return showError('Введите телефон полностью');

  /* Если бронируют на сегодня — время не должно быть в прошлом */
  if (date === todayISO()) {
    var now = new Date();
    var nowStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (time < nowStr) return showError('Это время сегодня уже прошло');
  }

  /* --- Заявка принята --- */
  var booking = {
    venue: venue.name,
    table: bookingTable ? bookingTable.id : 'на усмотрение администратора',
    date: date, time: time, guests: guests, name: name, phone: phone,
    createdAt: new Date().toISOString()
  };
  bookings.push(booking);

  /* Сюда позже встанет отправка на сервер:
     fetch('/api/bookings', { method:'POST', body: JSON.stringify(booking) }) */
  console.log('Новая заявка:', booking);

  document.getElementById('bookingSummary').innerHTML =
    '<div><b>Заведение:</b> ' + esc(venue.name) + '</div>' +
    '<div><b>Стол:</b> ' + esc(booking.table) + '</div>' +
    '<div><b>Когда:</b> ' + esc(prettyDate(date)) + ', ' + esc(time) + '</div>' +
    '<div><b>Гостей:</b> ' + guests + '</div>' +
    '<div><b>Имя:</b> ' + esc(name) + '</div>' +
    '<div><b>Телефон:</b> ' + esc(phone) + '</div>';

  document.getElementById('bookingForm').style.display = 'none';
  document.getElementById('bookingDone').style.display = '';
}


/* ============================================================================
   8.5. КАРТИНКА БЛЮДА И ОЦЕНКИ
   ----------------------------------------------------------------------------
   Картинка блюда переехала сюда из menu.html: теперь она нужна двум
   страницам — полному меню и превью меню на странице заведения.
   ============================================================================ */

/* Есть фото — показываем фото, нет — цветную заглушку в цвете раздела.
   Фото добавляются по одному, вёрстку править не нужно.
   place — где рисуем: 'in-card', 'in-reco' или 'in-modal'. */
function dishImageHtml(dish, color, place) {
  /* Плашка «СТОП» поверх картинки, если блюдо кончилось */
  var stop = dish.stop ? '<span class="dish-stop">СТОП</span>' : '';

  if (dish.photo) {
    return '<div class="dish-img ' + place + ' has-photo" ' +
           'style="background-image:url(\'' + esc(dish.photo) + '\')">' + stop + '</div>';
  }
  return '<div class="dish-img ' + place + '" style="--dish-color:' + esc(color) + '">' +
           '<span class="dish-emoji">' + esc(dish.emoji) + '</span>' + stop +
         '</div>';
}

/* --- Крупный обзор блюда ----------------------------------------------------
   Три состояния: вращение по кадрам, статичное фото, цветная заглушка.
   Что именно покажется, решают сами данные — вёрстка одна и та же.
   -------------------------------------------------------------------------- */
function dishViewerHtml(dish, color) {
  var frames = dish.frames || [];
  var spinnable = frames.length > 1;
  var stage;

  if (spinnable) {
    stage = '<img class="dish-frame" src="' + esc(frames[0]) + '" alt="' + esc(dish.name) + '" draggable="false">';
  } else if (dish.photo) {
    stage = '<img class="dish-frame" src="' + esc(dish.photo) + '" alt="' + esc(dish.name) + '" draggable="false">';
  } else {
    stage = '<div class="dish-img in-view" style="--dish-color:' + esc(color) + '">' +
              '<span class="dish-emoji">' + esc(dish.emoji) + '</span>' +
            '</div>';
  }

  return '<div class="dish-view' + (spinnable ? ' spinnable' : '') + '">' +
      '<div class="dish-stage">' + stage + '</div>' +
      (spinnable
        ? '<button class="dish-spin" type="button" aria-label="Повернуть блюдо">&#8635;</button>' +
          '<div class="dish-hint">Потяните, чтобы рассмотреть со всех сторон</div>'
        : '<div class="dish-hint">Обзор 360° появится после съёмки блюда</div>') +
    '</div>';
}

/* Оживляет вращение: перетаскивание меняет кадр, кнопка ↻ крутит оборот сама */
function initDishRotator(root, frames) {
  if (!root || !frames || frames.length < 2) return;

  var stage = root.querySelector('.dish-stage');
  var img = root.querySelector('.dish-frame');
  var index = 0;
  var ШАГ = 8;          // сколько пикселей протяжки приходится на один кадр
  var авто = null;

  /* Подгружаем кадры заранее: иначе при первом обороте они будут
     появляться рывками по мере скачивания. */
  frames.forEach(function (src) { new Image().src = src; });

  function показать(i) {
    index = ((i % frames.length) + frames.length) % frames.length;
    img.src = frames[index];
  }

  /* --- Перетаскивание --- */
  var тянем = false, startX = 0, startIndex = 0;

  stage.addEventListener('pointerdown', function (e) {
    остановить();
    тянем = true;
    startX = e.clientX;
    startIndex = index;
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', function (e) {
    if (!тянем) return;
    показать(startIndex + Math.round((e.clientX - startX) / ШАГ));
  });

  ['pointerup', 'pointercancel'].forEach(function (тип) {
    stage.addEventListener(тип, function () { тянем = false; });
  });

  /* --- Кнопка: один полный оборот --- */
  function остановить() { if (авто) { clearInterval(авто); авто = null; } }

  root.querySelector('.dish-spin').addEventListener('click', function () {
    if (авто) { остановить(); return; }      // повторный клик останавливает
    var осталось = frames.length;
    авто = setInterval(function () {
      показать(index + 1);
      if (--осталось <= 0) остановить();
    }, 45);
  });
}

/* --- Карусель блюда: само блюдо, затем ингредиенты --------------------------
   Прокрутка сделана на CSS (scroll-snap), а не на скриптах: пальцем свайп
   работает сам собой, а стрелки просто просят браузер прокрутить на экран.
   Последний слайд — полный список ингредиентов, до него и доводит свайп
   вправо на телефоне.
   -------------------------------------------------------------------------- */
function dishCarouselHtml(dish, color) {
  var ing = dish.ingredients || [];

  /* Слайд 1 — само блюдо (вращение, фото или заглушка) */
  var slides = ['<div class="dish-slide">' + dishViewerHtml(dish, color) + '</div>'];
  var captions = [dish.compo || dish.name];

  /* Слайды ингредиентов */
  ing.forEach(function (item) {
    var картинка = item.photo
      ? '<img class="dish-frame" src="' + esc(item.photo) + '" alt="' + esc(item.name) + '" draggable="false">'
      : '<div class="dish-img in-view" style="--dish-color:' + esc(color) + '">' +
          '<span class="dish-emoji">' + esc(item.emoji) + '</span></div>';

    slides.push('<div class="dish-slide"><div class="dish-view"><div class="dish-stage">' +
                картинка + '</div></div></div>');
    captions.push('<b>' + esc(item.name) + '</b>' + (item.note ? ' — ' + esc(item.note) : ''));
  });

  /* Последний слайд — весь состав списком */
  if (ing.length > 0) {
    var список = ing.map(function (item) {
      return '<li><span>' + esc(item.emoji) + '</span> ' + esc(item.name) + '</li>';
    }).join('');

    slides.push('<div class="dish-slide"><div class="dish-view"><div class="dish-stage">' +
        '<ul class="ing-list">' + список + '</ul>' +
      '</div></div></div>');
    captions.push('Всё, из чего собрано блюдо');
  }

  /* Стрелки и точки нужны только когда слайдов больше одного */
  var управление = slides.length > 1
    ? '<div class="dish-nav">' +
        '<button class="dish-arrow" type="button" data-dir="-1" aria-label="Назад">&#8249;</button>' +
        '<span class="dish-dots">' + slides.map(function (_, i) {
          return '<span class="dot' + (i === 0 ? ' on' : '') + '"></span>';
        }).join('') + '</span>' +
        '<button class="dish-arrow" type="button" data-dir="1" aria-label="Вперёд">&#8250;</button>' +
      '</div>'
    : '';

  return '<div class="dish-carousel" data-captions="' + esc(JSON.stringify(captions)) + '">' +
      '<div class="dish-track">' + slides.join('') + '</div>' +
      '<div class="dish-caption">' + captions[0] + '</div>' +
      управление +
    '</div>';
}

/* Стрелки, точки и подпись под текущим слайдом */
function initDishCarousel(root) {
  if (!root) return;

  var track = root.querySelector('.dish-track');
  var caption = root.querySelector('.dish-caption');
  var dots = root.querySelectorAll('.dish-dots .dot');
  var captions = JSON.parse(root.dataset.captions);

  function обновить() {
    /* Номер слайда считаем из положения прокрутки — тогда он верен
       и после свайпа пальцем, и после нажатия стрелки. */
    var i = Math.round(track.scrollLeft / track.clientWidth);
    i = Math.max(0, Math.min(captions.length - 1, i));

    caption.innerHTML = captions[i];
    dots.forEach(function (dot, j) { dot.classList.toggle('on', j === i); });
  }

  track.addEventListener('scroll', обновить, { passive: true });

  root.querySelectorAll('.dish-arrow').forEach(function (btn) {
    btn.addEventListener('click', function () {
      track.scrollBy({ left: track.clientWidth * Number(btn.dataset.dir), behavior: 'smooth' });
    });
  });
}

/* Граммовка и БЖУ строкой под описанием */
function nutritionHtml(nutrition) {
  if (!nutrition) return '';

  var поля = [
    { label: 'Порция',   value: nutrition.weight },
    { label: 'Белки',    value: nutrition.protein },
    { label: 'Жиры',     value: nutrition.fat },
    { label: 'Углеводы', value: nutrition.carbs },
    { label: 'Энергия',  value: nutrition.kcal }
  ].filter(function (п) { return п.value; });

  if (поля.length === 0) return '';

  return '<div class="nutrition">' + поля.map(function (п) {
    return '<div class="nutri-item">' +
        '<span class="nutri-value">' + esc(п.value) + '</span>' +
        '<span class="nutri-label">' + esc(п.label) + '</span>' +
      '</div>';
  }).join('') + '</div>';
}

/* Выделяет жирным ключевые слова в описании — как у Apple под товаром.
   Экранируем сначала весь текст, потом оборачиваем уже безопасные куски:
   в обратном порядке экранирование съело бы сами теги. */
function highlightHtml(text, words) {
  var out = esc(text || '');
  (words || []).forEach(function (word) {
    out = out.replace(esc(word), '<b>' + esc(word) + '</b>');
  });
  return out;
}

/* Средний балл по отзывам. Считаем, а не храним отдельно —
   иначе однажды разойдётся с самими отзывами. */
function averageScore(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  var sum = reviews.reduce(function (total, r) { return total + r.score; }, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/* Строка звёзд: 4 → ★★★★☆ */
function starsHtml(score) {
  var full = Math.round(score);
  var out = '';
  for (var i = 1; i <= 5; i++) out += (i <= full ? '★' : '☆');
  return '<span class="stars">' + out + '</span>';
}


/* ============================================================================
   9. ПОДВАЛ САЙТА
   ----------------------------------------------------------------------------
   Сейчас рисуется только на главной, но лежит здесь, а не в index.html:
   подвал — часть платформы, а не одной страницы. Чтобы добавить его на
   другую страницу, хватит блока <footer id="siteFooter"> и одной строки
   renderFooter(document.getElementById('siteFooter')).

   Тексты ссылок берутся из platform.footer, список заведений — из venues,
   поэтому новое заведение появляется в подвале само.
   ============================================================================ */

function renderFooter(host) {
  if (!host) return;
  var data = platform.footer || {};

  /* Превращает массив { text, href, primary } в набор ссылок */
  function linkList(items) {
    return (items || []).map(function (item) {
      return '<a href="' + esc(item.href) + '"' + (item.primary ? ' class="primary"' : '') + '>' +
               esc(item.text) +
             '</a>';
    }).join('');
  }

  /* Колонка 1 — заведения платформы, единственные настоящие ссылки */
  var venueLinks = Object.keys(venues).map(function (id) {
    return '<a href="' + pageUrl('venue', id) + '">' +
             esc(venues[id].emoji) + ' ' + esc(venues[id].name) +
           '</a>';
  }).join('');

  /* Колонка 4 — соцсети, плашками с иконкой */
  var socialLinks = (data.social || []).map(function (item) {
    return '<a href="' + esc(item.href) + '" target="_blank" rel="noopener">' +
             '<span>' + esc(item.icon) + '</span>' + esc(item.text) +
           '</a>';
  }).join('');

  host.className = 'site-footer';
  host.innerHTML =
    '<div class="footer-cols">' +
      '<div class="footer-col"><h4>Наши заведения</h4>' + venueLinks + '</div>' +
      '<div class="footer-col"><h4>Компания</h4>' + linkList(data.company) + '</div>' +
      '<div class="footer-col"><h4>Партнёрам</h4>' + linkList(data.partners) + '</div>' +
      '<div class="footer-col"><h4>Мы в соцсетях</h4>' +
        '<div class="footer-social">' + socialLinks + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">' +
      /* Год берём текущий, а не пишем в данные — иначе он устареет 1 января */
      '<div class="footer-note">© ' + new Date().getFullYear() + ' ' + esc(platform.name) + '. ' +
        esc(data.note || '') + '</div>' +
      '<div class="footer-logo">' + esc(platform.name) + '</div>' +
    '</div>';
}


/* ============================================================================
   10. ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ
   ----------------------------------------------------------------------------
   Элементы с классом .reveal приглушены, пока не попадут в среднюю часть
   экрана. Следит за этим IntersectionObserver — встроенный в браузер
   механизм: он сам сообщает, когда элемент вошёл в зону видимости.
   Это дешевле, чем считать координаты на каждое движение прокрутки.
   ============================================================================ */

function initScrollReveal() {
  var items = document.querySelectorAll('.reveal');
  if (items.length === 0) return;

  /* Показать всё сразу, если браузер старый или человек отключил анимации */
  var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noMotion || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  var observerWorked = false;

  var observer = new IntersectionObserver(function (entries) {
    observerWorked = true;
    entries.forEach(function (entry) {
      /* Добавляем и снимаем класс, а не только добавляем — тогда эффект
         работает в обе стороны: при прокрутке назад элемент снова гаснет
         у края экрана и проявляется, когда возвращается в середину. */
      entry.target.classList.toggle('visible', entry.isIntersecting);
    });
  }, {
    /* Сужаем зону на 12% сверху и снизу: яркой считается середина экрана,
       а не весь его край. Именно это даёт эффект «проявления к центру». */
    rootMargin: '-12% 0px -12% 0px',
    threshold: 0.12
  });

  items.forEach(function (el) { observer.observe(el); });

  /* Страховка. Обычно наблюдатель сообщает о видимых элементах сразу после
     запуска. Но если в какой-то среде он промолчит, вся страница останется
     полупрозрачной — а это выглядит как поломка. Через полторы секунды
     проверяем, сработал ли он хоть раз, и если нет — показываем всё.
     Лучше без эффекта, чем приглушённый сайт. */
  setTimeout(function () {
    if (observerWorked) return;
    items.forEach(function (el) { el.classList.add('visible'); });
  }, 1500);
}


/* ============================================================================
   11. ЗАПУСК СТРАНИЦЫ
   ----------------------------------------------------------------------------
   Одна строка в странице собирает всё общее:
       const venue = initVenuePage('hall');
   ============================================================================ */

function initVenuePage(page) {
  var venue = getVenue();

  var titles = { menu: ' — меню', owner: ' — кабинет владельца', hall: ' — карта зала' };
  document.title = venue.name + (titles[page] || '');

  applyTheme(venue.theme);
  renderHero(venue, page);
  renderNav(venue, page);
  renderSidebar(venue);
  createBookingModal(venue);

  /* Esc закрывает то, что открыто сверху: сначала модалку, потом боковое меню */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = document.getElementById('bookingOverlay');
    if (modal && modal.classList.contains('open')) { closeBooking(); return; }
    if (document.getElementById('sidebar').classList.contains('open')) closeSidebar();
  });

  return venue;
}
