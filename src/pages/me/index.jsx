import { Textarea, Button, Text, View } from "@tarojs/components";
import * as React from "react";
import {
  useSession,
  Screen,
  Notice,
  api,
  handleAuthError,
  errorMessage,
} from "../../shared";
const RATINGS = [
    {
      value: "inspiring",
      label: "有启发",
    },
    {
      value: "not_relevant",
      label: "不太贴切",
    },
    {
      value: "unclear",
      label: "没看明白",
    },
  ],
  RATING_PLACEHOLDERS = {
    inspiring: "哪一点给了你新的启发？",
    not_relevant: "哪一点没有回应你的问题？",
    unclear: "哪一部分让你感到困惑？",
  };
let feedbackDraft = {
  rating: "not_relevant",
  content: "",
};
function MePage() {
  const session = useSession("me"),
    [rating, setRating] = React.useState(feedbackDraft.rating),
    [content, setContent] = React.useState(feedbackDraft.content),
    [message, setMessage] = React.useState(""),
    [submitting, setSubmitting] = React.useState(false),
    [submitted, setSubmitted] = React.useState(false),
    submitBusy = React.useRef(false);
  async function submitFeedback() {
    if (!submitBusy.current && !submitted)
      if (content.trim()) {
        {
          ((submitBusy.current = true), setSubmitting(true), setMessage(""));
          try {
            (await api.feedback(rating, content),
              (feedbackDraft = {
                rating: "not_relevant",
                content: "",
              }),
              setSubmitted(true),
              setMessage("感谢你的反馈，我们已收到。"));
          } catch (e) {
            handleAuthError(e, "me") || setMessage(errorMessage(e));
          } finally {
            ((submitBusy.current = false), setSubmitting(false));
          }
        }
      } else setMessage("请写下你的感受后再提交。");
  }
  return (
    <Screen page={"me"} title={"我的"}>
      <View className={"me-feedback"}>
        <View className={"me-feedback-body"}>
          <View className={"me-intro"}>
            <Text className={"ui-text me-headline"}>
              {"让你的思考"}
              {"\n"}
              {"被长期保存"}
            </Text>
            <Text className={"ui-text me-subtitle"}>
              {"从历史文字中，找到新的认识角度。"}
            </Text>
          </View>
          <View className={"me-feedback-form"}>
            <Text className={"ui-text me-feedback-title"}>
              {"这次使用，感觉如何？"}
            </Text>
            <Text className={"ui-text me-feedback-description"}>
              {"你的感受，会帮助我们判断哪些内容真正有价值。"}
            </Text>
            <View className={"me-ratings"}>
              {RATINGS.map((e) => (
                <Button
                  className={
                    "ui-button " +
                    ("me-rating" +
                      (rating === e.value ? " me-rating-selected" : ""))
                  }
                  aria-label={e.label}
                  aria-pressed={rating === e.value}
                  disabled={submitting}
                  onClick={() => {
                    (setRating(e.value),
                      (feedbackDraft = {
                        rating: e.value,
                        content: content,
                      }),
                      setSubmitted(false),
                      setMessage(""));
                  }}
                  key={e.value}
                >
                  {e.label}
                </Button>
              ))}
            </View>
            <View className={"me-feedback-input"}>
              <Textarea
                className={"ui-textarea me-feedback-textarea"}
                value={content}
                maxlength={300}
                disabled={submitting}
                placeholder={RATING_PLACEHOLDERS[rating]}
                placeholderClass={"me-feedback-placeholder"}
                aria-label={"反馈内容"}
                adjustPosition={true}
                cursorSpacing={90}
                onInput={(e) => {
                  const a = e.detail.value.slice(0, 300);
                  (setContent(a),
                    (feedbackDraft = {
                      rating: rating,
                      content: a,
                    }),
                    setSubmitted(false),
                    setMessage(""));
                }}
              />
              <Text className={"ui-text me-feedback-count"}>
                {content.length}
                {"/300"}
              </Text>
            </View>
            <Text className={"ui-text me-feedback-privacy"}>
              {"反馈仅用于产品改进，不会公开展示。"}
            </Text>
            <Button
              className={"ui-button me-feedback-submit"}
              onClick={submitFeedback}
              disabled={submitting || submitted}
            >
              {submitting ? "提交中…" : submitted ? "已提交" : "提交反馈"}
            </Button>
            <Notice>{session.error || message}</Notice>
            {session.error && (
              <Button
                className={"ui-button text-button"}
                onClick={session.retry}
              >
                {"重试"}
              </Button>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}
export { MePage as default };
