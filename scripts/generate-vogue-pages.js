const fs = require("fs");

const data = JSON.parse(fs.readFileSync("data/vogue-crawl.json", "utf8"));

const navItems = [
  ["fashion", "FASHION"],
  ["beauty", "BEAUTY"],
  ["living", "LIVING"],
  ["culture", "CULTURE"],
  ["video", "VIDEO"]
];

const pageNotes = {
  fashion: "실루엣, 런웨이, 셀러브리티 스타일을 빠르게 훑는 패션 에디트.",
  beauty: "스킨케어, 메이크업, 웰니스 흐름을 카드로 정리한 뷰티 피드.",
  living: "공간, 여행, 푸드, 라이프스타일 취향을 모은 리빙 셀렉션.",
  culture: "영화, 아트, 공연, 인물 이야기를 따라가는 컬처 노트.",
  video: "보그 코리아 영상 콘텐츠를 한눈에 보는 비디오 라이브러리."
};

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function imageMime(file = "") {
  const ext = file.split(".").pop().toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpeg" || ext === "jpg") return "image/jpeg";
  return "image/jpeg";
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
  const items = cat.tabs && cat.tabs.length ? cat.tabs.slice(0, 8) : ["전체"];
  return items
    .map((tab, index) => `<li${index === 0 ? ' class="on"' : ""}><button type="button">${esc(tab)}</button></li>`)
    .join("");
}

function image(article) {
  const file = article.localImage || "";
  if (file && fs.existsSync(file)) {
    const base64 = fs.readFileSync(file).toString("base64");
    return `data:${imageMime(file)};base64,${base64}`;
  }
  return esc(article.image || "imges/sec3_img1.jpg");
}

function meta(article, cat) {
  return [article.category || cat.label || cat.title, article.date].filter(Boolean).map(esc).join(" / ");
}

function dek(article, cat) {
  if (article.description) return esc(article.description);
  const category = article.category || cat.label || cat.title;
  return `${esc(category)} 관점에서 읽어볼 만한 보그 코리아 최신 스토리입니다.`;
}

function heroCard(article, cat) {
  if (!article) return "";
  const author = article.author ? `<span>${esc(article.author)}</span>` : "";
  const heroImage = image(article);
  return `        <article class="hero-card">
          <figure style="--hero-image: url('${heroImage}')"><img src="${heroImage}" alt="${esc(article.title)}"></figure>
          <div class="hero-card-copy">
            <p class="eyebrow">${meta(article, cat)}</p>
            <h2>${esc(article.title)}</h2>
            <p>${dek(article, cat)}</p>
            <div class="card-foot"><span>Vogue Korea</span>${author}</div>
          </div>
        </article>`;
}

function featureCard(article, cat, index) {
  const author = article.author ? `<span>${esc(article.author)}</span>` : "";
  return `          <article class="feature-card card-${index + 1}">
            <figure><img src="${image(article)}" alt="${esc(article.title)}"></figure>
            <div class="feature-copy">
              <p>${meta(article, cat)}</p>
              <h3>${esc(article.title)}</h3>
              ${article.description ? `<em>${esc(article.description)}</em>` : ""}
              ${author}
            </div>
          </article>`;
}

function storyCard(article, cat, index) {
  const author = article.author ? `<span>${esc(article.author)}</span>` : "";
  return `          <article class="story-card">
            <figure><img src="${image(article)}" alt="${esc(article.title)}"></figure>
            <div class="story-copy">
              <p>${String(index + 1).padStart(2, "0")} / ${meta(article, cat)}</p>
              <h3>${esc(article.title)}</h3>
              ${article.description ? `<em>${esc(article.description)}</em>` : ""}
              ${author}
            </div>
          </article>`;
}

function page(cat) {
  const slug = cat.slug;
  const title = cat.title.toUpperCase();
  const articles = (cat.articles || []).filter((article) => article.title && article.url);
  const hero = articles[0];
  const features = articles.slice(1, 5).map((article, index) => featureCard(article, cat, index)).join("\n");
  const stories = articles.slice(5, 23).map((article, index) => storyCard(article, cat, index)).join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | VOGUE Editorial Experience</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="category.css?v=20260618-hero-contain">
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

  <main class="category-main">
    <section class="category-hero container">
      <div class="category-title">
        <p>Vogue Korea / ${esc(cat.label || title)}</p>
        <h1>${title}</h1>
        <span>${esc(pageNotes[slug] || "보그 코리아 최신 스토리를 카드로 정리했습니다.")}</span>
      </div>
${heroCard(hero, cat)}
    </section>

    <section class="container section-band">
      <div class="section-head">
        <h2>Editor's Cards</h2>
        <ul class="category-tabs">${tabs(cat)}</ul>
      </div>
      <div class="feature-grid">
${features}
      </div>
    </section>

    <section class="container section-band latest-band">
      <div class="section-head">
        <h2>Latest Stories</h2>
        <span>Collected from Vogue Korea</span>
      </div>
      <div class="story-grid">
${stories}
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <strong>VOGUE</strong>
      <p>Vogue Korea category images and card text arranged for this portfolio layout.</p>
    </div>
  </footer>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
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

    if (window.gsap && !reduceMotion) {
      gsap.from('.category-title > *', { y: 24, opacity: 0, duration: .75, stagger: .08, ease: 'power3.out' });
      gsap.from('.hero-card', { y: 34, opacity: 0, duration: .8, delay: .15, ease: 'power3.out' });
      gsap.from('.feature-card, .story-card', { y: 26, opacity: 0, duration: .65, stagger: .035, ease: 'power2.out' });
    }
  </script>
</body>
</html>
`;
}

for (const cat of Object.values(data.categories)) {
  fs.writeFileSync(`${cat.slug}.html`, page(cat), "utf8");
  console.log(`${cat.slug}.html ${cat.articles.length}`);
}
