import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './upstream/components/ui/dropdown-menu';

export function TimeRangeMenu({ value, onValueChange, options, label, className = '' }: {
  value: string;
  onValueChange: (value: string) => void;
  options: { key: string; label: string }[];
  label: string;
  className?: string;
}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={label} className={`nezha-time-range-trigger nezha-glass-control ${className}`}>
        <span>{options.find(option => option.key === value)?.label || value}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" collisionPadding={12} className="nezha-sort-menu nezha-time-range-menu nezha-glass-popup" aria-label={label}>
      <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
        {options.map(option => <DropdownMenuRadioItem key={option.key} value={option.key} className="nezha-sort-item">{option.label}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
