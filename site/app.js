const rawData = window.LI_AO_WISDOM_DATA;

const state = {
  query: "",
  book: "",
  tag: "",
  page: 1,
  pageSize: 20,
};

const elements = {
  datasetSummary: document.querySelector("#datasetSummary"),
  searchInput: document.querySelector("#searchInput"),
  bookSelect: document.querySelector("#bookSelect"),
  tagInput: document.querySelector("#tagInput"),
  tagList: document.querySelector("#tagList"),
  resetBtn: document.querySelector("#resetBtn"),
  resultTitle: document.querySelector("#resultTitle"),
  resultMeta: document.querySelector("#resultMeta"),
  pageInfo: document.querySelector("#pageInfo"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  cards: document.querySelector("#cards"),
};

const collator = new Intl.Collator("zh-Hans-CN");
const items = rawData.items.map((item, index) => {
  const tags = splitTags(item.theme_tags);
  return {
    ...item,
    index,
    tags,
    searchText: [
      item.id,
      item.book,
      item.source_file,
      item.source_chapter,
      item.wisdom_title,
      item.wisdom_text,
      item.theme_tags,
    ]
      .join(" ")
      .toLowerCase(),
  };
});

function splitTags(value) {
  return String(value || "")
    .split(";")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function countUnique(rows, getter) {
  return new Set(rows.map(getter).filter(Boolean)).size;
}

function countTags(rows) {
  const tags = new Set();
  rows.forEach((row) => row.tags.forEach((tag) => tags.add(tag)));
  return tags.size;
}

function getFilteredItems() {
  const tokens = state.query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return items.filter((item) => {
    if (state.book && item.book !== state.book) return false;
    if (state.tag && !item.tags.includes(state.tag)) return false;
    return tokens.every((token) => item.searchText.includes(token));
  });
}

function fillControls() {
  elements.datasetSummary.textContent = `${formatNumber(rawData.meta.totalItems)} 条智慧，来自 ${formatNumber(rawData.meta.totalBooks)} 本书。`;

  elements.bookSelect.innerHTML = "";
  elements.bookSelect.append(new Option("全部书籍", ""));
  rawData.books
    .slice()
    .sort((a, b) => collator.compare(a.name, b.name))
    .forEach((book) => {
      elements.bookSelect.append(new Option(`${book.name} (${book.count})`, book.name));
    });

  const fragment = document.createDocumentFragment();
  rawData.tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag.name;
    option.label = `${tag.name} (${tag.count})`;
    fragment.append(option);
  });
  elements.tagList.innerHTML = "";
  elements.tagList.append(fragment);
}

function renderTitle(rows) {
  const parts = [];
  if (state.book) parts.push(state.book);
  if (state.tag) parts.push(state.tag);
  if (state.query.trim()) parts.push(`“${state.query.trim()}”`);

  elements.resultTitle.textContent = parts.length ? parts.join(" / ") : "全部条目";
  elements.resultMeta.textContent = `${formatNumber(rows.length)} 条，${formatNumber(countUnique(rows, (row) => row.book))} 本书，${formatNumber(countTags(rows))} 个主题`;
}

function renderCards(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), totalPages);

  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);

  elements.pageInfo.textContent = `${state.page} / ${totalPages}`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;
  elements.cards.innerHTML = "";

  if (!pageRows.length) {
    elements.cards.innerHTML = '<div class="empty">没有匹配的条目</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  pageRows.forEach((item) => fragment.append(createCard(item)));
  elements.cards.append(fragment);
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "wisdom-card";

  const id = document.createElement("div");
  id.className = "card-id";
  id.textContent = item.id;

  const title = document.createElement("h3");
  title.textContent = item.wisdom_title;

  const text = document.createElement("p");
  text.textContent = item.wisdom_text;

  const meta = document.createElement("div");
  meta.className = "meta";
  [item.book, item.source_chapter, ...item.tags.slice(0, 3)].forEach((value) => {
    if (!value) return;
    const span = document.createElement("span");
    span.textContent = value;
    meta.append(span);
  });

  card.append(id, title, text, meta);
  return card;
}

function render() {
  const rows = getFilteredItems();
  renderTitle(rows);
  renderCards(rows);
}

function syncControls() {
  elements.searchInput.value = state.query;
  elements.bookSelect.value = state.book;
  elements.tagInput.value = state.tag;
}

function reset() {
  state.query = "";
  state.book = "";
  state.tag = "";
  state.page = 1;
  syncControls();
  render();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.page = 1;
    render();
  });

  elements.bookSelect.addEventListener("change", (event) => {
    state.book = event.target.value;
    state.page = 1;
    render();
  });

  elements.tagInput.addEventListener("change", (event) => {
    state.tag = event.target.value.trim();
    state.page = 1;
    render();
  });

  elements.tagInput.addEventListener("input", (event) => {
    if (!event.target.value.trim()) {
      state.tag = "";
      state.page = 1;
      render();
    }
  });

  elements.prevPage.addEventListener("click", () => {
    state.page -= 1;
    render();
  });

  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    render();
  });

  elements.resetBtn.addEventListener("click", reset);
}

fillControls();
bindEvents();
render();
