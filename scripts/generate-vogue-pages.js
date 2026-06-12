const fs = require("fs");

const data = JSON.parse(fs.readFileSync("data/vogue-crawl.json", "utf8"));

const navItems = [
  ["fashion", "FASHION"],
  ["beauty", "BEAUTY"],
  ["living", "LIVING"],
  ["culture", "CULTURE"],
  ["video", "VIDEO"],
];

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function imgSrc(article) {
  return esc(article.localImage || article.image || "");
}

function nav(slug) {
  return navItems
    .map(([href, label]) => `          <a href="${href}.html"${href === slug ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("\n");
}

function menu(slug) {
  return navItems
    .map(([href, label]) => `    <a class="menu-option" href="${href}.html"${href === slug ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("\n");
}

function tabs(cat) {
  const items = cat.tabs && cat.tabs.length ? cat.tabs : ["전체"];
  return items
    .map((tab, index) => `<li${index === 0 ? ' class="on"' : ""}><button type="button">${esc(tab)}</button></li>`)
    .join("");
}

function meta(article, cat) {
  const bits = [article.category || cat.ko || cat.title];
  if (article.date) bits.push(article.date);
  return bits.map((bit) => `<span>${esc(bit)}</span>`).join("");
}

function highlight(article, cat) {
  return `                <div slot="list_highlight" class="list_highlight">
                  <a href="${esc(article.url)}" target="_blank" rel="noopener">
                    <div class="thum"><img src="${imgSrc(article)}" alt="${esc(article.title)}"></div>
                    <div class="post_content">
                      <p>${meta(article, cat)}</p>
                      <h2>${esc(article.title)}</h2>
                      ${article.description ? `<em>${esc(article.description)}</em>` : ""}
                    </div>
                  </a>
                </div>`;
}

function card(article, cat, slotName) {
  const author = article.author ? `<span>by ${esc(article.author)}</span>` : "";
  return `                    <li slot="${slotName}">
                      <a href="${esc(article.url)}" target="_blank" rel="noopener">
                        <div class="thum"><img src="${imgSrc(article)}" alt="${esc(article.title)}"></div>
                        <div class="content">
                          <p class="category">${esc(article.category || cat.ko || cat.title)}</p>
                          <h3 class="s_tit">${esc(article.title)}</h3>
                          <p class="date">${esc(article.date || "")}${author}</p>
                        </div>
                      </a>
                    </li>`;
}

function page(cat) {
  const slug = cat.slug;
  const title = cat.title.toUpperCase();
  const articles = (cat.articles || []).filter((article) => article.title && article.url && (article.localImage || article.image));
  const hero = articles[0];
  const featureItems = articles.slice(1, 5).map((article) => card(article, cat, "list_1st")).join("\n");
  const latestItems = articles.map((article) => card(article, cat, "list_latest")).join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | VOGUE Editorial Experience</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="category.css">
</head>
<body>
  <header class="site-header" aria-label="Vogue navigation">
    <div class="container header-inner">
      <a class="brand" href="index.html">VOGUE</a>
      <nav class="nav" aria-label="Primary">
${nav(slug)}
      </nav>
      <button class="header-action menu-toggle" type="button" aria-expanded="false" aria-controls="menu-panel" aria-label="Open menu">
        <span class="menu-label">Menu</span>
        <span class="hamburger-icon" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
    </div>
  </header>

  <div class="menu-panel" id="menu-panel" hidden>
${menu(slug)}
  </div>

  <main id="main" class="site-main">
    <article class="sub_article">
      <div class="container">
        <section class="section_sub">
          <div class="h_area">
            <h1 class="tit_sub en">${title}</h1>
            <div class="tab_area">
              <ul class="d_flex">${tabs(cat)}</ul>
            </div>
          </div>

          <div class="ly_aside">
            <div class="inner">
              <div class="ly_post">
${hero ? highlight(hero, cat) : ""}

                <div class="post_list post_list_feature">
                  <ul class="m_d_flex">
${featureItems}
                  </ul>
                </div>

                <div class="list_group">
                  <h2 class="m_tit_sub">LATEST STORIES</h2>
                  <div class="post_list list_v2">
                    <ul id="post_list" class="m_d_flex">
${latestItems}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  </main>

  <script>
    const menuButton = document.querySelector('.menu-toggle');
    const menuPanel = document.querySelector('#menu-panel');
    const links = menuPanel.querySelectorAll('a');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setMenu(open) {
      menuButton.setAttribute('aria-expanded', String(open));
      if (open) {
        menuPanel.hidden = false;
        document.body.classList.add('menu-open');
        if (window.gsap && !reduceMotion) {
          gsap.fromTo(menuPanel, { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'power3.out' });
          gsap.fromTo(links, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .42, stagger: .05, delay: .08, ease: 'power3.out' });
        }
      } else if (window.gsap && !reduceMotion) {
        gsap.to(menuPanel, { y: -10, opacity: 0, duration: .26, ease: 'power2.in', onComplete: () => { menuPanel.hidden = true; document.body.classList.remove('menu-open'); } });
      } else {
        menuPanel.hidden = true;
        document.body.classList.remove('menu-open');
      }
    }

    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</body>
</html>
`;
}

for (const cat of Object.values(data.categories)) {
  fs.writeFileSync(`${cat.slug}.html`, page(cat), "utf8");
  console.log(`${cat.slug}.html ${cat.articles.length}`);
}
