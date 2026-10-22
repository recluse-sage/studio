import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { ArrowLeft, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { fetchPublicPosts, formatPostDate, readingMinutesFor } from "../api";
import type { PostItem, PostKind } from "../types";
import classes from "./ArticleView.module.css";

export type ArticleViewProps = {
  slug: string;
  kind: PostKind;
  backHref: string;
  backLabel: string;
  missingTitle: string;
  missingText: string;
  endpoint?: string;
};

function bodyParagraphs(item: PostItem): string[] {
  const source = (item.body ?? item.excerpt ?? "").trim();
  if (!source) return [];
  return source
    .split(/\n{2,}|\r\n\r\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function ArticleView({
  slug,
  kind,
  backHref,
  backLabel,
  missingTitle,
  missingText,
  endpoint,
}: ArticleViewProps) {
  const [item, setItem] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    fetchPublicPosts(endpoint, controller.signal)
      .then((result) => {
        if (!active) return;
        const found = result.items.find((row) => row.slug === slug && row.kind === kind) ?? null;
        setItem(found);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setItem(null);
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [endpoint, kind, slug]);

  if (loading) {
    return (
      <article className={classes.article} aria-busy="true">
        <p className={classes.status} role="status" aria-live="polite">
          Loading the note.
        </p>
      </article>
    );
  }

  if (loadError && !item) {
    return (
      <article className={classes.article}>
        <div className={classes.stateBox} role="alert">
          <p className={classes.stateTitle}>This note could not load just now.</p>
          <p className={classes.stateText}>
            Check your connection and try again. The intake stays open while you wait.
          </p>
          <div className={classes.stateActions}>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className={classes.ghostButton}
            >
              Try again
            </Button>
            <Button component="a" href={backHref} variant="subtle" className={classes.backButton}>
              <ArrowLeft weight="thin" aria-hidden="true" />
              <span>{backLabel}</span>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  if (!item) {
    return (
      <article className={classes.article}>
        <EmptyState
          title={missingTitle}
          description={missingText}
          action={
            <div className={classes.stateActions}>
              <Button component="a" href={backHref} variant="outline" className={classes.ghostButton}>
                <ArrowLeft weight="thin" aria-hidden="true" />
                <span>{backLabel}</span>
              </Button>
              <Button component="a" href="/#intake" className={classes.primaryButton}>
                <span>Send the intake</span>
                <ArrowRight weight="thin" aria-hidden="true" />
              </Button>
            </div>
          }
        />
      </article>
    );
  }

  const date = formatPostDate(item.publishedAt);
  const mins = readingMinutesFor(item);
  const paragraphs = bodyParagraphs(item);

  return (
    <article className={classes.article}>
      <p className={classes.kicker}>
        <a href={backHref} className={classes.backLink}>
          <ArrowLeft weight="thin" aria-hidden="true" />
          <span>{backLabel}</span>
        </a>
      </p>
      <h1 className={classes.title}>{item.title}</h1>
      <div className={classes.metaRow}>
        <span className={classes.date}>{date ?? "Draft note"}</span>
        <span className={classes.pill}>{mins} min read</span>
      </div>
      <p className={classes.shieldRow} role="note">
        <ShieldCheck weight="thin" aria-hidden="true" className={classes.shieldIcon} />
        <span>Written by our small studio from real work. Plain notes, no stock advice.</span>
      </p>
      <div className={classes.body}>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
        ) : (
          <p>Full text is coming with the first published note.</p>
        )}
      </div>
      <div className={classes.cta}>
        <p className={classes.ctaText}>
          Have a repeating task of your own? Send one line and we reply with plain next steps.
        </p>
        <Button component="a" href="/#intake" className={classes.primaryButton}>
          <span>Send the intake</span>
          <ArrowRight weight="thin" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
