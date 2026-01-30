import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSectors } from '@/hooks/use-sectors'

interface SectorSelectProps {
  value: string | null
  onChange: (sectorId: string | null) => void
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
}

export function SectorSelect({
  value,
  onChange,
  placeholder = 'Select sector',
  allowClear = true,
  disabled = false,
}: SectorSelectProps) {
  const { data: sectors, isLoading } = useSectors()

  const handleValueChange = (newValue: string) => {
    // Convert empty string (clear selection) to null
    onChange(newValue === '__all__' ? null : newValue)
  }

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading sectors..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={value ?? '__all__'}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value="__all__">All sectors</SelectItem>
        )}
        {sectors?.map((sector) => (
          <SelectItem key={sector.id} value={sector.id}>
            {sector.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
