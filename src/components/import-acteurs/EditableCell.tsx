import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export function EditableCell({ value, onChange, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() !== value) {
      onChange(editValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-7 text-sm py-0 px-2"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors",
        className
      )}
      title="Double-cliquez pour modifier"
    >
      {value || <span className="text-muted-foreground italic">Non défini</span>}
    </div>
  );
}
