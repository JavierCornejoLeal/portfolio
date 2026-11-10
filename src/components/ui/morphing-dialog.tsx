import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, MotionConfig, motion, type Transition, type Variant } from "motion/react"

import { cn } from "@/lib/utils"

/*
 * Morphing dialog, after the motion-primitives API (MorphingDialog, Trigger, Container, Content, Image, Close).
 * The trigger and the content share a layoutId, so opening grows the trigger's box into the dialog and closing
 * shrinks it back. Adds `onOpenChange`, so an owner (the projects carousel) can pause while it is open.
 */

interface MorphingDialogContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  uniqueId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const MorphingDialogContext = React.createContext<MorphingDialogContextValue | null>(null)

function useMorphingDialog() {
  const context = React.useContext(MorphingDialogContext)
  if (!context) throw new Error("useMorphingDialog must be used within a MorphingDialog")
  return context
}

export function MorphingDialog({
  children,
  transition,
  onOpenChange
}: {
  children: React.ReactNode
  transition?: Transition
  onOpenChange?: (open: boolean) => void
}) {
  const [isOpen, setOpen] = React.useState(false)
  const uniqueId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const onOpenChangeRef = React.useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange

  const setIsOpen = React.useCallback((open: boolean) => {
    setOpen(open)
    onOpenChangeRef.current?.(open)
  }, [])

  const value = React.useMemo(() => ({ isOpen, setIsOpen, uniqueId, triggerRef }), [isOpen, setIsOpen, uniqueId])

  return (
    <MorphingDialogContext.Provider value={value}>
      <MotionConfig transition={transition} reducedMotion="user">{children}</MotionConfig>
    </MorphingDialogContext.Provider>
  )
}

export function MorphingDialogTrigger({
  children,
  className,
  style,
  "aria-label": ariaLabel
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  "aria-label"?: string
}) {
  const { isOpen, setIsOpen, uniqueId, triggerRef } = useMorphingDialog()
  return (
    <motion.button
      ref={triggerRef}
      type="button"
      layoutId={`dialog-${uniqueId}`}
      className={cn("relative cursor-pointer", className)}
      style={style}
      onClick={() => setIsOpen(!isOpen)}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={`motion-ui-morphing-dialog-content-${uniqueId}`}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  )
}

export function MorphingDialogContainer({ children }: { children: React.ReactNode }) {
  const { isOpen, setIsOpen, uniqueId } = useMorphingDialog()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // The page behind stays put while the dialog is open.
  React.useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = previous
    }
  }, [isOpen])

  if (!mounted) return null
  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <>
          <motion.div
            key={`backdrop-${uniqueId}`}
            className="fixed inset-0 z-[100] bg-ground/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center">{children}</div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function MorphingDialogContent({
  children,
  className,
  style,
  "aria-label": ariaLabel
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  "aria-label"?: string
}) {
  const { setIsOpen, uniqueId, triggerRef } = useMorphingDialog()
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const content = contentRef.current
    const trigger = triggerRef.current
    const focusables = () =>
      Array.from(content?.parentElement?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [])
    focusables()[0]?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
        return
      }
      if (event.key !== "Tab") return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      trigger?.focus({ preventScroll: true })
    }
  }, [setIsOpen, triggerRef])

  return (
    <motion.div
      ref={contentRef}
      layoutId={`dialog-${uniqueId}`}
      className={cn("pointer-events-auto", className)}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      id={`motion-ui-morphing-dialog-content-${uniqueId}`}
    >
      {children}
    </motion.div>
  )
}

export function MorphingDialogImage({
  src,
  alt,
  className,
  style
}: {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}) {
  const { uniqueId } = useMorphingDialog()
  return <motion.img src={src} alt={alt} draggable={false} className={cn(className)} layoutId={`dialog-img-${uniqueId}`} style={style} />
}

export function MorphingDialogClose({
  children,
  className,
  variants
}: {
  children?: React.ReactNode
  className?: string
  variants?: { initial: Variant; animate: Variant; exit: Variant }
}) {
  const { setIsOpen } = useMorphingDialog()
  return (
    <motion.button
      type="button"
      onClick={() => setIsOpen(false)}
      aria-label="Close dialog"
      className={cn("pointer-events-auto", className)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
    >
      {children}
    </motion.button>
  )
}
