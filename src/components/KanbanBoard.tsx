"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useBooksByStage } from "@/hooks/useBooks";
import { useIsMobile } from "@/hooks/useIsMobile";
import { moveBookToPosition } from "@/lib/books";
import { STAGES, STAGE_CONFIG } from "@/lib/constants";
import type { Stage, Book } from "@/lib/types";
import { matchesSearch } from "@/lib/search";
import { getUniqueQuotes } from "@/lib/quotes";
import { useTranslation } from "@/lib/preferences";
import StageTabs from "./StageTabs";
import AddButton from "./AddButton";
import BookCard from "./BookCard";
import SortableBookCard from "./SortableBookCard";
import SwipeableBookCard from "./SwipeableBookCard";
import EmptyState from "./EmptyState";

interface KanbanBoardProps {
  searchQuery?: string;
  scrollToBookId?: string | null;
  onScrollToBook?: (bookId: string | null) => void;
  onClearSearch?: () => void;
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto space-y-2 px-1 pb-2 min-h-[100px] rounded-lg transition-colors ${
        isOver ? "bg-forest/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function KanbanBoard({
  searchQuery = "",
  scrollToBookId = null,
  onScrollToBook,
  onClearSearch,
}: KanbanBoardProps) {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTabState] = useState<Stage>("tsundoku");

  // Initialize from URL on mount (client-side only, avoids SSR mismatch)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stage = params.get("stage");
    if (STAGES.includes(stage as Stage)) {
      setActiveTabState(stage as Stage);
    }
  }, []);

  const setActiveTab = useCallback((stage: Stage) => {
    setActiveTabState(stage);
    window.history.replaceState(null, "", `/?stage=${stage}`);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const stage = params.get("stage");
      if (STAGES.includes(stage as Stage)) {
        setActiveTabState(stage as Stage);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const booksByStage = useBooksByStage();
  const isMobile = useIsMobile();

  const preSearchTab = useRef<Stage | null>(null);
  const autoSwitched = useRef(false);

  const handleTabChange = useCallback(
    (stage: Stage) => {
      autoSwitched.current = false;
      setActiveTab(stage);
    },
    [setActiveTab]
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      if (!preSearchTab.current) {
        preSearchTab.current = activeTab;
      }
    } else {
      if (preSearchTab.current) {
        setActiveTab(preSearchTab.current);
        preSearchTab.current = null;
        autoSwitched.current = false;
      }
    }
  }, [searchQuery, activeTab, setActiveTab]);

  const filteredByStage = useMemo(() => {
    if (!booksByStage || !searchQuery.trim()) return booksByStage;
    const result: Record<Stage, Book[]> = {
      a_acheter: [],
      tsundoku: [],
      bibliotheque: [],
      revendre: [],
    };
    for (const stage of STAGES) {
      result[stage] = booksByStage[stage].filter((book) =>
        matchesSearch(book, searchQuery)
      );
    }
    return result;
  }, [booksByStage, searchQuery]);

  useEffect(() => {
    if (!isMobile || !filteredByStage || !searchQuery.trim()) return;

    // If we auto-switched away and original tab now has results, snap back
    if (autoSwitched.current && preSearchTab.current && filteredByStage[preSearchTab.current].length > 0) {
      autoSwitched.current = false;
      setActiveTab(preSearchTab.current);
      return;
    }

    // If current tab has results, stay
    if (filteredByStage[activeTab].length > 0) return;

    // Current tab empty — find the tab with the most matches
    let bestStage: Stage | null = null;
    let bestCount = 0;
    for (const stage of STAGES) {
      const count = filteredByStage[stage].length;
      if (count > bestCount) {
        bestCount = count;
        bestStage = stage;
      }
    }
    if (bestStage) {
      autoSwitched.current = true;
      setActiveTab(bestStage);
    }
  }, [filteredByStage, searchQuery, activeTab, isMobile, setActiveTab]);

  const uniqueQuotes = useMemo(() => {
    const quotes = getUniqueQuotes(STAGES.length, locale);
    return Object.fromEntries(STAGES.map((s, i) => [s, quotes[i]])) as Record<Stage, (typeof quotes)[number]>;
  }, [locale]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [virtualItems, setVirtualItems] = useState<Record<Stage, string[]> | null>(null);
  const initialVirtualItemsRef = useRef<Record<Stage, string[]> | null>(null);
  const isSearching = Boolean(searchQuery.trim());

  // Map of all books by ID for rendering from virtualItems
  const allBooksMap = useMemo(() => {
    if (!filteredByStage) return new Map<string, Book>();
    const map = new Map<string, Book>();
    for (const stage of STAGES) {
      for (const book of filteredByStage[stage]) {
        map.set(book.id, book);
      }
    }
    return map;
  }, [filteredByStage]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const bookId = event.active.id as string;
      if (!filteredByStage) return;
      for (const stage of STAGES) {
        const found = filteredByStage[stage].find((b) => b.id === bookId);
        if (found) {
          setActiveBook(found);
          break;
        }
      }
      // Snapshot book IDs for cross-column placeholder tracking
      const snapshot: Record<Stage, string[]> = {} as Record<Stage, string[]>;
      for (const stage of STAGES) {
        snapshot[stage] = filteredByStage[stage].map((b) => b.id);
      }
      setVirtualItems(snapshot);
      initialVirtualItemsRef.current = snapshot;
    },
    [filteredByStage]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (isSearching) return;

      setVirtualItems((prev) => {
        if (!prev) return prev;

        const activeId = event.active.id as string;
        const over = event.over;
        if (!over) return prev;
        const overId = over.id as string;
        if (activeId === overId) return prev;

        // Find which container has the active item
        let activeContainer: Stage | null = null;
        for (const stage of STAGES) {
          if (prev[stage].includes(activeId)) {
            activeContainer = stage;
            break;
          }
        }
        if (!activeContainer) return prev;

        // Find which container has the over item
        let overContainer: Stage | null = null;
        if (STAGES.includes(overId as Stage)) {
          overContainer = overId as Stage;
        } else {
          for (const stage of STAGES) {
            if (prev[stage].includes(overId)) {
              overContainer = stage;
              break;
            }
          }
        }
        if (!overContainer) return prev;

        if (activeContainer === overContainer) {
          // Within-container: reorder
          const items = [...prev[activeContainer]];
          const activeIndex = items.indexOf(activeId);
          const overIndex = items.indexOf(overId);
          if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return prev;
          items.splice(activeIndex, 1);
          items.splice(overIndex, 0, activeId);
          return { ...prev, [activeContainer]: items };
        }

        // Cross-container: move item from source to target
        const newItems = { ...prev };
        newItems[activeContainer] = prev[activeContainer].filter((id) => id !== activeId);
        const targetItems = [...prev[overContainer]];
        if (STAGES.includes(overId as Stage)) {
          targetItems.push(activeId);
        } else {
          const overIndex = targetItems.indexOf(overId);
          targetItems.splice(overIndex !== -1 ? overIndex : targetItems.length, 0, activeId);
        }
        newItems[overContainer] = targetItems;
        return newItems;
      });
    },
    [isSearching]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const currentVirtualItems = virtualItems;
      setActiveBook(null);
      initialVirtualItemsRef.current = null;
      // Keep virtualItems alive so the card stays in the target column
      // during the DragOverlay drop animation and DB write

      if (isSearching || !currentVirtualItems) {
        setVirtualItems(null);
        return;
      }

      const { active, over } = event;
      if (!over) {
        setVirtualItems(null);
        return;
      }

      const bookId = active.id as string;

      // Find target stage and position from virtualItems
      let targetStage: Stage | null = null;
      let bookIndex = -1;
      for (const stage of STAGES) {
        const idx = currentVirtualItems[stage].indexOf(bookId);
        if (idx !== -1) {
          targetStage = stage;
          bookIndex = idx;
          break;
        }
      }
      if (!targetStage || bookIndex === -1) {
        setVirtualItems(null);
        return;
      }

      // targetIndex = book's position in virtualItems (matches what moveBookToPosition expects)
      const targetIndex = bookIndex;

      // Skip if same position
      if (filteredByStage) {
        for (const stage of STAGES) {
          const idx = filteredByStage[stage].findIndex((b) => b.id === bookId);
          if (idx !== -1) {
            if (stage === targetStage && idx === targetIndex) {
              setVirtualItems(null);
              return;
            }
            break;
          }
        }
      }

      await moveBookToPosition(bookId, targetStage, targetIndex);
      setVirtualItems(null);
    },
    [isSearching, virtualItems, filteredByStage]
  );

  const handleMobileDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveBook(null);
      if (isSearching) return;

      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const bookId = active.id as string;
      const books = filteredByStage ? filteredByStage[activeTab] : [];
      const overIndex = books.findIndex((b) => b.id === (over.id as string));
      if (overIndex === -1) return;
      await moveBookToPosition(bookId, activeTab, overIndex);
    },
    [isSearching, filteredByStage, activeTab]
  );

  const handleDragCancel = useCallback(() => {
    setActiveBook(null);
    setVirtualItems(null);
    initialVirtualItemsRef.current = null;
  }, []);

  const handleSearchResultClick = useCallback(
    (e: React.MouseEvent, book: Book) => {
      if (!searchQuery.trim()) return;
      e.preventDefault();
      // Reset preSearchTab so the restoration effect doesn't override the teleport tab switch
      preSearchTab.current = null;
      // Record which book to scroll to
      onScrollToBook?.(book.id);
      // Switch to the correct tab on mobile
      if (isMobile) {
        setActiveTab(book.stage);
      }
      // Clear search (re-enables DnD and shows all books)
      onClearSearch?.();
    },
    [searchQuery, onScrollToBook, onClearSearch, isMobile, setActiveTab]
  );

  useEffect(() => {
    if (!scrollToBookId) return;

    // Small delay to let DOM update after search clears and tab switches
    const timer = setTimeout(() => {
      const element = document.querySelector(`[data-book-id="${CSS.escape(scrollToBookId)}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("glow-highlight");
        setTimeout(() => {
          element.classList.remove("glow-highlight");
        }, 2000);
      }
      onScrollToBook?.(null);
    }, 100);

    return () => clearTimeout(timer);
  }, [scrollToBookId, onScrollToBook]);

  if (!filteredByStage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-forest/30 text-sm">{t("loading")}</div>
      </div>
    );
  }

  const counts = {
    a_acheter: filteredByStage.a_acheter.length,
    tsundoku: filteredByStage.tsundoku.length,
    bibliotheque: filteredByStage.bibliotheque.length,
    revendre: filteredByStage.revendre.length,
  };

  if (isMobile) {
    const books = filteredByStage[activeTab];

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleMobileDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-col h-full">
          <StageTabs active={activeTab} counts={counts} onChange={handleTabChange} searchActive={isSearching} />

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <SortableContext
              items={books.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {books.length === 0 ? (
                isSearching ? (
                  <p className="text-center text-sm text-forest/30 py-8">{t("noResults")}</p>
                ) : (
                  <EmptyState quote={uniqueQuotes[activeTab]} />
                )
              ) : (
                books.map((book) => (
                  <SortableBookCard
                    key={book.id}
                    book={book}
                    isDragDisabled={isSearching}
                    isMobile
                    onClick={isSearching ? (e) => handleSearchResultClick(e, book) : undefined}
                  />
                ))
              )}
            </SortableContext>
          </div>

          <AddButton stage={activeTab} />
        </div>
        <DragOverlay dropAnimation={null}>
          {activeBook ? (
            <div className="opacity-90 shadow-lg rounded-xl">
              <BookCard book={activeBook} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 p-4 md:p-6 h-full overflow-hidden">
        {STAGES.map((stage) => {
          const itemIds = virtualItems ? virtualItems[stage] : filteredByStage[stage].map((b) => b.id);
          return (
            <div key={stage} className="flex-1 min-w-0 flex flex-col rounded-xl p-2 bg-cream/50">
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <h2 className="text-xs font-semibold tracking-widest uppercase text-forest/60">
                  {t(STAGE_CONFIG[stage].labelKey)}
                </h2>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-forest/10 text-forest/60 text-xs font-medium">
                  {counts[stage]}
                </span>
                <Link
                  href={`/add?stage=${stage}`}
                  className="ml-auto text-forest/30 hover:text-forest/60 transition-colors"
                  aria-label={t("kanban_addBookToStage").replace("{stage}", t(STAGE_CONFIG[stage].labelKey))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                </Link>
              </div>
              <DroppableColumn id={stage}>
                <SortableContext
                  items={itemIds}
                  strategy={verticalListSortingStrategy}
                >
                  {itemIds.length === 0 ? (
                    searchQuery.trim() ? (
                      <p className="text-center text-sm text-forest/30 py-8">{t("noResults")}</p>
                    ) : (
                      <EmptyState quote={uniqueQuotes[stage]} />
                    )
                  ) : (
                    itemIds.map((id) => {
                      const book = allBooksMap.get(id);
                      if (!book) return null;
                      return (
                        <SortableBookCard
                          key={id}
                          book={book}
                          isDragDisabled={isSearching}
                          onClick={(e) => handleSearchResultClick(e, book)}
                        />
                      );
                    })
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeBook ? (
          <div className="opacity-90 shadow-lg rounded-xl">
            <BookCard book={activeBook} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
