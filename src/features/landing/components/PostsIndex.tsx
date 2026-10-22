import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { ArrowRight } from "@phosphor-icons/react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { fetchPublicPosts, formatPostDate, readingMinutesFor } from "../api";
import type { PostItem, PostKind } from "../types";
import classes from "./PostsIndex.module.css";

export type PostsIndexProps = {
  kind: PostKind;
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyText: string;
  endpoint?: string;
};

function postHref(basePath: string, slug: string): string {
  return `${basePath}/${slug}`;
}

export function PostsIndex({
  kind,
  basePath,
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyText,
  endpoint,
}: PostsIndexProps) {
  const [items, setItems] = useState<PostItem[]>([]);
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
        setItems(result.items.filter((item) => item.kind === kind));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [endpoint, kind]);

  return (
    <div className={classes.wrap}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      {loading ? (
        <p className={classes.status} role="status" aria-live="polite">
          Loading notes.
        </p>
      ) : loadError && items.length === 0 ? (
        <div className={classes.stateBox} role="alert">
          <p className={classes.stateTitle}>Notes could not load just now.</p>
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
            <Button component="a" href="/#intake" className={classes.primaryButton}>
              <span>Send the intake</span>
              <ArrowRight weight="thin" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyText}
          action={
            <Button component="a" href="/#intake" className={classes.primaryButton}>
              <span>Send the intake</span>
              <ArrowRight weight="thin" aria-hidden="true" />
            </Button>
          }
        />
      ) : (
        <ul className={classes.list}>
          {items.map((item) => {
            const date = formatPostDate(item.publishedAt);
            const mins = readingMinutesFor(item);
            return (
              <li key={item.slug} className={classes.cardItem}>
                <a href={postHref(basePath, item.slug)} className={classes.card}>
                  <h2 className={classes.cardTitle}>{item.title}</h2>
                  {item.excerpt ? <p className={classes.cardExcerpt}>{item.excerpt}</p> : null}
                  <p className={classes.cardMeta}>
                    {date ? <span>{date}</span> : <span>Draft note</span>}
                    <span className={classes.pill}>{mins} min read</span>
                  </p>
                  <span className={classes.cardLink}>
                    <span>Read the note</span>
                    <ArrowRight weight="thin" aria-hidden="true" className={classes.arrow} />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
