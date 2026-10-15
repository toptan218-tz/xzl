const objectValue = (e) =>
    e && "object" === typeof e && !Array.isArray(e) ? e : {},
  stringValue = (e) => ("string" === typeof e ? e : ""),
  payload = (e) => {
    var t;
    return objectValue(null != (t = objectValue(e).data) ? t : e);
  },
  arrayValue = (e) => (Array.isArray(e) ? e : []),
  firstString = (e, t) => t.map((t) => stringValue(e[t])).find(Boolean) || "";
function normalizeMaterials(e) {
  return arrayValue(e).map((e, t) => {
    var n;
    const r = objectValue(e);
    return {
      id: String(null != (n = r.id) ? n : t),
      viewpoint: stringValue(r.viewpoint),
      methods: arrayValue(r.methods).filter((e) => "string" === typeof e),
      guidance: stringValue(r.guidance),
      basis: {
        sources: arrayValue(objectValue(r.basis).sources).map((e) => {
          const t = objectValue(e),
            n = objectValue(t.work);
          return {
            work: {
              title: stringValue(n.title),
              date: stringValue(n.date),
            },
            source: objectValue(t.source),
          };
        }),
      },
    };
  });
}
function normalizeSearch(e, t = "") {
  const n = payload(e);
  if (!Array.isArray(n.materials))
    throw new Error("观点资料暂时无法读取，请重试。");
  return {
    input: stringValue(n.input) || t,
    materials: normalizeMaterials(n.materials),
  };
}
function normalizeFavorite(e) {
  var t;
  const n = payload(e),
    r = objectValue(null != (t = n.favorite) ? t : n);
  if (null == r.id) throw new Error("存档记录缺少编号。");
  return {
    id: String(r.id),
    question: stringValue(r.question),
    title: stringValue(r.title),
    note: stringValue(r.note),
    createdAt: stringValue(r.createdAt),
    categories: arrayValue(r.categories)
      .map((e) =>
        firstString(objectValue(e), [
          "categoryName",
          "name",
          "title",
          "label",
          "categoryId",
          "id",
        ]),
      )
      .filter(Boolean),
    materials: normalizeMaterials(r.materials),
  };
}
function normalizeList(e) {
  const t = payload(e),
    n = objectValue(t.data),
    r = Array.isArray(e)
      ? e
      : [t.items, t.favorites, t.results, n.items, n.favorites, n.results].find(
          Array.isArray,
        );
  if (!r) throw new Error("存档列表暂时无法读取。");
  return {
    items: arrayValue(r).map(normalizeFavorite),
    nextCursor: "string" === typeof t.nextCursor ? t.nextCursor : null,
  };
}
const mergeFavorites = (e, t) => [
  ...new Map([...e, ...t].map((e) => [e.id, e])).values(),
];
function normalizeStats(e) {
  var t, n;
  const r = payload(e),
    s = [],
    a = (e) => {
      var t, n, r, a;
      for (const [i, o] of Object.entries(e)) {
        if (!Array.isArray(o)) continue;
        const e = /thought|key/i.test(i) ? "thought_key" : "problem_prototype";
        for (const i of o) {
          const o = objectValue(i),
            l = firstString(o, [
              "categoryId",
              "prototypeId",
              "keyId",
              "id",
              "code",
            ]);
          l &&
            s.push({
              id: l,
              type: stringValue(null != (t = o.categoryType) ? t : o.type) || e,
              name:
                firstString(o, ["categoryName", "name", "title", "label"]) || l,
              count: Number(
                null !=
                  (a =
                    null != (r = null != (n = o.count) ? n : o.favoriteCount)
                      ? r
                      : o.total)
                  ? a
                  : 0,
              ),
            });
        }
      }
    };
  (a(r), Object.values(r).forEach((e) => a(objectValue(e))));
  const i = Number(
    null != (n = null != (t = r.totalFavorites) ? t : r.total) ? n : r.count,
  );
  return {
    totalFavorites: Number.isFinite(i) && i >= 0 ? i : null,
    categories: [...new Map(s.map((e) => [`${e.type}:${e.id}`, e])).values()],
  };
}
function normalizeArticle(e) {
  const t = payload(e),
    n = objectValue(t.article),
    r = objectValue(t.original);
  return {
    historicalContext: stringValue(n.historicalContext),
    text:
      stringValue(r.text) ||
      arrayValue(r.paragraphs)
        .map((e) => stringValue(objectValue(e).text))
        .filter(Boolean)
        .join("\n\n"),
  };
}
export {
  payload,
  normalizeSearch,
  normalizeFavorite,
  normalizeList,
  normalizeStats,
  normalizeArticle,
  mergeFavorites,
};
