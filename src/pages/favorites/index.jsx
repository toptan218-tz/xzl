import { showModal } from "@tarojs/taro";
import {
  Textarea,
  Input,
  ScrollView,
  Button,
  Text,
  View,
} from "@tarojs/components";
import * as React from "react";
import {
  useSession,
  Screen,
  Notice,
  FavoriteSnapshot,
  api,
  handleAuthError,
  errorMessage,
  mergeFavorites,
  storage,
  go,
} from "../../shared";
function FavoritesPage() {
  var p;
  const session = useSession("favorites"),
    [favorites, setFavorites] = React.useState([]),
    [statistics, setStatistics] = React.useState(null),
    [selectedCategory, setSelectedCategory] = React.useState(""),
    [cursor, setCursor] = React.useState(null),
    [loading, setLoading] = React.useState(false),
    [error, setError] = React.useState(""),
    [statsError, setStatsError] = React.useState(""),
    [detail, setDetail] = React.useState(null),
    [openId, setOpenId] = React.useState(""),
    [title, setTitle] = React.useState(""),
    [note, setNote] = React.useState(""),
    [saving, setSaving] = React.useState(false),
    [message, setMessage] = React.useState(""),
    listSequence = React.useRef(0),
    detailSequence = React.useRef(0),
    listBusy = React.useRef(false),
    saveBusy = React.useRef(false),
    seenCursors = React.useRef(new Set());
  async function loadStatistics() {
    try {
      const e = await api.stats();
      (setStatistics(e), setStatsError(""));
    } catch (e) {
      handleAuthError(e, "favorites") || setStatsError(errorMessage(e));
    }
  }
  async function loadFavorites(e = selectedCategory, s = false) {
    if (s && (listBusy.current || !cursor)) return;
    const t = ++listSequence.current;
    ((listBusy.current = true),
      setLoading(true),
      setError(""),
      s || (setFavorites([]), setCursor(null), seenCursors.current.clear()));
    try {
      const n =
          null == statistics
            ? void 0
            : statistics.categories.find((s) => `${s.type}:${s.id}` === e),
        l = await api.list({
          categoryType: null == n ? void 0 : n.type,
          categoryId: null == n ? void 0 : n.id,
          cursor: s && null != cursor ? cursor : void 0,
        });
      if (t !== listSequence.current) return;
      if (s && l.nextCursor && seenCursors.current.has(l.nextCursor))
        throw new Error("存档分页暂时无法继续，请重新加载。");
      (l.nextCursor && seenCursors.current.add(l.nextCursor),
        setFavorites((e) => mergeFavorites(s ? e : [], l.items)),
        setCursor(l.nextCursor));
    } catch (n) {
      t !== listSequence.current ||
        handleAuthError(n, "favorites") ||
        setError(errorMessage(n));
    } finally {
      t === listSequence.current &&
        ((listBusy.current = false), setLoading(false));
    }
  }
  function selectCategory(e) {
    (setSelectedCategory(e),
      detailSequence.current++,
      setDetail(null),
      setOpenId(""),
      loadFavorites(e));
  }
  async function loadDetail() {
    if (openId === s.id)
      return (detailSequence.current++, setOpenId(""), void setDetail(null));
    const e = ++detailSequence.current;
    (setOpenId(s.id), setDetail(null), setError(""));
    try {
      const t = await api.detail(s.id);
      if (e !== detailSequence.current) return;
      (setDetail(t), setTitle(t.title), setNote(t.note));
    } catch (t) {
      e !== detailSequence.current ||
        handleAuthError(t, "favorites") ||
        (setOpenId(""), setError(errorMessage(t)));
    }
  }
  async function saveDetail() {
    if (detail && !saveBusy.current) {
      ((saveBusy.current = true), setSaving(true));
      try {
        (await api.edit(detail.id, title, note),
          setDetail(await api.detail(detail.id)),
          setMessage("存档已更新。"),
          await Promise.all([loadFavorites(), loadStatistics()]));
      } catch (e) {
        handleAuthError(e, "favorites") || setError(errorMessage(e));
      } finally {
        ((saveBusy.current = false), setSaving(false));
      }
    }
  }
  async function deleteDetail() {
    if (!detail || saveBusy.current) return;
    const e = detail.id,
      s = await showModal({
        title: "删除存档",
        content: "确定删除这条存档吗？",
      });
    if (s.confirm && !saveBusy.current) {
      ((saveBusy.current = true), setSaving(true));
      try {
        (await api.remove(e),
          detailSequence.current++,
          setDetail(null),
          setOpenId(""),
          setMessage("存档已删除。"),
          await Promise.all([loadFavorites(), loadStatistics()]));
      } catch (t) {
        handleAuthError(t, "favorites") || setError(errorMessage(t));
      } finally {
        ((saveBusy.current = false), setSaving(false));
      }
    }
  }
  React.useEffect(
    () => (
      session.user && (loadFavorites(), loadStatistics()),
      () => {
        (listSequence.current++, detailSequence.current++);
      }
    ),
    [session.user],
  );
  const research = (e) => {
    (storage.set("xinzhili_draft", e.question), go("home"));
  };
  return (
    <Screen page={"favorites"} title={"存档"}>
      <View className={"section-heading"}>
        <Text className={"ui-text page-title"}>{"我的问题存档"}</Text>
        <Text className={"ui-text total"}>
          {null != (p = null == statistics ? void 0 : statistics.totalFavorites)
            ? p
            : "—"}
        </Text>
      </View>
      <Notice>{session.error}</Notice>
      {session.error && (
        <Button className={"ui-button outline"} onClick={session.retry}>
          {"重试"}
        </Button>
      )}
      <View className={"section-heading"}>
        <Text className="ui-text">{"我常遇到的问题结构"}</Text>
        <Button
          className={"ui-button text-button"}
          disabled={saving}
          onClick={() => selectCategory("")}
        >
          {"查看全部"}
        </Button>
      </View>
      <Notice>{statsError}</Notice>
      {statsError && (
        <Button className={"ui-button outline"} onClick={loadStatistics}>
          {"重试统计"}
        </Button>
      )}
      {statistics && (
        <ScrollView
          scrollY={true}
          className={"topics"}
          style={{
            height: 38 * Math.min(statistics.categories.length, 5) + "px",
          }}
        >
          {statistics.categories.map((e) => (
            <Button
              className={
                "ui-button " +
                (selectedCategory === `${e.type}:${e.id}`
                  ? "topic active"
                  : "topic")
              }
              disabled={saving}
              onClick={() =>
                selectCategory(
                  selectedCategory === `${e.type}:${e.id}`
                    ? ""
                    : `${e.type}:${e.id}`,
                )
              }
              key={`${e.type}:${e.id}`}
            >
              <Text className="ui-text">{e.name}</Text>
              <View className={"track"}>
                <View
                  className={"fill"}
                  style={{
                    width:
                      (e.count /
                        Math.max(
                          ...statistics.categories.map((e) => e.count),
                          1,
                        )) *
                        100 +
                      "%",
                  }}
                />
              </View>
              <Text className="ui-text">{e.count}</Text>
            </Button>
          ))}
        </ScrollView>
      )}
      {!session.user && (
        <Button className="outline ui-button" onClick={() => loadFavorites()}>
          读取我的存档
        </Button>
      )}
      <Notice>{message}</Notice>
      <Notice>{error}</Notice>
      {error && (
        <Button className={"ui-button outline"} onClick={() => loadFavorites()}>
          {"重新加载"}
        </Button>
      )}
      <View className={"section-heading"}>
        <Text className="ui-text">{"最近的问题"}</Text>
        <Text className={"ui-text muted"}>
          {"已加载 "}
          {favorites.length}
          {" 条"}
        </Text>
      </View>
      <View className={"timeline"}>
        {favorites.map((e) => (
          <View className={"timeline-item"} key={e.id}>
            <Button
              className={"ui-button record-row"}
              disabled={saving}
              onClick={() => loadDetail(e)}
            >
              <Text className={"ui-text date"}>
                {e.createdAt.slice(0, 10).replace(/-/g, ".")}
              </Text>
              <Text className={"ui-text record-question"}>
                {e.title || e.question}
              </Text>
              {!!e.categories.length && (
                <Text className={"ui-text badge"}>{e.categories[0]}</Text>
              )}
            </Button>
            {openId === e.id && (
              <View className={"favorite-detail"}>
                {detail ? (
                  <React.Fragment>
                    <View className={"section-heading"}>
                      <Text className="ui-text">{"存档详情"}</Text>
                      <Button
                        className={"ui-button text-button"}
                        disabled={saving}
                        onClick={() => {
                          (detailSequence.current++,
                            setOpenId(""),
                            setDetail(null));
                        }}
                      >
                        {"关闭"}
                      </Button>
                    </View>
                    <Text className={"ui-text prose"}>{detail.question}</Text>
                    <Text className={"ui-text label"}>{"标题"}</Text>
                    <Input
                      className={"ui-input field"}
                      value={title}
                      maxlength={100}
                      disabled={saving}
                      onInput={(e) => setTitle(e.detail.value)}
                    />
                    <Text className={"ui-text label"}>{"备注"}</Text>
                    <Textarea
                      className={"ui-textarea field note"}
                      value={note}
                      maxlength={1e3}
                      disabled={saving}
                      onInput={(e) => setNote(e.detail.value)}
                    />
                    <View className={"actions"}>
                      <Button
                        className={"ui-button outline"}
                        onClick={deleteDetail}
                        disabled={saving}
                      >
                        {"删除"}
                      </Button>
                      <Button
                        className={"ui-button primary"}
                        onClick={saveDetail}
                        disabled={saving}
                      >
                        {saving ? "保存中…" : "保存修改"}
                      </Button>
                    </View>
                    <FavoriteSnapshot
                      favorite={detail}
                      onResearch={() => research(detail)}
                    />
                  </React.Fragment>
                ) : (
                  <Notice>{"正在读取详情…"}</Notice>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
      {loading && <Notice>{"正在读取存档…"}</Notice>}
      {!loading && !error && !favorites.length && (
        <Notice>
          {selectedCategory ? "该分类下暂无存档。" : "还没有存档的问题。"}
        </Notice>
      )}
      {cursor && (
        <Button
          className={"ui-button outline load-more"}
          disabled={loading || saving}
          onClick={() => loadFavorites(selectedCategory, true)}
        >
          {"加载更多"}
        </Button>
      )}
    </Screen>
  );
}
export { FavoritesPage as default };
