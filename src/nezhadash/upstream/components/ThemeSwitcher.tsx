// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import { ThemeSwitch } from '../../../ThemeSwitch';
import { getProbe } from '../../bridge';
export function ModeToggle() { return <ThemeSwitch appearance={getProbe().appearance} />; }
