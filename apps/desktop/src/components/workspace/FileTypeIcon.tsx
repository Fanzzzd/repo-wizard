import { useTheme } from 'next-themes';
import { getIconUrl } from '../../lib/iconLoader';
import { iconService } from '../../lib/iconService';

interface FileTypeIconProps {
  filename: string;
  isDirectory?: boolean;
  isOpen?: boolean;
}

export function FileTypeIcon({
  filename,
  isDirectory,
  isOpen,
}: FileTypeIconProps) {
  const { resolvedTheme } = useTheme();
  const currentTheme = (resolvedTheme as 'light' | 'dark') || 'dark';

  const iconName = isDirectory
    ? iconService.getIconNameForFolder(filename, !!isOpen, currentTheme)
    : iconService.getIconNameForFile(filename, currentTheme);

  let iconUrl = getIconUrl(iconName);

  if (!iconUrl) {
    // Fallback to default icons if the specific icon is not found
    const fallbackName = isDirectory ? 'folder' : 'file';
    iconUrl = getIconUrl(fallbackName);
  }

  if (!iconUrl) {
    return null;
  }

  return (
    <img
      src={iconUrl}
      alt={`${filename} icon`}
      className="w-4 h-4"
      draggable="false"
      // In case of loading error, this will make it less disruptive
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
