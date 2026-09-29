import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { allUnlocked, serverUnlocks, unlockSections } from '../probe-unlocks';
import { getPayload, subscribePayload } from './bridge';

export function LuminaUnlocks({ uuid }: { uuid: string }) {
  const payload = useSyncExternalStore(subscribePayload, getPayload);
  const unlocks = serverUnlocks(payload, uuid);
  const sections = unlockSections(unlocks);
  const count = sections.reduce((sum, section) => sum + section.count, 0);
  const [tab, setTab] = useState('streaming');
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const position = useCallback(() => {
    if (!trigger.current || !panel.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const up = below < 240 && above > below;
    Object.assign(panel.current.style, {
      left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`,
      top: up ? 'auto' : `${rect.bottom + 6}px`,
      bottom: up ? `${window.innerHeight - rect.top + 6}px` : 'auto',
      maxHeight: `${Math.max(80, (up ? above : below) - 6)}px`,
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, position]);
  if (!unlocks.length) return null;
  return <>
    <button ref={trigger} type="button" className="node-traffic-trigger lumina-unlocks-trigger" popoverTarget={id}
      data-complete={allUnlocked(unlocks)}
      aria-label={`解锁检测 ${count}/${unlocks.length}`} title={`解锁检测 ${count}/${unlocks.length}`} aria-expanded={open} aria-haspopup="dialog"
      onClick={event => { event.preventDefault(); event.stopPropagation(); panel.current?.togglePopover(); }}
      onKeyDown={event => event.stopPropagation()}>
      <LockKeyhole size={14} aria-hidden="true" />
    </button>
    {createPortal(<div ref={panel} id={id} popover="auto" role="dialog" aria-label="解锁检测"
      className="node-traffic-popover lumina-unlocks-panel"
      onBeforeToggle={event => { if (event.newState === 'open') position(); }}
      onToggle={event => setOpen(event.newState === 'open')}
      onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <div className="node-traffic-popover-head"><strong>解锁检测</strong><span>{count}/{unlocks.length}</span></div>
      <div className="lumina-unlocks-tabs">
        {sections.map(section => <button key={section.key} type="button" aria-pressed={tab === section.key} onClick={() => setTab(section.key)}>
          {section.zh}<small>{section.count}/{section.rows.length}</small>
        </button>)}
      </div>
      <div className="lumina-unlocks-panels">
      {sections.map(section => <div key={section.key} className="lumina-unlocks-section" style={{ visibility: tab === section.key ? 'visible' : 'hidden' }} aria-hidden={tab !== section.key} inert={tab !== section.key}>
      <ul className="node-traffic-popover-rows lumina-unlocks-list">
        {section.rows.map(row => <li className="node-traffic-popover-row" key={row.key} title={row.title}>
          <span className="node-traffic-popover-label lumina-unlocks-label">
            {row.meta.icon ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={row.meta.icon.path} /></svg> : <span className="lumina-unlocks-letter">{row.meta.short}</span>}
            <span>{row.meta.label}</span>
          </span>
          <span className="lumina-unlocks-status" data-tone={row.tone}><span>{row.text}</span>
            {row.tone !== 'info' && (row.tone === 'ok' || row.tone === 'partial' ? <LockKeyholeOpen aria-hidden="true" /> : row.tone === 'muted' ? <CircleHelp aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />)}
          </span>
        </li>)}
      </ul>
      {!section.rows.length && <p className="lumina-unlocks-empty">暂无检测结果</p>}
      </div>)}
      </div>
    </div>, document.body)}
  </>;
}
