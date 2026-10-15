import { Textarea, Text, View, Button } from "@tarojs/components";
import * as React from "react";
import {
  useShare,
  useSession,
  storage,
  Screen,
  Notice,
  Materials,
  api,
  handleAuthError,
  errorMessage,
  go,
} from "../../shared";
const EXAMPLES = [
  "团队一直在争论方向，每个人都有道理，但事情迟迟无法推进。",
  "我掌握的信息很多，却越来越难判断什么才是最重要的问题。",
  "一个新项目刚起步，资源很少，也看不到短期胜算，该怎么看？",
];
function HomePage() {
  useShare();
  const session = useSession("home"),
    [question, setQuestion] = React.useState(() =>
      storage.get("xinzhili_draft"),
    ),
    [result, setResult] = React.useState(null),
    [searching, setSearching] = React.useState(false),
    [searchError, setSearchError] = React.useState(""),
    [saving, setSaving] = React.useState(false),
    [saved, setSaved] = React.useState(false),
    [saveMessage, setSaveMessage] = React.useState(""),
    requestSequence = React.useRef(0),
    searchBusy = React.useRef(false),
    saveBusy = React.useRef(false);
  function updateQuestion(e) {
    (setQuestion(e), storage.set("xinzhili_draft", e));
  }
  async function search(e = question) {
    if (searchBusy.current || !e.trim()) return;
    searchBusy.current = true;
    const s = ++requestSequence.current;
    (setSearching(true),
      setSearchError(""),
      setResult(null),
      setSaveMessage(""));
    try {
      const r = await api.search(e.trim());
      s === requestSequence.current && (setResult(r), setSaved(false));
    } catch (r) {
      s !== requestSequence.current ||
        handleAuthError(r, "home") ||
        setSearchError(errorMessage(r));
    } finally {
      s === requestSequence.current &&
        ((searchBusy.current = false), setSearching(false));
    }
  }
  async function saveFavorite() {
    var e;
    if (result && !saveBusy.current && !saved) {
      ((saveBusy.current = true), setSaving(true), setSaveMessage(""));
      try {
        const s = await api.stats();
        if (null === s.totalFavorites)
          throw new Error("存档额度暂时无法读取，请重试。");
        if (s.totalFavorites >= 5) {
          let s,
            r = false;
          const t = new Set();
          do {
            const n = await api.list({
              cursor: s,
            });
            if (
              ((r = n.items.some(
                (e) =>
                  e.question.trim().replace(/\s+/g, " ") ===
                  result.input.trim().replace(/\s+/g, " "),
              )),
              r)
            )
              break;
            if (n.nextCursor && t.has(n.nextCursor))
              throw new Error("存档分页异常，请重试。");
            ((s = null != (e = n.nextCursor) ? e : void 0), s && t.add(s));
          } while (s);
          if (!r)
            return (
              storage.set("xinzhili_paywall_question", result.input),
              void go("upgrade", "source=limit")
            );
        }
        const r = await api.create(result.input);
        (setSaved(true),
          setSaveMessage(
            false === r.created
              ? "这个问题已经存档。"
              : true === r.created
                ? "已保存到我的存档。"
                : "问题已存档。",
          ));
      } catch (s) {
        (s instanceof Error &&
          "这个问题已经收藏过了。" === s.message &&
          setSaved(true),
          handleAuthError(s, "home") || setSaveMessage(errorMessage(s)));
      } finally {
        ((saveBusy.current = false), setSaving(false));
      }
    }
  }
  return (
    React.useEffect(
      () => () => {
        requestSequence.current++;
      },
      [],
    ),
    (
      <Screen page={"home"} compactHome={!result}>
        <Notice>{session.error}</Notice>
        {session.error && (
          <Button className={"ui-button outline"} onClick={session.retry}>
            {"重试登录状态检查"}
          </Button>
        )}
        {
          <React.Fragment>
            {result ? (
              <View>
                <View className={"question-heading"}>
                  <Text className={"ui-text eyebrow"}>{"你的问题"}</Text>
                  <Text className={"ui-text viewpoint"}>{result.input}</Text>
                  <View className={"actions"}>
                    <Button
                      className={"ui-button outline"}
                      onClick={saveFavorite}
                      disabled={saving || saved}
                    >
                      {saving ? "保存中…" : saved ? "已存档" : "收藏问题"}
                    </Button>
                    <Button
                      className={"ui-button text-button"}
                      onClick={() => {
                        (requestSequence.current++, setResult(null));
                      }}
                    >
                      {"换一个问题"}
                    </Button>
                  </View>
                  <Notice>{saveMessage}</Notice>
                </View>
                <View className={"section-heading"}>
                  <Text className="ui-text">{"相关观点"}</Text>
                  <Text className="ui-text">{result.materials.length}</Text>
                </View>
                {result.materials.length ? (
                  <Materials
                    items={result.materials}
                    onResearch={() => search(result.input)}
                  />
                ) : (
                  <Notice>
                    {
                      "暂未检索到相关的已核验观点。你可以保留问题，稍后重新检索。"
                    }
                  </Notice>
                )}
                <Button
                  className={"ui-button outline"}
                  onClick={() => search(result.input)}
                  disabled={searching}
                >
                  {"重新检索"}
                </Button>
              </View>
            ) : (
              <View className={"home-input"}>
                <View className={"hero"}>
                  <Text className="ui-text">{"把你的难题"}</Text>
                  <Text className={"ui-text hero-accent"}>{"写下来"}</Text>
                </View>
                <Text className={"ui-text tagline"}>
                  {"面对困难，想想那些经过实践检验的文字"}
                </Text>
                <View className={"input-panel"}>
                  <Textarea
                    className={"ui-textarea question-input"}
                    value={question}
                    maxlength={1200}
                    disabled={searching}
                    onInput={(e) => updateQuestion(e.detail.value)}
                    placeholder={
                      "例如：团队内部对下一步方向分歧很大，讨论了很久，却始终无法形成行动……"
                    }
                  />
                  <View className={"input-footer"}>
                    <Text className={"ui-text date"}>
                      {question.length}
                      {"/1200"}
                    </Text>
                  </View>
                </View>
                <Button
                  className={"ui-button primary submit"}
                  disabled={!question.trim() || searching}
                  onClick={() => search()}
                >
                  {searching ? "正在翻阅…" : "看看他老人家怎么说"}
                </Button>
                <Notice>{searchError}</Notice>
                {searchError && (
                  <Button
                    className={"ui-button outline"}
                    onClick={() => search()}
                  >
                    {"保留问题，重新检索"}
                  </Button>
                )}
                <View className={"examples"}>
                  <Text className={"ui-text examples-label"}>
                    {"试试这些问题"}
                  </Text>
                  {EXAMPLES.map((e) => (
                    <Button
                      className={"ui-button example"}
                      disabled={searching}
                      onClick={() => {
                        (updateQuestion(e), search(e));
                      }}
                      key={e}
                    >
                      {e}
                    </Button>
                  ))}
                </View>
              </View>
            )}
          </React.Fragment>
        }
      </Screen>
    )
  );
}
export { HomePage as default };
