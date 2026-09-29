import { useState } from 'react';
import { CircleHelp, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { allUnlocked, serverUnlocks, unlockSections } from '../probe-unlocks';
import { useProbeBridge } from './bridge';
import { Popover, PopoverContent, PopoverTrigger } from './upstream/components/ui/popover';
import { Button } from './upstream/components/ui/button';

export function NezhaUnlocks({ id, corner = false }: { id: number; corner?: boolean }) {
  const snapshot = useProbeBridge();
  const [tab, setTab] = useState('streaming');
  const [open, setOpen] = useState(false);
  const unlocks = serverUnlocks(snapshot?.data, id);
  const sections = unlockSections(unlocks);
  const count = sections.reduce((sum, section) => sum + section.count, 0);
  if (!unlocks.length) return null;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="sm" className={`nezha-unlocks-trigger nezha-glass-control${corner ? ' nezha-unlocks-corner' : ''}`}
        data-complete={allUnlocked(unlocks)}
        aria-label={`解锁检测 ${count}/${unlocks.length}`} title={`解锁检测 ${count}/${unlocks.length}`}
        onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(!open); }}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); event.stopPropagation(); }}>
        <LockKeyhole size={14} aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" collisionPadding={8} className="nezha-unlocks-panel" aria-label="解锁检测"
      onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); event.stopPropagation(); }}>
      <div className="nezha-unlocks-heading"><strong>解锁检测</strong><span>{count}/{unlocks.length}</span></div>
      <div className="nezha-unlocks-tabs">
        {sections.map(section => <Button key={section.key} type="button" variant={tab === section.key ? 'secondary' : 'ghost'}
          size="sm" aria-pressed={tab === section.key} onClick={() => setTab(section.key)}>
          {section.zh}<small>{section.count}/{section.rows.length}</small>
        </Button>)}
      </div>
      <div className="nezha-unlocks-panels">
      {sections.map(section => <div key={section.key} className="nezha-unlocks-section" style={{ visibility: tab === section.key ? 'visible' : 'hidden' }} aria-hidden={tab !== section.key} inert={tab !== section.key}>
      <ul className="nezha-unlocks-list">
        {section.rows.map(row => <li key={row.key} title={row.title}>
          {row.meta.icon ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={row.meta.icon.path} /></svg> : <span className="nezha-unlocks-letter">{row.meta.short}</span>}
          <span className="nezha-unlocks-label">{row.meta.label}</span>
          <span className="nezha-unlocks-status" data-tone={row.tone}><span>{row.text}</span>
            {row.tone !== 'info' && (row.tone === 'ok' || row.tone === 'partial' ? <LockKeyholeOpen aria-hidden="true" /> : row.tone === 'muted' ? <CircleHelp aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />)}
          </span>
        </li>)}
      </ul>
      {!section.rows.length && <p className="nezha-unlocks-empty">暂无检测结果</p>}
      </div>)}
      </div>
    </PopoverContent>
  </Popover>;
}
