import {
  generateManifest,
  ManifestConfig,
  type Manifest,
} from 'material-icon-theme';
import { iconManifestConfig } from './iconManifestConfig';

class IconService {
  private manifest: Manifest;

  constructor() {
    this.manifest = generateManifest(iconManifestConfig as ManifestConfig);
  }

  private stripSVGExtension(iconPath: string): string {
    return iconPath.replace(/\.svg$/, '');
  }

  private getAssociation(
    associations: Record<string, string> | undefined,
    key: string
  ): string | undefined {
    if (!associations) return undefined;
    return associations[key.toLowerCase()];
  }

  private getIconPath(
    identifier: string,
    manifest?: Manifest
  ): string | undefined {
    if (!manifest?.iconDefinitions?.[identifier]) return undefined;
    const iconPath = manifest.iconDefinitions[identifier].iconPath;
    return this.stripSVGExtension(iconPath);
  }

  private resolveIcon(
    identifier: string | undefined,
    theme: 'light' | 'dark'
  ): string | undefined {
    if (!identifier) return undefined;

    if (theme === 'light') {
      const lightIcon = this.getIconPath(identifier, this.manifest.light);
      if (lightIcon) return lightIcon;
    }

    return this.getIconPath(identifier, this.manifest);
  }

  public getIconNameForFile(
    filename: string,
    theme: 'light' | 'dark' = 'dark'
  ): string {
    if (!this.manifest) return 'file';

    const lowerFilename = filename.toLowerCase();
    const fileExtension = lowerFilename.split('.').pop() ?? '';

    let identifier: string | undefined;

    if (theme === 'light') {
      identifier =
        this.getAssociation(this.manifest.light?.fileNames, lowerFilename) ??
        this.getAssociation(this.manifest.fileNames, lowerFilename) ??
        this.getAssociation(
          this.manifest.light?.fileExtensions,
          fileExtension
        ) ??
        this.getAssociation(this.manifest.fileExtensions, fileExtension);
    } else {
      identifier =
        this.getAssociation(this.manifest.fileNames, lowerFilename) ??
        this.getAssociation(this.manifest.fileExtensions, fileExtension);
    }

    const resolvedIcon = this.resolveIcon(identifier, theme);
    if (resolvedIcon) return resolvedIcon;

    const defaultIdentifier =
      theme === 'light'
        ? this.manifest.light?.file ?? this.manifest.file
        : this.manifest.file;

    return this.resolveIcon(defaultIdentifier, theme) ?? 'file';
  }

  public getIconNameForFolder(
    folderName: string,
    isOpen: boolean,
    theme: 'light' | 'dark' = 'dark'
  ): string {
    if (!this.manifest) return isOpen ? 'folder-open' : 'folder';

    const lowerFolderName = folderName.toLowerCase();

    const primaryAssoc = isOpen ? 'folderNamesExpanded' : 'folderNames';
    const secondaryAssoc = isOpen ? 'folderNames' : 'folderNamesExpanded';

    let identifier: string | undefined;

    if (theme === 'light') {
      identifier =
        this.getAssociation(
          this.manifest.light?.[primaryAssoc],
          lowerFolderName
        ) ??
        this.getAssociation(this.manifest[primaryAssoc], lowerFolderName) ??
        this.getAssociation(
          this.manifest.light?.[secondaryAssoc],
          lowerFolderName
        ) ??
        this.getAssociation(this.manifest[secondaryAssoc], lowerFolderName);
    } else {
      identifier =
        this.getAssociation(this.manifest[primaryAssoc], lowerFolderName) ??
        this.getAssociation(this.manifest[secondaryAssoc], lowerFolderName);
    }

    const resolvedIcon = this.resolveIcon(identifier, theme);
    if (resolvedIcon) return resolvedIcon;

    const defaultIdentifier = isOpen
      ? theme === 'light'
        ? this.manifest.light?.folderExpanded ?? this.manifest.folderExpanded
        : this.manifest.folderExpanded
      : theme === 'light'
        ? this.manifest.light?.folder ?? this.manifest.folder
        : this.manifest.folder;

    return (
      this.resolveIcon(defaultIdentifier, theme) ??
      (isOpen ? 'folder-open' : 'folder')
    );
  }
}

export const iconService = new IconService();
