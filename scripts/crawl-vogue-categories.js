const fs = require("fs");
const path = require("path");

const categories = [
  { slug: "fashion", title: "FASHION", label: "패션", url: "https://www.vogue.co.kr/fashion/" },
  { slug: "beauty", title: "BEAUTY", label: "뷰티", url: "https://www.vogue.co.kr/beauty/" },
  { slug: "living", title: "LIVING", label: "리빙", url: "https://www.vogue.co.kr/living/" },
  { slug: "culture", title: "CULTURE", label: "컬처", url: "https://www.vogue.co.kr/culture/" },
  { slug: "video", title: "VIDEO", label: "비디오", url: "https://www.vogue.co.kr/video/" }
];

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "));
}

function absolutize(url = "") {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return new URL(url, "https://www.vogue.co.kr").href;
}

function attr(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function firstMatch(html, regex) {
  const match = html.match(regex);
  return match ? stripTags(match[1]) : "";
}

function imageFrom(html) {
  const img = html.match(/<img\b[^>]*>/i)?.[0] || "";
  return attr(img, "data-src") || attr(img, "src");
}

function extensionFrom(url = "", contentType = "") {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const clean = url.split("?")[0];
  const ext = clean.match(/\.([a-z0-9]{3,4})$/i)?.[1]?.toLowerCase();
  return ext || "jpg";
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; VoguePortfolioPreview/1.0)",
      "referer": "https://www.vogue.co.kr/"
    }
  });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

async function hydrateArticle(article) {
  try {
    const html = await fetchHtml(article.url);
    const description =
      attr(html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:description|description)["'][^>]*>/i)?.[0] || "", "content") ||
      attr(html.match(/<meta\b[^>]*content=["'][^"']+["'][^>]*(?:property|name)=["'](?:og:description|description)["'][^>]*>/i)?.[0] || "", "content");
    return {
      ...article,
      description: stripTags(description).slice(0, 140)
    };
  } catch (error) {
    return article;
  }
}

async function downloadImage(article, slug, index) {
  if (!article.image) return article;
  try {
    const response = await fetch(article.image, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; VoguePortfolioPreview/1.0)",
        "referer": "https://www.vogue.co.kr/"
      }
    });
    if (!response.ok) throw new Error(`${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) throw new Error(`Not image: ${contentType}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 2048) throw new Error(`Image too small: ${buffer.length}`);
    const ext = extensionFrom(article.image, contentType);
    const file = path.join("imges", "vogue-cards", `${slug}-${String(index + 1).padStart(2, "0")}.${ext}`);
    fs.writeFileSync(file, buffer);
    return {
      ...article,
      localImage: file.replace(/\\/g, "/")
    };
  } catch (error) {
    console.warn(`image skipped ${slug}-${index + 1}: ${error.message}`);
    return article;
  }
}

function parseTabs(html) {
  const list = html.match(/id=["']post_terms_depth2_list["'][\s\S]*?<\/ul>/i)?.[0] || "";
  const tabs = [...list.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  return tabs.length ? tabs : ["전체"];
}

function parseHighlight(html) {
  const block = html.match(/<div\b[^>]*class=["'][^"']*list_highlight[^"']*["'][\s\S]*?<\/div>\s*<\/a>\s*<\/div>/i)?.[0] || "";
  if (!block) return null;
  const href = absolutize(attr(block.match(/<a\b[^>]*>/i)?.[0] || "", "href"));
  const title = firstMatch(block, /<h3\b[^>]*>([\s\S]*?)<\/h3>/i) || firstMatch(block, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  const spans = [...block.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map((match) => stripTags(match[1])).filter(Boolean);
  if (!href || !title) return null;
  return {
    postId: "",
    url: href,
    image: absolutize(imageFrom(block)),
    category: spans[0] || "",
    title,
    date: (spans[1] || "").replaceAll(".", "-"),
    author: "",
    sourceSlot: "highlight"
  };
}

function parseListItems(html) {
  const articles = [];
  const itemPattern = /<li\b[^>]*id=["']p_(\d+)["'][\s\S]*?<\/li>/gi;
  for (const match of html.matchAll(itemPattern)) {
    const block = match[0];
    const anchor = block.match(/<a\b[^>]*>/i)?.[0] || "";
    const href = absolutize(attr(anchor, "href"));
    const title = firstMatch(block, /<h3\b[^>]*class=["'][^"']*s_tit[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)
      || firstMatch(block, /<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    if (!href || !title) continue;
    const dateHtml = block.match(/<p\b[^>]*class=["'][^"']*date[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || "";
    articles.push({
      postId: match[1],
      url: href,
      image: absolutize(imageFrom(block)),
      category: firstMatch(block, /<p\b[^>]*class=["'][^"']*category[^"']*["'][^>]*>([\s\S]*?)<\/p>/i),
      title,
      date: stripTags(dateHtml.replace(/<span[\s\S]*?<\/span>/i, "")).replaceAll(".", "-"),
      author: firstMatch(dateHtml, /<span\b[^>]*>([\s\S]*?)<\/span>/i).replace(/^by\s+/i, ""),
      sourceSlot: attr(block, "slot") || "list"
    });
  }
  return articles;
}

async function crawlCategory(category) {
  const html = await fetchHtml(category.url);
  const seen = new Set();
  const articles = [];

  [parseHighlight(html), ...parseListItems(html)].filter(Boolean).forEach((article) => {
    if (seen.has(article.url)) return;
    seen.add(article.url);
    articles.push(article);
  });

  const hydrated = [];
  for (const [index, article] of articles.entries()) {
    const withText = await hydrateArticle(article);
    const withImage = await downloadImage(withText, category.slug, index);
    hydrated.push(withImage);
  }

  return {
    ...category,
    tabs: parseTabs(html),
    articles: hydrated
  };
}

(async () => {
  fs.mkdirSync(path.join("imges", "vogue-cards"), { recursive: true });
  const output = {
    source: "https://www.vogue.co.kr/",
    crawledAt: new Date().toISOString(),
    note: "Category list data, public card images, and short metadata descriptions only; full article bodies are not copied.",
    categories: {}
  };

  for (const category of categories) {
    const result = await crawlCategory(category);
    output.categories[category.slug] = result;
    console.log(`${category.slug}: ${result.articles.length}`);
  }

  fs.writeFileSync("data/vogue-crawl.json", JSON.stringify(output, null, 2), "utf8");
})();
