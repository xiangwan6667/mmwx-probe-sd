// NezhaDash adaptation of hamster1963/nezha-dash-v2 (Apache-2.0).
// Rewritten for MMWX probe data and existing history/detail components.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, CheckCircle2, ChevronRight, CircleDashed, Clock3, LayoutGrid, List, Network, Search, Server, X } from 'lucide-react';
import type { ProbePayload, ProbeServer } from '../types';
import { ThemeSwitch } from '../ThemeSwitch';
import { PasskeyLogin } from '../PasskeyLogin';
import { Twemoji } from '../Twemoji';
import { displayServerName } from '../server-name';
import { countryCodeToFlag } from '../country-flag';
import { clearServerDetail, readServerDetailRoute } from '../server-detail-route';
import { billableTraffic, bootTraffic, trafficUsageLabel } from '../traffic-display';
import { formatBytes, formatSpeed, formatUptime, numeric, percentage, selectServers, serverRegion, sortOptions, summarizeNetwork, type SortKey, type StatusFilter } from './model';
import './nezhadash.css';

function nodeName(server: ProbeServer, index: number) {
  const country = server.region_country || server.region || '';
  return displayServerName(server.name, `服务器 ${index + 1}`, /^[a-z]{2}$/i.test(country) ? countryCodeToFlag(country) : '');
}
function Usage({ label, value }: { label: string; value?: number }) {
  const amount = numeric(value);
  return <div className="nd-usage">
    <div><span>{label}</span><strong>{amount === undefined ? '—' : `${amount.toFixed(1)}%`}</strong></div>
    <div className="nd-track" aria-hidden="true"><i className={amount === undefined ? '' : amount > 90 ? 'danger' : amount > 70 ? 'warning' : 'healthy'} style={{ width: `${Math.min(amount ?? 0, 100)}%` }} /></div>
  </div>;
}
function NodeCard({ server, index }: { server: ProbeServer; index: number }) {
  const boot = bootTraffic(server);
  return <a className={`nd-node${server.online ? '' : ' nd-node-offline'}`} href={`#/server/${index}`} aria-label={`查看 ${server.name || `服务器 ${index + 1}`} 详情`}>
    <div className="nd-node-heading">
      <div><h3><Twemoji>{nodeName(server, index)}</Twemoji></h3><p>{[serverRegion(server), server.os, server.arch].filter(Boolean).join(' · ') || '暂无系统信息'}</p></div>
      <span className={`nd-status ${server.online ? 'is-online' : ''}`}><i />{server.online ? '在线' : '离线'}</span>
    </div>
    <div className="nd-node-metrics">
      <Usage label="CPU" value={server.cpu_pct} />
      <Usage label="内存" value={percentage(server.mem_used, server.mem_total)} />
      <Usage label="硬盘" value={percentage(server.disk_used, server.disk_total)} />
      <div className="nd-speed"><span>上传</span><strong>{server.online ? formatSpeed(server.upload_speed) : '—'}</strong></div>
      <div className="nd-speed"><span>下载</span><strong>{server.online ? formatSpeed(server.download_speed) : '—'}</strong></div>
    </div>
    {(boot.uplink !== undefined || boot.downlink !== undefined) && <div className="nd-node-transfer" title="本次启动累计流量"><span>累计上传 {formatBytes(boot.uplink)}</span><span>累计下载 {formatBytes(boot.downlink)}</span></div>}
    <div className="nd-node-bottom"><span><Clock3 size={13} aria-hidden="true" />{server.online ? formatUptime(server.uptime) : '节点离线'}</span><span>详情<ChevronRight size={14} aria-hidden="true" /></span></div>
  </a>;
}

export default function NezhaDashPage({ data, error, renderDetail, licenseBadge }: {
  data: ProbePayload; error?: string | null;
  renderDetail: (server: ProbeServer, index: number) => ReactNode;
  licenseBadge?: ReactNode;
}) {
  const servers = data.servers || [];
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [descending, setDescending] = useState(false);
  const [view, setView] = useState<'card' | 'list'>(() => {
    try { return localStorage.getItem('probe-nezhadash-view') === 'list' ? 'list' : 'card'; } catch { return 'card'; }
  });
  const [route, setRoute] = useState(readServerDetailRoute);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const previousIndex = useRef<number | undefined>(undefined);
  useEffect(() => {
    const sync = () => setRoute(readServerDetailRoute());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const routeKey = route.kind === 'server' ? `server-${route.index}` : route.kind;
  useEffect(() => {
    if (route.kind !== 'none') {
      if (route.kind === 'server') previousIndex.current = route.index;
      detailHeading.current?.focus();
      window.scrollTo({ top: 0 });
    } else if (previousIndex.current !== undefined) {
      document.querySelector<HTMLAnchorElement>(`.nd-node[href="#/server/${previousIndex.current}"]`)?.focus();
    }
  // Only move focus on navigation, never on periodic probe refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);
  const selected = route.kind === 'server' ? servers[route.index] : undefined;
  const online = servers.filter(server => server.online).length;
  const network = summarizeNetwork(servers);
  const regions = [...new Set(servers.map(serverRegion).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const visible = useMemo(() => selectServers(servers, { status, query, region, sort, descending }), [servers, status, query, region, sort, descending]);
  const clearFilters = () => { setQuery(''); setRegion(''); setStatus('all'); };
  const back = () => { clearServerDetail(); setRoute({ kind: 'none' }); };
  const changeView = (next: 'card' | 'list') => {
    setView(next);
    try { localStorage.setItem('probe-nezhadash-view', next); } catch { /* Keep the session usable without storage. */ }
  };
  return <div className={`nd-page${data.license_badge ? ' has-license-footer' : ''}`}>
    <header className="nd-header">
      <div className="nd-header-inner">
        <div className="nd-brand">{data.logo ? <img src={data.logo} alt="" /> : <Server size={24} aria-hidden="true" />}<div><h1>{data.title?.trim() || '服务器状态'}</h1><span>NezhaDash</span></div></div>
        <nav aria-label="站点设置"><span className="nd-header-status"><i />{online} / {servers.length} 在线</span><ThemeSwitch appearance={data.appearance} /><PasskeyLogin /></nav>
      </div>
    </header>
    <main className="nd-main">
      {error && <p className="nd-alert" role="status">连接暂时中断，正在重试。当前显示最近收到的数据。</p>}
      {route.kind !== 'none' ? <>
        <button className="nd-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" />返回服务器列表</button>
        <div className="nd-section-heading"><div><h2 ref={detailHeading} tabIndex={-1}>{selected && route.kind === 'server' ? <Twemoji>{nodeName(selected, route.index)}</Twemoji> : '服务器不存在'}</h2><p>{selected ? '服务器详情与网络监控' : '这个节点可能已被移除，或链接已经失效。'}</p></div>{selected && <span className={`nd-status ${selected.online ? 'is-online' : ''}`}><i />{selected.online ? '在线' : '离线'}</span>}</div>
        {selected && route.kind === 'server' && <div className="nd-detail" key={route.index}>
          <section className="nd-info nd-panel" aria-labelledby="nd-system-title"><h3 id="nd-system-title">系统信息</h3><dl>
            {[
              ['操作系统', selected.os], ['架构', selected.arch], ['内核', selected.kernel], ['处理器', selected.cpu_model],
              ['核心 / 线程', `${selected.cpu_cores ?? '—'} / ${selected.cpu_threads ?? '—'}`],
              ['内存', `${formatBytes(selected.mem_used)} / ${formatBytes(selected.mem_total)}`],
              ['硬盘', `${formatBytes(selected.disk_used)} / ${formatBytes(selected.disk_total)}`],
              ['运行时间', formatUptime(selected.uptime)], ['地区', serverRegion(selected)], ['服务商', selected.provider_name],
              [trafficUsageLabel(selected), formatBytes(billableTraffic(selected))],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
          </dl></section>
          <section className="nd-detail-live" aria-label="实时指标与历史趋势">{renderDetail(selected, route.index)}</section>
        </div>}
      </> : <>
        <div className="nd-section-heading"><div><h2>服务器概览</h2><p>所有节点的运行状态，一目了然。</p></div><span className="nd-live"><i />实时更新</span></div>
        <section className="nd-overview" aria-label="节点概览与状态筛选">
          {([
            ['all', '总服务器', servers.length, Server], ['online', '在线服务器', online, CheckCircle2], ['offline', '离线服务器', servers.length - online, CircleDashed],
          ] as const).map(([value, label, count, Icon]) => <button key={value} className="nd-summary nd-panel" aria-pressed={status === value} onClick={() => setStatus(value)}><span>{label}<Icon size={17} aria-hidden="true" /></span><strong>{count}<small>台</small></strong><span className="nd-summary-hint">{value === 'all' ? '查看全部节点' : value === 'online' ? '正在运行' : '当前不可用'}</span></button>)}
          <div className="nd-summary nd-panel nd-network-summary"><span>实时网络<Network size={17} aria-hidden="true" /></span><div><ArrowUp size={14} aria-hidden="true" /><span className="visually-hidden">总上传速度</span><b>{formatSpeed(network.upload)}</b></div><div><ArrowDown size={14} aria-hidden="true" /><span className="visually-hidden">总下载速度</span><b>{formatSpeed(network.download)}</b></div><span className="nd-summary-hint">{network.partialUpload || network.partialDownload ? '部分在线节点未上报' : '在线节点合计'}</span></div>
        </section>
        <section className="nd-toolbar" aria-label="筛选服务器">
          <div className="nd-search"><Search size={16} aria-hidden="true" /><input aria-label="搜索服务器" placeholder="搜索服务器、地区或系统…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="清除搜索" onClick={() => setQuery('')}><X size={15} /></button>}</div>
          <div className="nd-controls"><label className="nd-select"><span className="visually-hidden">地区</span><select value={region} onChange={event => setRegion(event.target.value)}><option value="">所有地区</option>{[...new Set([...regions, ...(region ? [region] : [])])].map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className="nd-select"><span className="visually-hidden">排序方式</span><select value={sort} onChange={event => setSort(event.target.value as SortKey)}>{sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="nd-icon-button" aria-label={descending ? '降序，点击改为升序' : '升序，点击改为降序'} onClick={() => setDescending(value => !value)}><ArrowUpDown size={16} aria-hidden="true" /></button><div className="nd-view" aria-label="视图切换"><button aria-label="卡片视图" aria-pressed={view === 'card'} onClick={() => changeView('card')}><LayoutGrid size={17} /></button><button aria-label="列表视图" aria-pressed={view === 'list'} onClick={() => changeView('list')}><List size={17} /></button></div></div>
        </section>
        <div className="nd-results"><span role="status">显示 {visible.length} / {servers.length} 台服务器{status !== 'all' ? ` · ${status === 'online' ? '在线' : '离线'}` : ''}</span>{(query || region || status !== 'all') && <button onClick={clearFilters}>清除筛选</button>}</div>
        {visible.length ? <section className={`nd-nodes nd-${view}`} aria-label="服务器列表">{visible.map(({ server, index }) => <NodeCard key={index} server={server} index={index} />)}</section> : <div className="nd-empty nd-panel"><Search size={28} aria-hidden="true" /><h3>{servers.length ? '没有匹配的服务器' : '暂无服务器'}</h3><p>{servers.length ? '试试其他关键词，或清除筛选条件。' : '主控还没有发布可展示的节点。'}</p>{servers.length > 0 && <button className="nd-back" onClick={clearFilters}>清除筛选</button>}</div>}
      </>}
    </main>
    <footer className="nd-footer"><span>Powered by <a href="https://github.com/mmwx-group">MMWX Group</a></span><span>Theme <a href="https://github.com/hamster1963/nezha-dash-v2">NezhaDash</a> · <a href="https://github.com/xiangwan6667/mmwx-probe-sd">mmwx-probe-sd</a></span></footer>
    {licenseBadge}
  </div>;
}
