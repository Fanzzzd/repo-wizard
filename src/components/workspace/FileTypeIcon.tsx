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
  const iconName = isDirectory
    ? iconService.getIconNameForFolder(filename, !!isOpen)
    : iconService.getIconNameForFile(filename);

  return (
    <img
      src={`/icons/${iconName}.svg`}
      alt={`${filename} icon`}
      className="w-4 h-4"
      draggable="false"
      // In case of loading error, this will make it less disruptive
      onError={e => (e.currentTarget.style.display = 'none')}
    />
  );
}
