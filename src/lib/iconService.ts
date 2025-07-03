import {
  generateManifest,
  ManifestConfig,
  type Manifest,
} from "material-icon-theme";
import { iconManifestConfig } from "./iconManifestConfig";

class IconService {
  private manifest: Manifest;

  constructor() {
    this.manifest = generateManifest(iconManifestConfig as ManifestConfig);
  }

  private stripSVGExtension(iconPath: string): string {
    return iconPath.replace(/\.svg$/, "");
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

  private resolveIcon(identifier: string | undefined): string | undefined {
    if (!identifier) return undefined;
    // Prefer light theme definition if available, otherwise fallback to dark theme.
    return (
      this.getIconPath(identifier, this.manifest.light) ??
      this.getIconPath(identifier, this.manifest)
    );
  }

  public getIconNameForFile(filename: string): string {
    if (!this.manifest) return "file";

    const lowerFilename = filename.toLowerCase();
    const fileExtension = lowerFilename.split(".").pop() ?? "";

    const identifier =
      this.getAssociation(this.manifest.light?.fileNames, lowerFilename) ??
      this.getAssociation(this.manifest.fileNames, lowerFilename) ??
      this.getAssociation(this.manifest.light?.fileExtensions, fileExtension) ??
      this.getAssociation(this.manifest.fileExtensions, fileExtension);

    const resolvedIcon = this.resolveIcon(identifier);
    if (resolvedIcon) return resolvedIcon;

    const defaultIdentifier = this.manifest.light?.file ?? this.manifest.file;
    return this.resolveIcon(defaultIdentifier) ?? "file";
  }

  public getIconNameForFolder(folderName: string, isOpen: boolean): string {
    if (!this.manifest) return isOpen ? "folder-open" : "folder";

    const lowerFolderName = folderName.toLowerCase();

    const primaryAssoc = isOpen ? "folderNamesExpanded" : "folderNames";
    const secondaryAssoc = isOpen ? "folderNames" : "folderNamesExpanded";

    const identifier =
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

    const resolvedIcon = this.resolveIcon(identifier);
    if (resolvedIcon) return resolvedIcon;

    const defaultIdentifier = isOpen
      ? this.manifest.light?.folderExpanded ?? this.manifest.folderExpanded
      : this.manifest.light?.folder ?? this.manifest.folder;

    return this.resolveIcon(defaultIdentifier) ?? (isOpen ? "folder-open" : "folder");
  }
}

export const iconService = new IconService();