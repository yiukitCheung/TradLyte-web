/**
 * In-Lab lesson drawer. Lets any "what's this?" explainer open the existing
 * interactive education widget (IndicatorPlayground / CandleAnatomy) in a bottom
 * sheet — learn the concept without leaving the Strategy Lab.
 *
 * Reuses the education LESSONS registry; no lesson content is duplicated here.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import IndicatorPlayground from "@/components/education/IndicatorPlayground";
import CandleAnatomy from "@/components/education/CandleAnatomy";
import { LESSONS } from "@/components/education/lessons";

interface LessonDrawerCtx {
  /** Open a lesson by id (LESSONS key or "candle-anatomy"). Returns true if one exists. */
  openLesson: (lessonId: string) => boolean;
  /** Whether a lesson exists for this id (used to show/hide a "Try it" affordance). */
  hasLesson: (lessonId?: string) => boolean;
}

const Ctx = createContext<LessonDrawerCtx>({ openLesson: () => false, hasLesson: () => false });

export function useLessonDrawer() {
  return useContext(Ctx);
}

function lessonExists(id?: string): boolean {
  if (!id) return false;
  return id === "candle-anatomy" || Boolean(LESSONS[id]);
}

export function LessonDrawerProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const openLesson = useCallback((lessonId: string) => {
    if (!lessonExists(lessonId)) return false;
    setOpenId(lessonId);
    return true;
  }, []);

  const value = useMemo<LessonDrawerCtx>(
    () => ({ openLesson, hasLesson: lessonExists }),
    [openLesson],
  );

  const lesson = openId && openId !== "candle-anatomy" ? LESSONS[openId] : null;

  return (
    <Ctx.Provider value={value}>
      {children}
      <Drawer open={openId != null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DrawerContent className="max-h-[92vh]">
          <div className="mx-auto w-full max-w-[640px] overflow-y-auto px-5 pb-10">
            <DrawerHeader className="px-0">
              <DrawerTitle className="font-serif text-2xl font-medium text-fg-primary">
                Learn by doing
              </DrawerTitle>
              <DrawerDescription className="text-fg-secondary">
                Drag the control to see how it behaves, then close to keep building.
              </DrawerDescription>
            </DrawerHeader>
            {openId === "candle-anatomy" ? (
              <CandleAnatomy onComplete={() => setOpenId(null)} />
            ) : lesson ? (
              <IndicatorPlayground key={lesson.id} lesson={lesson} onComplete={() => setOpenId(null)} />
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </Ctx.Provider>
  );
}
