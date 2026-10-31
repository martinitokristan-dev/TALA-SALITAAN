import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type TIconName } from './TIcon'

/* ── ⋯ action menu ──────────────────────────────────────────
 * Row actions live behind one "more" button. The menu opens next to it
 * (rendered in a portal, so table scroll areas never clip it), animates in,
 * closes on outside click / Esc / scroll, and supports arrow keys.
 * Destructive items go last, in red, after a divider. */

export interface MenuItem {
  label: string
  icon: TIconName
  onSelect: () => void
  danger?: boolean
  hint?: string
}

export function ActionMenu({ items, label = 'Mga gagawin' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const safe = items.filter((i) => !i.danger)
  const danger = items.filter((i) => i.danger)

  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const r = trigger.current.getBoundingClientRect()
    const width = 232
    const height = items.length * 42 + (danger.length && safe.length ? 9 : 0) + 12
    const up = r.bottom + height + 8 > window.innerHeight && r.top > height
    setPos({ top: up ? r.top - height - 6 : r.bottom + 6, left: Math.max(8, r.right - width), up })
  }, [open, items.length, danger.length, safe.length])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (menu.current?.contains(e.target as Node) || trigger.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length
        buttons[next]?.focus()
      }
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    // Focus the first item for keyboard users.
    requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true }))
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const renderItem = (item: MenuItem) => (
    <button
      key={item.label}
      type="button"
      role="menuitem"
      className={`tp-menu-item ${item.danger ? 'is-danger' : ''}`}
      onClick={() => {
        setOpen(false)
        item.onSelect()
      }}
    >
      <Icon name={item.icon} size={17} />
      <span className="tp-menu-text">
        {item.label}
        {item.hint && <small>{item.hint}</small>}
      </span>
    </button>
  )

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`tp-kebab ${open ? 'is-open' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <Icon name="more" size={18} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            className={`tp tp-menu ${pos.up ? 'is-up' : ''}`}
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {safe.map(renderItem)}
            {danger.length > 0 && safe.length > 0 && <div className="tp-menu-divider" role="separator" />}
            {danger.map(renderItem)}
          </div>,
          document.body,
        )}
    </>
  )
}

/* ── Switch (on / off state) ────────────────────────────── */

export function Switch({
  checked,
  onChange,
  label,
  onText,
  offText,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  onText: string
  offText: string
  disabled?: boolean
}) {
  return (
    <label className={`tp-switch ${checked ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className="tp-switch-track"
        onClick={(e) => {
          e.stopPropagation()
          onChange(!checked)
        }}
      >
        <span className="tp-switch-thumb" />
      </button>
      <span className="tp-switch-text">{checked ? onText : offText}</span>
    </label>
  )
}

/* ── Dialog ─────────────────────────────────────────────── */

export function Dialog({
  open,
  title,
  icon,
  tone = 'default',
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  icon?: TIconName
  tone?: 'default' | 'danger'
  children: ReactNode
  onClose: () => void
  footer: ReactNode
}) {
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => card.current?.querySelector<HTMLElement>('input, [data-autofocus]')?.focus())
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="tp tp-dialog-backdrop" onMouseDown={onClose}>
      <div
        ref={card}
        className={`tp-dialog is-${tone}`}
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="tp-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tp-dialog-head">
          {icon && (
            <span className={`tp-dialog-icon is-${tone}`}>
              <Icon name={icon} size={20} />
            </span>
          )}
          <h2 id="tp-dialog-title">{title}</h2>
          <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Isara">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="tp-dialog-body">{children}</div>
        <div className="tp-dialog-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Dialog with one text field (e.g. rename). */
export function PromptDialog({
  open,
  title,
  label,
  initial,
  submitLabel,
  error,
  busy,
  onSubmit,
  onClose,
}: {
  open: boolean
  title: string
  label: string
  initial: string
  submitLabel: string
  error?: string | null
  busy?: boolean
  onSubmit: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (value.trim() && value.trim() !== initial) onSubmit(value.trim())
  }

  return (
    <Dialog
      open={open}
      title={title}
      icon="rename"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="t-btn" onClick={onClose}>
            Kanselahin
          </button>
          <button type="submit" form="tp-prompt" className="t-btn t-btn-primary" disabled={busy || !value.trim() || value.trim() === initial}>
            <Icon name="check" size={16} /> {submitLabel}
          </button>
        </>
      }
    >
      <form id="tp-prompt" onSubmit={submit} className="t-field">
        <span>{label}</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} />
        {error && <small className="tp-field-error">{error}</small>}
      </form>
    </Dialog>
  )
}

/** Confirmation for actions that cannot be undone; states the consequence and names the item. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      title={title}
      icon="trash"
      tone="danger"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="t-btn" onClick={onClose} data-autofocus>
            Kanselahin
          </button>
          <button type="button" className="t-btn t-btn-danger-solid" onClick={onConfirm} disabled={busy}>
            <Icon name="trash" size={16} /> {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}

/** Small bottom toast for quick feedback ("Nai-save"). */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 2400)
    return () => window.clearTimeout(t)
  }, [msg])
  const node = msg
    ? createPortal(
        <div className="tp tp-toast" role="status">
          <Icon name="check" size={16} /> {msg}
        </div>,
        document.body,
      )
    : null
  return { toast: setMsg, toastNode: node }
}

/* ── Drawer (slide-over panel for editing one record) ───────
 * Opens from the right so the list stays visible behind it.
 * Header (kicker + title), scrolling body, fixed footer.
 * Forms inside put their buttons in the footer with <DrawerActions>. */

const DrawerFooter = createContext<HTMLElement | null>(null)

/** Renders its buttons in the open drawer's footer (or inline when not in a drawer). Buttons need form="id" to submit. */
export function DrawerActions({ children }: { children: ReactNode }) {
  const target = useContext(DrawerFooter)
  if (!target) return <div className="t-row t-row-end">{children}</div>
  return createPortal(children, target)
}

export function Drawer({
  open,
  onClose,
  kicker,
  title,
  badge,
  wide,
  status,
  children,
}: {
  open: boolean
  onClose: () => void
  kicker?: ReactNode
  title: ReactNode
  badge?: ReactNode
  wide?: boolean
  /** Saved / error line shown at the left of the footer. */
  status?: ReactNode
  children: ReactNode
}) {
  const [shown, setShown] = useState(open)
  const [closing, setClosing] = useState(false)
  const [footer, setFooter] = useState<HTMLElement | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setShown(true)
      setClosing(false)
      return
    }
    if (!shown) return
    setClosing(true)
    const t = window.setTimeout(() => {
      setShown(false)
      setClosing(false)
    }, 180)
    return () => window.clearTimeout(t)
  }, [open, shown])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      // Let an open confirm dialog or menu handle Esc first.
      if (e.key === 'Escape' && !document.querySelector('.tp-dialog-backdrop, .tp-menu')) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>('.tp-drawer-body input:not([type=file]):not([type=radio]), .tp-drawer-body textarea')
      ;(first ?? panel.current)?.focus({ preventScroll: true })
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!shown) return null
  return createPortal(
    <div className={`tp tp-drawer-backdrop ${closing ? 'is-closing' : ''}`} onMouseDown={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        className={`tp-drawer ${wide ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-drawer-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="tp-drawer-head">
          {badge}
          <div className="tp-drawer-titles">
            {kicker && <div className="tp-drawer-kicker">{kicker}</div>}
            <h2 id="tp-drawer-title">{title}</h2>
          </div>
          <button type="button" className="tp-icon-btn" onClick={onClose} aria-label="Isara">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="tp-drawer-body">
          <DrawerFooter.Provider value={footer}>{children}</DrawerFooter.Provider>
        </div>
        <footer className="tp-drawer-foot">
          <div className="tp-drawer-status">{status}</div>
          <button type="button" className="t-btn" onClick={onClose}>
            Isara
          </button>
          <div ref={setFooter} className="tp-drawer-actions" />
        </footer>
      </div>
    </div>,
    document.body,
  )
}
